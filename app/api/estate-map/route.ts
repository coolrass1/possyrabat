import { NextRequest, NextResponse } from 'next/server';
import { getSessionById } from '@/lib/auth';
import db from '@/lib/db';

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

    // Get the most recent estate map
    const estateMap = db
      .prepare('SELECT * FROM estate_maps ORDER BY uploaded_at DESC LIMIT 1')
      .get();

    if (!estateMap) {
      return NextResponse.json({ error: 'No estate map available' }, { status: 404 });
    }

    return NextResponse.json(estateMap);
  } catch (error) {
    console.error('Estate map fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
