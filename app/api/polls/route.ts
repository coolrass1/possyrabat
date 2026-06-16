import { NextRequest, NextResponse } from 'next/server';
import { createPoll, listPolls } from '@/lib/polls';
import { getSessionById } from '@/lib/auth';
import db from '@/lib/db';

export async function POST(req: NextRequest) {
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
      return NextResponse.json({ error: 'Only committee members can create polls' }, { status: 403 });
    }

    const body = await req.json();
    const { question, choices, deadline } = body;

    if (!question || !choices || !Array.isArray(choices) || choices.length === 0) {
      return NextResponse.json({ error: 'Invalid poll data' }, { status: 400 });
    }

    const poll = await createPoll({
      question,
      choices,
      deadline: deadline || Date.now() + 7 * 24 * 60 * 60 * 1000,
      created_by: session.member_id,
    });

    return NextResponse.json(poll);
  } catch (error) {
    console.error('Failed to create poll:', error);
    return NextResponse.json({ error: 'Failed to create poll' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.cookies.get('session_id')?.value;
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = getSessionById(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const filter = (req.nextUrl.searchParams.get('filter') || 'all') as 'open' | 'closed' | 'all';
    const polls = await listPolls(filter);

    return NextResponse.json(polls);
  } catch (error) {
    console.error('Failed to list polls:', error);
    return NextResponse.json({ error: 'Failed to list polls' }, { status: 500 });
  }
}
