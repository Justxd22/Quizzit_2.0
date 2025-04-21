import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from "jose"
import { createClient } from "@/lib/supabase"

// Secret key for JWT verification
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET)
// Define the backend API URL
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("authToken")?.value
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Verify token
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const { walletAddress, txHash, quizAttempts } = payload as {
      walletAddress: string
      txHash: string
      quizAttempts: number
    }


    // Check if the request is multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'File must be a PDF' },
        { status: 400 }
      );
    }

    // Create a new FormData instance to send to the backend
    const backendFormData = new FormData();
    backendFormData.append('file', file);
    
    // Get the number of questions from the form data or use default
    const numQuestions = formData.get('num_questions') || '10';
    backendFormData.append('num_questions', numQuestions.toString());

    // Send the file to the backend
    const response = await fetch(`${BACKEND_URL}/generate-questions/`, {
      method: 'POST',
      body: backendFormData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      return NextResponse.json(
        { error: errorData.detail || 'Failed to process PDF' },
        { status: response.status }
      );
    }

    // Get the generated questions from the backend
    const data = await response.json();
    // Initialize Supabase client
    const supabase = createClient()

    const { error: updateError } = await supabase
      .from("users")
      .update({ quiz: data.questions })
      .eq("wallet_address", walletAddress)
      .eq("tx_hash", txHash).single()


    if (updateError) {
      console.error("Database error:", updateError)
      return NextResponse.json({ message: "Failed to save quiz" }, { status: 500 })
    }


    return NextResponse.json({message: "All good"});
  } catch (error) {
    console.error('Error processing upload:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
