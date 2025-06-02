import { NextResponse } from 'next/server';
import { createClient } from "@/lib/supabase";


export async function GET() {
  try {
    
    // Initialize Supabase client
    const supabase = createClient();
    
    // Query the quizzes table
    const { data: quizzes, error } = await supabase
      .from("quiz")
      .select("id, name, len, difficulty");
    
    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ message: "Failed to fetch quizzes" }, { status: 500 });
    }
    
    return NextResponse.json({ quizzes });
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
