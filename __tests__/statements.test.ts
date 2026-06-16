import { randomUUID } from 'crypto';
import db from '../lib/db';
import { generateStatement, sendStatementEmail } from '../lib/statements';
import { Statement, EmailLog } from '../lib/types';

describe('Statements', () => {
  let committeeId: string;
  let memberId1: string;
  let memberId2: string;

  beforeEach(() => {
    // Clean up (respect foreign keys)
    db.exec(`
      DELETE FROM statements;
      DELETE FROM email_logs;
      DELETE FROM expenses;
      DELETE FROM contributions;
      DELETE FROM members;
    `);

    // Create test members
    committeeId = randomUUID();
    memberId1 = randomUUID();
    memberId2 = randomUUID();

    const now = Date.now();
    db.prepare(`
      INSERT INTO members (id, email, password_hash, name, role, parcel_count, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(committeeId, 'committee@test.com', 'hash', 'Committee', 'committee', 0, now);

    db.prepare(`
      INSERT INTO members (id, email, password_hash, name, role, parcel_count, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(memberId1, 'member1@test.com', 'hash', 'Member 1', 'member', 4, now);

    db.prepare(`
      INSERT INTO members (id, email, password_hash, name, role, parcel_count, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(memberId2, 'member2@test.com', 'hash', 'Member 2', 'member', 6, now);
  });

  describe('tracer bullet: generateStatement for a month', () => {
    it('generates statement with total in, out by aim, balance, and contributors', async () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth(); // 0-indexed

      // Create contributions this month
      const monthStart = new Date(year, month, 1).getTime();
      const monthEnd = new Date(year, month + 1, 1).getTime();

      db.prepare(`
        INSERT INTO contributions (id, member_id, amount, date, method, notes, recorded_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), memberId1, 100, monthStart + 1000, 'transfer', 'contrib', committeeId, monthStart);

      db.prepare(`
        INSERT INTO contributions (id, member_id, amount, date, method, notes, recorded_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), memberId2, 200, monthStart + 2000, 'transfer', 'contrib', committeeId, monthStart);

      // Create expenses this month
      db.prepare(`
        INSERT INTO expenses (id, description, amount, aim, date, recorded_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        'Court filing',
        150,
        'court_case',
        monthStart + 3000,
        committeeId,
        monthStart
      );

      db.prepare(`
        INSERT INTO expenses (id, description, amount, aim, date, recorded_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        'Fencing',
        100,
        'construction',
        monthStart + 4000,
        committeeId,
        monthStart
      );

      // Generate statement
      const statement = await generateStatement(year, month);

      expect(statement).toBeDefined();
      expect(statement.id).toBeDefined();
      expect(statement.year).toBe(year);
      expect(statement.month).toBe(month);
      expect(statement.total_in).toBe(300); // 100 + 200
      expect(statement.total_out).toBe(250); // 150 + 100
      expect(statement.balance).toBe(50); // 300 - 250
      expect(statement.expenses_by_aim.court_case).toBe(150);
      expect(statement.expenses_by_aim.construction).toBe(100);
      expect(statement.expenses_by_aim.security).toBe(0);
      expect(statement.expenses_by_aim.general).toBe(0);

      // Check contributors
      expect(statement.contributors).toHaveLength(2);
      expect(statement.contributors).toContainEqual({ member_id: memberId1, amount: 100 });
      expect(statement.contributors).toContainEqual({ member_id: memberId2, amount: 200 });

      // HTML content should exist
      expect(statement.html_content).toBeDefined();
      expect(statement.html_content.length).toBeGreaterThan(0);

      // Verify in DB
      const row = db.prepare('SELECT * FROM statements WHERE id = ?').get(statement.id) as any;
      expect(row).toBeDefined();
      expect(row.year).toBe(year);
      expect(row.month).toBe(month);
    });
  });

  describe('email sending', () => {
    it('sends statement email to member and logs it in email_logs', async () => {
      // Generate a statement first
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const monthStart = new Date(year, month, 1).getTime();

      db.prepare(`
        INSERT INTO contributions (id, member_id, amount, date, method, notes, recorded_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), memberId1, 100, monthStart + 1000, 'transfer', 'test', committeeId, monthStart);

      const statement = await generateStatement(year, month);

      // Send email to member
      const emailLog = await sendStatementEmail(memberId1, statement);

      expect(emailLog).toBeDefined();
      expect(emailLog.id).toBeDefined();
      expect(emailLog.to).toBe('member1@test.com');
      expect(emailLog.subject).toContain('Statement');
      expect(emailLog.status).toBe('sent');
      expect(emailLog.sent_at).toBeDefined();
      expect(emailLog.created_at).toBeDefined();

      // Verify in DB
      const row = db.prepare('SELECT * FROM email_logs WHERE id = ?').get(emailLog.id) as any;
      expect(row).toBeDefined();
      expect(row.to_email).toBe('member1@test.com');
      expect(row.status).toBe('sent');
    });
  });
});
