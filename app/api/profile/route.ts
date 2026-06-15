import { NextRequest, NextResponse } from 'next/server';
import { getSessionById, getMemberById } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('session_id')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const session = getSessionById(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const member = getMemberById(session.member_id);
    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    // Return profile without password hash
    return NextResponse.json({
      id: member.id,
      email: member.email,
      name: member.name,
      phone: member.phone,
      photo_url: member.photo_url,
      role: member.role,
      created_at: member.created_at,
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('session_id')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const session = getSessionById(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const member = getMemberById(session.member_id);
    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, phone, photo_url } = body;

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone);
    }
    if (photo_url !== undefined) {
      updates.push('photo_url = ?');
      values.push(photo_url);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    values.push(member.id);

    const updateStmt = db.prepare(
      `UPDATE members SET ${updates.join(', ')} WHERE id = ?`
    );
    updateStmt.run(...values);

    // Fetch updated member
    const updatedMember = getMemberById(member.id);

    return NextResponse.json({
      id: updatedMember!.id,
      email: updatedMember!.email,
      name: updatedMember!.name,
      phone: updatedMember!.phone,
      photo_url: updatedMember!.photo_url,
      role: updatedMember!.role,
      created_at: updatedMember!.created_at,
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
