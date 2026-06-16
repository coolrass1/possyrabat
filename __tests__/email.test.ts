import { randomUUID } from 'crypto';
import db from '../lib/db';
import { sendEmail, broadcastToMembers, getEmailLog } from '../lib/email';

describe('Email', () => {
  beforeEach(() => {
    db.exec(`
      DELETE FROM email_logs;
      DELETE FROM members;
    `);
  });

  describe('tracer bullet: sendEmail logs a record', () => {
    it('records the email in the transparency log as sent', async () => {
      const log = await sendEmail({
        to: 'someone@test.com',
        subject: 'Hello',
        body: 'A message',
      });

      expect(log.id).toBeDefined();
      expect(log.to).toBe('someone@test.com');
      expect(log.subject).toBe('Hello');
      expect(log.status).toBe('sent');

      const rows = await getEmailLog();
      expect(rows).toHaveLength(1);
      expect(rows[0].subject).toBe('Hello');
    });
  });

  describe('broadcast to members', () => {
    it('sends one email per active member', async () => {
      const now = Date.now();
      const mk = (email: string, status = 'active') =>
        db.prepare(`
          INSERT INTO members (id, email, password_hash, name, role, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(randomUUID(), email, 'h', email, 'member', status, now);

      mk('a@test.com');
      mk('b@test.com');
      mk('gone@test.com', 'inactive');

      const logs = await broadcastToMembers({ subject: 'Notice', body: 'Town hall Friday' });

      expect(logs).toHaveLength(2);
      const recipients = logs.map((l) => l.to).sort();
      expect(recipients).toEqual(['a@test.com', 'b@test.com']);

      const allLogged = await getEmailLog();
      expect(allLogged).toHaveLength(2);
    });
  });

  describe('email log ordering', () => {
    it('returns most recent emails first', async () => {
      await sendEmail({ to: 'x@test.com', subject: 'First', body: '1' });
      await sendEmail({ to: 'y@test.com', subject: 'Second', body: '2' });

      const rows = await getEmailLog();
      expect(rows[0].subject).toBe('Second');
      expect(rows[1].subject).toBe('First');
    });
  });
});
