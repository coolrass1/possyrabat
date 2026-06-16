import { NextRequest, NextResponse } from 'next/server';
import { getPoll } from '@/lib/polls';
import { getSessionById } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionId = req.cookies.get('session_id')?.value;
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = getSessionById(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const poll = await getPoll(id);

    if (!poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
    }

    return NextResponse.json(poll);
  } catch (error) {
    console.error('Failed to get poll:', error);
    return NextResponse.json({ error: 'Failed to get poll' }, { status: 500 });
  }
}
