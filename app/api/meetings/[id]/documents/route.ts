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

  try {
    // Check if this is JSON (metadata-only) or FormData (file upload)
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      // Metadata-only (no file upload)
      const { filename } = await request.json();

      if (!filename) {
        return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
      }

      // Create document metadata without file
      const now = Date.now();
      const db = await import('@/lib/db').then(m => m.default);
      const { randomUUID } = await import('crypto');
      const docId = randomUUID();

      db.prepare(`
        INSERT INTO meeting_documents (id, meeting_id, filename, storage_path, uploaded_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(docId, id, filename, 'metadata-only', member.id, now);

      return NextResponse.json({
        id: docId,
        meeting_id: id,
        filename,
        storage_path: 'metadata-only',
        uploaded_by: member.id,
        created_at: now,
      }, { status: 201 });
    } else {
      // File upload (existing behavior)
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
    }
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Upload failed' }, { status: 400 });
  }
}
