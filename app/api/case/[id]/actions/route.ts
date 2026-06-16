import { NextRequest, NextResponse } from 'next/server';
import { getSessionById, getMemberById } from '@/lib/auth';
import { createCaseAction, getCaseActions } from '../../documents-actions';

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
    const actions = await getCaseActions(id);
    return NextResponse.json(actions);
  } catch (error) {
    console.error('Actions retrieval error:', error);
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
    const { task, assigned_to, due_date } = await request.json();

    if (!task || !assigned_to || !due_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const action = await createCaseAction(
      {
        case_id: id,
        task,
        assigned_to,
        due_date,
      },
      member.id
    );

    return NextResponse.json(action, { status: 201 });
  } catch (error) {
    console.error('Action creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
