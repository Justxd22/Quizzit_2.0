"use client"

import { useState, useEffect, useRef } from "react"
import { Clock } from "lucide-react"

interface TimerProps {
  duration: number // in seconds
  onExpire: () => void
  label?: string // Optional label to display with the timer
}

export function Timer({ duration, onExpire, label = "Time Remaining" }: TimerProps) {
  // Use a ref to track if the timer has been initialized
  const initialized = useRef(false)
  // Use a ref to store the remaining time to prevent resets
  const remainingTimeRef = useRef(duration)
  // State for UI updates
  const [remainingSeconds, setRemainingSeconds] = useState(duration)

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true
      remainingTimeRef.current = duration
      setRemainingSeconds(duration)
    }

    const timerInterval = setInterval(() => {
      remainingTimeRef.current -= 1
      setRemainingSeconds(remainingTimeRef.current)

      if (remainingTimeRef.current <= 0) {
        clearInterval(timerInterval)
        onExpire()
      }
    }, 1000)

    return () => clearInterval(timerInterval)
  }, [duration, onExpire])

  // Format the time as MM:SS
  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60
  const formattedTime = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`

  const isWarning = remainingSeconds <= 60

  // Fraction of time remaining, used to deplete the ring and tint the clock.
  const fraction = duration > 0 ? Math.max(0, Math.min(1, remainingSeconds / duration)) : 0

  // Gradually shift the clock color from sky-blue (full time) to red (no time).
  // Hue 200 ≈ sky blue, hue 0 = red.
  const hue = fraction * 200
  const clockColor = `hsl(${hue}, 85%, 60%)`

  // Ring geometry (full circle around the clock icon)
  const ringRadius = 18
  const ringCircumference = 2 * Math.PI * ringRadius
  const ringOffset = ringCircumference * (1 - fraction)

  return (
    <div
      className={`relative inline-flex items-center gap-4 rounded-2xl bg-slate-950/70 backdrop-blur-md pl-4 pr-6 py-3 border ${
        isWarning ? "border-red-500/30" : "border-sky-500/20"
      } shadow-lg shadow-sky-500/10`}
    >
      {/* Clock icon with depleting ring around it */}
      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" width="44" height="44" viewBox="0 0 44 44" aria-hidden>
          {/* Track */}
          <circle cx="22" cy="22" r={ringRadius} fill="none" stroke="#1e293b" strokeWidth="3" />
          {/* Remaining time */}
          <circle
            cx="22"
            cy="22"
            r={ringRadius}
            fill="none"
            stroke={clockColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={ringCircumference}
            strokeDashoffset={ringOffset}
            style={{
              transition: "stroke-dashoffset 1s linear, stroke 1s linear",
              filter: `drop-shadow(0 0 4px ${clockColor})`,
            }}
          />
        </svg>
        <Clock className="h-5 w-5" style={{ color: clockColor, transition: "color 1s linear" }} />
      </div>

      {/* Label + digits */}
      <div className="flex flex-col leading-none">
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
          {label}
        </span>
        <span
          className="mt-1 text-3xl font-bold tabular-nums"
          style={{ color: clockColor, transition: "color 1s linear" }}
        >
          {formattedTime}
        </span>
      </div>
    </div>
  )
}
