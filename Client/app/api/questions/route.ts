// /api/questions
import { NextResponse, NextRequest } from "next/server"
import type { QuizQuestion } from "@/lib/types"
import { jwtVerify } from "jose"
import { createClient } from "@/lib/supabase"
import { createJwtToken } from "@/lib/utils"



// Secret key for JWT verification
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET)

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
  const limit = 60
  const timePerQuestion = 600 
  let totalTime = 1 * timePerQuestion // total in seconds

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
    // Strip the correct answers from questions sent to frontend
    const shuffledQuestions = shuffleArray(user.quiz).slice(0, limit).map((q) => ({
      id: q.id,
      question: q.question,
      options: shuffleArray(q.options),
    }))
  

    // Increment quiz attempts
    const { error: updateError } = await supabase
      .from("users")
      .update({ quiz_attempts: quizAttempts + 1 })
      .eq("wallet_address", walletAddress)
      .eq("tx_hash", txHash).single()

    if (updateError) {
      console.error("Database error:", updateError)
      return NextResponse.json({ message: "Failed to update quiz attempts" }, { status: 500 })
    }

    // Create new token with updated attempts
    const newToken = await createJwtToken(walletAddress, txHash, quizAttempts + 1)
    
    try {
      // Fetch quiz data directly from Supabase using txHash as quiz_id
      const quizData = shuffledQuestions
      
      if (!quizData || quizData.length === 0) {
        return NextResponse.json({ message: "No quiz questions found" }, { status: 404 })
      }
      
      // Calculate total time based on number of questions
      totalTime = quizData.length * timePerQuestion
      
      return NextResponse.json({
        totalTime,
        questions: quizData,
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
