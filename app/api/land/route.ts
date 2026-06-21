import { NextRequest, NextResponse } from 'next/server';
import { getSessionById, getMemberById } from '@/lib/auth';
import db from '@/lib/db';
import { upsertLand } from '@/lib/land';

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

    const { id, name, reference, location, area, description } = await request.json();

    // Validation
    if (!name || !area) {
      return NextResponse.json({ error: 'Name and area are required' }, { status: 400 });
    }

    if (typeof area !== 'number' || area <= 0) {
      return NextResponse.json({ error: 'Area must be a positive number' }, { status: 400 });
    }

    const land = upsertLand({
      id: id || undefined,
      name,
      reference: reference ?? null,
      location: location ?? null,
      area,
      description: description ?? null,
    });

    return NextResponse.json(
      {
        id: land.id,
        name: land.name,
        reference: land.reference,
        location: land.location,
        area: land.area,
        description: land.description,
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
        reference: l.reference ?? null,
        location: l.location,
        area: l.area,
        description: l.description ?? null,
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
