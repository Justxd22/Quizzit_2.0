"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AnimatedBackground } from "@/components/ui/animated-background"
import { useAuth } from "@/hooks/use-auth"

export default function AttemptsExceededPage() {
  const router = useRouter()
  const { isAuthenticated, walletAddress } = useAuth()

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/")
    }
  }, [isAuthenticated, router])

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col">
      <AnimatedBackground />
      <div className="absolute inset-0 bg-black/50" /> {/* Dim overlay */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="backdrop-blur-md bg-black/30 border border-red-500/50 shadow-lg shadow-red-500/20 text-white overflow-hidden">
            <CardHeader>
              <CardTitle className="text-xl text-red-400">Maximum Attempts Reached</CardTitle>
              <CardDescription className="text-white/70">
                You have used all your available quiz attempts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Your wallet address{" "}
                <span className="text-red-400 font-mono">
                  {walletAddress?.substring(0, 6)}...{walletAddress?.substring(walletAddress.length - 4)}
                </span>{" "}
                has reached the maximum number of allowed quiz attempts.
              </p>
              <p>If you would like to try again, you will need to register with a different wallet address.</p>
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => router.push("/")}
                className="w-full bg-gradient-to-r from-red-500 to-red-400 hover:from-red-400 hover:to-red-300 text-white"
              >
                Return to Home
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
