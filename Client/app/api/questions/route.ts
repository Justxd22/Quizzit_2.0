import { NextResponse, NextRequest } from "next/server"
import type { QuizQuestion } from "@/lib/types"
import { jwtVerify } from "jose"
import { createClient } from "@/lib/supabase"
import { createJwtToken } from "@/lib/utils"


// Secret key for JWT verification
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET)

// Mock database of questions
const quizQuestions: QuizQuestion[] = [
  {
    id: 1,
    question: "What is the capital of France?",
    options: ["London", "Berlin", "Paris", "Madrid"],
    correctAnswer: "Paris",
  },
  {
    id: 2,
    question: "Which planet is known as the Red Planet?",
    options: ["Venus", "Mars", "Jupiter", "Saturn"],
    correctAnswer: "Mars",
  },
  {
    id: 3,
    question: "What is the largest ocean on Earth?",
    options: ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean", "Pacific Ocean"],
    correctAnswer: "Pacific Ocean",
  },
  {
    id: 4,
    question: "Who painted the Mona Lisa?",
    options: ["Vincent van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Michelangelo"],
    correctAnswer: "Leonardo da Vinci",
  },
  {
    id: 5,
    question: "What is the chemical symbol for gold?",
    options: ["Go", "Gd", "Au", "Ag"],
    correctAnswer: "Au",
  },
  {
    id: 6,
    question: "Which country is home to the kangaroo?",
    options: ["New Zealand", "South Africa", "Australia", "Brazil"],
    correctAnswer: "Australia",
  },
  {
    id: 7,
    question: "What is the tallest mountain in the world?",
    options: ["K2", "Mount Everest", "Kangchenjunga", "Makalu"],
    correctAnswer: "Mount Everest",
  },
  {
    id: 8,
    question: "Which element has the chemical symbol 'O'?",
    options: ["Osmium", "Oxygen", "Oganesson", "Olivine"],
    correctAnswer: "Oxygen",
  },
  {
    id: 9,
    question: "Who wrote 'Romeo and Juliet'?",
    options: ["Charles Dickens", "Jane Austen", "William Shakespeare", "Mark Twain"],
    correctAnswer: "William Shakespeare",
  },
  {
    id: 10,
    question: "What is the largest organ in the human body?",
    options: ["Heart", "Liver", "Brain", "Skin"],
    correctAnswer: "Skin",
  },
]

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
  const totalTime = 1 * timePerQuestion // total in seconds
  const shuffledQuestions = shuffleArray(quizQuestions).slice(0, limit).map((q) => ({
    ...q,
    options: shuffleArray(q.options),
  }))

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


    return NextResponse.json({
      totalTime,
      questions: shuffledQuestions,
      token: newToken,
      attempts: quizAttempts + 1,
      allowed: true
    })
  } catch (error) {
    console.error("Error fetching questions:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }

}
