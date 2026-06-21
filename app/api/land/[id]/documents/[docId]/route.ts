import { NextRequest, NextResponse } from 'next/server';
import { getSessionById, getMemberById } from '@/lib/auth';
import { getLandDocumentFile, deleteLandDocument } from '@/lib/land';
import { isInlineMime } from '@/lib/uploads';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const sessionId = request.cookies.get('session_id')?.value;
  if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const session = getSessionById(sessionId);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { docId } = await params;
  const file = await getLandDocumentFile(docId);
  if (!file) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

  const disposition = isInlineMime(file.mime_type) ? 'inline' : 'attachment';
  return new NextResponse(new Uint8Array(file.content), {
    status: 200,
    headers: {
      'Content-Type': file.mime_type,
      'Content-Disposition': `${disposition}; filename="${file.filename.replace(/"/g, '')}"`,
    },
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const sessionId = request.cookies.get('session_id')?.value;
  if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const session = getSessionById(sessionId);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const member = getMemberById(session.member_id);
  if (!member || member.role === 'member') {
    return NextResponse.json({ error: 'Forbidden - committee only' }, { status: 403 });
  }

  const { docId } = await params;
  await deleteLandDocument(docId);
  return NextResponse.json({ success: true });
}
