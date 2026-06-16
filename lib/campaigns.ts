'use server';

import { randomUUID } from 'crypto';
import db from './db';
import { Campaign } from './types';

function rowToCampaign(row: any): Campaign {
  return {
    id: row.id,
    name: row.name,
    purpose: row.purpose ?? null,
    aim: row.aim,
    target_amount: row.target_amount,
    deadline: row.deadline ?? null,
    status: row.status,
    created_by: row.created_by,
    created_at: row.created_at,
  };
}

export async function createCampaign(data: {
  name: string;
  purpose: string | null;
  aim: Campaign['aim'];
  target_amount: number;
  deadline: number | null;
  created_by: string;
}): Promise<Campaign> {
  const id = randomUUID();
  const now = Date.now();

  db.prepare(`
    INSERT INTO campaigns (id, name, purpose, aim, target_amount, deadline, status, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.name, data.purpose, data.aim, data.target_amount, data.deadline, 'active', data.created_by, now);

  return {
    id,
    name: data.name,
    purpose: data.purpose,
    aim: data.aim,
    target_amount: data.target_amount,
    deadline: data.deadline,
    status: 'active',
    created_by: data.created_by,
    created_at: now,
  };
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  const row = db.prepare('SELECT * FROM campaigns WHERE id = ? AND deleted_at IS NULL').get(id) as any;
  return row ? rowToCampaign(row) : null;
}

export async function listCampaigns(): Promise<Campaign[]> {
  const rows = db.prepare(`
    SELECT * FROM campaigns WHERE deleted_at IS NULL ORDER BY created_at DESC
  `).all() as any[];
  return rows.map(rowToCampaign);
}

export interface CampaignProgress {
  raised: number;
  target: number;
  percent: number;
}

/**
 * A campaign's "raised" is the contributions received during its window —
 * from when the push opened (created_at) up to its deadline. Derived from the
 * ledger so it always reflects real money in, never a stored figure.
 */
export async function getCampaignProgress(id: string): Promise<CampaignProgress> {
  const campaign = await getCampaign(id);
  if (!campaign) throw new Error('Campaign not found');

  const until = campaign.deadline ?? Number.MAX_SAFE_INTEGER;
  const row = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM contributions
    WHERE deleted_at IS NULL AND date >= ? AND date <= ?
  `).get(campaign.created_at, until) as any;

  const raised = row.total || 0;
  const target = campaign.target_amount;
  const percent = target > 0 ? Math.round((raised / target) * 100) : 0;

  return { raised, target, percent };
}

export async function setCampaignStatus(
  id: string,
  status: Campaign['status']
): Promise<Campaign> {
  db.prepare('UPDATE campaigns SET status = ? WHERE id = ?').run(status, id);
  const updated = await getCampaign(id);
  if (!updated) throw new Error('Campaign not found');
  return updated;
}
