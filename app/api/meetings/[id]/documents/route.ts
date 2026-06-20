import { NextRequest, NextResponse } from 'next/server';
import { getSessionById, getMemberById } from '@/lib/auth';
import { addMeetingDocument, getMeetingDocuments } from '@/lib/meeting-documents';
import { getMeeting } from '@/lib/meetings';
import { broadcastToMembers } from '@/lib/email';
import { MeetingDocument } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionId = request.cookies.get('session_id')?.value;
  if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const session = getSessionById(sessionId);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  return NextResponse.json(await getMeetingDocuments(id));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionId = request.cookies.get('session_id')?.value;
  if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const session = getSessionById(sessionId);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const member = getMemberById(session.member_id);
  if (!member || member.role === 'member') {
    return NextResponse.json({ error: 'Forbidden - committee only' }, { status: 403 });
  }

  const { id } = await params;
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const kindRaw = String(formData.get('kind') || 'other');
  const kind: MeetingDocument['kind'] = ['minutes', 'report', 'other'].includes(kindRaw)
    ? (kindRaw as MeetingDocument['kind'])
    : 'other';
  const notify = String(formData.get('notify') || '') === 'true';

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  try {
    const fileContent = Buffer.from(await file.arrayBuffer());
    const document = await addMeetingDocument(
      { meeting_id: id, filename: file.name, fileContent, kind },
      member.id
    );

    if (notify) {
      const meeting = await getMeeting(id);
      const title = meeting?.title || 'a meeting';
      await broadcastToMembers({
        subject: `New ${kind}: ${title}`,
        body: `A new ${kind} ("${document.filename}") was added to "${title}". It's available on the meeting page.`,
      });
    }

    return NextResponse.json(document, { status: 201 });
  } catch (error: any) {
    // Validation failures (type/size) surface as 400
    return NextResponse.json({ error: error?.message || 'Upload failed' }, { status: 400 });
  }
}
