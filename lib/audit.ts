'use server';

import { randomUUID } from 'crypto';
import db from './db';
import { AuditEntry } from './types';

export async function createAuditLog(data: {
  entity_type: AuditEntry['entity_type'];
  entity_id: string;
  action: AuditEntry['action'];
  before_values: Record<string, any> | null;
  after_values: Record<string, any>;
  performed_by: string;
}): Promise<AuditEntry> {
  const id = randomUUID();
  const now = Date.now();

  db.prepare(`
    INSERT INTO audit_log (
      id, entity_type, entity_id, action, before_values, after_values, performed_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.entity_type,
    data.entity_id,
    data.action,
    data.before_values ? JSON.stringify(data.before_values) : null,
    JSON.stringify(data.after_values),
    data.performed_by,
    now
  );

  return {
    id,
    entity_type: data.entity_type,
    entity_id: data.entity_id,
    action: data.action,
    before_values: data.before_values,
    after_values: data.after_values,
    performed_by: data.performed_by,
    created_at: now,
  };
}

export async function getAuditLogs(options: {
  entity_type?: AuditEntry['entity_type'];
  startDate?: number;
  endDate?: number;
  limit?: number;
  offset?: number;
} = {}): Promise<{ entries: AuditEntry[]; total: number }> {
  const limit = options.limit || 50;
  const offset = options.offset || 0;

  let query = 'SELECT * FROM audit_log WHERE 1=1';
  const params: any[] = [];

  if (options.entity_type) {
    query += ' AND entity_type = ?';
    params.push(options.entity_type);
  }

  if (options.startDate) {
    query += ' AND created_at >= ?';
    params.push(options.startDate);
  }

  if (options.endDate) {
    query += ' AND created_at <= ?';
    params.push(options.endDate);
  }

  // Get total count
  const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
  const countResult = db.prepare(countQuery).get(...params) as any;
  const total = countResult.count || 0;

  // Get paginated results
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const rows = db.prepare(query).all(...params) as any[];

  const entries: AuditEntry[] = rows.map((row) => ({
    id: row.id,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    action: row.action,
    before_values: row.before_values ? JSON.parse(row.before_values) : null,
    after_values: JSON.parse(row.after_values),
    performed_by: row.performed_by,
    created_at: row.created_at,
  }));

  return { entries, total };
}
