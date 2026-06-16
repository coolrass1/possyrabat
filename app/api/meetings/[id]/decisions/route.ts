import { NextRequest, NextResponse } from 'next/server';
import { getSessionById, getMemberById } from '@/lib/auth';
import { addDecision, getMeetingDecisions } from '@/lib/meetings';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionId = request.cookies.get('session_id')?.value;
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = getSessionById(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const decisions = await getMeetingDecisions(id);
    return NextResponse.json(decisions);
  } catch (error) {
    console.error('Decisions retrieval error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionId = request.cookies.get('session_id')?.value;
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = getSessionById(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const member = getMemberById(session.member_id);
    if (!member || member.role === 'member') {
      return NextResponse.json({ error: 'Forbidden - committee only' }, { status: 403 });
    }

    const { id } = await params;
    const { description } = await request.json();

    if (!description) {
      return NextResponse.json({ error: 'Description required' }, { status: 400 });
    }

    const decision = await addDecision({
      meeting_id: id,
      description,
      decided_by: member.id,
    });

    return NextResponse.json(decision, { status: 201 });
  } catch (error) {
    console.error('Decision creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
