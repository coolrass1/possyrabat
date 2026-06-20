import { NextRequest, NextResponse } from 'next/server';
import { getSessionById } from '@/lib/auth';
import { getMemberStanding } from '@/lib/targets';

export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get('session_id')?.value;
  if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = getSessionById(sessionId);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const standing = getMemberStanding(session.member_id);
    return NextResponse.json(standing);
  } catch (error) {
    console.error('Fetch my target standing error:', error);
    return NextResponse.json({ error: 'Failed to fetch standing' }, { status: 500 });
  }
}
