import { randomUUID } from 'crypto';
import db from '../lib/db';
import { initializeDb } from '../lib/db';
import {
  calculateMemberObligation,
  getMemberTotalPaid,
  calculateMemberArrears,
  getMemberStatus,
  getArrearsReport,
} from '../lib/arrears';

describe('Arrears & Obligations', () => {
  let memberId: string;
  let committeeId: string;
  let q1Id: string;

  beforeEach(() => {
    // Clean up
    db.exec(`
      PRAGMA foreign_keys=OFF;
      DELETE FROM contributions;
      DELETE FROM members;
      DELETE FROM target_quarters;
      DELETE FROM target_months;
      DELETE FROM member_quarter_obligations;
      PRAGMA foreign_keys=ON;
    `);

    initializeDb();
    const q1 = db.prepare('SELECT id FROM target_quarters ORDER BY start_date ASC').get() as { id: string };
    q1Id = q1.id;

    // Create test member with 4 parcels
    memberId = randomUUID();
    const now = Date.now();
    db.prepare(`
      INSERT INTO members (id, email, password_hash, name, role, parcel_count, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(memberId, 'member@test.com', 'hash', 'Test Member', 'member', 4, now);

    // Set test member manual obligation to 200
    db.prepare(`
      INSERT INTO member_quarter_obligations (id, member_id, quarter_id, amount_due, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(randomUUID(), memberId, q1Id, 200, now, now);

    // Create committee for recording contributions
    committeeId = randomUUID();
    db.prepare(`
      INSERT INTO members (id, email, password_hash, name, role, parcel_count, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(committeeId, 'committee@test.com', 'hash', 'Committee', 'committee', 0, now);
  });

  describe('tracer bullet: calculate member obligation', () => {
    it('calculates obligation as sum of manual quarter obligations', async () => {
      const obligation = await calculateMemberObligation(memberId);
      expect(obligation).toBe(200);
    });
  });

  describe('member contributions tracking', () => {
    it('sums all contributions for a member', async () => {
      // Record some contributions
      db.prepare(`
        INSERT INTO contributions (id, member_id, amount, date, method, recorded_by, created_at, quarter_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), memberId, 100, Date.now(), 'cash', committeeId, Date.now(), q1Id);

      db.prepare(`
        INSERT INTO contributions (id, member_id, amount, date, method, recorded_by, created_at, quarter_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), memberId, 75, Date.now(), 'transfer', committeeId, Date.now(), q1Id);

      const totalPaid = await getMemberTotalPaid(memberId);
      expect(totalPaid).toBe(175);
    });

    it('returns 0 if member has no contributions', async () => {
      const totalPaid = await getMemberTotalPaid(memberId);
      expect(totalPaid).toBe(0);
    });
  });

  describe('arrears calculation', () => {
    it('calculates arrears as obligation - paid', async () => {
      db.prepare(`
        INSERT INTO contributions (id, member_id, amount, date, method, recorded_by, created_at, quarter_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), memberId, 100, Date.now(), 'cash', committeeId, Date.now(), q1Id);

      const arrears = await calculateMemberArrears(memberId);
      expect(arrears).toBe(100); // 200 - 100
    });

    it('returns negative arrears if overpaid', async () => {
      db.prepare(`
        INSERT INTO contributions (id, member_id, amount, date, method, recorded_by, created_at, quarter_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), memberId, 250, Date.now(), 'cash', committeeId, Date.now(), q1Id);

      const arrears = await calculateMemberArrears(memberId);
      expect(arrears).toBe(-50); // 200 - 250
    });

    it('returns 0 if fully paid', async () => {
      db.prepare(`
        INSERT INTO contributions (id, member_id, amount, date, method, recorded_by, created_at, quarter_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), memberId, 200, Date.now(), 'cash', committeeId, Date.now(), q1Id);

      const arrears = await calculateMemberArrears(memberId);
      expect(arrears).toBe(0);
    });
  });

  describe('member status determination', () => {
    it('status is "paid" when arrears <= 0', async () => {
      db.prepare(`
        INSERT INTO contributions (id, member_id, amount, date, method, recorded_by, created_at, quarter_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), memberId, 250, Date.now(), 'cash', committeeId, Date.now(), q1Id);

      const status = await getMemberStatus(memberId);
      expect(status).toBe('paid');
    });

    it('status is "outstanding" when some amount owed', async () => {
      db.prepare(`
        INSERT INTO contributions (id, member_id, amount, date, method, recorded_by, created_at, quarter_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), memberId, 100, Date.now(), 'cash', committeeId, Date.now(), q1Id);

      const status = await getMemberStatus(memberId);
      expect(status).toBe('outstanding');
    });

    it('status is "partial" when nothing paid but obligation exists', async () => {
      const status = await getMemberStatus(memberId);
      expect(status).toBe('partial');
    });
  });

  describe('arrears report', () => {
    it('lists all members with their obligation and arrears', async () => {
      // Create another member
      const member2Id = randomUUID();
      const now = Date.now();
      db.prepare(`
        INSERT INTO members (id, email, password_hash, name, role, parcel_count, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(member2Id, 'member2@test.com', 'hash', 'Member 2', 'member', 2, now);

      db.prepare(`
        INSERT INTO member_quarter_obligations (id, member_id, quarter_id, amount_due, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), member2Id, q1Id, 100, now, now);

      // Member 1: owes 200, paid 100 (100 outstanding)
      db.prepare(`
        INSERT INTO contributions (id, member_id, amount, date, method, recorded_by, created_at, quarter_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), memberId, 100, Date.now(), 'cash', committeeId, Date.now(), q1Id);

      const report = await getArrearsReport();
      expect(report).toHaveLength(2);

      const member1Report = report.find((r) => r.member_id === memberId);
      expect(member1Report).toBeDefined();
      expect(member1Report?.obligation).toBe(200);
      expect(member1Report?.paid).toBe(100);
      expect(member1Report?.arrears).toBe(100);
      expect(member1Report?.status).toBe('outstanding');

      const member2Report = report.find((r) => r.member_id === member2Id);
      expect(member2Report).toBeDefined();
      expect(member2Report?.obligation).toBe(100);
      expect(member2Report?.paid).toBe(0);
      expect(member2Report?.arrears).toBe(100);
      expect(member2Report?.status).toBe('partial');
    });

    it('filters to only members with arrears > 0', async () => {
      const member2Id = randomUUID();
      const now = Date.now();
      db.prepare(`
        INSERT INTO members (id, email, password_hash, name, role, parcel_count, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(member2Id, 'member2@test.com', 'hash', 'Member 2', 'member', 3, now);

      db.prepare(`
        INSERT INTO member_quarter_obligations (id, member_id, quarter_id, amount_due, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), member2Id, q1Id, 150, now, now);

      // Member 1: owes 200, paid 100 (100 outstanding)
      db.prepare(`
        INSERT INTO contributions (id, member_id, amount, date, method, recorded_by, created_at, quarter_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), memberId, 100, Date.now(), 'cash', committeeId, Date.now(), q1Id);

      // Member 2: owes 150, paid 150 (fully paid)
      db.prepare(`
        INSERT INTO contributions (id, member_id, amount, date, method, recorded_by, created_at, quarter_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), member2Id, 150, Date.now(), 'cash', committeeId, Date.now(), q1Id);

      const report = await getArrearsReport({ arrearOnly: true });
      expect(report).toHaveLength(1);
      expect(report[0].member_id).toBe(memberId);
    });

    it('sorts by arrears amount', async () => {
      const member2Id = randomUUID();
      const member3Id = randomUUID();
      const now = Date.now();

      db.prepare(`
        INSERT INTO members (id, email, password_hash, name, role, parcel_count, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(member2Id, 'member2@test.com', 'hash', 'Member 2', 'member', 2, now);

      db.prepare(`
        INSERT INTO members (id, email, password_hash, name, role, parcel_count, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(member3Id, 'member3@test.com', 'hash', 'Member 3', 'member', 6, now);

      // Set obligations
      db.prepare(`
        INSERT INTO member_quarter_obligations (id, member_id, quarter_id, amount_due, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), member2Id, q1Id, 100, now, now);
      db.prepare(`
        INSERT INTO member_quarter_obligations (id, member_id, quarter_id, amount_due, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), member3Id, q1Id, 300, now, now);

      // Member 1: owes 200, paid 100 (100 outstanding)
      db.prepare(`
        INSERT INTO contributions (id, member_id, amount, date, method, recorded_by, created_at, quarter_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), memberId, 100, Date.now(), 'cash', committeeId, Date.now(), q1Id);

      // Member 2: owes 100, paid 0 (100 outstanding)
      // Member 3: owes 300, paid 200 (100 outstanding)
      db.prepare(`
        INSERT INTO contributions (id, member_id, amount, date, method, recorded_by, created_at, quarter_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), member3Id, 200, Date.now(), 'cash', committeeId, Date.now(), q1Id);

      const report = await getArrearsReport({ sortBy: 'arrears' });
      expect(report).toHaveLength(3);
      expect(report[0].arrears).toBeGreaterThanOrEqual(report[1].arrears);
      expect(report[1].arrears).toBeGreaterThanOrEqual(report[2].arrears);
    });
  });
});
