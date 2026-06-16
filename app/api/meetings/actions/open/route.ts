import { NextRequest, NextResponse } from 'next/server';
import { getSessionById } from '@/lib/auth';
import { getOpenMeetingActions } from '@/lib/meetings';

export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get('session_id')?.value;
  if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const session = getSessionById(sessionId);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json(await getOpenMeetingActions());
}
