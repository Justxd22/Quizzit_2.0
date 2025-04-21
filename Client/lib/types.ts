export interface QuizQuestion {
  id?: number
  question: string
  options: string[]
  correct_answer?: string
  correctAnswer?: string
}

export interface QuizResult {
  score: number
  answers: Record<
    number,
    {
      answer: string
      correct: boolean
      correctAnswer: string
    }
  >
  metadata?: {
    tabSwitches: number
    timeExpired: boolean
    elapsedTime?: number
  }
}
