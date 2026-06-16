import { NextRequest, NextResponse } from 'next/server';
import { getSessionById, getMemberById } from '@/lib/auth';
import { getRules, setRules } from '@/lib/settings';

export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get('session_id')?.value;
  if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = getSessionById(sessionId);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json({ rules_text: getRules() });
}

export async function PUT(request: NextRequest) {
  const sessionId = request.cookies.get('session_id')?.value;
  if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = getSessionById(sessionId);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const actor = getMemberById(session.member_id);
  if (!actor || actor.role === 'member') {
    return NextResponse.json({ error: 'Only committee members can edit the rules' }, { status: 403 });
  }

  const { rules_text } = await request.json();
  if (typeof rules_text !== 'string') {
    return NextResponse.json({ error: 'rules_text must be a string' }, { status: 400 });
  }

  return NextResponse.json({ rules_text: setRules(rules_text, actor.id) });
}
