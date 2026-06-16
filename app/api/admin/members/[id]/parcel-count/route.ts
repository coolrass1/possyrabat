import { NextRequest, NextResponse } from 'next/server';
import { getSessionById, getMemberById } from '@/lib/auth';
import db from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { parcel_count } = await request.json();
    const { id: targetMemberId } = await params;

    if (!targetMemberId) {
      return NextResponse.json({ error: 'Member ID required' }, { status: 400 });
    }

    if (typeof parcel_count !== 'number' || parcel_count < 0) {
      return NextResponse.json({ error: 'Invalid parcel count' }, { status: 400 });
    }

    const updateStmt = db.prepare('UPDATE members SET parcel_count = ? WHERE id = ?');
    updateStmt.run(parcel_count, targetMemberId);

    const updated = db.prepare('SELECT * FROM members WHERE id = ?').get(targetMemberId);

    if (!updated) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: (updated as any).id,
      email: (updated as any).email,
      name: (updated as any).name,
      parcel_count: (updated as any).parcel_count,
    });
  } catch (error) {
    console.error('Parcel count update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
