import { NextRequest, NextResponse } from 'next/server';
import { getSessionById } from '@/lib/auth';
import { getMemberImpact } from '@/lib/targets';

export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get('session_id')?.value;
  if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = getSessionById(sessionId);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    return NextResponse.json(getMemberImpact(session.member_id));
  } catch (error) {
    console.error('Fetch my impact error:', error);
    return NextResponse.json({ error: 'Failed to fetch impact' }, { status: 500 });
  }
}
