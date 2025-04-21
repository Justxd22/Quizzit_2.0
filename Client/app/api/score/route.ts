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
      .from('users')
      .select('wallet_address, tx_hash, best_score', { count: 'exact' })
      .order('best_score', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching leaderboard data:', error);
      return NextResponse.json({ error: 'Failed to fetch leaderboard data' }, { status: 500 });
    }

    // Format user data with rank
    const leaderboardData = users.map((user, index) => ({
      id: user.wallet_address,
      tx_hash: user.tx_hash,
      rank: offset + index + 1,
      score: user.best_score,
      // Truncate tx_hash for display
      displayName: `${user.tx_hash.substring(0, 6)}...${user.tx_hash.substring(user.tx_hash.length - 4)}`,
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