import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import db from './db';
import { Session, Member, AuthResult } from './types';

const SESSION_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateSessionId(): string {
  return randomBytes(32).toString('hex');
}

export function createSession(memberId: string): Session {
  const sessionId = generateSessionId();
  const now = Date.now();
  const expiresAt = now + SESSION_TTL;

  const stmt = db.prepare(
    'INSERT INTO sessions (id, member_id, expires_at, created_at) VALUES (?, ?, ?, ?)'
  );
  stmt.run(sessionId, memberId, expiresAt, now);

  return {
    id: sessionId,
    member_id: memberId,
    expires_at: expiresAt,
    created_at: now,
  };
}

export function getSessionById(sessionId: string): Session | null {
  const stmt = db.prepare('SELECT * FROM sessions WHERE id = ? AND expires_at > ?');
  const session = stmt.get(sessionId, Date.now()) as Session | undefined;
  return session || null;
}

export function deleteSession(sessionId: string): void {
  const stmt = db.prepare('DELETE FROM sessions WHERE id = ?');
  stmt.run(sessionId);
}

export async function loginMember(email: string, password: string): Promise<AuthResult> {
  const stmt = db.prepare('SELECT * FROM members WHERE email = ?');
  const member = stmt.get(email) as Member | undefined;

  if (!member) {
    return { success: false, error: 'Invalid email or password' };
  }

  const passwordMatch = await verifyPassword(password, member.password_hash);
  if (!passwordMatch) {
    return { success: false, error: 'Invalid email or password' };
  }

  const session = createSession(member.id);
  return { success: true, session };
}

export function getMemberById(memberId: string): Member | null {
  const stmt = db.prepare('SELECT * FROM members WHERE id = ?');
  const member = stmt.get(memberId) as any;
  if (!member) return null;
  return { ...member, must_change_password: !!member.must_change_password } as Member;
}
