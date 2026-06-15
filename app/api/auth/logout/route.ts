import { NextRequest, NextResponse } from 'next/server';
import { deleteSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('session_id')?.value;

    if (sessionId) {
      deleteSession(sessionId);
    }

    // Create response and clear cookie
    const response = NextResponse.json(
      { success: true },
      { status: 200 }
    );

    response.cookies.delete('session_id');

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
