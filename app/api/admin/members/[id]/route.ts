import { NextRequest, NextResponse } from 'next/server';
import { getSessionById, getMemberById } from '@/lib/auth';
import { updateMemberRole, deactivateMember } from '@/lib/members';

async function requireOwner(request: NextRequest) {
  const sessionId = request.cookies.get('session_id')?.value;
  if (!sessionId) return { error: 'Unauthorized', status: 401 as const };
  const session = getSessionById(sessionId);
  if (!session) return { error: 'Unauthorized', status: 401 as const };
  const actor = getMemberById(session.member_id);
  if (!actor || actor.role !== 'owner') return { error: 'Only the owner can manage members', status: 403 as const };
  return { actor };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireOwner(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  try {
    const { role } = await request.json();
    if (!['member', 'committee', 'owner'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }
    const updated = await updateMemberRole(id, role);
    const { password_hash, ...safe } = updated;
    return NextResponse.json(safe);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update role' }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireOwner(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  try {
    await deactivateMember(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to deactivate member' }, { status: 400 });
  }
}
