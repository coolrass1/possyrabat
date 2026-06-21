import { NextRequest, NextResponse } from 'next/server';
import { getSessionById } from '@/lib/auth';
import { getLandOverview } from '@/lib/land';

export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get('session_id')?.value;
  if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const session = getSessionById(sessionId);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json(getLandOverview());
}
