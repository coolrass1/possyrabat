'use server';

import { randomUUID } from 'crypto';
import db from './db';
import { hashPassword } from './auth';
import { Member } from './types';

function rowToMember(row: any): Member {
  return {
    id: row.id,
    email: row.email,
    password_hash: row.password_hash,
    name: row.name,
    phone: row.phone,
    photo_url: row.photo_url,
    parcel_count: row.parcel_count,
    role: row.role,
    status: row.status || 'active',
    created_at: row.created_at,
  };
}

export async function createMember(data: {
  email: string;
  name: string;
  role: 'member' | 'committee' | 'owner';
  parcel_count: number;
  password: string;
}): Promise<Member> {
  const id = randomUUID();
  const now = Date.now();
  const passwordHash = await hashPassword(data.password);

  db.prepare(`
    INSERT INTO members (id, email, password_hash, name, role, parcel_count, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.email, passwordHash, data.name, data.role, data.parcel_count, 'active', now);

  const row = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
  return rowToMember(row);
}

export async function listMembers(): Promise<Member[]> {
  const rows = db.prepare(`
    SELECT * FROM members WHERE status != 'inactive' OR status IS NULL ORDER BY name
  `).all() as any[];
  return rows.map(rowToMember);
}

function countActiveOwners(excludeId?: string): number {
  const row = db.prepare(`
    SELECT COUNT(*) as n FROM members
    WHERE role = 'owner' AND (status != 'inactive' OR status IS NULL) AND id != ?
  `).get(excludeId || '') as any;
  return row.n as number;
}

export async function updateMemberRole(
  memberId: string,
  role: 'member' | 'committee' | 'owner'
): Promise<Member> {
  const current = db.prepare('SELECT role FROM members WHERE id = ?').get(memberId) as any;
  if (!current) throw new Error('Member not found');

  // Prevent locking everyone out: the last owner cannot be demoted.
  if (current.role === 'owner' && role !== 'owner' && countActiveOwners(memberId) === 0) {
    throw new Error('Cannot demote the last remaining owner');
  }

  db.prepare('UPDATE members SET role = ? WHERE id = ?').run(role, memberId);
  return rowToMember(db.prepare('SELECT * FROM members WHERE id = ?').get(memberId));
}

export async function deactivateMember(memberId: string): Promise<void> {
  const current = db.prepare('SELECT role FROM members WHERE id = ?').get(memberId) as any;
  if (!current) throw new Error('Member not found');

  if (current.role === 'owner' && countActiveOwners(memberId) === 0) {
    throw new Error('Cannot deactivate the last remaining owner');
  }

  db.prepare(`UPDATE members SET status = 'inactive' WHERE id = ?`).run(memberId);
}
