"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"

interface AuthContextType {
  isAuthenticated: boolean
  walletAddress: string | null
  token: string | null
  quizAttempts: number
  remainingAttempts: number
  connectWallet: () => Promise<boolean>
  setAuthToken: (token: string) => void
  logout: () => void
  restoreSession: (address: string) => Promise<boolean>
  recordQuizAttempt: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Maximum number of quiz attempts allowed
const MAX_QUIZ_ATTEMPTS = 3

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [quizAttempts, setQuizAttempts] = useState(0)

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const storedToken = document.cookie.split('; ').find(row => row.startsWith('authToken='))?.split('=')[1] || null;
    const storedAddress = localStorage.getItem("walletAddress")

    if (storedToken && storedAddress) {
      setToken(storedToken)
      setWalletAddress(storedAddress)
      setIsAuthenticated(true)

      // Restore session with backend to get updated attempts
      restoreSession(storedAddress)
    }
  }, [])

  const setAuthToken = (token: string) => {
    document.cookie = `authToken=${token}; path=/; max-age=${1 * 24 * 60 * 60}; SameSite=Strict`;
    setToken(token)
    setIsAuthenticated(true);
  };
  
  const clearAuthToken = () => {
    document.cookie = "authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  };

  // Connect wallet and authenticate
  const connectWallet = async () => {
    if (typeof window.ethereum === "undefined") {
      throw new Error("MetaMask is not installed")
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" })

      if (accounts.length === 0) {
        throw new Error("No accounts found")
      }

      const address = accounts[0]
      setWalletAddress(address)

      // Try to restore session if user already registered
      const sessionRestored = await restoreSession(address)

      if (!sessionRestored) {
        // User needs to complete registration
        router.push("/")
      }

      return true
    } catch (error) {
      console.error("Failed to connect wallet:", error)
      throw error
    }
  }

  // Restore session from backend
  const restoreSession = async (address: string) => {
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ walletAddress: address }),
      })

      if (!response.ok) {
        return false
      }

      const data = await response.json()

      // Update auth state
      setAuthToken(data.token);
      setQuizAttempts(data.attempts)
      setWalletAddress(address)
      setIsAuthenticated(true)

      localStorage.setItem("walletAddress", address)

      return true
    } catch (error) {
      console.error("Failed to restore session:", error)
      return false
    }
  }

  // Record a quiz attempt
  const recordQuizAttempt = async () => {
    setQuizAttempts(quizAttempts + 1)
  }

  // Logout
  const logout = () => {
    setIsAuthenticated(false)
    setWalletAddress(null)
    setToken(null)
    setQuizAttempts(0)

    // Clear localStorage
    localStorage.removeItem("walletAddress")
    clearAuthToken()

    // Redirect to home
    router.push("/")
  }

  const value = {
    isAuthenticated,
    walletAddress,
    token,
    quizAttempts,
    remainingAttempts: MAX_QUIZ_ATTEMPTS - quizAttempts,
    connectWallet,
    logout,
    restoreSession,
    recordQuizAttempt,
    setAuthToken
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
