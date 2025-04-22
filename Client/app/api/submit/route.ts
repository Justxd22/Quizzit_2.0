import { type NextRequest, NextResponse } from "next/server"
import type { QuizResult } from "@/lib/types"
import { jwtVerify } from "jose"
import { createClient } from "@/lib/supabase"

// Secret key for JWT verification
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET)

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("authToken")?.value
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    console.log('tokkkkkkky', token)
    // Verify token
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const { walletAddress, txHash, quizAttempts } = payload as {
      walletAddress: string
      txHash: string
      quizAttempts: number
    }

    // Initialize Supabase client
    const supabase = createClient()
    // Check if user exists
    const { data: user, error } = await supabase.from("users").select("*").eq("wallet_address", walletAddress).eq("tx_hash", txHash).single()
    let allowed = true

    if (error || !user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }
    // Check if maximum attempts reached
    if (user.quiz_attempts > 3) {
      return NextResponse.json({ message: "Maximum quiz attempts reached", max: true, attempts: 3 }, { status: 200 })
    }

    if (user.quiz_attempts == 3 && !user.allowed) {
      allowed = false
    }


    // Parse the request body
    const submission = await request.json()
    console.log(submission);

    // Extract answers and metadata from submission
    const { answers, metadata } = submission
    
    // Retrieve the questions with correct answers from the database
    const originalQuestions = user.quiz || []

    // Create a mapping of question content to correct answers
    // This allows us to match questions by their content rather than just ID
    const questionMap = new Map()
    originalQuestions.forEach(q => {
      // Use the question text as a unique identifier
      questionMap.set(q.id, {
        correct_answer: q.correct_answer,
      })
    })
    
    // Debug logging
    console.log("Original Questions:", originalQuestions.length)
    console.log("Answer Keys:", Object.keys(answers))
    
    // Calculate score and prepare results
    let score = 0
    const resultAnswers: Record<number, { answer: string; correct: boolean; correctAnswer: string }> = {}
    
    // Check each answer
    answers.forEach(({ id, answer }, index) => {
      const question = questionMap.get(id);
      const isCorrect = answer === question?.correct_answer;
    
      if (isCorrect) {
        score++;
      }
    
      resultAnswers[index] = {
        answer: answer,
        correct: isCorrect,
        correctAnswer: question?.correct_answer,
      };
    });
    

    // Return the results
    const result: QuizResult = {
      score,
      answers: resultAnswers,
      metadata,
    }

    // Save score
    const { err } = await supabase
      .from("users")
      .update({ best_score: score, allowed: allowed })
      .eq("wallet_address", walletAddress).eq("tx_hash", txHash)

    if (err) {
      console.error("Database error:", err)
      return NextResponse.json({ message: "Failed to update quiz attempts" }, { status: 500 })
    }

    return NextResponse.json({
      message: "Quiz attempt recorded",
      result
    })
  } catch (error) {
    console.error("Error processing submission:", error)
    return NextResponse.json({ error: "Failed to process submission" }, { status: 500 })
  }
}
