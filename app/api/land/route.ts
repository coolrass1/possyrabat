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

    const { name, location, area } = await request.json();

    // Validation
    if (!name || !area) {
      return NextResponse.json({ error: 'Name and area are required' }, { status: 400 });
    }

    if (typeof area !== 'number' || area <= 0) {
      return NextResponse.json({ error: 'Area must be a positive number' }, { status: 400 });
    }

    // Create land
    const landId = randomBytes(16).toString('hex');
    const now = Date.now();

    db.prepare(
      'INSERT INTO land (id, name, location, area, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(landId, name, location || null, area, now);

    const land = db.prepare('SELECT * FROM land WHERE id = ?').get(landId) as any;

    return NextResponse.json(
      {
        id: land.id,
        name: land.name,
        location: land.location,
        area: land.area,
        created_at: land.created_at,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create land error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    const lands = db.prepare('SELECT * FROM land').all() as any[];

    return NextResponse.json(
      lands.map((l) => ({
        id: l.id,
        name: l.name,
        location: l.location,
        area: l.area,
        created_at: l.created_at,
      }))
    );
  } catch (error) {
    console.error('Get land error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
