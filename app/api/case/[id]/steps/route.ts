import { NextRequest, NextResponse } from 'next/server';
import { getSessionById, getMemberById } from '@/lib/auth';
import { logCaseStep } from '../../actions';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const { date, description, type, document_url } = await request.json();

    if (!date || !description || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const step = await logCaseStep(
      {
        case_id: params.id,
        date,
        description,
        type,
        document_url: document_url || null,
      },
      member.id
    );

    return NextResponse.json(step, { status: 201 });
  } catch (error) {
    console.error('Case step logging error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
