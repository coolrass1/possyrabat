import db from '@/lib/db';
import { hashPassword, createSession } from '@/lib/auth';
import { initializeDb } from '@/lib/db';
import { randomBytes } from 'crypto';

describe('Expense Recording & Ledger', () => {
  beforeAll(() => {
    initializeDb();
  });

  beforeEach(() => {
    db.exec('PRAGMA foreign_keys=OFF; DELETE FROM expenses; DELETE FROM sessions; DELETE FROM members; PRAGMA foreign_keys=ON;');
  });

  it('committee records expense; members view ledger grouped by aim', async () => {
    // Setup: create committee and member
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

    // Act: committee records expenses
    const { POST: postExpense } = await import('@/app/api/expenses/route');

    const expenses = [
      { description: 'Legal fees', amount: 300, aim: 'court_case' },
      { description: 'Court filing', amount: 200, aim: 'court_case' },
      { description: 'Fencing materials', amount: 500, aim: 'construction' },
      { description: 'Security system', amount: 400, aim: 'security' },
    ];

    for (const expense of expenses) {
      const postRequest = {
        cookies: {
          get: (name: string) => (name === 'session_id' ? { value: committeeSession.id } : undefined),
        },
        json: async () => ({
          description: expense.description,
          amount: expense.amount,
          aim: expense.aim,
          date: now,
          receipt_url: 'https://example.com/receipt.pdf',
        }),
      } as any;

      const postResponse = await postExpense(postRequest);
      expect(postResponse.status).toBe(201);
    }

    // Act: member views ledger
    const memberSession = createSession(memberId);
    const { GET: getLedger } = await import('@/app/api/expenses/ledger/route');
    const getRequest = {
      url: 'http://localhost:3000/api/expenses/ledger',
      cookies: {
        get: (name: string) => (name === 'session_id' ? { value: memberSession.id } : undefined),
      },
    } as any;

    const getResponse = await getLedger(getRequest);

    // Assert: ledger shows totals by aim
    expect(getResponse.status).toBe(200);
    const ledger = await getResponse.json();

    expect(ledger).toMatchObject({
      court_case: 500,
      construction: 500,
      security: 400,
      general: 0,
      total: 1400,
      currency: 'EUR',
    });
  });
});

describe('Expense edit & soft-delete', () => {
  beforeEach(() => {
    db.exec('PRAGMA foreign_keys=OFF; DELETE FROM expenses; DELETE FROM sessions; DELETE FROM members; PRAGMA foreign_keys=ON;');
  });

  async function setup() {
    const passwordHash = await hashPassword('test123');
    const now = Date.now();
    const insertMemberStmt = db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    );
    insertMemberStmt.run('committee-e', 'admin@example.com', passwordHash, 'Admin', 'committee', now);
    insertMemberStmt.run('member-e', 'm@example.com', passwordHash, 'Member', 'member', now);
    const expId = randomBytes(16).toString('hex');
    db.prepare(
      'INSERT INTO expenses (id, description, amount, aim, date, receipt_url, recorded_by, created_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(expId, 'Legal fees', 300, 'court_case', now - 86400000, null, 'committee-e', now, null);
    return { expId };
  }

  it('committee can edit an expense', async () => {
    const { expId } = await setup();
    const committeeSession = createSession('committee-e');
    const { PATCH } = await import('@/app/api/expenses/[id]/route');
    const req = {
      cookies: { get: (n: string) => (n === 'session_id' ? { value: committeeSession.id } : undefined) },
      json: async () => ({ amount: 450, aim: 'construction', description: 'Fence repair' }),
    } as any;

    const res = await PATCH(req, { id: expId });
    expect(res.status).toBe(200);
    const updated = await res.json();
    expect(updated).toMatchObject({ id: expId, amount: 450, aim: 'construction', description: 'Fence repair' });
  });

  it('committee can soft-delete an expense; it leaves the ledger', async () => {
    const { expId } = await setup();
    const committeeSession = createSession('committee-e');
    const { DELETE } = await import('@/app/api/expenses/[id]/route');
    const req = {
      cookies: { get: (n: string) => (n === 'session_id' ? { value: committeeSession.id } : undefined) },
    } as any;

    const res = await DELETE(req, { id: expId });
    expect(res.status).toBe(200);

    const memberSession = createSession('member-e');
    const { GET: getLedger } = await import('@/app/api/expenses/ledger/route');
    const ledReq = {
      url: 'http://localhost:3000/api/expenses/ledger',
      cookies: { get: (n: string) => (n === 'session_id' ? { value: memberSession.id } : undefined) },
    } as any;
    const ledger = await (await getLedger(ledReq)).json();
    expect(ledger.court_case).toBe(0);
    expect(ledger.total).toBe(0);
  });

  it('regular member cannot edit or delete an expense', async () => {
    const { expId } = await setup();
    const memberSession = createSession('member-e');
    const { PATCH, DELETE } = await import('@/app/api/expenses/[id]/route');
    const req = {
      cookies: { get: (n: string) => (n === 'session_id' ? { value: memberSession.id } : undefined) },
      json: async () => ({ amount: 1 }),
    } as any;
    expect((await PATCH(req, { id: expId })).status).toBe(403);
    expect((await DELETE(req, { id: expId })).status).toBe(403);
  });
});

describe('Ledger line items & percentages', () => {
  beforeEach(() => {
    db.exec('PRAGMA foreign_keys=OFF; DELETE FROM expenses; DELETE FROM sessions; DELETE FROM members; PRAGMA foreign_keys=ON;');
  });

  it('ledger returns itemized expenses and per-aim percentages', async () => {
    const passwordHash = await hashPassword('test123');
    const now = Date.now();
    db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('committee-l', 'admin@example.com', passwordHash, 'Admin', 'committee', now);
    db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('member-l', 'm@example.com', passwordHash, 'Member', 'member', now);

    const ins = db.prepare(
      'INSERT INTO expenses (id, description, amount, aim, date, recorded_by, created_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    // court_case 750, construction 250 -> total 1000 (75% / 25%)
    ins.run(randomBytes(8).toString('hex'), 'Legal A', 750, 'court_case', now - 2000, 'committee-l', now, null);
    ins.run(randomBytes(8).toString('hex'), 'Fence B', 250, 'construction', now - 1000, 'committee-l', now, null);

    const memberSession = createSession('member-l');
    const { GET: getLedger } = await import('@/app/api/expenses/ledger/route');
    const req = {
      url: 'http://localhost:3000/api/expenses/ledger',
      cookies: { get: (n: string) => (n === 'session_id' ? { value: memberSession.id } : undefined) },
    } as any;

    const ledger = await (await getLedger(req)).json();

    // Itemized list, newest first
    expect(ledger.items).toHaveLength(2);
    expect(ledger.items[0]).toMatchObject({ description: 'Fence B', amount: 250, aim: 'construction' });
    expect(ledger.items[1]).toMatchObject({ description: 'Legal A', amount: 750, aim: 'court_case' });

    // Percentages by aim
    expect(ledger.percentages).toMatchObject({
      court_case: 75,
      construction: 25,
      security: 0,
      general: 0,
    });

    // Totals still present (backward compatible)
    expect(ledger.total).toBe(1000);
  });
});
