import { randomUUID } from 'crypto';
import db from '../lib/db';
import {
  createCampaign,
  listCampaigns,
  getCampaignProgress,
  setCampaignStatus,
} from '../lib/campaigns';

describe('Campaigns', () => {
  let committeeId: string;

  beforeEach(() => {
    db.exec(`
      DELETE FROM campaigns;

      DELETE FROM target_payments;

      DELETE FROM members;
    `);
    committeeId = randomUUID();
    db.prepare(`
      INSERT INTO members (id, email, password_hash, name, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(committeeId, 'c@test.com', 'h', 'Committee', 'committee', Date.now());
  });

  describe('tracer bullet: create and list', () => {
    it('committee creates a campaign and reads it back', async () => {
      const c = await createCampaign({
        name: 'Fencing fund',
        purpose: 'Fence the disputed perimeter',
        aim: 'security',
        target_amount: 5000,
        deadline: Date.now() + 30 * 86400000,
        created_by: committeeId,
      });

      expect(c.id).toBeDefined();
      expect(c.name).toBe('Fencing fund');
      expect(c.aim).toBe('security');
      expect(c.target_amount).toBe(5000);
      expect(c.status).toBe('active');

      const all = await listCampaigns();
      expect(all).toHaveLength(1);
      expect(all[0].name).toBe('Fencing fund');
    });
  });

  describe('progress', () => {
    it('sums contributions received within the campaign window', async () => {
      const start = Date.now();
      const c = await createCampaign({
        name: 'Legal push',
        purpose: null,
        aim: 'court_case',
        target_amount: 3000,
        deadline: start + 10 * 86400000,
        created_by: committeeId,
      });

      const contribute = (amount: number, date: number) =>
        db.prepare(`
          INSERT INTO target_payments (id, member_id, amount, date_paid, method, recorded_by, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(randomUUID(), committeeId, amount, date, 'cash', committeeId, date);

      contribute(1000, start + 86400000); // within window
      contribute(500, start + 2 * 86400000); // within window
      contribute(800, start - 86400000); // before campaign started — excluded

      const progress = await getCampaignProgress(c.id);
      expect(progress.raised).toBe(1500);
      expect(progress.target).toBe(3000);
      expect(progress.percent).toBe(50);
    });
  });

  describe('status', () => {
    it('marks a campaign completed', async () => {
      const c = await createCampaign({
        name: 'Done soon',
        purpose: null,
        aim: 'general',
        target_amount: 100,
        deadline: null,
        created_by: committeeId,
      });

      const updated = await setCampaignStatus(c.id, 'completed');
      expect(updated.status).toBe('completed');
    });
  });
});
