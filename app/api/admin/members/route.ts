import { NextRequest, NextResponse } from 'next/server';
import { getSessionById, getMemberById } from '@/lib/auth';
import { createMember, listMembers } from '@/lib/members';

export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get('session_id')?.value;
  if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = getSessionById(sessionId);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const actor = getMemberById(session.member_id);
  if (!actor || actor.role === 'member') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const members = await listMembers();
  // Never leak password hashes
  return NextResponse.json(
    members.map(({ password_hash, ...rest }) => rest)
  );
}

export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get('session_id')?.value;
  if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = getSessionById(sessionId);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const actor = getMemberById(session.member_id);
  // Only the owner can add members / assign roles (PRD §3)
  if (!actor || actor.role !== 'owner') {
    return NextResponse.json({ error: 'Only the owner can add members' }, { status: 403 });
  }

  try {
    const { email, name, role, parcel_count, password } = await request.json();
    if (!email || !password || !name) {
      return NextResponse.json({ error: 'email, name and password are required' }, { status: 400 });
    }
    if (!['member', 'committee', 'owner'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const member = await createMember({
      email,
      name,
      role,
      parcel_count: Number(parcel_count) || 0,
      password,
    });

    const { password_hash, ...safe } = member;
    return NextResponse.json(safe);
  } catch (error: any) {
    if (String(error?.message || '').includes('UNIQUE')) {
      return NextResponse.json({ error: 'A member with that email already exists' }, { status: 409 });
    }
    console.error('Create member error:', error);
    return NextResponse.json({ error: 'Failed to create member' }, { status: 500 });
  }
}
