import { NextRequest, NextResponse } from 'next/server';
import { getSessionById, getMemberById } from '@/lib/auth';
import { addMeetingAction, getMeetingActions } from '@/lib/meetings';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionId = request.cookies.get('session_id')?.value;
  if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const session = getSessionById(sessionId);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  return NextResponse.json(await getMeetingActions(id));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionId = request.cookies.get('session_id')?.value;
  if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const session = getSessionById(sessionId);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const member = getMemberById(session.member_id);
  if (!member || member.role === 'member') {
    return NextResponse.json({ error: 'Forbidden - committee only' }, { status: 403 });
  }

  const { id } = await params;
  const { task, assigned_to, due_date } = await request.json();
  if (!task) return NextResponse.json({ error: 'Task required' }, { status: 400 });

  const action = await addMeetingAction({
    meeting_id: id,
    task,
    assigned_to: assigned_to || null,
    due_date: due_date || null,
  });
  return NextResponse.json(action, { status: 201 });
}
