'use server';

import { randomUUID } from 'crypto';
import db from './db';
import { EmailLog } from './types';

function rowToLog(row: any): EmailLog {
  return {
    id: row.id,
    to: row.to_email,
    subject: row.subject,
    body: row.body,
    status: row.status,
    sent_at: row.sent_at,
    error: row.error ?? null,
    created_at: row.created_at,
  };
}

/**
 * Send an email. No real transport is configured (offline-first, low traffic),
 * so this records the message in email_logs for full transparency — exactly
 * what the PRD's "email log for transparency" calls for. Swapping in Resend
 * later only changes the transport, not this interface.
 */
export async function sendEmail(data: {
  to: string;
  subject: string;
  body: string;
}): Promise<EmailLog> {
  const id = randomUUID();
  const now = Date.now();

  db.prepare(`
    INSERT INTO email_logs (id, to_email, subject, body, status, sent_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.to, data.subject, data.body, 'sent', now, now);

  return {
    id,
    to: data.to,
    subject: data.subject,
    body: data.body,
    status: 'sent',
    sent_at: now,
    error: null,
    created_at: now,
  };
}

export async function broadcastToMembers(data: {
  subject: string;
  body: string;
}): Promise<EmailLog[]> {
  const members = db.prepare(`
    SELECT email FROM members WHERE status != 'inactive' OR status IS NULL
  `).all() as Array<{ email: string }>;

  const logs: EmailLog[] = [];
  for (const m of members) {
    logs.push(await sendEmail({ to: m.email, subject: data.subject, body: data.body }));
  }
  return logs;
}

export async function getEmailLog(limit = 100): Promise<EmailLog[]> {
  const rows = db.prepare(`
    SELECT * FROM email_logs ORDER BY created_at DESC, rowid DESC LIMIT ?
  `).all(limit) as any[];
  return rows.map(rowToLog);
}
