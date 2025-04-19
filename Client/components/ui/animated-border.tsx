"use client"
import { useEffect, useState } from "react"

interface AnimatedBorderProps {
  className?: string
}

export function AnimatedBorder({ className = "" }: AnimatedBorderProps) {
  const [position, setPosition] = useState(0)
  
  useEffect(() => {
    const interval = setInterval(() => {
      setPosition((prev) => (prev + 0.2) % 100)
    }, 30)
    
    return () => clearInterval(interval)
  }, [])

  return (
    <div className={`absolute -inset-1 rounded-xl pointer-events-none ${className}`}>
      {/* Main border */}
      <svg width="100%" height="100%" className="absolute inset-0" preserveAspectRatio="none">
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="none"
          rx="16"
          ry="16"
          strokeWidth="2"
          stroke="url(#neon-gradient)"
          strokeDasharray="80 20" // 70% dash, 30% gap with normalized values
          strokeDashoffset={position}
          filter="drop-shadow(0 0 6px #00f7ff)"
          pathLength="100" // Normalize the path length
        />
        <defs>
          <linearGradient id="neon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f7ff" stopOpacity="1" />
            <stop offset="50%" stopColor="#38bdf8" stopOpacity="1" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="1" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Glow effect */}
      <svg width="100%" height="100%" className="absolute inset-0 opacity-50" preserveAspectRatio="none">
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="none"
          rx="16"
          ry="16"
          strokeWidth="4"
          stroke="url(#neon-gradient-glow)"
          strokeDasharray="80 20" // 70% dash, 30% gap with normalized values
          strokeDashoffset={position}
          filter="blur(8px)"
          pathLength="100" // Normalize the path length
        />
        <defs>
          <linearGradient id="neon-gradient-glow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f7ff" stopOpacity="1" />
            <stop offset="50%" stopColor="#38bdf8" stopOpacity="1" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="1" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}