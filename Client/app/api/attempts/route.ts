import { type NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"

// Secret key for JWT verification
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET)

// Maximum number of quiz attempts allowed
const MAX_QUIZ_ATTEMPTS = 3

export async function GET(request: NextRequest) {
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

    // Check if maximum attempts reached
    if (quizAttempts >= MAX_QUIZ_ATTEMPTS) {
      return NextResponse.json({ message: "Maximum quiz attempts reached", max: true, attempts: 3, walletAddress: walletAddress }, { status: 200 })
    }
    

    return NextResponse.json({
      message: `Quiz attempts: ${quizAttempts}`,
      attempts: quizAttempts,
      max: false,
      walletAddress: walletAddress
    })
  } catch (error) {
    console.error("Quiz attempt error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

