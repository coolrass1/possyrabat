import { NextRequest, NextResponse } from 'next/server';
import { getSessionById, getMemberById } from '@/lib/auth';
import { createMeeting, getAllMeetings } from '@/lib/meetings';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('session_id')?.value;
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = getSessionById(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const meetings = await getAllMeetings();
    return NextResponse.json(meetings);
  } catch (error) {
    console.error('Meetings retrieval error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    const { date, title, location, agenda, description } = await request.json();

    if (!date || !title) {
      return NextResponse.json({ error: 'Title and date are required' }, { status: 400 });
    }

    const meeting = await createMeeting({
      date,
      title,
      location: location || null,
      agenda: agenda || null,
      description: description || null,
      created_by: member.id,
    });

    return NextResponse.json(meeting, { status: 201 });
  } catch (error: any) {
    console.error('Meeting creation error:', error?.message || error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
