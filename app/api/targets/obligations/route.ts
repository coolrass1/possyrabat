import { NextRequest, NextResponse } from 'next/server';
import { getSessionById, getMemberById } from '@/lib/auth';
import { listObligations, setObligation } from '@/lib/targets';

export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get('session_id')?.value;
  if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = getSessionById(sessionId);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const quarterId = searchParams.get('quarter_id');
    if (!quarterId) {
      return NextResponse.json({ error: 'Missing quarter_id' }, { status: 400 });
    }

    const obligations = listObligations(quarterId);
    return NextResponse.json(obligations);
  } catch (error) {
    console.error('Fetch obligations error:', error);
    return NextResponse.json({ error: 'Failed to fetch obligations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get('session_id')?.value;
  if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = getSessionById(sessionId);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const actor = getMemberById(session.member_id);
  if (!actor || actor.role === 'member') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { quarter_id, obligations } = await request.json();
    if (!quarter_id || !Array.isArray(obligations)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    for (const ob of obligations) {
      const { member_id, amount_due } = ob;
      if (member_id && amount_due !== undefined) {
        setObligation(member_id, quarter_id, Number(amount_due));
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update obligations error:', error);
    return NextResponse.json({ error: 'Failed to update obligations' }, { status: 500 });
  }
}
