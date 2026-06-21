import { NextRequest, NextResponse } from 'next/server';
import { getSessionById, getMemberById } from '@/lib/auth';
import { createMeeting, getAllMeetings } from '@/lib/meetings';
import { isMeetingStatus } from '@/lib/meeting-status';

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

    const { date, title, notes, location, agenda, description, status, attendees } =
      await request.json();

    if (!date || !title || !attendees) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (status !== undefined && status !== null && !isMeetingStatus(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const meeting = await createMeeting({
      date,
      title,
      notes: notes || null,
      location: location || null,
      agenda: agenda || null,
      description: description || null,
      status: status || 'Planned',
      attendees,
      created_by: member.id,
    });

    return NextResponse.json(meeting, { status: 201 });
  } catch (error) {
    console.error('Meeting creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
