import { NextResponse } from 'next/server';
import { createClient } from "@/lib/supabase";
import { unstable_cache } from 'next/cache';

export async function GET() {
  try {
    const getCachedQuizzes = unstable_cache(
      async () => {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("quiz")
          .select("id, name, len, difficulty, created_at")
          .neq('name', null)
          .neq('hidden', true)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        return data;
      },
      ['quizzes-list'], // Cache key
      { revalidate: 60 } // 1 minutes
    );

    const quizzes = await getCachedQuizzes();
    
    return NextResponse.json({ quizzes });
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
