"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ExternalLink, AlertTriangle, CheckCircle, Loader2 } from "lucide-react"
import { ethers } from "ethers"
import styles from "./login.module.css"
import MetaMaskFox from "@/components/ui/fox"

// Create motion components
const MotionCard = motion.create(Card)
const MotionButton = motion.create(Button)
const MotionDiv = motion.div

// Smart contract details
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS
const PAYMENT_AMOUNT = "0.0001" // Sepolia ETH
const CONTRACT_ABI = [
  "function deposit() external payable"
]

export default function SignupPage() {
  const router = useRouter()
  const [walletConnected, setWalletConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState("")
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false)
  const [hasSufficientFunds, setHasSufficientFunds] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [txStatus, setTxStatus] = useState("")
  const [txHash, setTxHash] = useState("")
  // Add a state to track if we're in client-side environment
  const [isBrowser, setIsBrowser] = useState(false)
  

  // Sepolia network parameters
  const SEPOLIA_CHAIN_ID = "0xaa36a7" // 11155111 in decimal
  const SEPOLIA_RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://eth-sepolia.g.alchemy.com/v2/oKxs-03sij-U_N0iOlrSsZFr29-IqbuF"
  const SEPOLIA_FAUCET_URL = "https://cloud.google.com/application/web3/faucet/ethereum/sepolia"

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100 },
    },
  }

  const logoVariants = {
    initial: { scale: 1 },
    animate: {
      scale: [1, 1.05, 1],
      transition: {
        duration: 2,
        repeat: Number.POSITIVE_INFINITY,
        repeatType: "reverse",
      },
    },
  }

  const buttonVariants = {
    initial: { scale: 1 },
    hover: {
      scale: 1.03,
      boxShadow: "0 0 15px rgba(1, 255, 255, 0.76)",
      transition: { type: "spring", stiffness: 400 },
    },
    tap: { scale: 0.97 },
  }

  // Check if we're in browser environment and MetaMask is installed
  useEffect(() => {
    setIsBrowser(true)
  }, [])

  // Check if MetaMask is installed
  const isMetaMaskInstalled = () => {
    return isBrowser && typeof window !== "undefined" && window.ethereum !== undefined
  }

  // Connect to MetaMask
  const connectWallet = async () => {
    if (!isMetaMaskInstalled()) {
      setError("MetaMask is not installed. Please install MetaMask to continue.")
      return
    }

    try {
      setIsLoading(true)
      setError("")

      // Request account access
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" })

      if (accounts.length > 0) {
        setWalletAddress(accounts[0])
        setWalletConnected(true)

        // Check network
        await checkNetwork()

        // Check balance
        await checkBalance(accounts[0])
      }
    } catch (error) {
      console.error("Error connecting to MetaMask:", error)
      setError("Failed to connect to MetaMask. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Check if connected to Sepolia network
  const checkNetwork = async () => {
    try {
      const chainId = await window.ethereum.request({ method: "eth_chainId" })

      if (chainId === SEPOLIA_CHAIN_ID) {
        setIsCorrectNetwork(true)
      } else {
        setIsCorrectNetwork(false)
      }
    } catch (error) {
      console.error("Error checking network:", error)
      setIsCorrectNetwork(false)
    }
  }

  // Switch to Sepolia network
  const switchToSepolia = async () => {
    try {
      setIsLoading(true)
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      })

      // After switching, check network again
      await checkNetwork()

      // Check balance after network switch
      if (walletAddress) {
        await checkBalance(walletAddress)
      }
    } catch (error) {
      // This error code indicates that the chain has not been added to MetaMask
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: SEPOLIA_CHAIN_ID,
                chainName: "Sepolia Test Network",
                nativeCurrency: {
                  name: "Sepolia ETH",
                  symbol: "SEP",
                  decimals: 18,
                },
                rpcUrls: [SEPOLIA_RPC_URL],
                blockExplorerUrls: ["https://sepolia.etherscan.io/"],
              },
            ],
          })

          // After adding, check network again
          await checkNetwork()
        } catch (addError) {
          console.error("Error adding Sepolia network:", addError)
          setError("Failed to add Sepolia network to MetaMask.")
        }
      } else {
        console.error("Error switching network:", error)
        setError("Failed to switch to Sepolia network.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Check if wallet has sufficient funds
  const checkBalance = async (address) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const balance = await provider.getBalance(address)

      // Consider 0.01 ETH as sufficient for this example
      const sufficientBalance = ethers.parseEther(PAYMENT_AMOUNT)

      if (balance >= sufficientBalance) {
        setHasSufficientFunds(true)
      } else {
        setHasSufficientFunds(false)
      }
    } catch (error) {
      console.error("Error checking balance:", error)
      setHasSufficientFunds(false)
    }
  }

  // Complete signup by sending transaction and registering with backend
  const completeSignup = async () => {
    if (!walletConnected || !isCorrectNetwork || !hasSufficientFunds) {
      return
    }

    try {
      setIsLoading(true)
      setTxStatus("Initiating transaction...")
      setError("")

      // Get provider and signer

      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      
      // Send transaction
      setTxStatus("Please confirm the transaction in MetaMask...")
      const tx = await contract.deposit({ value: ethers.parseEther(PAYMENT_AMOUNT) });

      setTxHash(tx.hash)
      setTxStatus("Transaction sent! Waiting for confirmation...")

      // Wait for transaction to be mined
      await tx.wait()

      setTxStatus("Transaction confirmed! Registering with server...")

      // Send transaction data to backend
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress: walletAddress,
          txHash: tx.hash,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to register with server")
      }

      const data = await response.json()
      document.cookie = `authToken=${data.token}; path=/; max-age=${1 * 24 * 60 * 60}; SameSite=Strict`;

      setTxStatus("Registration complete! Redirecting to quiz...")

      // Redirect to quiz page
      setTimeout(() => {
        router.push("/quiz")
      }, 1000)
    } catch (error) {
      console.error("Error completing signup:", error)
      setError(error.message || "Failed to complete signup. Please try again.")
      setTxStatus("")
    } finally {
      setIsLoading(false)
    }
  }

  // Generate grid spans
  const gridSpans = Array(225)
    .fill(0)
    .map((_, i) => (
      <motion.span
        key={i}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: i * 0.01 }}
        className={styles.gridSpan}
      />
    ))

  // Listen for account changes
  useEffect(() => {
    if (isMetaMaskInstalled()) {
      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length > 0) {
          setWalletAddress(accounts[0])
          checkBalance(accounts[0])
        } else {
          setWalletConnected(false)
          setWalletAddress("")
          setIsCorrectNetwork(false)
          setHasSufficientFunds(false)
        }
      })

      window.ethereum.on("chainChanged", () => {
        checkNetwork()
        if (walletAddress) {
          checkBalance(walletAddress)
        }
      })
    }

    return () => {
      if (isMetaMaskInstalled()) {
        window.ethereum.removeAllListeners("accountsChanged")
        window.ethereum.removeAllListeners("chainChanged")
      }
    }
  }, [walletAddress, isBrowser])

  return (
    <section className={styles.loginSection}>
      <div className={styles.gridContainer}>{gridSpans}</div>

      <MotionDiv
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="relative z-10 container mx-auto px-4 py-12"
      >
        <div className="max-w-5xl mx-auto">
          <MotionDiv variants={itemVariants} className="text-center mb-12">
            <MotionDiv
              variants={logoVariants}
              initial="initial"
              className="flex items-center justify-center gap-2 mb-4 text-3xl font-bold mb-2"
            >
              <Image src="/logo.svg" alt="Logo" width={100} height={100} className="text-primary" />
              Quizzit
            </MotionDiv>
            <h1 className="text-3xl font-bold mb-2">Create Your Account</h1>
            <p className="text-white/70">Choose your preferred payment method to join</p>
          </MotionDiv>

          <div className="flex justify-center md:grid gap-12 md:gap-16 relative">
            {/* MetaMask Option */}
            <MotionCard
              variants={itemVariants}
              className="backdrop-blur-md bg-white/5 border border-white/10 overflow-visible"
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <CardTitle>Connect with MetaMask</CardTitle>
                </div>
                <CardDescription className="text-white/70">
                  Connect your Ethereum wallet to create an account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center items-center p-6 pt-0">
                  <MetaMaskFox width={100} height={100} followMouse={true} />
                </div>
                {isBrowser && !isMetaMaskInstalled() && (
                  <MotionDiv
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Alert variant="destructive" className="bg-red-900/20 border-red-500/50 text-white">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>MetaMask Not Detected</AlertTitle>
                      <AlertDescription>
                        Please install the MetaMask browser extension to continue.
                        <a
                          href="https://metamask.io/download/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-pink-400 hover:text-pink-300 mt-2"
                        >
                          Download MetaMask <ExternalLink className="h-3 w-3" />
                        </a>
                      </AlertDescription>
                    </Alert>
                  </MotionDiv>
                )}

                {error && (
                  <MotionDiv
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Alert variant="destructive" className="bg-red-900/20 border-red-500/50 text-white">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  </MotionDiv>
                )}

                {walletConnected && (
                  <MotionDiv
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-4"
                  >
                    <MotionDiv
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="p-3 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500" />
                        <div>
                          <p className="text-sm font-medium">Connected Wallet</p>
                          <p className="text-xs text-white/70">
                            {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
                          </p>
                        </div>
                      </div>
                      <MotionDiv
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                      >
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      </MotionDiv>
                    </MotionDiv>

                    {!isCorrectNetwork && (
                      <MotionDiv
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                      >
                        <Alert className="bg-yellow-900/20 border-yellow-500/50">
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          <AlertTitle>Wrong Network</AlertTitle>
                          <AlertDescription className="space-y-2">
                            <p>Please switch to the Sepolia Test Network to continue.</p>
                            <MotionButton
                              variants={buttonVariants}
                              initial="initial"
                              whileHover="hover"
                              whileTap="tap"
                              onClick={switchToSepolia}
                              disabled={isLoading}
                              className="bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-white border-0"
                            >
                              Switch to Sepolia
                            </MotionButton>
                          </AlertDescription>
                        </Alert>
                      </MotionDiv>
                    )}

                    {isCorrectNetwork && !hasSufficientFunds && (
                      <MotionDiv
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.2 }}
                      >
                        <Alert className="bg-yellow-900/20 border-yellow-500/50">
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          <AlertTitle>Insufficient Funds</AlertTitle>
                          <AlertDescription className="space-y-2">
                            <p>You need some Sepolia ETH to continue. Get free test ETH from a faucet.</p>
                            <a href={SEPOLIA_FAUCET_URL} target="_blank" rel="noopener noreferrer">
                              <MotionButton
                                variants={buttonVariants}
                                initial="initial"
                                whileHover="hover"
                                whileTap="tap"
                                className="bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-white border-0"
                              >
                                Go to Sepolia Faucet <ExternalLink className="h-3 w-3 ml-2" />
                              </MotionButton>
                            </a>
                          </AlertDescription>
                        </Alert>
                      </MotionDiv>
                    )}

                    {isCorrectNetwork && hasSufficientFunds && (
                      <MotionDiv
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.3 }}
                      >
                        <Alert className="bg-green-900/20 border-green-500/50">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <AlertTitle>Ready to Continue</AlertTitle>
                          <AlertDescription>
                            Your wallet is properly configured. Click below to complete signup.
                          </AlertDescription>
                        </Alert>
                      </MotionDiv>
                    )}

                    {txStatus && (
                      <MotionDiv
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Alert className="bg-blue-900/20 border-blue-500/50">
                          <div className="flex items-center">
                            {isLoading && <Loader2 className="h-4 w-4 text-blue-500 mr-2 animate-spin" />}
                            {!isLoading && <CheckCircle className="h-4 w-4 text-blue-500 mr-2" />}
                            <AlertTitle>Transaction Status</AlertTitle>
                          </div>
                          <AlertDescription className="space-y-2">
                            <p>{txStatus}</p>
                            {txHash && (
                              <a
                                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 mt-2"
                              >
                                View on Etherscan <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </AlertDescription>
                        </Alert>
                      </MotionDiv>
                    )}
                  </MotionDiv>
                )}
              </CardContent>
              <CardFooter>
                {!walletConnected ? (
                  <MotionButton
                    variants={buttonVariants}
                    initial="initial"
                    whileHover="hover"
                    whileTap="tap"
                    onClick={connectWallet}
                    disabled={isLoading || !isMetaMaskInstalled()}
                    className="w-full bg-gradient-to-r from-[#03e1f1] to-[#51787a] hover:bg-[#01ffffc2] text-white border-0"
                  >
                    {isLoading ? "Connecting..." : "Connect MetaMask"}
                  </MotionButton>
                ) : (
                  <MotionButton
                    variants={buttonVariants}
                    initial="initial"
                    whileHover="hover"
                    whileTap="tap"
                    onClick={completeSignup}
                    disabled={!isCorrectNetwork || !hasSufficientFunds || isLoading}
                    className="w-full bg-gradient-to-r from-[#03e1f1] to-[#51787a] hover:bg-[#01ffffc2] text-white border-0"
                  >
                    {isLoading ? (
                      <span className="flex items-center">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </span>
                    ) : (
                      "Complete Signup"
                    )}
                  </MotionButton>
                )}
              </CardFooter>
            </MotionCard>
          </div>
        </div>
      </MotionDiv>
    </section>
  )
}
