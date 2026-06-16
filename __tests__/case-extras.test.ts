import { randomUUID } from 'crypto';
import db from '../lib/db';
import { createCase, editCase, getCaseById, getCaseCosts } from '../app/api/case/actions';

describe('Case lawyer details & costs', () => {
  let committeeId: string;

  beforeEach(() => {
    db.exec(`
      DELETE FROM expenses;
      DELETE FROM cases;
      DELETE FROM members;
    `);
    committeeId = randomUUID();
    db.prepare(`
      INSERT INTO members (id, email, password_hash, name, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(committeeId, 'c@test.com', 'h', 'Committee', 'committee', Date.now());
  });

  async function makeCase() {
    return createCase(
      {
        title: 'Recover parcels',
        opposing_party: 'Occupiers',
        court: 'Tribunal',
        stage: 'in progress',
        summary: null,
        opened_date: Date.now(),
        next_hearing_date: null,
      },
      committeeId
    );
  }

  describe('lawyer details', () => {
    it('persists lawyer name and contact via editCase', async () => {
      const c = await makeCase();
      expect(c.lawyer_name).toBeNull();

      await editCase(c.id, { lawyer_name: 'Maître Diop', lawyer_contact: 'diop@law.sn' }, committeeId);

      const reloaded = await getCaseById(c.id);
      expect(reloaded?.lawyer_name).toBe('Maître Diop');
      expect(reloaded?.lawyer_contact).toBe('diop@law.sn');
    });

    it('leaves lawyer details untouched when editing other fields', async () => {
      const c = await makeCase();
      await editCase(c.id, { lawyer_name: 'Counsel' }, committeeId);

      await editCase(c.id, { stage: 'hearing scheduled' }, committeeId);

      const reloaded = await getCaseById(c.id);
      expect(reloaded?.lawyer_name).toBe('Counsel');
      expect(reloaded?.stage).toBe('hearing scheduled');
    });
  });

  describe('case costs from the ledger', () => {
    it('sums only court_case expenses', async () => {
      const expense = (aim: string, amount: number) =>
        db.prepare(`
          INSERT INTO expenses (id, description, amount, aim, date, recorded_by, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(randomUUID(), aim + ' spend', amount, aim, Date.now(), committeeId, Date.now());

      expense('court_case', 500);
      expense('court_case', 250);
      expense('construction', 1000);
      expense('security', 300);

      const costs = await getCaseCosts();
      expect(costs).toBe(750);
    });

    it('returns 0 when there are no legal expenses', async () => {
      expect(await getCaseCosts()).toBe(0);
    });
  });
});
