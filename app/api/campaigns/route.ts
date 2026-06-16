import { NextRequest, NextResponse } from 'next/server';
import { getSessionById, getMemberById } from '@/lib/auth';
import { createCampaign, listCampaigns, getCampaignProgress } from '@/lib/campaigns';

export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get('session_id')?.value;
  if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const session = getSessionById(sessionId);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const campaigns = await listCampaigns();
  const withProgress = await Promise.all(
    campaigns.map(async (c) => ({ ...c, progress: await getCampaignProgress(c.id) }))
  );
  return NextResponse.json(withProgress);
}

export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get('session_id')?.value;
  if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const session = getSessionById(sessionId);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const actor = getMemberById(session.member_id);
  if (!actor || actor.role === 'member') {
    return NextResponse.json({ error: 'Only committee members can create campaigns' }, { status: 403 });
  }

  const { name, purpose, aim, target_amount, deadline } = await request.json();
  if (!name || !aim || !target_amount) {
    return NextResponse.json({ error: 'name, aim and target_amount are required' }, { status: 400 });
  }
  if (!['court_case', 'construction', 'security', 'general'].includes(aim)) {
    return NextResponse.json({ error: 'Invalid aim' }, { status: 400 });
  }

  const campaign = await createCampaign({
    name,
    purpose: purpose || null,
    aim,
    target_amount: Number(target_amount),
    deadline: deadline || null,
    created_by: actor.id,
  });
  return NextResponse.json(campaign, { status: 201 });
}
