import { randomUUID } from 'crypto';
import db from '../lib/db';
import { createAuditLog, getAuditLogs } from '../lib/audit';
import { AuditEntry } from '../lib/types';

describe('Audit Logging', () => {
  let committeeId: string;

  beforeEach(() => {
    // Clean up (respect foreign keys)
    db.exec(`
      DELETE FROM audit_log;

      DELETE FROM expenses;
      DELETE FROM target_payments;
      DELETE FROM members;
    `);

    // Create test committee member
    committeeId = randomUUID();
    db.prepare(`
      INSERT INTO members (id, email, password_hash, name, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(committeeId, 'committee@test.com', 'hash', 'Committee', 'committee', Date.now());
  });

  describe('tracer bullet: createAuditLog records an entry', () => {
    it('creates an audit entry with all required fields', async () => {
      const afterValues = { member_id: 'mem-1', amount: 500, date: Date.now() };

      const entry = await createAuditLog({
        entity_type: 'contribution',
        entity_id: 'contrib-1',
        action: 'created',
        before_values: null,
        after_values: afterValues,
        performed_by: committeeId,
      });

      expect(entry).toBeDefined();
      expect(entry.id).toBeDefined();
      expect(entry.entity_type).toBe('contribution');
      expect(entry.entity_id).toBe('contrib-1');
      expect(entry.action).toBe('created');
      expect(entry.before_values).toBeNull();
      expect(entry.after_values).toEqual(afterValues);
      expect(entry.performed_by).toBe(committeeId);
      expect(entry.created_at).toBeDefined();
      expect(typeof entry.created_at).toBe('number');

      // Verify in database
      const row = db.prepare('SELECT * FROM audit_log WHERE id = ?').get(entry.id) as any;
      expect(row).toBeDefined();
      expect(row.entity_type).toBe('contribution');
      expect(JSON.parse(row.after_values)).toEqual(afterValues);
    });

    it('captures before_values when provided (update/delete)', async () => {
      const beforeValues = { amount: 300, date: 12345 };
      const afterValues = { amount: 500, date: 12345 };

      const entry = await createAuditLog({
        entity_type: 'contribution',
        entity_id: 'contrib-2',
        action: 'updated',
        before_values: beforeValues,
        after_values: afterValues,
        performed_by: committeeId,
      });

      expect(entry.before_values).toEqual(beforeValues);
      expect(entry.after_values).toEqual(afterValues);

      const row = db.prepare('SELECT * FROM audit_log WHERE id = ?').get(entry.id) as any;
      expect(JSON.parse(row.before_values)).toEqual(beforeValues);
    });
  });

  describe('contribution logging', () => {
    it('creates an audit entry when a contribution is created', async () => {
      const memberId = randomUUID();
      db.prepare(`
        INSERT INTO members (id, email, password_hash, name, role, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(memberId, 'member@test.com', 'hash', 'Member', 'member', Date.now());

      const contribId = randomUUID();
      const amount = 500;
      const date = Date.now();
      const now = Date.now();

      // Simulate contribution creation with audit log
      db.prepare(`
        INSERT INTO target_payments (id, member_id, amount, date_paid, method, notes, recorded_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(contribId, memberId, amount, date, 'transfer', 'test', committeeId, now);

      // Log the audit entry
      await createAuditLog({
        entity_type: 'contribution',
        entity_id: contribId,
        action: 'created',
        before_values: null,
        after_values: { member_id: memberId, amount, date, method: 'transfer', notes: 'test' },
        performed_by: committeeId,
      });

      // Verify audit entry exists
      const auditLogs = await getAuditLogs({ entity_type: 'contribution' });
      expect(auditLogs.entries).toHaveLength(1);
      expect(auditLogs.entries[0].entity_id).toBe(contribId);
      expect(auditLogs.entries[0].action).toBe('created');
      expect(auditLogs.entries[0].after_values.amount).toBe(amount);
    });

    it('logs contribution updates with before and after values', async () => {
      const memberId = randomUUID();
      db.prepare(`
        INSERT INTO members (id, email, password_hash, name, role, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(memberId, 'member@test.com', 'hash', 'Member', 'member', Date.now());

      const contribId = randomUUID();
      const now = Date.now();

      // Create contribution
      db.prepare(`
        INSERT INTO target_payments (id, member_id, amount, date_paid, method, notes, recorded_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(contribId, memberId, 300, now - 10000, 'transfer', 'old', committeeId, now);

      // Update it
      const newAmount = 500;
      db.prepare(`
        UPDATE target_payments SET amount = ? WHERE id = ?
      `).run(newAmount, contribId);

      // Log the update
      await createAuditLog({
        entity_type: 'contribution',
        entity_id: contribId,
        action: 'updated',
        before_values: { amount: 300 },
        after_values: { amount: newAmount },
        performed_by: committeeId,
      });

      // Verify audit entry
      const auditLogs = await getAuditLogs({ entity_type: 'contribution' });
      const updateEntry = auditLogs.entries[0];
      expect(updateEntry.action).toBe('updated');
      expect(updateEntry.before_values?.amount).toBe(300);
      expect(updateEntry.after_values.amount).toBe(newAmount);
    });

    it('logs contribution deletion', async () => {
      const memberId = randomUUID();
      db.prepare(`
        INSERT INTO members (id, email, password_hash, name, role, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(memberId, 'member@test.com', 'hash', 'Member', 'member', Date.now());

      const contribId = randomUUID();
      const now = Date.now();

      // Create contribution
      db.prepare(`
        INSERT INTO target_payments (id, member_id, amount, date_paid, method, notes, recorded_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(contribId, memberId, 500, now - 10000, 'transfer', 'test', committeeId, now);

      // Soft delete it
      db.prepare(`
        UPDATE target_payments SET deleted_at = ? WHERE id = ?
      `).run(Date.now(), contribId);

      // Log the deletion
      await createAuditLog({
        entity_type: 'contribution',
        entity_id: contribId,
        action: 'deleted',
        before_values: { amount: 500, member_id: memberId },
        after_values: {},
        performed_by: committeeId,
      });

      // Verify audit entry
      const auditLogs = await getAuditLogs({ entity_type: 'contribution' });
      const deleteEntry = auditLogs.entries[0];
      expect(deleteEntry.action).toBe('deleted');
    });
  });

  describe('expense logging', () => {
    it('logs expense creation', async () => {
      const expenseId = randomUUID();
      const now = Date.now();
      const description = 'Court filing fee';
      const amount = 500;
      const aim = 'court_case';

      // Create expense
      db.prepare(`
        INSERT INTO expenses (id, description, amount, aim, date, recorded_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(expenseId, description, amount, aim, now - 5000, committeeId, now);

      // Log it
      await createAuditLog({
        entity_type: 'expense',
        entity_id: expenseId,
        action: 'created',
        before_values: null,
        after_values: { description, amount, aim, date: now - 5000 },
        performed_by: committeeId,
      });

      // Verify
      const auditLogs = await getAuditLogs({ entity_type: 'expense' });
      expect(auditLogs.entries).toHaveLength(1);
      expect(auditLogs.entries[0].entity_id).toBe(expenseId);
      expect(auditLogs.entries[0].after_values.amount).toBe(amount);
    });

    it('logs expense updates', async () => {
      const expenseId = randomUUID();
      const now = Date.now();

      // Create expense
      db.prepare(`
        INSERT INTO expenses (id, description, amount, aim, date, recorded_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(expenseId, 'Old description', 300, 'construction', now - 5000, committeeId, now);

      // Update it
      const newAmount = 400;
      db.prepare(`
        UPDATE expenses SET amount = ? WHERE id = ?
      `).run(newAmount, expenseId);

      // Log it
      await createAuditLog({
        entity_type: 'expense',
        entity_id: expenseId,
        action: 'updated',
        before_values: { amount: 300 },
        after_values: { amount: newAmount },
        performed_by: committeeId,
      });

      // Verify
      const auditLogs = await getAuditLogs({ entity_type: 'expense' });
      expect(auditLogs.entries[0].action).toBe('updated');
      expect(auditLogs.entries[0].before_values?.amount).toBe(300);
      expect(auditLogs.entries[0].after_values.amount).toBe(newAmount);
    });

    it('logs expense deletion', async () => {
      const expenseId = randomUUID();
      const now = Date.now();

      // Create expense
      db.prepare(`
        INSERT INTO expenses (id, description, amount, aim, date, recorded_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(expenseId, 'To delete', 500, 'security', now - 5000, committeeId, now);

      // Soft delete
      db.prepare(`
        UPDATE expenses SET deleted_at = ? WHERE id = ?
      `).run(Date.now(), expenseId);

      // Log it
      await createAuditLog({
        entity_type: 'expense',
        entity_id: expenseId,
        action: 'deleted',
        before_values: { description: 'To delete', amount: 500, aim: 'security' },
        after_values: {},
        performed_by: committeeId,
      });

      // Verify
      const auditLogs = await getAuditLogs({ entity_type: 'expense' });
      expect(auditLogs.entries[0].action).toBe('deleted');
    });
  });

  describe('audit log filtering and pagination', () => {
    it('filters audit entries by entity_type', async () => {
      await createAuditLog({
        entity_type: 'contribution',
        entity_id: 'c1',
        action: 'created',
        before_values: null,
        after_values: { amount: 100 },
        performed_by: committeeId,
      });

      await createAuditLog({
        entity_type: 'expense',
        entity_id: 'e1',
        action: 'created',
        before_values: null,
        after_values: { amount: 50 },
        performed_by: committeeId,
      });

      const contribLogs = await getAuditLogs({ entity_type: 'contribution' });
      const expenseLogs = await getAuditLogs({ entity_type: 'expense' });

      expect(contribLogs.entries).toHaveLength(1);
      expect(contribLogs.entries[0].entity_type).toBe('contribution');

      expect(expenseLogs.entries).toHaveLength(1);
      expect(expenseLogs.entries[0].entity_type).toBe('expense');
    });

    it('filters by date range', async () => {
      const now = Date.now();
      const dayAgo = now - 24 * 60 * 60 * 1000;
      const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

      // Create entries at different times
      db.prepare(`
        INSERT INTO audit_log (id, entity_type, entity_id, action, after_values, performed_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        'contribution',
        'c1',
        'created',
        JSON.stringify({ amount: 100 }),
        committeeId,
        weekAgo
      );

      db.prepare(`
        INSERT INTO audit_log (id, entity_type, entity_id, action, after_values, performed_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        'contribution',
        'c2',
        'created',
        JSON.stringify({ amount: 200 }),
        committeeId,
        dayAgo
      );

      const logsLastDay = await getAuditLogs({
        startDate: dayAgo,
        endDate: now,
      });

      expect(logsLastDay.entries).toHaveLength(1);
      expect(logsLastDay.entries[0].entity_id).toBe('c2');
    });

    it('returns paginated results with total count', async () => {
      // Create 5 audit entries
      for (let i = 0; i < 5; i++) {
        await createAuditLog({
          entity_type: 'contribution',
          entity_id: `c${i}`,
          action: 'created',
          before_values: null,
          after_values: { amount: 100 + i },
          performed_by: committeeId,
        });
      }

      const page1 = await getAuditLogs({ limit: 2, offset: 0 });
      const page2 = await getAuditLogs({ limit: 2, offset: 2 });

      expect(page1.total).toBe(5);
      expect(page1.entries).toHaveLength(2);
      expect(page2.entries).toHaveLength(2);
    });
  });
});
