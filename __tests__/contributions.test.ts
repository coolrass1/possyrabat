import db from '@/lib/db';
import { hashPassword, createSession } from '@/lib/auth';
import { initializeDb } from '@/lib/db';
import { randomBytes } from 'crypto';

describe('Contributions', () => {
  beforeAll(() => {
    initializeDb();
  });

  beforeEach(() => {
    db.exec('PRAGMA foreign_keys=OFF; DELETE FROM contributions; DELETE FROM sessions; DELETE FROM members; PRAGMA foreign_keys=ON;');
  });

  it('committee can record contribution; member views it in history', async () => {
    const passwordHash = await hashPassword('test123');
    const committeeId = 'committee-1';
    const memberId = 'member-1';
    const now = Date.now();

    const insertMemberStmt = db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    );
    insertMemberStmt.run(committeeId, 'admin@example.com', passwordHash, 'Admin', 'committee', now);
    insertMemberStmt.run(memberId, 'alice@example.com', passwordHash, 'Alice', 'member', now);

    const committeeSession = createSession(committeeId);
    const contribDate = now - 7 * 24 * 60 * 60 * 1000;

    const { POST: postContribution } = await import('@/app/api/contributions/route');
    const postRequest = {
      cookies: {
        get: (name: string) => (name === 'session_id' ? { value: committeeSession.id } : undefined),
      },
      json: async () => ({
        member_id: memberId,
        amount: 100,
        date: contribDate,
        method: 'transfer',
        notes: 'Monthly contribution',
      }),
    } as any;

    const postResponse = await postContribution(postRequest);
    expect(postResponse.status).toBe(201);
    const contribution = await postResponse.json();

    expect(contribution).toMatchObject({
      id: expect.any(String),
      member_id: memberId,
      amount: 100,
      method: 'transfer',
      notes: 'Monthly contribution',
      recorded_by: committeeId,
      created_at: expect.any(Number),
    });

    const memberSession = createSession(memberId);
    const { GET: getHistory } = await import('@/app/api/contributions/my-history/route');
    const getRequest = {
      url: 'http://localhost:3000/api/contributions/my-history?page=1&limit=10',
      cookies: {
        get: (name: string) => (name === 'session_id' ? { value: memberSession.id } : undefined),
      },
    } as any;

    const getResponse = await getHistory(getRequest);
    expect(getResponse.status).toBe(200);
    const history = await getResponse.json();

    expect(history.items).toHaveLength(1);
    expect(history.items[0]).toMatchObject({
      id: contribution.id,
      member_id: memberId,
      amount: 100,
      method: 'transfer',
      notes: 'Monthly contribution',
      recorded_by: committeeId,
    });
    expect(history.total).toBe(1);
    expect(history.page).toBe(1);
    expect(history.limit).toBe(10);
  });
});
