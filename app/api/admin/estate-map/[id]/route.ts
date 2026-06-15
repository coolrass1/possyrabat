import { NextRequest, NextResponse } from 'next/server';
import { getSessionById, getMemberById } from '@/lib/auth';
import db from '@/lib/db';

export async function PATCH(request: NextRequest, context: any) {
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

    const { caption } = await request.json();
    const mapId = context.id || context.params?.id;

    if (!mapId) {
      return NextResponse.json({ error: 'Map ID required' }, { status: 400 });
    }

    const updateStmt = db.prepare(
      'UPDATE estate_maps SET caption = ? WHERE id = ?'
    );
    updateStmt.run(caption || null, mapId);

    const updated = db.prepare('SELECT * FROM estate_maps WHERE id = ?').get(mapId);

    if (!updated) {
      return NextResponse.json({ error: 'Estate map not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Estate map update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
