"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"

interface ProgressBarProps {
  progress: number
  current?: number
  total?: number
  questionTimeProgress?: number
}

// Pick a segment count that keeps each dash from getting too cramped.
// Roughly one segment per ~22px of viewport width, clamped to a sane range.
function getSegmentCount(width: number) {
  return Math.max(8, Math.min(28, Math.floor(width / 22)))
}

export function ProgressBar({ progress, current, total, questionTimeProgress }: ProgressBarProps) {
  const [segments, setSegments] = useState(20)

  useEffect(() => {
    const update = () => setSegments(getSegmentCount(window.innerWidth))
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])
  // Determine color for the question time progress bar
  const getTimeProgressColor = () => {
    if (questionTimeProgress && questionTimeProgress >= 90) {
      return "bg-red-500/80" // Red when >= 90%
    } else if (questionTimeProgress && questionTimeProgress >= 70) {
      return "bg-orange-400/80" // Orange when >= 70%
    } else {
      return "bg-yellow-400/70" // Default yellow
    }
  }

  // Number of fully/partially lit segments based on overall progress
  const filledCount = Math.round((progress / 100) * segments)

  return (
    <div className="w-full space-y-3">
      {/* Header: PROGRESS label + count */}
      <div className="flex items-end justify-between px-0.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
          Progress
        </span>
        {current !== undefined && total !== undefined && (
          <span className="text-sm font-medium tracking-wide text-slate-400">
            {current} <span className="text-slate-500">OF</span>{" "}
            <span className="font-bold text-sky-300">{total}</span>
          </span>
        )}
      </div>

      {/* Segmented progress bar */}
      <div className="flex w-full items-center gap-1 sm:gap-1.5">
        {Array.from({ length: segments }).map((_, i) => {
          const isFilled = i < filledCount
          const isLeading = i === filledCount - 1
          // Interpolate hue across the filled segments: amber (45) -> sky blue (200)
          const t = filledCount > 1 ? i / (filledCount - 1) : 1
          const hue = 45 + t * (200 - 45)
          const color = `hsl(${hue}, 90%, 58%)`

          return (
            <motion.div
              key={i}
              className="h-1.5 flex-1 rounded-full"
              initial={false}
              animate={{
                backgroundColor: isFilled ? color : "rgba(100, 116, 139, 0.25)",
              }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              style={
                isFilled
                  ? {
                      boxShadow: isLeading
                        ? `0 0 8px ${color}, 0 0 14px ${color}`
                        : `0 0 4px ${color}`,
                    }
                  : undefined
              }
            />
          )
        })}
      </div>

      {/* Time progress indicator for current question */}
      {questionTimeProgress !== undefined && (
        <div className="relative h-2 w-full bg-black/30 backdrop-blur-sm rounded-full overflow-hidden border border-sky-500/20">
          <motion.div
            className={`absolute top-0 left-0 h-full ${getTimeProgressColor()}`}
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
    </div>
  )
}
