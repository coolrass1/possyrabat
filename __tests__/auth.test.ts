import db from '@/lib/db';
import { loginMember, hashPassword, getMemberById, getSessionById, deleteSession } from '@/lib/auth';
import { initializeDb } from '@/lib/db';

describe('Authentication', () => {
  beforeAll(() => {
    initializeDb();
  });

  beforeEach(() => {
    // Clear tables in proper order to respect foreign keys
    db.exec('DELETE FROM sessions; DELETE FROM members;');
  });

  describe('login', () => {
    it('user can log in with valid email and password', async () => {
      // Setup: create a member
      const password = 'test-password-123';
      const passwordHash = await hashPassword(password);
      const memberId = 'member-1';

      const insertStmt = db.prepare(
        'INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      );
      insertStmt.run(memberId, 'alice@example.com', passwordHash, 'Alice', 'member', Date.now());

      // Act: attempt login
      const result = await loginMember('alice@example.com', password);

      // Assert: login succeeds and session is created
      expect(result.success).toBe(true);
      expect(result.session).toBeDefined();
      expect(result.error).toBeUndefined();

      if (result.session) {
        // Verify session is stored in database
        const sessionInDb = getSessionById(result.session.id);
        expect(sessionInDb).toBeDefined();
        expect(sessionInDb?.member_id).toBe(memberId);
      }
    });

    it('user cannot log in with wrong password', async () => {
      // Setup: create a member
      const password = 'correct-password-123';
      const passwordHash = await hashPassword(password);
      const memberId = 'member-2';

      const insertStmt = db.prepare(
        'INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      );
      insertStmt.run(memberId, 'bob@example.com', passwordHash, 'Bob', 'member', Date.now());

      // Act: attempt login with wrong password
      const result = await loginMember('bob@example.com', 'wrong-password');

      // Assert: login fails
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password');
      expect(result.session).toBeUndefined();
    });

    it('user cannot log in with non-existent email', async () => {
      // Act: attempt login with non-existent email
      const result = await loginMember('nonexistent@example.com', 'any-password');

      // Assert: login fails
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password');
      expect(result.session).toBeUndefined();
    });

    it('authenticated user has valid session', async () => {
      // Setup: create a member and log in
      const password = 'test-password';
      const passwordHash = await hashPassword(password);
      const memberId = 'member-3';

      const insertStmt = db.prepare(
        'INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      );
      insertStmt.run(memberId, 'charlie@example.com', passwordHash, 'Charlie', 'member', Date.now());

      const loginResult = await loginMember('charlie@example.com', password);
      expect(loginResult.success).toBe(true);
      const sessionId = loginResult.session!.id;

      // Act: retrieve session
      const session = getSessionById(sessionId);

      // Assert: session is valid and not expired
      expect(session).toBeDefined();
      expect(session?.expires_at).toBeGreaterThan(Date.now());
    });

    it('user can log out and session is cleared', async () => {
      // Setup: create member and session
      const password = 'test-password';
      const passwordHash = await hashPassword(password);
      const memberId = 'member-4';

      const insertStmt = db.prepare(
        'INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      );
      insertStmt.run(memberId, 'david@example.com', passwordHash, 'David', 'member', Date.now());

      const loginResult = await loginMember('david@example.com', password);
      expect(loginResult.success).toBe(true);
      const sessionId = loginResult.session!.id;

      // Verify session exists
      let session = getSessionById(sessionId);
      expect(session).toBeDefined();

      // Act: delete session (logout)
      deleteSession(sessionId);

      // Assert: session no longer exists
      session = getSessionById(sessionId);
      expect(session).toBeNull();
    });
  });
});
