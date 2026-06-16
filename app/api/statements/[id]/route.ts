import { NextRequest, NextResponse } from 'next/server';
import { getSessionById } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionId = request.cookies.get('session_id')?.value;
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = getSessionById(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const statement = db.prepare('SELECT * FROM statements WHERE id = ?').get(id) as any;

    if (!statement) {
      return NextResponse.json({ error: 'Statement not found' }, { status: 404 });
    }

    const html = statement.html_content;
    const monthName = new Date(statement.year, statement.month).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="statement-${monthName.replace(/ /g, '-')}.html"`,
      },
    });
  } catch (error) {
    console.error('Statement download error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
