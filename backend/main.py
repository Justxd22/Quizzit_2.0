from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict
import uvicorn
from pydantic import BaseModel
import PyPDF2
from openai import AsyncOpenAI
import json
import os
from dotenv import load_dotenv
import random
from io import BytesIO

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

# Initialize OpenAI client
openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class Question(BaseModel):
    question: str
    options: List[str]
    correct_answer: str

class QuestionsResponse(BaseModel):
    questions: List[Question]

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
async def generate_questions_endpoint(file: UploadFile = File(...), num_questions: int = 10):
    """
    Upload a PDF file and generate multiple choice questions.
    
    Args:
        file: PDF file to process
        num_questions: Number of questions to generate (default: 10)
    
    Returns:
        List of questions with options and correct answers
    """
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
        questions = await generate_mcq_questions(text, num_questions)
        
        if not questions:
            raise HTTPException(status_code=500, detail="Failed to generate questions")
        
        return {"questions": questions}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")

@app.get("/health/")
async def health_check():
    """Check if the API is running."""
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
