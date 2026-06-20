import { NextRequest, NextResponse } from 'next/server';
import { getSessionById, getMemberById } from '@/lib/auth';
import { listObligations } from '@/lib/targets';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quarterId } = await params;
    const sessionId = request.cookies.get('session_id')?.value;

    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = getSessionById(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const actor = getMemberById(session.member_id);
    if (!actor || actor.role === 'member') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const obligations = listObligations(quarterId);
    return NextResponse.json(obligations);
  } catch (error: any) {
    console.error('Fetch obligations error:', error);
    return NextResponse.json({ error: 'Failed to fetch obligations' }, { status: 500 });
  }
}
