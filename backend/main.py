from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Optional, Union
import uvicorn
from pydantic import BaseModel
import PyPDF2
from openai import AsyncOpenAI
import json
import os
from dotenv import load_dotenv
import random
from io import BytesIO
from supabase import create_client, Client
from datetime import datetime
import uuid
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

app = FastAPI(title="PDF MCQ Generator API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "*").split(","),  # easier instead of redeploy
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")

if not supabase_url or not supabase_key:
    logger.warning("Supabase credentials not found in environment variables. Database features will not work.")
    supabase_client = None
else:
    try:
        supabase_client = create_client(supabase_url, supabase_key)
        logger.info("Supabase client initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {str(e)}")
        supabase_client = None

# Initialize OpenAI client
openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class Question(BaseModel):
    question: str
    options: List[str]
    correct_answer: str

class QuestionsResponse(BaseModel):
    questions: List[Question]
    quiz_id: Optional[str] = None
    success: bool = True
    message: Optional[str] = None

class UserQuizRequest(BaseModel):
    wallet_address: str
    quiz_id: str

class UserQuizResponse(BaseModel):
    wallet_address: str
    quiz_id: str
    quiz_attempts: int
    remaining_attempts: int
    redirect_to_exceeded: bool = False
    success: bool = True
    message: Optional[str] = None
    
class TriesResponse(BaseModel):
    tries_left: int
    success: bool = True
    message: Optional[str] = None

# Constants
MAX_QUIZ_ATTEMPTS = 3  # Maximum number of attempts allowed per quiz

async def extract_text_from_pdf(pdf_file) -> str:
    """Extract text content from uploaded PDF file."""
    try:
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        raise ValueError(f"Failed to extract text from PDF: {str(e)}")

async def generate_mcq_questions(text: str, num_questions: int = 10) -> List[Dict]:
    """Generate MCQ questions using OpenAI."""
    system_prompt = """You are an expert at creating multiple choice questions. 
    When given text, create clear and focused questions with one correct answer and three plausible but incorrect options.
    Always respond in valid JSON format with the following structure:
    {
        "questions": [
            {
                "question": "question text",
                "options": ["correct answer", "wrong1", "wrong2", "wrong3"],
                "correct_answer": "correct answer"
            }
        ]
    }"""
    
    user_prompt = f"""Generate {num_questions} multiple choice questions based on this text:

{text[:4000]}  # Limit text to 4000 characters to stay within token limits

Remember to:
1. Create clear, focused questions
2. Ensure one correct answer per question
3. Provide three plausible but incorrect options
4. Return in the exact JSON format specified"""
    
    try:
        response = await openai_client.chat.completions.create(
            model=os.getenv("LLM_MODEL"),  # Using the latest model that's better at JSON
            response_format={"type": "json_object"},  # Enforce JSON response
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7
        )
        
        # Get the response content
        content = response.choices[0].message.content
        print("Raw response:", content)  # Debug print
        
        # Parse the response
        result = json.loads(content)
        questions = result.get("questions", [])
        
        # Shuffle options for each question
        for q in questions:
            random.shuffle(q["options"])
            
        return questions[:num_questions]
        
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid response format from OpenAI: {str(e)}")
    except Exception as e:
        print(f"Error generating questions: {e}")
        print("Response content:", response.choices[0].message.content if 'response' in locals() else "No response")
        raise ValueError(f"Failed to generate questions: {str(e)}")

@app.post("/generate-questions/", response_model=QuestionsResponse)
async def generate_questions_endpoint(file: UploadFile = File(...), num_questions: int = 10, wallet_address: Optional[str] = None):
    """
    Upload a PDF file and generate multiple choice questions.
    
    Args:
        file: PDF file to process
        num_questions: Number of questions to generate (default: 10)
        wallet_address: User's wallet address to associate with the quiz
    
    Returns:
        List of questions with options and correct answers and quiz_id
    """
    logger.info(f"Generating questions from PDF: {file.filename}, num_questions: {num_questions}, wallet_address: {wallet_address}")
    
    # fix bug if name is in UPPER case
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    try:
        # Read the PDF content directly into memory
        pdf_content = await file.read()
        
        # Check file size before processing
        if len(pdf_content) > 60 * 1024 * 1024:  # 60MB limit
            raise HTTPException(status_code=400, detail="PDF file too large. Maximum size is 60MB.")
            
        pdf_file = BytesIO(pdf_content)
        # Extract text from PDF
        text = await extract_text_from_pdf(pdf_file)
        
        if not text.strip():
            raise HTTPException(status_code=422, detail="Could not extract text from the PDF. The file may be empty, corrupted, or contain only images.")
        
        # Generate questions
        logger.info("Generating questions from extracted text")
        questions = await generate_mcq_questions(text, num_questions)
        
        if not questions:
            raise HTTPException(status_code=500, detail="Failed to generate questions")
        
        logger.info(f"Successfully generated {len(questions)} questions")
        
        # Generate a unique ID for the quiz (using UUID as tx_hash)
        tx_hash = str(uuid.uuid4())
        logger.info(f"Generated quiz ID: {tx_hash}")
        
        # Check if Supabase client is available
        if not supabase_client:
            logger.warning("Supabase client not available. Quiz will not be saved to database.")
            return {
                "questions": questions, 
                "quiz_id": tx_hash,
                "success": True,
                "message": "Quiz generated successfully but not saved to database due to configuration issues."
            }
        
        try:
            # Prepare the quiz JSON content
            quiz_json = {
                "questions": questions,
                "metadata": {
                    "pdf_name": file.filename,
                    "created_at": datetime.now().isoformat(),
                    "num_questions": len(questions)
                }
            }
            
            # Save the quiz content to the quiz table
            quiz_data = {
                "tx_hash": tx_hash,
                "created_at": datetime.now().isoformat(),
                "quiz": json.dumps(quiz_json)
            }
            
            logger.info(f"Saving quiz with tx_hash {tx_hash} to quiz table")
            # Insert the quiz into Supabase quiz table
            quiz_result = supabase_client.table("quiz").insert(quiz_data).execute()
            
            # Verify the quiz was saved correctly
            verification = supabase_client.table("quiz").select("*").eq("tx_hash", tx_hash).execute()
            if not verification.data:
                logger.error(f"Failed to save quiz with tx_hash {tx_hash} to quiz table")
                raise HTTPException(status_code=500, detail="Failed to save quiz to database")
            
            logger.info(f"Quiz saved successfully with ID: {tx_hash}")
            
            # If a wallet address was provided, associate the quiz with the user
            if wallet_address:
                logger.info(f"Associating quiz with wallet address: {wallet_address}")
                
                # Check if user already exists in the database
                user_result = supabase_client.table("users").select("*").eq("wallet_address", wallet_address).execute()
                
                # Prepare user-quiz data
                user_quiz_data = {
                    "wallet_address": wallet_address,
                    "tx_hash": tx_hash,
                    "quiz_attempts": 0,  # Initial attempts is 0
                    "best_score": 0,     # Initial best score is 0
                    "created_at": datetime.now().isoformat(),
                    "allowed": True      # Quiz is allowed by default
                }
                
                logger.info(f"Saving user-quiz relationship to users table")
                
                # Insert the user-quiz relationship into Supabase users table
                result = supabase_client.table("users").insert(user_quiz_data).execute()
                
                return {
                    "questions": questions, 
                    "quiz_id": tx_hash,
                    "success": True,
                    "message": "Quiz generated and saved successfully"
                }
            else:
                logger.warning("No wallet address provided. Quiz will not be associated with a user.")
                return {
                    "questions": questions, 
                    "quiz_id": tx_hash,
                    "success": True,
                    "message": "Quiz generated successfully but not associated with a user."
                }
            
        except Exception as db_error:
            logger.error(f"Database error when saving quiz: {str(db_error)}")
            # Return questions even if database save fails
            return {
                "questions": questions, 
                "quiz_id": tx_hash,
                "success": True,
                "message": f"Quiz generated successfully but database save failed: {str(db_error)}"
            }
    
    except Exception as e:
        logger.error(f"Error in generate_questions_endpoint: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")

@app.get("/quiz/{quiz_id}")
@app.get("/get-quiz/{quiz_id}")
async def get_quiz(quiz_id: str):
    """
    Get a quiz by its ID (tx_hash).
    
    Args:
        quiz_id: Quiz ID (tx_hash)
        
    Returns:
        Quiz data or error message
    """
    if not supabase_client:
        raise HTTPException(status_code=503, detail="Database connection not available")
    
    try:
        logger.info(f"Retrieving quiz with tx_hash: {quiz_id}")
        
        # Try to decode the quiz_id if it's URL-encoded
        try:
            # Check if the quiz_id might be URL-encoded
            if '%' in quiz_id:
                logger.info(f"Attempting to URL-decode quiz_id: {quiz_id}")
                from urllib.parse import unquote
                decoded_quiz_id = unquote(quiz_id)
                logger.info(f"Decoded quiz_id: {decoded_quiz_id}")
                quiz_id = decoded_quiz_id
        except Exception as e:
            logger.warning(f"Error decoding quiz_id: {str(e)}")
        
        # Get the quiz from the quiz table
        logger.info(f"Querying Supabase for quiz with tx_hash: {quiz_id}")
        
        try:
            # Try using the from().select() approach like in the frontend
            quiz_result = supabase_client.from_("quiz").select("*").eq("tx_hash", quiz_id).execute()
            logger.info(f"Using from().select() approach: {quiz_result}")
        except Exception as e:
            logger.warning(f"Error using from().select(): {str(e)}")
            # Fall back to the table().select() approach
            quiz_result = supabase_client.table("quiz").select("*").eq("tx_hash", quiz_id).execute()
            logger.info(f"Falling back to table().select() approach: {quiz_result}")
        
        # Log the raw response for debugging
        logger.info(f"Supabase response: {quiz_result}")
        logger.info(f"Response data: {quiz_result.data}")
        
        # Check if we found the quiz
        if not quiz_result.data:
            logger.warning(f"Quiz with ID {quiz_id} not found in database")
            
            # Try checking if the quiz exists in the users table
            logger.info(f"Checking if quiz exists in users table")
            user_result = supabase_client.table("users").select("*").eq("tx_hash", quiz_id).execute()
            logger.info(f"Users table response: {user_result.data}")
            
            # Also try checking if any quizzes exist at all
            all_quizzes = supabase_client.table("quiz").select("tx_hash").limit(5).execute()
            logger.info(f"Sample of available quizzes: {all_quizzes.data}")
            
            raise HTTPException(status_code=404, detail=f"Quiz with ID {quiz_id} not found")
        
        # Get the quiz data
        quiz_data = quiz_result.data[0]
        logger.info(f"Found quiz with ID {quiz_id}")
        
        # Check if the quiz field exists and is a string
        if "quiz" not in quiz_data or not isinstance(quiz_data["quiz"], str):
            logger.error(f"Quiz data for {quiz_id} is missing or invalid")
            raise HTTPException(status_code=500, detail="Quiz data is corrupted")
        
        # Parse the quiz JSON
        try:
            quiz_content = json.loads(quiz_data["quiz"])
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse quiz JSON for {quiz_id}: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to parse quiz data")
        
        # Check if questions exist in the quiz content
        if "questions" not in quiz_content or not quiz_content["questions"]:
            logger.error(f"Quiz {quiz_id} has no questions")
            raise HTTPException(status_code=500, detail="Quiz has no questions")
        
        # Try to get user data if available
        user_result = supabase_client.table("users").select("*").eq("tx_hash", quiz_id).execute()
        
        # Default values for user data
        quiz_attempts = 0
        best_score = 0
        
        # If user data exists, get attempts and score
        if user_result.data:
            user_data = user_result.data[0]
            quiz_attempts = user_data.get("quiz_attempts", 0)
            best_score = user_data.get("best_score", 0)
            logger.info(f"Found user data for quiz {quiz_id}: attempts={quiz_attempts}, best_score={best_score}")
        else:
            logger.info(f"No user data found for quiz {quiz_id}")
        
        # Return the quiz data with user information if available
        return {
            "quiz_id": quiz_id,
            "questions": quiz_content["questions"],
            "metadata": quiz_content.get("metadata", {}),
            "quiz_attempts": quiz_attempts,
            "best_score": best_score,
            "success": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving quiz {quiz_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving quiz: {str(e)}")
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Error retrieving quiz {quiz_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving quiz: {str(e)}")
        
        return quiz_data
    except Exception as e:
        logger.error(f"Error retrieving quiz {quiz_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving quiz: {str(e)}")

@app.post("/user-quiz/", response_model=UserQuizResponse)
async def create_user_quiz(request: UserQuizRequest):
    """Create or update a user-quiz relationship using wallet address."""
    if not supabase_client:
        raise HTTPException(status_code=503, detail="Database connection not available")
        
    try:
        # Check if the quiz exists
        logger.info(f"Checking if quiz with tx_hash {request.quiz_id} exists")
        quiz_result = supabase_client.table("quiz").select("*").eq("tx_hash", request.quiz_id).execute()
        
        if not quiz_result.data:
            logger.warning(f"Quiz with tx_hash {request.quiz_id} not found")
            return {
                "wallet_address": request.wallet_address,
                "quiz_id": request.quiz_id,
                "quiz_attempts": 0,
                "remaining_attempts": 0,
                "redirect_to_exceeded": True,
                "success": False,
                "message": "Quiz not found"
            }
        
        # Check if this wallet already has an entry for this quiz
        logger.info(f"Checking quiz attempts for wallet {request.wallet_address} and quiz {request.quiz_id}")
        user_quiz_result = supabase_client.table("users").select("*").eq("wallet_address", request.wallet_address).eq("tx_hash", request.quiz_id).execute()
        
        # Define max attempts allowed
        MAX_QUIZ_ATTEMPTS = 3
        
        if user_quiz_result.data:
            # User already has an entry for this quiz
            current_attempts = user_quiz_result.data[0].get("quiz_attempts", 0)
            if isinstance(current_attempts, str) and current_attempts.isdigit():
                current_attempts = int(current_attempts)
            elif not isinstance(current_attempts, int):
                current_attempts = 0
                
            remaining_attempts = MAX_QUIZ_ATTEMPTS - current_attempts
            redirect_to_exceeded = remaining_attempts <= 0
            
            logger.info(f"User has already attempted this quiz {current_attempts} times, remaining attempts: {remaining_attempts}")
            
            return {
                "wallet_address": request.wallet_address,
                "quiz_id": request.quiz_id,
                "quiz_attempts": current_attempts,
                "remaining_attempts": remaining_attempts,
                "redirect_to_exceeded": redirect_to_exceeded,
                "success": True,
                "message": "Retrieved quiz attempts successfully"
            }
        else:
            # No entry exists for this wallet and quiz combination
            # This should not happen with the current flow, but we'll handle it anyway
            # by creating a new entry or updating the existing one
            logger.info(f"Creating new quiz attempt entry for wallet {request.wallet_address} and quiz {request.quiz_id}")
            
            # Check if the quiz exists but is not associated with this wallet
            quiz_exists = supabase_client.table("quiz").select("*").eq("tx_hash", request.quiz_id).execute()
            
            if quiz_exists.data:
                # The quiz exists but is not associated with this wallet
                # Create a new entry for this wallet
                quiz_data = {
                    "wallet_address": request.wallet_address,
                    "tx_hash": request.quiz_id,
                    "quiz_attempts": 0,
                    "created_at": datetime.now().isoformat(),
                    "best_score": 0,
                    "allowed": True
                }
                
                result = supabase_client.table("users").insert(quiz_data).execute()
                
                return {
                    "wallet_address": request.wallet_address,
                    "quiz_id": request.quiz_id,
                    "quiz_attempts": 0,
                    "remaining_attempts": MAX_QUIZ_ATTEMPTS,
                    "redirect_to_exceeded": False,
                    "success": True,
                    "message": "Created new quiz attempt entry"
                }
            else:
                # The quiz doesn't exist at all
                return {
                    "wallet_address": request.wallet_address,
                    "quiz_id": request.quiz_id,
                    "quiz_attempts": 0,
                    "remaining_attempts": 0,
                    "redirect_to_exceeded": True,
                    "success": False,
                    "message": "Quiz not found"
                }
    except Exception as e:
        logger.error(f"Error checking quiz attempts: {str(e)}")
        return {
            "wallet_address": request.wallet_address,
            "quiz_id": request.quiz_id,
            "quiz_attempts": 0,
            "remaining_attempts": 0,
            "redirect_to_exceeded": True,
            "success": False,
            "message": f"Error checking quiz attempts: {str(e)}"
        }

@app.put("/user-quiz/increment-attempts/", response_model=UserQuizResponse)
async def increment_attempts(request: UserQuizRequest):
    """
    Increment the number of attempts for a user on a quiz and check if redirect is needed.
    
    Args:
        request: UserQuizRequest containing wallet_address and quiz_id
        
    Returns:
        UserQuizResponse with updated attempt information
    """
    if not supabase_client:
        return UserQuizResponse(
            wallet_address=request.wallet_address,
            quiz_id=request.quiz_id,
            quiz_attempts=0,
            remaining_attempts=MAX_QUIZ_ATTEMPTS,
            success=False,
            message="Database connection not available"
        )
    
    try:
        # Get current attempts for this user and quiz
        result = supabase_client.table("users").select("*").eq("wallet_address", request.wallet_address).eq("tx_hash", request.quiz_id).execute()
        
        if not result.data:
            # No record found, create a new one with 1 attempt
            new_record = {
                "wallet_address": request.wallet_address,
                "tx_hash": request.quiz_id,
                "quiz_attempts": 1,
                "best_score": 0,
                "created_at": datetime.now().isoformat(),
                "allowed": True
            }
            supabase_client.table("users").insert(new_record).execute()
            
            return UserQuizResponse(
                wallet_address=request.wallet_address,
                quiz_id=request.quiz_id,
                quiz_attempts=1,
                remaining_attempts=MAX_QUIZ_ATTEMPTS - 1,
                redirect_to_exceeded=False
            )
        else:
            # Record exists, increment attempts
            record = result.data[0]
            current_attempts = record.get("quiz_attempts", 0)
            new_attempts = current_attempts + 1
            
            # Update the record
            supabase_client.table("users").update({"quiz_attempts": new_attempts}).eq("wallet_address", request.wallet_address).eq("tx_hash", request.quiz_id).execute()
            
            # Check if attempts exceeded
            remaining = max(0, MAX_QUIZ_ATTEMPTS - new_attempts)
            redirect_needed = remaining <= 0
            
            return UserQuizResponse(
                wallet_address=request.wallet_address,
                quiz_id=request.quiz_id,
                quiz_attempts=new_attempts,
                remaining_attempts=remaining,
                redirect_to_exceeded=redirect_needed
            )
            
    except Exception as e:
        logger.error(f"Error incrementing attempts: {str(e)}")
        return UserQuizResponse(
            wallet_address=request.wallet_address,
            quiz_id=request.quiz_id,
            quiz_attempts=0,
            remaining_attempts=MAX_QUIZ_ATTEMPTS,
            success=False,
            message=f"Error incrementing attempts: {str(e)}"
        )

class RemainingAttemptsResponse(BaseModel):
    remaining_attempts: int
    quiz_attempts: int
    redirect_to_exceeded: bool = False
    success: bool = True
    message: Optional[str] = None

@app.get("/user-quiz/attempts/{wallet_address}/{quiz_id}", response_model=RemainingAttemptsResponse)
async def get_remaining_attempts(wallet_address: str, quiz_id: str):
    """
    Get the number of remaining attempts for a user on a quiz.
    
    Args:
        wallet_address: User's wallet address
        quiz_id: Quiz ID (tx_hash)
        
    Returns:
        RemainingAttemptsResponse with attempt information
    """
    if not supabase_client:
        return RemainingAttemptsResponse(
            remaining_attempts=MAX_QUIZ_ATTEMPTS,
            quiz_attempts=0,
            success=False,
            message="Database connection not available"
        )
    
    try:
        # Get current attempts for this user and quiz
        result = supabase_client.table("users").select("*").eq("wallet_address", wallet_address).eq("tx_hash", quiz_id).execute()
        
        if not result.data:
            # No record found, user has all attempts available
            return RemainingAttemptsResponse(
                remaining_attempts=MAX_QUIZ_ATTEMPTS,
                quiz_attempts=0,
                redirect_to_exceeded=False
            )
        else:
            # Record exists, calculate remaining attempts
            record = result.data[0]
            current_attempts = record.get("quiz_attempts", 0)
            remaining = max(0, MAX_QUIZ_ATTEMPTS - current_attempts)
            redirect_needed = remaining <= 0
            
            return RemainingAttemptsResponse(
                remaining_attempts=remaining,
                quiz_attempts=current_attempts,
                redirect_to_exceeded=redirect_needed
            )
            
    except Exception as e:
        logger.error(f"Error getting remaining attempts: {str(e)}")
        return RemainingAttemptsResponse(
            remaining_attempts=MAX_QUIZ_ATTEMPTS,
            quiz_attempts=0,
            success=False,
            message=f"Error getting remaining attempts: {str(e)}"
        )

class ScoreUpdateRequest(BaseModel):
    wallet_address: str
    quiz_id: str
    score: int

class ScoreUpdateResponse(BaseModel):
    wallet_address: str
    quiz_id: str
    best_score: int
    success: bool = True
    message: Optional[str] = None

@app.put("/user-quiz/update-score/", response_model=ScoreUpdateResponse)
async def update_best_score(request: ScoreUpdateRequest):
    """
    Update the best score for a user on a quiz if the new score is higher.
    
    Args:
        request: ScoreUpdateRequest containing wallet_address, quiz_id, and score
        
    Returns:
        ScoreUpdateResponse with updated score information
    """
    if not supabase_client:
        return ScoreUpdateResponse(
            wallet_address=request.wallet_address,
            quiz_id=request.quiz_id,
            best_score=request.score,
            success=False,
            message="Database connection not available"
        )
    
    try:
        # Get current best score for this user and quiz
        result = supabase_client.table("users").select("*").eq("wallet_address", request.wallet_address).eq("tx_hash", request.quiz_id).execute()
        
        if not result.data:
            # No record found, create a new one with the current score
            new_record = {
                "wallet_address": request.wallet_address,
                "tx_hash": request.quiz_id,
                "quiz_attempts": 1,  # First attempt
                "best_score": request.score,
                "created_at": datetime.now().isoformat(),
                "allowed": True
            }
            supabase_client.table("users").insert(new_record).execute()
            
            return ScoreUpdateResponse(
                wallet_address=request.wallet_address,
                quiz_id=request.quiz_id,
                best_score=request.score
            )
        else:
            # Record exists, update best score if new score is higher
            record = result.data[0]
            current_best = record.get("best_score", 0)
            
            if request.score > current_best:
                # Update the record with the new best score
                supabase_client.table("users").update({"best_score": request.score}).eq("wallet_address", request.wallet_address).eq("tx_hash", request.quiz_id).execute()
                
                return ScoreUpdateResponse(
                    wallet_address=request.wallet_address,
                    quiz_id=request.quiz_id,
                    best_score=request.score,
                    message="Best score updated successfully"
                )
            else:
                # No update needed
                return ScoreUpdateResponse(
                    wallet_address=request.wallet_address,
                    quiz_id=request.quiz_id,
                    best_score=current_best,
                    message="Score not higher than current best"
                )
            
    except Exception as e:
        logger.error(f"Error updating best score: {str(e)}")
        return ScoreUpdateResponse(
            wallet_address=request.wallet_address,
            quiz_id=request.quiz_id,
            best_score=request.score,
            success=False,
            message=f"Error updating best score: {str(e)}"
        )
    """Update the best score for a user on a quiz if the new score is higher."""
    if not supabase_client:
        raise HTTPException(status_code=503, detail="Database connection not available")
        
    try:
        # Get the current quiz record
        logger.info(f"Getting current best score for wallet {request.wallet_address} on quiz {request.quiz_id}")
        quiz_result = supabase_client.table("users").select("*").eq("wallet_address", request.wallet_address).eq("tx_hash", request.quiz_id).execute()
        
        if not quiz_result.data:
            logger.warning(f"Quiz record not found for wallet {request.wallet_address} and quiz {request.quiz_id}")
            return {
                "wallet_address": request.wallet_address,
                "quiz_id": request.quiz_id,
                "best_score": request.score,  # Set the new score as best score
                "success": False,
                "message": "Quiz record not found, but score recorded"
            }
        
        # Get current best score
        current_best_score = quiz_result.data[0].get("best_score", 0)
        if isinstance(current_best_score, str) and current_best_score.isdigit():
            current_best_score = int(current_best_score)
        elif not isinstance(current_best_score, int):
            current_best_score = 0
            
        # Only update if the new score is higher
        if request.score > current_best_score:
            logger.info(f"Updating best score for wallet {request.wallet_address} on quiz {request.quiz_id} from {current_best_score} to {request.score}")
            
            update_data = {
                "best_score": request.score,
                "updated_at": datetime.now().isoformat()
            }
            
            supabase_client.table("quiz_attempts").update(update_data).eq("wallet_address", request.wallet_address).eq("tx_hash", request.quiz_id).execute()
            
            return {
                "wallet_address": request.wallet_address,
                "quiz_id": request.quiz_id,
                "best_score": request.score,
                "success": True,
                "message": "Best score updated successfully"
            }
        else:
            logger.info(f"New score {request.score} is not higher than current best score {current_best_score}, not updating")
            return {
                "wallet_address": request.wallet_address,
                "quiz_id": request.quiz_id,
                "best_score": current_best_score,
                "success": True,
                "message": "Score not updated as it's not higher than the current best score"
            }
    except Exception as e:
        logger.error(f"Error updating best score: {str(e)}")
        return {
            "wallet_address": request.wallet_address,
            "quiz_id": request.quiz_id,
            "best_score": 0,
            "success": False,
            "message": f"Error updating best score: {str(e)}"
        }

@app.get("/health/")
async def health_check():
    """Check if the API is running."""
    db_status = "connected" if supabase_client else "disconnected"
    return {"status": "healthy", "database": db_status}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
