"use client"

import { useState, useEffect, useRef } from "react"
import { Clock } from "lucide-react"

interface TimerProps {
  duration: number // in seconds
  onExpire: () => void
  label?: string // Optional label to display with the timer
}

export function Timer({ duration, onExpire, label }: TimerProps) {
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

  // Determine if we should show a warning (less than 1 minute)
  const isWarning = remainingSeconds <= 60

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-full bg-black/30 backdrop-blur-sm border ${
        isWarning ? "border-red-500/50" : "border-sky-500/50"
      } transition-colors duration-300`}
    >
      <Clock className={`h-4 w-4 ${isWarning ? "text-red-400" : "text-sky-400"}`} />
      {label && <span className={`${isWarning ? "text-red-400" : "text-sky-400"} text-xs`}>{label}:</span>}
      <span className={`${isWarning ? "text-red-400 font-bold" : "text-sky-400"} tabular-nums`}>{formattedTime}</span>
    </div>
  )
}
