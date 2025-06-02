"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AnimatedBackground } from "@/components/ui/animated-background"
import { Loader2, BookOpen, BarChart3, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface Quiz {
    id: string
    name: string
    description: string
    difficulty: string
    category: string
    len: number
}

export default function SelectQuiz() {
    const [quizzes, setQuizzes] = useState<Quiz[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null)
    const [startingQuiz, setStartingQuiz] = useState(false)
    const [showNameModal, setShowNameModal] = useState(false)
    const [userName, setUserName] = useState("nill0")

    const router = useRouter()

    useEffect(() => {
        async function fetchQuizzes() {
            try {
                setLoading(true)
                const response = await fetch("/api/ava")

                if (!response.ok) {
                    throw new Error("Failed to fetch available quizzes")
                }

                const data = await response.json()
                setQuizzes(data.quizzes || [])
            } catch (error) {
                console.error("Error fetching quizzes:", error)
                setError("Failed to load available quizzes. Please try again.")
            } finally {
                setLoading(false)
            }
        }

        fetchQuizzes()
    }, [])

    const handleStartQuiz = async () => {
        if (!selectedQuizId) return
        const n = sessionStorage.getItem("name");
        if (n) setUserName(n)
        setShowNameModal(true);
    }

    const confirmStart = async () => {
        try {
            setStartingQuiz(true)

            // You can optionally send `userName` to session/localStorage or backend here.

            const response = await fetch(`/api/questions?id=${selectedQuizId}&name=${userName}`)
            if (!response.ok) throw new Error("Failed to fetch quiz questions")
            const data = await response.json()

            document.cookie = `authToken=${data.token}; path=/; max-age=${1 * 24 * 60 * 60}; SameSite=Strict`;
            sessionStorage.setItem("quizQuestions", JSON.stringify(data.questions));
            sessionStorage.setItem("name", data.name);
            sessionStorage.setItem("totalTime", data.totalTime);
            sessionStorage.setItem("guest", "allowed");
            router.push("/quiz/run")
        } catch (error) {
            console.error("Error starting quiz:", error)
            setError("Failed to start quiz. Please try again.")
            setStartingQuiz(false)
        }
    }

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty.toLowerCase()) {
            case "easy":
                return "bg-green-500 hover:bg-green-400"
            case "medium":
                return "bg-yellow-500 hover:bg-yellow-400"
            case "hard":
                return "bg-red-500 hover:bg-red-400"
            default:
                return "bg-blue-500 hover:bg-blue-400"
        }
    }

    return (
        <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center">
            <AnimatedBackground />
            <div className="absolute inset-0 bg-black/50" />
            <Card className="w-full max-w-2xl backdrop-blur-md bg-black/30 border border-sky-500/50 shadow-lg shadow-sky-500/20 text-white relative z-10">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center text-sky-400">Select a Quiz</CardTitle>
                    <CardDescription className="text-sky-300/80 text-center">
                        Choose from our available quizzes to test your knowledge
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {loading ? (
                        <div className="flex justify-center items-center py-12">
                            <Loader2 className="h-8 w-8 text-sky-400 animate-spin" />
                        </div>
                    ) : error ? (
                        <div className="p-4 bg-black/40 rounded-lg border border-red-500/50 flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-red-200">{error}</p>
                        </div>
                    ) : quizzes.length === 0 ? (
                        <div className="p-4 bg-black/40 rounded-lg border border-yellow-500/50 flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-yellow-200">No quizzes are currently available. Please check back later.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {quizzes.map((quiz) => (
                                <div
                                    key={quiz.id}
                                    className={`p-4 rounded-lg border transition-all cursor-pointer ${selectedQuizId === quiz.id
                                        ? "bg-sky-900/50 border-sky-400"
                                        : "bg-black/40 border-sky-500/20 hover:border-sky-500/50"
                                        }`}
                                    onClick={() => setSelectedQuizId(quiz.id)}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-semibold text-lg text-sky-300">{quiz.name}</h3>
                                        <Badge className={`${getDifficultyColor(quiz.difficulty)} text-white`}>{quiz.difficulty}</Badge>
                                    </div>
                                    <p className="text-sm text-gray-300 mb-3">{quiz.description}</p>
                                    <div className="flex items-center gap-4 text-xs text-gray-400">
                                        <div className="flex items-center gap-1">
                                            <BookOpen className="h-3.5 w-3.5" />
                                            <span>{quiz.category}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <BarChart3 className="h-3.5 w-3.5" />
                                            <span>{quiz.len} questions</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    <Button
                        className="w-full bg-gradient-to-r from-sky-500 to-sky-400 hover:from-sky-400 hover:to-sky-300 text-white border border-sky-400/50"
                        disabled={!selectedQuizId || startingQuiz || loading}
                        onClick={handleStartQuiz}
                    >
                        {startingQuiz ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading Quiz...
                            </>
                        ) : (
                            "Start Selected Quiz"
                        )}
                    </Button>
                </CardFooter>
            </Card>

            {showNameModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center">
                    <div className="bg-black/90 border border-sky-500/30 rounded-xl p-6 w-full max-w-md shadow-lg text-white">
                        <h2 className="text-lg font-bold mb-2 text-sky-300">Enter Your Name (Optional)</h2>
                        <p className="text-sm text-gray-300 mb-4">
                            This is optional and only used for the leaderboard on this page.
                        </p>
                        <input
                            type="text"
                            className="w-full p-2 mb-4 bg-black/30 border border-sky-500/30 rounded text-white placeholder:text-gray-400"
                            placeholder="Your name (optional)"
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => setShowNameModal(false)}>
                                Cancel
                            </Button>
                            <Button
                                className="bg-sky-500 hover:bg-sky-400 text-white"
                                onClick={confirmStart}
                                disabled={startingQuiz}
                            >
                                {startingQuiz ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Starting...
                                    </>
                                ) : (
                                    "Start Quiz"
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}
