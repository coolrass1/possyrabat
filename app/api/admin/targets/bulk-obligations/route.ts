import { NextRequest, NextResponse } from 'next/server';
import { getSessionById, getMemberById } from '@/lib/auth';
import db from '@/lib/db';
import { setObligation } from '@/lib/targets';
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

    const actor = getMemberById(session.member_id);
    if (!actor || actor.role === 'member') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { quarter_id, global_target, strategy } = await request.json();

    if (!quarter_id || !global_target || !strategy) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (strategy !== 'equal') {
      return NextResponse.json({ error: 'Unknown strategy' }, { status: 400 });
    }

    // Get all active members (exclude committee/owner)
    const members = db.prepare(
      'SELECT id FROM members WHERE status = ? AND role = ? ORDER BY id ASC'
    ).all('active', 'member') as Array<{ id: string }>;

    if (members.length === 0) {
      return NextResponse.json({ error: 'No active members' }, { status: 400 });
    }

    // Calculate per-member obligation (equal split)
    const perMemberObligation = global_target / members.length;

    // Set obligations for each member
    members.forEach((member) => {
      setObligation(member.id, quarter_id, perMemberObligation);
    });

    return NextResponse.json({
      quarter_id,
      global_target,
      strategy,
      member_count: members.length,
      per_member_obligation: perMemberObligation,
      message: `Set obligations for ${members.length} members`,
    });
  } catch (error: any) {
    console.error('Bulk obligations error:', error);
    return NextResponse.json({ error: 'Failed to set obligations' }, { status: 500 });
  }
}
