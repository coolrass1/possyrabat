import { NextRequest, NextResponse } from 'next/server';
import { getSessionById, getMemberById } from '@/lib/auth';
import db from '@/lib/db';
import { randomBytes } from 'crypto';

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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;
    const caption = (formData.get('caption') as string) || null;

    if (!imageFile) {
      return NextResponse.json(
        { error: 'Image file required' },
        { status: 400 }
      );
    }

    // Convert file to base64
    const buffer = await imageFile.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const mimeType = imageFile.type || 'image/png';
    const imageData = `data:${mimeType};base64,${base64}`;

    // Create new estate map (replaces previous)
    const mapId = randomBytes(16).toString('hex');
    const now = Date.now();

    const insertStmt = db.prepare(
      'INSERT INTO estate_maps (id, image_data, caption, uploaded_by, uploaded_at) VALUES (?, ?, ?, ?, ?)'
    );
    insertStmt.run(mapId, imageData, caption, member.id, now);

    return NextResponse.json(
      {
        id: mapId,
        image_data: imageData,
        caption,
        uploaded_by: member.id,
        uploaded_at: now,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Estate map upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
