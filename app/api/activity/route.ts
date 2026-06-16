import { NextRequest, NextResponse } from 'next/server';
import { getSessionById } from '@/lib/auth';
import { getActivityFeed } from './feed';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('session_id')?.value;
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = getSessionById(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10');
    const feed = await getActivityFeed(Math.min(limit, 50)); // Cap at 50

    return NextResponse.json(feed);
  } catch (error) {
    console.error('Activity feed error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
