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

describe('Contribution edit & soft-delete', () => {
  beforeEach(() => {
    db.exec('PRAGMA foreign_keys=OFF; DELETE FROM contributions; DELETE FROM sessions; DELETE FROM members; PRAGMA foreign_keys=ON;');
  });

  async function setup() {
    const passwordHash = await hashPassword('test123');
    const now = Date.now();
    const insertMemberStmt = db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    );
    insertMemberStmt.run('committee-x', 'admin@example.com', passwordHash, 'Admin', 'committee', now);
    insertMemberStmt.run('member-x', 'm@example.com', passwordHash, 'Member', 'member', now);
    const contribId = randomBytes(16).toString('hex');
    db.prepare(
      'INSERT INTO contributions (id, member_id, amount, date, method, notes, recorded_by, created_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(contribId, 'member-x', 100, now - 86400000, 'cash', 'orig', 'committee-x', now, null);
    return { contribId, now };
  }

  it('committee can edit a contribution amount/method/notes', async () => {
    const { contribId } = await setup();
    const committeeSession = createSession('committee-x');
    const { PATCH } = await import('@/app/api/contributions/[id]/route');

    const req = {
      cookies: { get: (n: string) => (n === 'session_id' ? { value: committeeSession.id } : undefined) },
      json: async () => ({ amount: 175, method: 'transfer', notes: 'corrected' }),
    } as any;

    const res = await PATCH(req, { id: contribId });
    expect(res.status).toBe(200);
    const updated = await res.json();
    expect(updated).toMatchObject({ id: contribId, amount: 175, method: 'transfer', notes: 'corrected' });

    const row = db.prepare('SELECT * FROM contributions WHERE id = ?').get(contribId) as any;
    expect(row.amount).toBe(175);
  });

  it('committee can soft-delete a contribution; it leaves history and totals', async () => {
    const { contribId } = await setup();
    const committeeSession = createSession('committee-x');
    const { DELETE } = await import('@/app/api/contributions/[id]/route');

    const req = {
      cookies: { get: (n: string) => (n === 'session_id' ? { value: committeeSession.id } : undefined) },
    } as any;

    const res = await DELETE(req, { id: contribId });
    expect(res.status).toBe(200);

    // Row still exists but is marked deleted
    const row = db.prepare('SELECT * FROM contributions WHERE id = ?').get(contribId) as any;
    expect(row.deleted_at).not.toBeNull();

    // Excluded from member's history
    const memberSession = createSession('member-x');
    const { GET: getHistory } = await import('@/app/api/contributions/my-history/route');
    const histReq = {
      url: 'http://localhost:3000/api/contributions/my-history?page=1&limit=10',
      cookies: { get: (n: string) => (n === 'session_id' ? { value: memberSession.id } : undefined) },
    } as any;
    const hist = await (await getHistory(histReq)).json();
    expect(hist.items).toHaveLength(0);
    expect(hist.total).toBe(0);
  });

  it('regular member cannot edit or delete a contribution', async () => {
    const { contribId } = await setup();
    const memberSession = createSession('member-x');
    const { PATCH, DELETE } = await import('@/app/api/contributions/[id]/route');
    const req = {
      cookies: { get: (n: string) => (n === 'session_id' ? { value: memberSession.id } : undefined) },
      json: async () => ({ amount: 1 }),
    } as any;

    expect((await PATCH(req, { id: contribId })).status).toBe(403);
    expect((await DELETE(req, { id: contribId })).status).toBe(403);
  });
});
