import { NextRequest, NextResponse } from 'next/server';
import { getSessionById, getMemberById } from '@/lib/auth';
import { setPerParcelFee, setEnabledSections, getSettings } from '@/lib/settings';

export async function PATCH(request: NextRequest) {
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

    const body = await request.json();
    const { per_parcel_fee, enabled_sections } = body;

    if (per_parcel_fee !== undefined) {
      if (typeof per_parcel_fee !== 'number' || per_parcel_fee < 0) {
        return NextResponse.json({ error: 'Fee must be 0 or greater' }, { status: 400 });
      }
    }

    if (enabled_sections !== undefined) {
      if (!Array.isArray(enabled_sections)) {
        return NextResponse.json({ error: 'Enabled sections must be an array' }, { status: 400 });
      }
      for (const section of enabled_sections) {
        if (typeof section !== 'string') {
          return NextResponse.json({ error: 'Each enabled section must be a string' }, { status: 400 });
        }
      }
    }

    let updated = null;
    if (per_parcel_fee !== undefined) {
      updated = setPerParcelFee(per_parcel_fee, member.id);
    }
    if (enabled_sections !== undefined) {
      updated = setEnabledSections(enabled_sections, member.id);
    }

    if (!updated) {
      updated = getSettings();
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Settings update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
