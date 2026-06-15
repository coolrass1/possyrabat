import db from '@/lib/db';
import { hashPassword, createSession } from '@/lib/auth';
import { initializeDb } from '@/lib/db';
import { GET as getProfile } from '@/app/api/profile/route';

describe('Profile API', () => {
  beforeAll(() => {
    initializeDb();
  });

  beforeEach(() => {
    db.exec('DELETE FROM sessions; DELETE FROM members;');
  });

  describe('GET /api/profile', () => {
    it('member can view their own profile', async () => {
      // Setup: create a member with profile data
      const passwordHash = await hashPassword('test123');
      const memberId = 'member-1';
      const joinDate = Date.now();

      const insertStmt = db.prepare(
        'INSERT INTO members (id, email, password_hash, name, phone, photo_url, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      );
      insertStmt.run(
        memberId,
        'alice@example.com',
        passwordHash,
        'Alice Smith',
        '+1-555-0123',
        'https://example.com/alice.jpg',
        'member',
        joinDate
      );

      // Create a session for this member
      const session = createSession(memberId);

      // Act: create a mock request with session cookie
      const mockRequest = {
        cookies: {
          get: (name: string) => {
            if (name === 'session_id') {
              return { value: session.id };
            }
            return undefined;
          },
        },
      } as any;

      const response = await getProfile(mockRequest);

      // Assert: profile returned with status 200
      expect(response.status).toBe(200);
      const profile = await response.json();

      expect(profile).toEqual({
        id: memberId,
        email: 'alice@example.com',
        name: 'Alice Smith',
        phone: '+1-555-0123',
        photo_url: 'https://example.com/alice.jpg',
        role: 'member',
        created_at: joinDate,
      });
    });
  });

  describe('PATCH /api/profile', () => {
    it('member can update their own profile', async () => {
      // Setup: create a member
      const passwordHash = await hashPassword('test123');
      const memberId = 'member-2';

      const insertStmt = db.prepare(
        'INSERT INTO members (id, email, password_hash, name, phone, photo_url, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      );
      insertStmt.run(
        memberId,
        'bob@example.com',
        passwordHash,
        'Bob Jones',
        null,
        null,
        'member',
        Date.now()
      );

      const session = createSession(memberId);

      // Act: update profile
      const { PATCH: patchProfile } = await import('@/app/api/profile/route');
      const mockRequest = {
        cookies: {
          get: (name: string) => {
            if (name === 'session_id') {
              return { value: session.id };
            }
            return undefined;
          },
        },
        json: async () => ({
          name: 'Robert Jones',
          phone: '+1-555-0456',
          photo_url: 'https://example.com/bob.jpg',
        }),
      } as any;

      const response = await patchProfile(mockRequest);

      // Assert: update successful
      expect(response.status).toBe(200);
      const updated = await response.json();

      expect(updated).toMatchObject({
        id: memberId,
        email: 'bob@example.com',
        name: 'Robert Jones',
        phone: '+1-555-0456',
        photo_url: 'https://example.com/bob.jpg',
        role: 'member',
      });

      // Verify persistence: fetch again
      const verifyRequest = {
        cookies: {
          get: (name: string) => {
            if (name === 'session_id') {
              return { value: session.id };
            }
            return undefined;
          },
        },
      } as any;

      const { GET } = await import('@/app/api/profile/route');
      const verifyResponse = await GET(verifyRequest);
      const verified = await verifyResponse.json();

      expect(verified.name).toBe('Robert Jones');
      expect(verified.phone).toBe('+1-555-0456');
      expect(verified.photo_url).toBe('https://example.com/bob.jpg');
    });

    it('member cannot change their own role', async () => {
      // Setup: create a member
      const passwordHash = await hashPassword('test123');
      const memberId = 'member-3';

      const insertStmt = db.prepare(
        'INSERT INTO members (id, email, password_hash, name, phone, photo_url, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      );
      insertStmt.run(
        memberId,
        'charlie@example.com',
        passwordHash,
        'Charlie',
        null,
        null,
        'member',
        Date.now()
      );

      const session = createSession(memberId);

      // Act: try to update role
      const { PATCH: patchProfile } = await import('@/app/api/profile/route');
      const mockRequest = {
        cookies: {
          get: (name: string) => {
            if (name === 'session_id') {
              return { value: session.id };
            }
            return undefined;
          },
        },
        json: async () => ({
          name: 'Charlie',
          role: 'committee', // Attempt to change role
        }),
      } as any;

      const response = await patchProfile(mockRequest);
      const updated = await response.json();

      // Assert: role was not changed
      expect(updated.role).toBe('member');
    });

    it('PATCH endpoint only updates authenticated user profile', async () => {
      // Setup: create two members
      const passwordHash = await hashPassword('test123');
      const member1Id = 'member-4';
      const member2Id = 'member-5';

      const insertStmt = db.prepare(
        'INSERT INTO members (id, email, password_hash, name, phone, photo_url, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      );
      insertStmt.run(member1Id, 'dave@example.com', passwordHash, 'Dave', null, null, 'member', Date.now());
      insertStmt.run(member2Id, 'eve@example.com', passwordHash, 'Eve', null, null, 'member', Date.now());

      // Member 1 creates a session
      const member1Session = createSession(member1Id);

      // Act: update profile with member 1's session
      const { PATCH: patchProfile } = await import('@/app/api/profile/route');
      const mockRequest = {
        cookies: {
          get: (name: string) => {
            if (name === 'session_id') {
              return { value: member1Session.id };
            }
            return undefined;
          },
        },
        json: async () => ({
          name: 'Dave Updated',
        }),
      } as any;

      const response = await patchProfile(mockRequest);
      const updated = await response.json();

      // Assert: only member 1's profile was updated
      expect(updated.id).toBe(member1Id);
      expect(updated.name).toBe('Dave Updated');

      // Verify member 2's profile is unchanged
      const member2 = db.prepare('SELECT * FROM members WHERE id = ?').get(member2Id);
      expect((member2 as any).name).toBe('Eve');
    });
  });
});
