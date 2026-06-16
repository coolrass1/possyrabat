import { randomUUID } from 'crypto';
import db from '../lib/db';
import { createPost, listPosts } from '../lib/community';

describe('Community posts', () => {
  let memberId: string;

  beforeEach(() => {
    db.exec(`
      DELETE FROM community_posts;
      DELETE FROM members;
    `);
    memberId = randomUUID();
    db.prepare(`
      INSERT INTO members (id, email, password_hash, name, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(memberId, 'm@test.com', 'h', 'Member', 'member', Date.now());
  });

  describe('tracer bullet: create and list a story', () => {
    it('creates a story post and lists it', async () => {
      const post = await createPost({
        type: 'story',
        title: 'Harvest day',
        body: 'We gathered at the east field.',
        image_data: null,
        author_id: memberId,
      });

      expect(post.id).toBeDefined();
      expect(post.type).toBe('story');
      expect(post.title).toBe('Harvest day');

      const stories = await listPosts('story');
      expect(stories).toHaveLength(1);
      expect(stories[0].body).toBe('We gathered at the east field.');
    });
  });

  describe('listing by type', () => {
    it('separates notices, stories and gratitude', async () => {
      await createPost({ type: 'notice', title: 'Water off', body: 'Tuesday', image_data: null, author_id: memberId });
      await createPost({ type: 'gratitude', title: null, body: 'Thank you Ada', image_data: null, author_id: memberId });
      await createPost({ type: 'story', title: 'Trip', body: 'Lovely', image_data: null, author_id: memberId });

      expect(await listPosts('notice')).toHaveLength(1);
      expect(await listPosts('gratitude')).toHaveLength(1);
      expect(await listPosts('story')).toHaveLength(1);
    });

    it('returns newest first', async () => {
      await createPost({ type: 'gratitude', title: null, body: 'first', image_data: null, author_id: memberId });
      await createPost({ type: 'gratitude', title: null, body: 'second', image_data: null, author_id: memberId });

      const posts = await listPosts('gratitude');
      expect(posts[0].body).toBe('second');
      expect(posts[1].body).toBe('first');
    });
  });
});
