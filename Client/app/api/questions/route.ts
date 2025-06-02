import { NextResponse, type NextRequest } from "next/server"
import { jwtVerify, SignJWT } from "jose"
import { createClient } from "@/lib/supabase"
import { createJwtToken } from "@/lib/utils"
import { v4 as uuidv4 } from "uuid"
import { uniqueNamesGenerator, colors, animals, } from 'unique-names-generator';



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

// Create guest JWT token
async function createGuestJwtToken(guestId: string, quizId: string) {
  const token = await new SignJWT({
    guestId,
    quizId,
    type: "guest",
    createdAt: new Date().toISOString(),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("6h")
    .sign(JWT_SECRET)

  return token
}

export async function GET(request: NextRequest) {
  const timePerQuestion = 60
  let totalTime = 1 * timePerQuestion // total in seconds

  try {
    const token = request.cookies.get("authToken")?.value
    const quizId = request.nextUrl.searchParams.get("id")
    let name = request.nextUrl.searchParams.get("name")
    // Initialize Supabase client
    const supabase = createClient()

    if (quizId) {
      // GUEST MODE
      console.log("Guest mode activated for quiz:", quizId)

      if (name == 'nill0' || name == "") {
        name = uniqueNamesGenerator({
          dictionaries: [colors, animals],
          separator: '-',
          style: 'lowerCase',
        })
      }

      // Generate unique guest ID
      const guestId = uuidv4()

      // Fetch quiz questions from database
      const { data: quiz, error: quizError } = await supabase
        .from("quiz")
        .select("quiz")
        .eq("id", quizId)
        .single()

      if (quizError || !quiz) {
        return NextResponse.json({ message: "Quiz not found" }, { status: 404 })
      }

      if (!quiz.quiz || quiz.quiz.length === 0) {
        return NextResponse.json({ message: "No questions found for this quiz" }, { status: 404 })
      }

      // Randomize questions order for this guest
      const shuffledQuestions = shuffleArray(quiz.quiz)

      // Save guest session with randomized questions order in guest table
      const { error: guestError } = await supabase.from("guest").insert({
        name: name,
        guest_id: guestId,
        quiz_id: quizId,
        quiz: shuffledQuestions, // Save the full questions with answers for later verification
        created_at: new Date().toISOString(),
      })

      if (guestError) {
        console.error("Error saving guest session:", guestError)
        return NextResponse.json({ message: "Failed to create guest session" }, { status: 500 })
      }

      // Strip correct answers from questions sent to frontend
      const questionsForFrontend = shuffledQuestions.map((q) => ({
        id: q.id,
        question: q.question,
        options: shuffleArray(q.options), // Shuffle options too
      }))
  
      // Generate guest JWT token
      const guestToken = await createGuestJwtToken(guestId, quizId)

      // Calculate total time based on number of questions
      totalTime = questionsForFrontend.length * timePerQuestion

      const response = NextResponse.json({
        totalTime,
        questions: questionsForFrontend,
        token: guestToken,
        attempts: 1,
        allowed: true,
        mode: "guest",
        guestId,
        name,
      })
      return response;
    }
    else if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // AUTHENTICATED USER MODE
    console.log("Authenticated mode activated")

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
    const shuffledQuestions = shuffleArray(user.quiz).map((q) => ({
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
