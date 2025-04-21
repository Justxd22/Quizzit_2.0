import { NextResponse, NextRequest } from "next/server"
import type { QuizQuestion } from "@/lib/types"
import { jwtVerify } from "jose"
import { createClient } from "@/lib/supabase"
import { createJwtToken } from "@/lib/utils"

// Define the backend API URL
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'


// Secret key for JWT verification
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET)

// Function to fetch quiz data directly from Supabase
async function fetchQuizData(quizId: string, supabase: any) {
  try {
    console.log(`Fetching quiz data for ID: ${quizId}`)
    
    // Get the quiz directly from Supabase using the pattern from the frontend
    const { data: existingQuiz, error } = await supabase
      .from("quiz")
      .select("*")
      .eq("tx_hash", quizId)
      .maybeSingle() // Use maybeSingle instead of single to avoid errors when no rows are found
    
    if (error) {
      console.error('Error fetching quiz from Supabase:', error)
      throw new Error(`Failed to fetch quiz data: ${error.message}`)
    }
    
    if (!existingQuiz) {
      console.error('No quiz found with ID:', quizId)
      throw new Error('Quiz not found')
    }
    
    // Parse the quiz content from the JSON string
    const quizContent = JSON.parse(existingQuiz.quiz)
    return quizContent.questions || []
  } catch (error) {
    console.error('Error fetching quiz data:', error)
    throw error
  }
}

// Utility function to shuffle an array
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export async function GET(request: NextRequest) {
  const timePerQuestion = 60 // 60 seconds per question
  let totalTime = 600 // default 10 minutes

  try {
    const token = request.cookies.get("authToken")?.value
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }


    // Verify token
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const { walletAddress, txHash, quizAttempts } = payload as {
      walletAddress: string
      txHash: string
      quizAttempts: number
    }

    if (quizAttempts >= 3) {
      return NextResponse.json({ message: "Maximum quiz attempts reached" }, { status: 403 })
    }

    // Initialize Supabase client
    const supabase = createClient()

    // Check if user exists
    const { data: user, error } = await supabase.from("users").select("*").eq("wallet_address", walletAddress).eq("tx_hash", txHash).single()
    if (error || !user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    // Check if maximum attempts reached
    if (user.quiz_attempts >= 3) {
      return NextResponse.json({ message: "Maximum quiz attempts reached", allowed: false, attempts: 3 }, { status: 200 })
    }

    // Increment quiz attempts
    const { error: updateError } = await supabase
      .from("users")
      .update({ quiz_attempts: quizAttempts + 1 })
      .eq("wallet_address", walletAddress)

    if (updateError) {
      console.error("Database error:", updateError)
      return NextResponse.json({ message: "Failed to update quiz attempts" }, { status: 500 })
    }

    // Create new token with updated attempts
    const newToken = await createJwtToken(walletAddress, txHash, quizAttempts + 1)
    
    try {
      // Fetch quiz data directly from Supabase using txHash as quiz_id
      const quizData = await fetchQuizData(txHash, supabase)
      
      if (!quizData || quizData.length === 0) {
        return NextResponse.json({ message: "No quiz questions found" }, { status: 404 })
      }
      
      // Format questions to match frontend expected format
      const formattedQuestions = quizData.map((q: any, index: number) => ({
        id: index + 1,
        question: q.question,
        options: shuffleArray(q.options),
        correctAnswer: q.correct_answer
      }))
      
      // Calculate total time based on number of questions
      totalTime = formattedQuestions.length * timePerQuestion
      
      return NextResponse.json({
        totalTime,
        questions: formattedQuestions,
        token: newToken,
        attempts: quizAttempts + 1,
        allowed: true
      })
    } catch (error) {
      console.error("Error fetching quiz data:", error)
      return NextResponse.json({ message: "Failed to fetch quiz data" }, { status: 500 })
    }
  } catch (error) {
    console.error("Error fetching questions:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }

}
