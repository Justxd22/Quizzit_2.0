import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from "jose"
import { createClient } from "@/lib/supabase"
import { google } from "@ai-sdk/google"
import { generateObject } from "ai"
import { z } from "zod"

// Secret key for JWT verification
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET)

// Dynamic import for pdf-parse to avoid issues with bundling
const getPdfParse = async () => {
  const pdfParse = await import("pdf-parse")
  return pdfParse.default
}

// Schema for the questions response
const QuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).length(4),
  correct_answer: z.string(),
})

const QuestionsResponseSchema = z.object({
  questions: z.array(QuestionSchema),
})

// Helper function to shuffle array
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = await getPdfParse()
    const data = await pdfParse(buffer)
    return data.text
  } catch (error) {
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}
// ${text.slice(0, 10000)}

async function generateMcqQuestions(text: string, numQuestions = 30) {
  const prompt = `Generate ${numQuestions} multiple choice questions based on this text:

${text}


IMPORTANT REQUIREMENTS:
1. Each question must have exactly 4 options
2. The correct answer MUST be included as one of the 4 options
3. The other 3 options should be plausible but incorrect
4. Return the correct answer exactly as it appears in the options array

Example format:
{
  "questions": [
    {
      "question": "What is the capital of France?",
      "options": ["Paris", "London", "Berlin", "Madrid"],
      "correct_answer": "Paris"
    }
  ]
}

Create clear, focused questions with one correct answer and three plausible but incorrect options, if Questions bank was provided dont re-write the text and provide the same number of questions`

  try {
    const { object } = await generateObject({
      model: google("gemini-2.0-flash-lite"),
      schema: QuestionsResponseSchema,
      prompt,
      temperature: 0.9,
    })

    // Shuffle options for each question
    const questionsWithShuffledOptions = object.questions.map((q) => ({
      ...q,
      options: shuffleArray(q.options),
    }))

    return questionsWithShuffledOptions
  } catch (error) {
    console.error("Error generating questions:", error)
    throw new Error(`Failed to generate questions: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("authToken")?.value
    // Verify token
    let walletAddress: string;
    let txHash: string;
    let quizAttempts: number;

    
    // Check if the request is multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const guest = formData.get("guest") === "true";

    if (!guest) {
      if (!token) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
      }
      const { payload } = await jwtVerify(token, JWT_SECRET);
      const data = payload as {
        walletAddress: string;
        txHash: string;
        quizAttempts: number;
      };

      walletAddress = data.walletAddress;
      txHash = data.txHash;
      quizAttempts = data.quizAttempts;
    }

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'File must be a PDF' },
        { status: 400 }
      );
    }

    // Check file size (60MB limit)
    if (file.size > 60 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'PDF file too large. Maximum size is 60MB.' },
        { status: 400 }
      );
    }

    // Get the number of questions from the form data or use default
    const numQuestionsParam = formData.get('num_questions') as string;
    const numQuestions = numQuestionsParam ? Number.parseInt(numQuestionsParam, 10) : 30;

    if (isNaN(numQuestions) || numQuestions < 1 || numQuestions > 50) {
      return NextResponse.json(
        { error: 'Number of questions must be between 1 and 50' },
        { status: 400 }
      );
    }

    // Convert file to buffer for processing in memory
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Extract text from PDF
    const text = await extractTextFromPdf(buffer)

    if (!text.trim()) {
      return NextResponse.json(
        { error: 'Could not extract text from the PDF. The file may be empty, corrupted, or contain only images.' },
        { status: 422 }
      );
    }

    // Generate questions using Gemini
    const questions = await generateMcqQuestions(text, numQuestions)

    if (!questions || questions.length === 0) {
      return NextResponse.json(
        { error: 'Failed to generate questions' },
        { status: 500 }
      );
    }

    // Add id to each question
    const questionsWithIds = questions.map((question, index) => ({
      id: index,
      ...question
    }));

    console.log(questionsWithIds);

    // Initialize Supabase client
    const supabase = createClient()

    if (!guest) {
      const { error: updateError } = await supabase
        .from("users")
        .update({ quiz: questionsWithIds })
        .eq("wallet_address", walletAddress)
        .eq("tx_hash", txHash).single()


      if (updateError) {
        console.error("Database error:", updateError)
        return NextResponse.json({ message: "Failed to save quiz" }, { status: 500 })
      }
    }
    else {
      const name = formData.get('quiz_name') as string;
      const len = questionsWithIds.length;
      const { error: updateError } = await supabase
        .from("quiz")
        .insert({ quiz: questionsWithIds, name: name, len: len })


      if (updateError) {
        console.error("Database error:", updateError)
        return NextResponse.json({ message: "Failed to save quiz" }, { status: 500 })
      }
    }


    return NextResponse.json({ message: "All good" });
  } catch (error) {
    console.error('Error processing upload:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
