import { NextRequest, NextResponse } from 'next/server';
import { getSessionById, getMemberById } from '@/lib/auth';
import { broadcastToMembers } from '@/lib/email';

export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get('session_id')?.value;
  if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = getSessionById(sessionId);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const actor = getMemberById(session.member_id);
  if (!actor || actor.role === 'member') {
    return NextResponse.json({ error: 'Only committee members can broadcast' }, { status: 403 });
  }

  const { subject, body } = await request.json();
  if (!subject || !body) {
    return NextResponse.json({ error: 'Subject and body are required' }, { status: 400 });
  }

  const logs = await broadcastToMembers({ subject, body });
  return NextResponse.json({ sent: logs.length });
}
