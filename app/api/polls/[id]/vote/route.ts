import { NextRequest, NextResponse } from 'next/server';
import { vote, getPollResults } from '@/lib/polls';
import { getSessionById } from '@/lib/auth';

export async function POST(
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
    const body = await req.json();
    const { choice } = body;

    if (!choice) {
      return NextResponse.json({ error: 'Choice is required' }, { status: 400 });
    }

    await vote({
      poll_id: id,
      member_id: session.member_id,
      choice,
    });

    const results = await getPollResults(id);
    return NextResponse.json({ success: true, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to vote';
    const status = message.includes('already voted') ? 400 : message.includes('closed') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
