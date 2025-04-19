"use client"

import { motion } from "framer-motion"

interface ProgressBarProps {
  progress: number
  questionTimeProgress?: number
}

export function ProgressBar({ progress, questionTimeProgress }: ProgressBarProps) {
  return (
    <div className="w-full space-y-3">
      {/* Time progress indicator for current question */}
      {questionTimeProgress !== undefined && (
        <div className="relative h-2 w-full bg-black/30 backdrop-blur-sm rounded-full overflow-hidden border border-sky-500/20">
          <motion.div
            className="absolute top-0 left-0 h-full bg-yellow-400/70"
            style={{ width: `${questionTimeProgress}%` }}
            initial={{ width: 0 }}
            animate={{ width: `${questionTimeProgress}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-full mt-3 text-xs text-yellow-300">
            Time for question
          </div>
        </div>
      )}

      {/* Main progress bar */}
      <div className="relative h-3 w-full bg-black/30 backdrop-blur-sm rounded-full overflow-hidden border border-sky-500/30">
        <motion.div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-sky-600 to-sky-400"
          style={{ width: `${progress}%` }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  )
}
