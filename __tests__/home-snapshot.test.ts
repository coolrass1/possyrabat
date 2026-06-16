import { randomUUID } from 'crypto';
import db from '../lib/db';
import { createCase } from '../app/api/case/actions';
import { getFundSnapshot } from '../app/api/fund/snapshot';
import { getActivityFeed } from '../app/api/activity/feed';

describe('Home Screen - Five Pillars', () => {
  let committeeId: string;
  let memberId: string;

  beforeEach(() => {
    // Delete in correct order to avoid FK constraint violations
    db.exec(`
      DELETE FROM case_actions;
      DELETE FROM case_documents;
      DELETE FROM case_steps;
      DELETE FROM cases;
      DELETE FROM contributions;
      DELETE FROM expenses;
      DELETE FROM members;
    `);

    committeeId = randomUUID();
    memberId = randomUUID();

    db.prepare(`
      INSERT INTO members (id, email, password_hash, name, role, parcel_count, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(committeeId, 'committee@test.com', 'hash', 'Committee', 'committee', 4, Date.now());

    db.prepare(`
      INSERT INTO members (id, email, password_hash, name, role, parcel_count, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(memberId, 'member@test.com', 'hash', 'Member', 'member', 6, Date.now());
  });

  describe('tracer bullet: case status with next hearing countdown', () => {
    it('home page displays case status and next hearing countdown', async () => {
      // Create a case with next hearing 10 days away
      const nextHearingDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).getTime();

      const caseData = {
        title: 'Members v. Occupiers',
        opposing_party: 'Unauthorized Occupiers',
        court: 'District Court',
        stage: 'in progress' as const,
        summary: 'Dispute over land parcels',
        opened_date: Date.now(),
        next_hearing_date: nextHearingDate,
      };

      const createdCase = await createCase(caseData, committeeId);

      // Verify case was created
      expect(createdCase.id).toBeDefined();
      expect(createdCase.stage).toBe('in progress');
      expect(createdCase.next_hearing_date).toBe(nextHearingDate);

      // Verify case is in database for home page to fetch
      const cases = db.prepare('SELECT * FROM cases WHERE deleted_at IS NULL').all();
      expect(cases).toHaveLength(1);
      expect((cases[0] as any).stage).toBe('in progress');
    });
  });

  describe('fund balance with three-way split', () => {
    it('home page can calculate fund balance and allocation by aim', async () => {
      // Create some expenses with different aims
      const now = Date.now();

      // Verify members exist
      const members = db.prepare('SELECT COUNT(*) as count FROM members').get() as any;
      expect(members.count).toBe(2);

      db.prepare(`
        INSERT INTO expenses (id, description, amount, aim, date, recorded_by, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), 'Court filing fee', 500, 'court_case', now, committeeId, 'recorded', now);

      db.prepare(`
        INSERT INTO expenses (id, description, amount, aim, date, recorded_by, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), 'Fence materials', 300, 'construction', now, committeeId, 'recorded', now);

      db.prepare(`
        INSERT INTO expenses (id, description, amount, aim, date, recorded_by, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), 'Security guard', 200, 'security', now, committeeId, 'recorded', now);

      // Create contributions to offset
      db.prepare(`
        INSERT INTO contributions (id, member_id, amount, date, recorded_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), memberId, 500, now, committeeId, now);

      db.prepare(`
        INSERT INTO contributions (id, member_id, amount, date, recorded_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), memberId, 500, now, committeeId, now);

      // Verify data was inserted
      const expenseCount = db.prepare('SELECT COUNT(*) as count FROM expenses').get() as any;
      const contributionCount = db.prepare('SELECT COUNT(*) as count FROM contributions').get() as any;

      expect(expenseCount.count).toBe(3);
      expect(contributionCount.count).toBe(2);

      // Calculate totals
      const totalContributions = (db.prepare('SELECT SUM(amount) as total FROM contributions WHERE deleted_at IS NULL').get() as any).total || 0;
      const totalExpenses = (db.prepare('SELECT SUM(amount) as total FROM expenses WHERE deleted_at IS NULL').get() as any).total || 0;
      const balance = totalContributions - totalExpenses;

      expect(totalContributions).toBe(1000);
      expect(totalExpenses).toBe(1000);
      expect(balance).toBe(0);
    });
  });

  describe('member parcel count', () => {
    it('home page displays member parcel count and holdings', async () => {
      // Member has 6 parcels (set in beforeEach)
      const member = db.prepare('SELECT * FROM members WHERE id = ?').get(memberId) as any;

      expect(member.parcel_count).toBe(6);
      expect(member.name).toBe('Member');
      expect(member.role).toBe('member');
    });
  });

  describe('this month contributions', () => {
    it('home page calculates this month contributions total', async () => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

      // Create contribution this month
      db.prepare(`
        INSERT INTO contributions (id, member_id, amount, date, recorded_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), memberId, 200, monthStart, committeeId, Date.now());

      // Create contribution last month
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
      db.prepare(`
        INSERT INTO contributions (id, member_id, amount, date, recorded_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), memberId, 150, lastMonth, committeeId, Date.now());

      // Calculate this month total
      const thisMonthTotal = (db.prepare(
        'SELECT SUM(amount) as total FROM contributions WHERE date >= ? AND deleted_at IS NULL'
      ).get(monthStart) as any).total || 0;

      expect(thisMonthTotal).toBe(200);
    });
  });

  describe('fund snapshot for dashboard', () => {
    it('getFundSnapshot returns balance and allocation by aim', async () => {
      const now = Date.now();

      // Create contributions
      db.prepare(`
        INSERT INTO contributions (id, member_id, amount, date, recorded_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), memberId, 1000, now, committeeId, now);

      // Create expenses with different aims
      db.prepare(`
        INSERT INTO expenses (id, description, amount, aim, date, recorded_by, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), 'Court fee', 200, 'court_case', now, committeeId, 'recorded', now);

      db.prepare(`
        INSERT INTO expenses (id, description, amount, aim, date, recorded_by, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), 'Fencing', 300, 'construction', now, committeeId, 'recorded', now);

      db.prepare(`
        INSERT INTO expenses (id, description, amount, aim, date, recorded_by, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), 'Guard', 150, 'security', now, committeeId, 'recorded', now);

      // Get fund snapshot
      const snapshot = await getFundSnapshot();

      expect(snapshot).toBeDefined();
      expect(snapshot.totalContributions).toBe(1000);
      expect(snapshot.totalExpenses).toBe(650);
      expect(snapshot.balance).toBe(350);
      expect(snapshot.byAim.court_case).toBe(200);
      expect(snapshot.byAim.construction).toBe(300);
      expect(snapshot.byAim.security).toBe(150);
    });

    it('includes this month contributions, excluding earlier months', async () => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15).getTime();

      // This month: 200 + 50
      db.prepare(`
        INSERT INTO contributions (id, member_id, amount, date, recorded_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), memberId, 200, monthStart, committeeId, monthStart);
      db.prepare(`
        INSERT INTO contributions (id, member_id, amount, date, recorded_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), memberId, 50, Date.now(), committeeId, Date.now());

      // Last month: should be excluded
      db.prepare(`
        INSERT INTO contributions (id, member_id, amount, date, recorded_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), memberId, 999, lastMonth, committeeId, lastMonth);

      const snapshot = await getFundSnapshot();

      expect(snapshot.thisMonthContributions).toBe(250);
    });
  });

  describe('activity feed', () => {
    it('getActivityFeed returns recent events in reverse chronological order', async () => {
      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;
      const twoHoursAgo = now - 2 * 60 * 60 * 1000;
      const threeHoursAgo = now - 3 * 60 * 60 * 1000;

      // Create a case
      const caseData = {
        title: 'Members v. Occupiers',
        opposing_party: 'Occupiers',
        court: 'Court',
        stage: 'filed' as const,
        summary: 'Test',
        opened_date: now,
        next_hearing_date: null,
      };
      const createdCase = await createCase(caseData, committeeId);

      // Add events in scrambled order
      // Case step (oldest)
      db.prepare(`
        INSERT INTO case_steps (id, case_id, date, description, type, logged_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        createdCase.id,
        threeHoursAgo,
        'Case filed',
        'filing',
        committeeId,
        threeHoursAgo
      );

      // Contribution (middle)
      db.prepare(`
        INSERT INTO contributions (id, member_id, amount, date, recorded_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), memberId, 500, twoHoursAgo, committeeId, twoHoursAgo);

      // Expense (newest)
      db.prepare(`
        INSERT INTO expenses (id, description, amount, aim, date, recorded_by, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        'Court fee',
        200,
        'court_case',
        oneHourAgo,
        committeeId,
        'recorded',
        oneHourAgo
      );

      // Get feed
      const feed = await getActivityFeed(10);

      expect(feed).toHaveLength(3);

      // Should be in reverse chronological order (newest first)
      expect(feed[0].type).toBe('expense');
      expect(feed[0].timestamp).toBe(oneHourAgo);

      expect(feed[1].type).toBe('contribution');
      expect(feed[1].timestamp).toBe(twoHoursAgo);

      expect(feed[2].type).toBe('case_step');
      expect(feed[2].timestamp).toBe(threeHoursAgo);
    });
  });
});
