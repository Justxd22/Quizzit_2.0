// use for restore
import { type NextRequest, NextResponse } from "next/server"
import { SignJWT } from "jose"
import { createClient } from "@/lib/supabase"

// Secret key for JWT verification
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-at-least-32-characters-long")

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const { walletAddress } = await request.json()

    // Validate input
    if (!walletAddress) {
      return NextResponse.json({ message: "Wallet address is required" }, { status: 400 })
    }

    // Initialize Supabase client
    const supabase = createClient()

    // Check if wallet address exists
    const { data: user, error } = await supabase.from("users").select("*").eq("wallet_address", walletAddress).single()

    if (error || !user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    // Create a new JWT token
    const token = await createJwtToken(user.wallet_address, user.tx_hash, user.quiz_attempts)

    return NextResponse.json({
      message: "Session restored",
      token,
      attempts: user.quiz_attempts,
    })
  } catch (error) {
    console.error("Session restoration error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

/**
 * Create a JWT token for authentication
 */
async function createJwtToken(walletAddress: string, txHash: string, quizAttempts: number): Promise<string> {
  const token = await new SignJWT({
    walletAddress,
    txHash,
    quizAttempts,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d") // Token expires in 7 days
    .sign(JWT_SECRET)

  return token
}
