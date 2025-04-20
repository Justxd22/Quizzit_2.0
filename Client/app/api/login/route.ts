import { type NextRequest, NextResponse } from "next/server"
import { ethers } from "ethers"
import { createClient } from "@/lib/supabase"
import { createJwtToken } from "@/lib/utils"

// Contract address that should receive the payment
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS
// Minimum payment amount in ETH
const REQUIRED_PAYMENT = "0.0001"

export async function POST(request: NextRequest) {
    try {
        // Parse request body
        const { walletAddress, txHash } = await request.json()

        // Validate input
        if (!walletAddress || !txHash) {
            return NextResponse.json({ message: "Wallet address and transaction hash are required" }, { status: 400 })
        }

        // Initialize Supabase client
        const supabase = createClient()

        // Check if wallet address already exists
        const { data: existingUser } = await supabase.from("users").select("*").eq("wallet_address", walletAddress).single()

        // If user exists, retrieve their transaction data
        if (existingUser) {
            // Create a new JWT token
            const token = await createJwtToken(walletAddress, existingUser.tx_hash, existingUser.quiz_attempts)

            return NextResponse.json({
                message: "User already registered",
                token,
                attempts: existingUser.quiz_attempts,
            })
        }

        // Verify the transaction on the blockchain
        const isValidTx = await verifyTransaction(txHash, walletAddress)

        if (!isValidTx) {
            return NextResponse.json({ message: "Invalid transaction. Please try again." }, { status: 400 })
        }

        // Store user data in the database
        const { error } = await supabase.from("users").insert({
            wallet_address: walletAddress,
            tx_hash: txHash,
            quiz_attempts: 0,
            best_score: 0,
            created_at: new Date().toISOString(),
        })

        if (error) {
            console.error("Database error:", error)
            return NextResponse.json({ message: "Failed to register user" }, { status: 500 })
        }

        // Create JWT token
        const token = await createJwtToken(walletAddress, txHash, 0)

        return NextResponse.json({
            message: "Registration successful",
            token,
        })
    } catch (error) {
        console.error("Registration error:", error)
        return NextResponse.json({ message: "Internal server error" }, { status: 500 })
    }
}

/**
 * Verify the transaction on the blockchain
 */
async function verifyTransaction(txHash: string, walletAddress: string): Promise<boolean> {
    try {
        // Connect to Sepolia network
        const provider = new ethers.JsonRpcProvider(
            process.env.NEXT_PUBLIC_RPC_URL || "https://eth-sepolia.g.alchemy.com/v2/oKxs-03sij-U_N0iOlrSsZFr29-IqbuF"
        )

        // Get transaction details
        const tx = await provider.getTransaction(txHash)

        if (!tx) {
            console.error("Transaction not found")
            return false
        }

        // Wait for transaction to be mined (if not already)
        const receipt = await tx.wait()

        if (!receipt || receipt.status !== 1) {
            console.error("Transaction failed or not confirmed")
            return false
        }

        // Verify sender address
        if (tx.from.toLowerCase() !== walletAddress.toLowerCase()) {
            console.error("Transaction sender does not match wallet address")
            return false
        }

        // Verify recipient address
        if (tx.to?.toLowerCase() !== CONTRACT_ADDRESS?.toLowerCase()) {
            console.error("Transaction recipient does not match contract address")
            return false
        }

        // Verify payment amount
        const minAmount = ethers.parseEther(REQUIRED_PAYMENT)
        if (tx.value < minAmount) {
            console.error("Transaction amount is less than required")
            return false
        }

        // Get the block the transaction was included in
        const block = await provider.getBlock(receipt.blockNumber);
        const txTimestamp = block.timestamp; // in seconds
        const currentTime = Math.floor(Date.now() / 1000); // in seconds

        // Check if transaction was made within the past hour (3600 seconds)
        const ONE_HOUR = 60 * 60;
        if (currentTime - txTimestamp > ONE_HOUR) {
            console.error("Transaction was not made within the past hour");
            return false;
        }

        return true
    } catch (error) {
        console.error("Error verifying transaction:", error)
        return false
    }
}
