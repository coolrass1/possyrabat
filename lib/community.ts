'use server';

import { randomUUID } from 'crypto';
import db from './db';
import { CommunityPost } from './types';

function rowToPost(row: any): CommunityPost {
  return {
    id: row.id,
    type: row.type,
    title: row.title ?? null,
    body: row.body,
    image_data: row.image_data ?? null,
    author_id: row.author_id,
    created_at: row.created_at,
  };
}

export async function createPost(data: {
  type: CommunityPost['type'];
  title: string | null;
  body: string;
  image_data: string | null;
  author_id: string;
}): Promise<CommunityPost> {
  const id = randomUUID();
  const now = Date.now();

  db.prepare(`
    INSERT INTO community_posts (id, type, title, body, image_data, author_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.type, data.title, data.body, data.image_data, data.author_id, now);

  return {
    id,
    type: data.type,
    title: data.title,
    body: data.body,
    image_data: data.image_data,
    author_id: data.author_id,
    created_at: now,
  };
}

export async function listPosts(type: CommunityPost['type']): Promise<CommunityPost[]> {
  const rows = db.prepare(`
    SELECT * FROM community_posts
    WHERE type = ? AND deleted_at IS NULL
    ORDER BY created_at DESC, rowid DESC
  `).all(type) as any[];
  return rows.map(rowToPost);
}
