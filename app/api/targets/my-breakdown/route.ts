import { NextRequest, NextResponse } from 'next/server';
import { getSessionById } from '@/lib/auth';
import { getActiveQuarter, getMemberQuarterBreakdown } from '@/lib/targets';

export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get('session_id')?.value;
  if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = getSessionById(sessionId);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const active = getActiveQuarter();
    if (!active) return NextResponse.json({ breakdown: null });

    const breakdown = getMemberQuarterBreakdown(session.member_id, active.id);
    return NextResponse.json({ breakdown, upcoming: active.is_upcoming });
  } catch (error) {
    console.error('Fetch my breakdown error:', error);
    return NextResponse.json({ error: 'Failed to fetch breakdown' }, { status: 500 });
  }
}
