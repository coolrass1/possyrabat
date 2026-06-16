import db from '@/lib/db';
import { hashPassword, createSession } from '@/lib/auth';
import { initializeDb } from '@/lib/db';
import { randomBytes } from 'crypto';

describe('Fund Balance & Allocation', () => {
  beforeAll(() => {
    initializeDb();
  });

  beforeEach(() => {
    db.exec('PRAGMA foreign_keys=OFF; DELETE FROM expenses; DELETE FROM contributions; DELETE FROM fund_settings; DELETE FROM sessions; DELETE FROM members; PRAGMA foreign_keys=ON;');
  });

  it('member views fund balance calculated from contributions - expenses', async () => {
    const passwordHash = await hashPassword('test123');
    const committeeId = 'committee-1';
    const memberId = 'member-1';

    const insertMemberStmt = db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    );
    insertMemberStmt.run(committeeId, 'admin@example.com', passwordHash, 'Admin', 'committee', Date.now());
    insertMemberStmt.run(memberId, 'alice@example.com', passwordHash, 'Alice', 'member', Date.now());

    const insertContribStmt = db.prepare(
      'INSERT INTO contributions (id, member_id, amount, date, method, recorded_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    insertContribStmt.run(randomBytes(8).toString('hex'), memberId, 1000, Date.now(), 'transfer', committeeId, Date.now());
    insertContribStmt.run(randomBytes(8).toString('hex'), memberId, 500, Date.now(), 'transfer', committeeId, Date.now());

    const insertExpenseStmt = db.prepare(
      'INSERT INTO expenses (id, description, amount, aim, date, recorded_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    insertExpenseStmt.run(randomBytes(8).toString('hex'), 'Legal fees', 300, 'court_case', Date.now(), committeeId, Date.now());
    insertExpenseStmt.run(randomBytes(8).toString('hex'), 'Fencing', 200, 'construction', Date.now(), committeeId, Date.now());

    const memberSession = createSession(memberId);
    const { GET: getBalance } = await import('@/app/api/fund/balance/route');
    const request = {
      cookies: {
        get: (name: string) => (name === 'session_id' ? { value: memberSession.id } : undefined),
      },
    } as any;

    const response = await getBalance(request);
    expect(response.status).toBe(200);
    const balance = await response.json();

    expect(balance).toMatchObject({
      total_in: 1500,
      total_out: 500,
      balance: 1000,
      currency: 'EUR',
    });
  });

  it('member views spending allocation by aim', async () => {
    const passwordHash = await hashPassword('test123');
    const committeeId = 'committee-2';
    const memberId = 'member-2';

    const insertMemberStmt = db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    );
    insertMemberStmt.run(committeeId, 'admin@example.com', passwordHash, 'Admin', 'committee', Date.now());
    insertMemberStmt.run(memberId, 'bob@example.com', passwordHash, 'Bob', 'member', Date.now());

    const insertExpenseStmt = db.prepare(
      'INSERT INTO expenses (id, description, amount, aim, date, recorded_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    insertExpenseStmt.run(randomBytes(8).toString('hex'), 'Legal fees', 300, 'court_case', Date.now(), committeeId, Date.now());
    insertExpenseStmt.run(randomBytes(8).toString('hex'), 'More legal', 200, 'court_case', Date.now(), committeeId, Date.now());
    insertExpenseStmt.run(randomBytes(8).toString('hex'), 'Fencing', 150, 'construction', Date.now(), committeeId, Date.now());
    insertExpenseStmt.run(randomBytes(8).toString('hex'), 'Security guard', 100, 'security', Date.now(), committeeId, Date.now());
    insertExpenseStmt.run(randomBytes(8).toString('hex'), 'Office supplies', 50, 'general', Date.now(), committeeId, Date.now());

    const memberSession = createSession(memberId);
    const { GET: getAllocation } = await import('@/app/api/fund/allocation/route');
    const request = {
      cookies: {
        get: (name: string) => (name === 'session_id' ? { value: memberSession.id } : undefined),
      },
    } as any;

    const response = await getAllocation(request);
    expect(response.status).toBe(200);
    const allocation = await response.json();

    expect(allocation).toMatchObject({
      court_case: 500,
      construction: 150,
      security: 100,
      general: 50,
      total: 800,
      currency: 'EUR',
    });
  });
});
