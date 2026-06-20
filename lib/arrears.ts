'use server';

import db from './db';
import { getMemberById } from './auth';

export async function calculateMemberObligation(memberId: string): Promise<number> {
  const member = getMemberById(memberId);
  if (!member) return 0;

  const result = db.prepare(`
    SELECT COALESCE(SUM(amount_due), 0) as total
    FROM member_quarter_obligations
    WHERE member_id = ?
  `).get(memberId) as any;

  return result?.total || 0;
}

export async function getMemberTotalPaid(memberId: string): Promise<number> {
  const result = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM contributions
    WHERE member_id = ? AND deleted_at IS NULL
  `).get(memberId) as any;

  return result.total || 0;
}

export async function calculateMemberArrears(memberId: string): Promise<number> {
  const obligation = await calculateMemberObligation(memberId);
  const paid = await getMemberTotalPaid(memberId);

  return obligation - paid;
}

export async function getMemberStatus(
  memberId: string
): Promise<'paid' | 'partial' | 'outstanding'> {
  const arrears = await calculateMemberArrears(memberId);
  const obligation = await calculateMemberObligation(memberId);

  if (arrears <= 0) return 'paid';
  if (obligation === 0) return 'paid';
  if (arrears === obligation) return 'partial';
  return 'outstanding';
}

export interface ArrearsReportRow {
  member_id: string;
  name: string;
  parcels: number;
  obligation: number;
  paid: number;
  arrears: number;
  status: 'paid' | 'partial' | 'outstanding';
}

export async function getArrearsReport(options?: {
  arrearOnly?: boolean;
  sortBy?: 'name' | 'arrears' | 'obligation';
}): Promise<ArrearsReportRow[]> {
  const members = db.prepare(`
    SELECT id, name, parcel_count FROM members WHERE role = 'member' ORDER BY name
  `).all() as any[];

  const report: ArrearsReportRow[] = [];

  for (const member of members) {
    const obligation = await calculateMemberObligation(member.id);
    const paid = await getMemberTotalPaid(member.id);
    const arrears = obligation - paid;
    const status = await getMemberStatus(member.id);

    if (options?.arrearOnly && arrears <= 0) {
      continue;
    }

    report.push({
      member_id: member.id,
      name: member.name,
      parcels: member.parcel_count,
      obligation,
      paid,
      arrears,
      status,
    });
  }

  // Sort by requested field
  if (options?.sortBy === 'arrears') {
    report.sort((a, b) => b.arrears - a.arrears);
  } else if (options?.sortBy === 'obligation') {
    report.sort((a, b) => b.obligation - a.obligation);
  }
  // Default sort by name is already applied above

  return report;
}
