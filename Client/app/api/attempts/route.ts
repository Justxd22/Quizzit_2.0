import { type NextRequest, NextResponse } from "next/server"
import { jwtVerify, SignJWT } from "jose"
import { createClient } from "@/lib/supabase"
import { createJwtToken } from "@/lib/utils"

// Secret key for JWT verification
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-at-least-32-characters-long")

// Maximum number of quiz attempts allowed
const MAX_QUIZ_ATTEMPTS = 3

export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Extract token
    const token = authHeader.split(" ")[1]

    // Verify token
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const { walletAddress, txHash, quizAttempts } = payload as {
        walletAddress: string
        txHash: string
        quizAttempts: number
    }

    // Check if maximum attempts reached
    if (quizAttempts >= MAX_QUIZ_ATTEMPTS) {
      return NextResponse.json({ message: "Maximum quiz attempts reached" }, { status: 403 })
    }

    // Initialize Supabase client
    const supabase = createClient()

    // Increment quiz attempts
    const { error } = await supabase
      .from("users")
      .update({ quiz_attempts: quizAttempts + 1 })
      .eq("wallet_address", walletAddress)

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ message: "Failed to update quiz attempts" }, { status: 500 })
    }

    // Create new token with updated attempts
    const newToken = await createJwtToken(walletAddress, txHash, quizAttempts + 1)

    return NextResponse.json({
      message: "Quiz attempt recorded",
      token: newToken,
      attempts: quizAttempts + 1,
      remainingAttempts: MAX_QUIZ_ATTEMPTS - (quizAttempts + 1),
    })
  } catch (error) {
    console.error("Quiz attempt error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

