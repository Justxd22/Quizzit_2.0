"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AnimatedBackground } from "@/components/ui/animated-background"
import type { QuizQuestion, QuizResult } from "@/lib/types"
import { CheckCircle, XCircle } from "lucide-react"

export default function ResultsPage() {
  const router = useRouter()
  const [results, setResults] = useState<QuizResult | null>(null)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadResults = async () => {
      try {
        // Get submission from session storage
        // const submissionData = sessionStorage.getItem("quizSubmission")
        // const submission = JSON.parse(submissionData)
        const questionsData = sessionStorage.getItem("quizQuestions")
        const questions = JSON.parse(questionsData)
        const resD = sessionStorage.getItem("quizResult")
        const res = JSON.parse(resD)

        setResults(res)
        setQuestions(questions)
        if (!resD|| !questionsData) {
          router.push("/quiz")
          return
        }
        setLoading(false)

      } catch (error) {
        console.error("Failed to load results:", error)
        setLoading(false)
      }
    }

    loadResults()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <AnimatedBackground />
        <div className="absolute inset-0 bg-black/50" /> {/* Dim overlay */}
        <div className="relative z-10 text-sky-400 text-xl">Calculating your results...</div>
      </div>
    )
  }

  if (!results) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <AnimatedBackground />
        <div className="absolute inset-0 bg-black/50" /> {/* Dim overlay */}
        <div className="relative z-10 text-red-400 text-xl">Error loading results</div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <AnimatedBackground />
      <div className="absolute inset-0 bg-black/50" /> {/* Dim overlay */}
      <div className="container mx-auto py-8 px-4 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Card className="backdrop-blur-md bg-black/30 border border-sky-500/50 shadow-lg shadow-sky-500/20 text-white mb-6">
            <CardHeader>
              <CardTitle className="text-2xl text-center text-sky-400">Quiz Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center mb-6">
                <motion.div
                  className="text-6xl font-bold mb-2"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  <span className="text-sky-400">{results.result.score}</span>
                  <span className="text-sky-200">/{questions.length}</span>
                </motion.div>
                <p className="text-lg text-sky-300">
                  {results.result.score === questions.length
                    ? "Perfect score! Excellent work!"
                    : results.result.score >= questions.length * 0.7
                      ? "Great job! Well done!"
                      : results.result.score >= questions.length * 0.5
                        ? "Good effort! Keep practicing!"
                        : "Keep studying and try again!"}
                </p>

                {results.result.metadata?.tabSwitches > 0 && (
                  <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-500/30 rounded-lg text-yellow-200 text-sm">
                    Note: Tab switching was detected {results.result.metadata.tabSwitches} times during your quiz.
                  </div>
                )}

                {results.result.metadata?.timeExpired && (
                  <div className="mt-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-red-200 text-sm">
                    Note: You ran out of time before completing the quiz.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-sky-400 mb-4">Question Review</h2>

          {questions.map((question, index) => {
            const userAnswer = results.result.answers[index]
            const isCorrect = userAnswer?.correct

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card
                  className={`backdrop-blur-md bg-black/30 border ${
                    isCorrect ? "border-green-500/50" : "border-red-500/50"
                  } shadow-lg text-white`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {isCorrect ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-medium mb-2">
                          {index + 1}. {question.question}
                        </h3>

                        <div className="space-y-2 mt-3">
                          <div className="text-sm">
                            <span className="text-sky-300">Your answer: </span>
                            <span className={isCorrect ? "text-green-400" : "text-red-400"}>
                              {userAnswer?.answer || "Not answered"}
                            </span>
                          </div>

                          {!isCorrect && (
                            <div className="text-sm">
                              <span className="text-sky-300">Correct answer: </span>
                              <span className="text-green-400">
                                {userAnswer?.correctAnswer || question.correctAnswer}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>

        <div className="flex justify-center mt-8">
          <Button
            onClick={() => router.push("/")}
            className="bg-gradient-to-r from-sky-500 to-sky-400 hover:from-sky-400 hover:to-sky-300 text-white"
          >
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  )
}
