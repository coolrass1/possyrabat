import { NextRequest, NextResponse } from 'next/server';
import { getSessionById, getMemberById } from '@/lib/auth';
import { setMeetingActionStatus } from '@/lib/meetings';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; actionId: string }> }
) {
  const sessionId = request.cookies.get('session_id')?.value;
  if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const session = getSessionById(sessionId);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const member = getMemberById(session.member_id);
  if (!member || member.role === 'member') {
    return NextResponse.json({ error: 'Forbidden - committee only' }, { status: 403 });
  }

  const { actionId } = await params;
  const { status } = await request.json();
  if (status !== 'open' && status !== 'done') {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  return NextResponse.json(await setMeetingActionStatus(actionId, status));
}
