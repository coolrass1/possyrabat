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
