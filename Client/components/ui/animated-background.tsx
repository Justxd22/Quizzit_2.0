"use client"

import { useEffect, useRef } from "react"

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Respect users who prefer reduced motion — render a static gradient only.
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    if (prefersReducedMotion) return

    // Detect low-end devices to scale the effect down.
    const cores = navigator.hardwareConcurrency ?? 4
    const deviceMemory = (navigator as any).deviceMemory ?? 4
    const isLowEnd = cores <= 4 || deviceMemory <= 4 || window.innerWidth < 768

    // Connecting lines are the expensive O(n^2) part — only draw them on
    // capable devices, and cap how far apart linked particles can be.
    const drawLines = !isLowEnd
    const maxDistance = 130
    const maxDistanceSq = maxDistance * maxDistance

    // Set canvas dimensions
    const setCanvasDimensions = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    setCanvasDimensions()
    window.addEventListener("resize", setCanvasDimensions)

    // Particle class
    class Particle {
      x: number
      y: number
      size: number
      speedX: number
      speedY: number
      color: string

      constructor() {
        this.x = Math.random() * canvas.width
        this.y = Math.random() * canvas.height
        this.size = Math.random() * 3 + 1
        this.speedX = Math.random() * 1 - 0.5
        this.speedY = Math.random() * 1 - 0.5
        this.color = `rgba(${30 + Math.random() * 20}, ${150 + Math.random() * 50}, ${220 + Math.random() * 35}, ${
          0.2 + Math.random() * 0.3
        })`
      }

      update() {
        this.x += this.speedX
        this.y += this.speedY

        if (this.x > canvas.width) this.x = 0
        else if (this.x < 0) this.x = canvas.width
        if (this.y > canvas.height) this.y = 0
        else if (this.y < 0) this.y = canvas.height
      }

      draw() {
        if (!ctx) return
        ctx.fillStyle = this.color
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Fewer particles overall, and far fewer on low-end hardware.
    const densityDivisor = isLowEnd ? 32000 : 16000
    const maxParticles = isLowEnd ? 35 : 70
    const numberOfParticles = Math.min(
      maxParticles,
      Math.floor((canvas.width * canvas.height) / densityDivisor),
    )

    const particlesArray: Particle[] = []
    for (let i = 0; i < numberOfParticles; i++) {
      particlesArray.push(new Particle())
    }

    // Connect nearby particles with lines (uses squared distance — no sqrt).
    const connectParticles = () => {
      for (let a = 0; a < particlesArray.length; a++) {
        for (let b = a + 1; b < particlesArray.length; b++) {
          const dx = particlesArray[a].x - particlesArray[b].x
          const dy = particlesArray[a].y - particlesArray[b].y
          const distanceSq = dx * dx + dy * dy

          if (distanceSq < maxDistanceSq) {
            const opacity = 1 - distanceSq / maxDistanceSq
            ctx.strokeStyle = `rgba(80, 180, 255, ${opacity * 0.2})`
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(particlesArray[a].x, particlesArray[a].y)
            ctx.lineTo(particlesArray[b].x, particlesArray[b].y)
            ctx.stroke()
          }
        }
      }
    }

    // Throttle to ~30fps to halve the work on weak GPUs/CPUs.
    const frameInterval = 1000 / 30
    let lastFrame = 0
    let rafId = 0

    const animate = (now: number) => {
      rafId = requestAnimationFrame(animate)

      if (now - lastFrame < frameInterval) return
      lastFrame = now

      ctx.fillStyle = "rgba(10, 15, 30, 0.18)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update()
        particlesArray[i].draw()
      }

      if (drawLines) connectParticles()
    }

    rafId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener("resize", setCanvasDimensions)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full -z-10 bg-gradient-to-b from-[#0a0a1a] to-[#0f172a]"
    />
  )
}
