import { NextRequest, NextResponse } from 'next/server';
import { getSessionById, getMemberById } from '@/lib/auth';
import { createCase as createCaseAction } from './actions';
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

    const rows = db.prepare(`
      SELECT * FROM cases WHERE deleted_at IS NULL ORDER BY created_at DESC
    `).all() as any[];

    const cases = rows.map(row => ({
      id: row.id,
      title: row.title,
      opposing_party: row.opposing_party,
      court: row.court,
      stage: row.stage,
      summary: row.summary,
      opened_date: row.opened_date,
      next_hearing_date: row.next_hearing_date,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return NextResponse.json(cases);
  } catch (error) {
    console.error('Cases retrieval error:', error);
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

    const {
      title,
      opposing_party,
      court,
      stage,
      summary,
      opened_date,
      next_hearing_date,
    } = await request.json();

    if (!title || !opposing_party || !court || !stage || !opened_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const caseRecord = await createCaseAction(
      {
        title,
        opposing_party,
        court,
        stage,
        summary,
        opened_date,
        next_hearing_date,
      },
      member.id
    );

    return NextResponse.json(caseRecord, { status: 201 });
  } catch (error) {
    console.error('Case creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
