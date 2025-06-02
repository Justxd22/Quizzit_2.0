import { NextResponse } from 'next/server';
import { createClient } from "@/lib/supabase"


export async function GET(request: Request) {
  try {
    // Get query parameters
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const page = parseInt(url.searchParams.get('page') || '1');
    const offset = (page - 1) * limit;
    const supabase = createClient()
    
    // Fetch users ordered by best_score in descending order
    const { data: users, error, count } = await supabase
      .from('guest')
      .select('name, score', { count: 'exact' })
      .neq('score', 0)
      .order('score', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching leaderboard data:', error);
      return NextResponse.json({ error: 'Failed to fetch leaderboard data' }, { status: 500 });
    }

    const uniqueUsersMap = new Map<string, typeof users[0]>();

    for (const user of users) {
      if (!uniqueUsersMap.has(user.name)) {
        uniqueUsersMap.set(user.name, user);
      } else {
        const existing = uniqueUsersMap.get(user.name)!;
        // Keep the one with the higher score
        if (user.score > existing.score) {
          uniqueUsersMap.set(user.name, user);
        }
      }
    }
    
    const uniqueUsers = Array.from(uniqueUsersMap.values());
    
    // Then add ranks
    const leaderboardData = uniqueUsers.map((user, index) => ({
      id: user.name,
      tx_hash: user.name,
      rank: offset + index + 1,
      score: user.score,
      displayName: user.name,
    }));

    return NextResponse.json({ 
      data: leaderboardData,
      pagination: {
        total: count,
        page,
        limit,
        pages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}