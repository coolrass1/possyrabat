import { NextRequest, NextResponse } from 'next/server';
import { closePoll } from '@/lib/polls';
import { getSessionById } from '@/lib/auth';
import db from '@/lib/db';

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

    // Verify committee member
    const member = db.prepare('SELECT role FROM members WHERE id = ?').get(session.member_id) as any;
    if (!member || (member.role !== 'committee' && member.role !== 'owner')) {
      return NextResponse.json({ error: 'Only committee members can close polls' }, { status: 403 });
    }

    const { id } = await params;
    const poll = await closePoll(id);

    return NextResponse.json(poll);
  } catch (error) {
    console.error('Failed to close poll:', error);
    return NextResponse.json({ error: 'Failed to close poll' }, { status: 500 });
  }
}
