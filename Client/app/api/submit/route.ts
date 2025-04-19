import { type NextRequest, NextResponse } from "next/server"
import type { QuizResult } from "@/lib/types"

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const submission = await request.json()
    console.log(submission);

    // Extract answers and metadata from submission
    const { answers, metadata, questions } = submission

    // Calculate score and prepare results
    let score = 0
    const resultAnswers: Record<number, { answer: string; correct: boolean; correctAnswer: string }> = {}

    // Check each answer
    Object.entries(answers).forEach(([index, answer]) => {
      const questionIndex = Number.parseInt(index)
      const question = questions[questionIndex]
      const isCorrect = answer === question.correctAnswer

      if (isCorrect) {
        score++
      }

      resultAnswers[questionIndex] = {
        answer: answer as string,
        correct: isCorrect,
        correctAnswer: question.correctAnswer,
      }
    })

    // Return the results
    const result: QuizResult = {
      score,
      answers: resultAnswers,
      metadata,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error processing submission:", error)
    return NextResponse.json({ error: "Failed to process submission" }, { status: 500 })
  }
}
