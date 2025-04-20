"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AnimatedBackground } from "@/components/ui/animated-background"

export default function AttemptsExceededPage() {
  const router = useRouter()
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  
  useEffect(() => {
    const fetchWalletAddress = async () => {
      try {
        const res = await fetch("/api/attempts")
        if (!res.ok) throw new Error("Failed to fetch wallet")
        const data = await res.json()
        if (!data.max){
          router.push('/quiz')
        }
        setWalletAddress(data.walletAddress)
        document.cookie = `authToken=undefined; path=/; max-age=${1 * 24 * 60 * 60}; SameSite=Strict`;
      } catch (err) {
        console.error(err)
        setWalletAddress(null)
      }
    }
    fetchWalletAddress()
  }, [])

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col">
      <AnimatedBackground />
      <div className="absolute inset-0 bg-black/50" />
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
              {walletAddress ? (
                <p className="mb-4">
                  Your wallet address{" "}
                  <span className="text-red-400 font-mono">
                    {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
                  </span>{" "}
                  has reached the maximum number of allowed quiz attempts.
                </p>
              ) : (
                <p className="mb-4 text-yellow-300">Fetching Your Status...</p>
              )}
              
              {/* Puppy donation highlighted message with GIF */}
              <div className="bg-[rgb(65,154,158)] p-4 my-6 rounded-lg shadow-lg border-2 border-yellow-400">
                <div className="flex items-center justify-between">
                  <div className="w-3/5">
                    <p className="text-yellow-300 font-bold text-lg">Your Funds are on the way to Puppies!</p>
                    <p className="text-white text-sm mt-1">Thank you for your $10 donation to help our furry friends!</p>
                  </div>                  
                  <div className="w-2/5 flex justify-end">
                    <img 
                      src="/pup.gif" 
                      alt="Happy puppy" 
                    />
                  </div>
                </div>
              </div>
              
              <p>If you would like to try again, you will need to register with another $10 donation.</p>
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

//rgb(65, 154, 158)