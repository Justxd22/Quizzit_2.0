import { type NextRequest, NextResponse } from "next/server"
import type { QuizResult } from "@/lib/types"
import { jwtVerify } from "jose"
import { createClient } from "@/lib/supabase"
import { ethers } from 'ethers';
import { use } from "react";

// Import your ABI or define it here
const EscrowRefundABI = [
  "function refund(address payable recipient, uint256 amount) external"
];
// Secret key for JWT verification
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET)
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as string;
const TRUSTED_BACKEND_PRIVATE_KEY = process.env.TRUSTED_BACKEND_PRIVATE_KEY as string;
const RPC_URL = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL as string;


export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("authToken")?.value
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    console.log('tokkkkkkky', token)
    const supabase = createClient()
    // Verify token
    const { payload } = await jwtVerify(token, JWT_SECRET)

    let user;
    if (payload.type == 'guest') {
      const guestId = payload.guestId
      const { data, error } = await supabase.from("guest").select("*").eq("guest_id", guestId).single()
      console.log("guest", guestId, data)
      if (error || !data) {
        return NextResponse.json({ message: "User not found" }, { status: 404 })
      }
      user = data;
    }
    else {

      const { walletAddress, txHash, quizAttempts } = payload as {
        walletAddress: string
        txHash: string
        quizAttempts: number
      }

      // Initialize Supabase client
      // Check if user exists
      const { data, error } = await supabase.from("users").select("*").eq("wallet_address", walletAddress).eq("tx_hash", txHash).single()
      let allowed = true

      if (error || !data) {
        return NextResponse.json({ message: "User not found" }, { status: 404 })
      }
      user = data;
      // Check if maximum attempts reached
      if (user.quiz_attempts > 3) {
        return NextResponse.json({ message: "Maximum quiz attempts reached", max: true, attempts: 3 }, { status: 200 })
      }

      if (user.quiz_attempts == 3 && !user.allowed) {
        allowed = false
      }
    }
    // Parse the request body
    const submission = await request.json()
    console.log(submission);

    // Extract answers and metadata from submission
    const { answers, metadata } = submission

    // Retrieve the questions with correct answers from the database
    const originalQuestions = user.quiz || []
    console.log(typeof(originalQuestions));

    // Create a mapping of question content to correct answers
    // This allows us to match questions by their content rather than just ID
    const questionMap = new Map()
    originalQuestions.forEach(q => {
      // Use the question text as a unique identifier
      questionMap.set(q.id, {
        correct_answer: q.correct_answer,
      })
    })

    // Debug logging
    console.log("Original Questions:", originalQuestions.length)
    console.log("Answer Keys:", Object.keys(answers))

    // Calculate score and prepare results
    let score = 0
    const resultAnswers: Record<number, { answer: string; correct: boolean; correctAnswer: string }> = {}

    // Check each answer
    answers.forEach(({ id, answer }, index) => {
      const question = questionMap.get(id);
      const isCorrect = answer === question?.correct_answer;

      if (isCorrect) {
        score++;
      }

      resultAnswers[index] = {
        answer: answer,
        correct: isCorrect,
        correctAnswer: question?.correct_answer,
      };
    });

    // Return the results
    const result: QuizResult = {
      score,
      answers: resultAnswers,
      metadata,
    }

    if (!(payload.type == 'guest')) {
      let refundReceipt = null
      const { walletAddress, txHash, quizAttempts } = payload as {
        walletAddress: string
        txHash: string
        quizAttempts: number
      }
      // refund
      if (score == 10) {
        try {

          // Set up provider
          const provider = new ethers.JsonRpcProvider(RPC_URL);
          const wallet = new ethers.Wallet(TRUSTED_BACKEND_PRIVATE_KEY, provider);

          // First, get the transaction receipt to verify it exists
          const receipt = await provider.getTransactionReceipt(txHash);
          if (!receipt) {
            return NextResponse.json({ message: 'Transaction not found' }, { status: 404 })
          }

          // Get the transaction details
          const transaction = await provider.getTransaction(txHash);
          if (!transaction) {
            return NextResponse.json({ message: 'Transaction details not found' }, { status: 404 })
          }

          // Check if the transaction is a deposit to our contract
          if (transaction.to?.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) {
            return NextResponse.json({ message: 'Transaction was not sent to the escrow contract' }, { status: 404 })
          }


          // Create contract instance
          const contractRead = new ethers.Contract(CONTRACT_ADDRESS, EscrowRefundABI, provider);
          const contractWrite = contractRead.connect(wallet);
          // Now issue the refund
          const tx = await contractWrite.refund(walletAddress, ethers.parseEther("0.0001"))

          // Wait for the refund transaction to be mined
          refundReceipt = await tx.wait();

        } catch (refundError) {
          console.error("Error processing refund:", refundError);
          // Continue with the response, just log the refund error
        }

      }
      // Update score
      if (user.best_score < score){
      const { err } = await supabase
        .from("users")
        .update({ best_score: score, allowed: allowed })
        .eq("wallet_address", walletAddress).eq("tx_hash", txHash)

      if (err) {
        console.error("Database error:", err)
        return NextResponse.json({ message: "Failed to update quiz attempts" }, { status: 500 })
      }
      }
      return NextResponse.json({
        message: "Quiz attempt recorded",
        result,
        tx: refundReceipt?.hash || null
      })
    }
    else {
      // Save score
      if (user.score < score){
      const { err } = await supabase
        .from("guest")
        .update({ score: score })
        .eq("guest_id", payload.guestId)

      if (err) {
        console.error("Database error:", err)
        return NextResponse.json({ message: "Failed to update quiz attempts" }, { status: 500 })
      }
      }
      return NextResponse.json({
        message: "Quiz attempt recorded",
        result,
      })
    }
  } catch (error) {
    console.error("Error processing submission:", error)
    return NextResponse.json({ error: "Failed to process submission" }, { status: 500 })
  }
}
