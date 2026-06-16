import { NextRequest, NextResponse } from 'next/server';
import { getSessionById, getMemberById } from '@/lib/auth';
import { createPost, listPosts } from '@/lib/community';
import { CommunityPost } from '@/lib/types';

const TYPES = ['story', 'notice', 'gratitude'] as const;

export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get('session_id')?.value;
  if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const session = getSessionById(sessionId);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const type = request.nextUrl.searchParams.get('type') as CommunityPost['type'] | null;
  if (!type || !TYPES.includes(type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }
  return NextResponse.json(await listPosts(type));
}

export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get('session_id')?.value;
  if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const session = getSessionById(sessionId);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const actor = getMemberById(session.member_id);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { type, title, body, image_data } = await request.json();
  if (!type || !TYPES.includes(type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }
  if (!body) return NextResponse.json({ error: 'Body is required' }, { status: 400 });

  // Stories and notices are committee-managed; the gratitude wall is open to
  // every member (community life is participatory).
  if ((type === 'story' || type === 'notice') && actor.role === 'member') {
    return NextResponse.json({ error: 'Only committee members can post that' }, { status: 403 });
  }

  const post = await createPost({
    type,
    title: title || null,
    body,
    image_data: image_data || null,
    author_id: actor.id,
  });
  return NextResponse.json(post, { status: 201 });
}
