"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { AnimatedBackground } from "@/components/ui/animated-background"
import { ProgressBar } from "@/components/ui/progress-bar"
import { Timer } from "@/components/ui/timer"
import { AnimatedBorder } from "@/components/ui/animated-border"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, AlertTriangle } from "lucide-react"
import type { QuizQuestion } from "@/lib/types"
import { cn } from "@/lib/utils"

export default function QuizPage() {
  const router = useRouter()
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tabSwitches, setTabSwitches] = useState(0)
  const [timeExpired, setTimeExpired] = useState(false)
  const [questionStartTime, setQuestionStartTime] = useState(Date.now())
  const [questionElapsedTime, setQuestionElapsedTime] = useState(0)
  const [totalTime, setTotalTime] = useState<number>(0)
  const [timePerQuestion, setTimePerQuestion] = useState<number>(0)

  // Check authentication and record attempt on initial load
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await fetch("/api/questions")

        if (!response.ok) {
          throw new Error("Failed to fetch questions")
        }

        const data = await response.json()

        if (!data.allowed) {
          router.push('/attempts-exceeded')
        }
        if (data.allowed) {

          document.cookie = `authToken=${data.token}; path=/; max-age=${1 * 24 * 60 * 60}; SameSite=Strict`;

          setQuestions(data.questions)
          const numberOfQuestions = data.questions.length
          const totalTimeFromAPI = data.totalTime || 10 * 60 // fallback

          setTotalTime(totalTimeFromAPI)
          setTimePerQuestion(totalTimeFromAPI / numberOfQuestions)
          setLoading(false)

          // Initialize the question start time when questions are loaded
          setQuestionStartTime(Date.now())
        }
      } catch (error) {
        console.error("Failed to load questions:", error)
        setError("Failed to load questions. Please try again.")
        setLoading(false)
      }

    }
    fetchQuestions()
  }, [])

  // Track time for current question - using setInterval for consistent updates
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now()
      const elapsed = Math.floor((now - questionStartTime) / 1000)
      setQuestionElapsedTime(elapsed)
    }, 500) // Update twice per second for smoother progress

    return () => clearInterval(timer)
  }, [questionStartTime])

  // Reset question timer when moving to a new question
  useEffect(() => {
    setQuestionStartTime(Date.now())
    setQuestionElapsedTime(0)
  }, [currentQuestionIndex])

  // Anti-cheat: Track tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitches((prev) => prev + 1)
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    // Anti-cheat: Disable right-click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      return false
    }

    document.addEventListener("contextmenu", handleContextMenu)

    // Anti-cheat: Disable copy/paste
    const handleCopyPaste = (e: ClipboardEvent) => {
      e.preventDefault()
      return false
    }

    document.addEventListener("copy", handleCopyPaste)
    document.addEventListener("paste", handleCopyPaste)
    document.addEventListener("cut", handleCopyPaste)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      document.removeEventListener("contextmenu", handleContextMenu)
      document.removeEventListener("copy", handleCopyPaste)
      document.removeEventListener("paste", handleCopyPaste)
      document.removeEventListener("cut", handleCopyPaste)
    }
  }, [])

  // Submit quiz
  const submitQuiz = useCallback(async () => {
    try {
      // Process answers to handle time expired markers
      const processedAnswers = Object.entries(answers).reduce((acc, [questionIndex, answer]) => {
        // If the answer is the time expired marker, set it to an empty string to be counted as wrong
        acc[questionIndex] = answer === "__TIME_EXPIRED__" ? "" : answer;
        return acc;
      }, {} as Record<string, string>);

      // Prepare questions with consistent correctAnswer field for scoring
      const preparedQuestions = questions.map(q => ({
        ...q,
        // Ensure correctAnswer is set, prioritizing correctAnswer if it exists, otherwise use correct_answer
        correctAnswer: q.correctAnswer || q.correct_answer
      }));

      // Create submission data with answers and anti-cheat info
      const submission = {
        answers: processedAnswers,
        metadata: {
          tabSwitches,
          timeExpired,
        },
        questions: preparedQuestions, // Include questions with normalized correctAnswer field for scoring
      }

      // Submit to API
      const response = await fetch("/api/submit", {
        method: "POST",
        body: JSON.stringify(submission),
      })

      if (!response.ok) {
        throw new Error("Failed to submit quiz")
      }

      const result = await response.json()

      // Store result in session storage for results page
      sessionStorage.setItem("quizResult", JSON.stringify(result))
      sessionStorage.setItem("quizSubmission", JSON.stringify(submission))
      sessionStorage.setItem("quizQuestions", JSON.stringify(questions))
      // Navigate to results page
      router.push("/quiz/results")
    } catch (error) {
      console.error("Failed to submit quiz:", error)
      setError("Failed to submit quiz. Please try again.")
    }
  }, [answers, questions, tabSwitches, timeExpired, router])

  // Handle quiz timer expiration
  const handleQuizTimeExpired = useCallback(() => {
    setTimeExpired(true)
    // Submit whatever answers were completed when time expired
    submitQuiz()
  }, [submitQuiz])

  // Handle answer selection
  const handleAnswerSelect = (answer: string) => {
    setAnswers({
      ...answers,
      [currentQuestionIndex]: answer,
    })
  }

  // Handle clicking on the entire answer option
  const handleOptionClick = (option: string) => {
    handleAnswerSelect(option)
  }

  // Navigate to next question
  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  // Navigate to previous question
  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  // Manual quiz submission
  const handleSubmitQuiz = () => {
    submitQuiz()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <AnimatedBackground />
        <div className="absolute inset-0 bg-black/50" /> {/* Dim overlay */}
        <div className="relative z-10 text-sky-400 text-xl flex items-center">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading quiz questions...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <AnimatedBackground />
        <div className="absolute inset-0 bg-black/50" /> {/* Dim overlay */}
        <div className="relative z-10 w-full max-w-md">
          <Alert variant="destructive" className="bg-red-900/20 border-red-500/50 text-white">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <AnimatedBackground />
        <div className="absolute inset-0 bg-black/50" /> {/* Dim overlay */}
        <div className="relative z-10 text-red-400 text-xl">Failed to load questions. Please try again.</div>
      </div>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100

  // Calculate the time progress for the current question (as a percentage of timePerQuestion)
  const questionTimeProgress = timePerQuestion > 0 ? (questionElapsedTime / timePerQuestion) * 100 : 0

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col">
      <AnimatedBackground />
      <div className="absolute inset-0 bg-black/50" /> {/* Dim overlay */}
      <div className="fixed top-4 right-4 z-10">
        {totalTime > 0 && <Timer duration={totalTime} onExpire={handleQuizTimeExpired} label="Quiz Time" />}
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-2xl mb-4">
          <ProgressBar progress={progress} questionTimeProgress={questionTimeProgress} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-2xl"
          >
            <div className="relative">
              <AnimatedBorder />
              <Card className="backdrop-blur-md bg-black/30 border border-sky-500/50 shadow-lg shadow-sky-500/20 text-white overflow-hidden">
                <div className="p-6">
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-sky-400 mb-2">
                      Question {currentQuestionIndex + 1} of {questions.length}
                    </h2>
                    <p className="text-lg text-white">{currentQuestion.question}</p>
                  </div>

                  <RadioGroup
                    value={answers[currentQuestionIndex] || ""}
                    onValueChange={handleAnswerSelect}
                    className="space-y-3"
                  >
                    {currentQuestion.options.map((option, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.1 }}
                        className={cn(
                          "flex items-center space-x-2 rounded-lg p-4 transition-colors cursor-pointer",
                          "border border-sky-500/30 bg-black/20 backdrop-blur-sm",
                          answers[currentQuestionIndex] === option
                            ? "bg-sky-900/40 border-sky-400/70"
                            : answers[currentQuestionIndex] === "__TIME_EXPIRED__"
                            ? "opacity-50 hover:bg-sky-900/20"
                            : "hover:bg-sky-900/20",
                        )}
                        onClick={() => handleOptionClick(option)}
                      >
                        <RadioGroupItem value={option} id={`option-${index}`} className="text-sky-400" />
                        <Label
                          htmlFor={`option-${index}`}
                          className="flex-1 cursor-pointer py-1 text-white"
                          onClick={(e) => e.preventDefault()} // Prevent label click from interfering with div click
                        >
                          {option}
                        </Label>
                      </motion.div>
                    ))}
                  </RadioGroup>

                  <div className="flex justify-between mt-6">
                    <Button
                      variant="outline"
                      onClick={handlePrevQuestion}
                      disabled={currentQuestionIndex === 0}
                      className="border-sky-500/50 text-sky-300 hover:bg-sky-900/30"
                    >
                      Previous
                    </Button>

                    {currentQuestionIndex < questions.length - 1 ? (
                      <Button
                        onClick={handleNextQuestion}
                        disabled={!answers[currentQuestionIndex] && answers[currentQuestionIndex] !== "__TIME_EXPIRED__"}
                        className="bg-gradient-to-r from-sky-500 to-sky-400 hover:from-sky-400 hover:to-sky-300 text-white"
                      >
                        Next
                      </Button>
                    ) : (
                      <Button
                        onClick={handleSubmitQuiz}
                        disabled={!answers[currentQuestionIndex] && answers[currentQuestionIndex] !== "__TIME_EXPIRED__"}
                        className="bg-gradient-to-r from-sky-500 to-sky-400 hover:from-sky-400 hover:to-sky-300 text-white"
                      >
                        Submit Quiz
                      </Button>
                    )}
                  </div>

                  {tabSwitches > 0 && (
                    <div className="mt-4 text-yellow-300 text-sm">
                      Warning: Tab switching detected ({tabSwitches} times)
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
