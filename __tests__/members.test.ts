import db from '../lib/db';
import { verifyPassword } from '../lib/auth';
import { createMember, listMembers, updateMemberRole, deactivateMember } from '../lib/members';

describe('Member management', () => {
  beforeEach(() => {
    db.exec(`DELETE FROM members;`);
  });

  describe('tracer bullet: create and list members', () => {
    it('creates a member with a hashed password and active status', async () => {
      const member = await createMember({
        email: 'new@test.com',
        name: 'New Member',
        role: 'member',
        parcel_count: 3,
        password: 'secret123',
      });

      expect(member.id).toBeDefined();
      expect(member.email).toBe('new@test.com');
      expect(member.name).toBe('New Member');
      expect(member.role).toBe('member');
      expect(member.parcel_count).toBe(3);
      expect(member.status).toBe('active');

      // Password is stored hashed, not in plaintext
      const row = db.prepare('SELECT password_hash FROM members WHERE id = ?').get(member.id) as any;
      expect(row.password_hash).not.toBe('secret123');
      expect(await verifyPassword('secret123', row.password_hash)).toBe(true);
    });
  });

  describe('listing members', () => {
    it('returns all active members ordered by name', async () => {
      await createMember({ email: 'b@test.com', name: 'Bea', role: 'member', parcel_count: 1, password: 'x' });
      await createMember({ email: 'a@test.com', name: 'Ada', role: 'committee', parcel_count: 2, password: 'x' });

      const members = await listMembers();

      expect(members).toHaveLength(2);
      expect(members[0].name).toBe('Ada');
      expect(members[1].name).toBe('Bea');
    });

    it('excludes deactivated members', async () => {
      // Keep an owner around so deactivating the member is allowed
      await createMember({ email: 'owner@test.com', name: 'Owner', role: 'owner', parcel_count: 0, password: 'x' });
      const m = await createMember({ email: 'gone@test.com', name: 'Gone', role: 'member', parcel_count: 1, password: 'x' });

      await deactivateMember(m.id);

      const members = await listMembers();
      expect(members.find((x) => x.id === m.id)).toBeUndefined();
    });
  });

  describe('role assignment', () => {
    it('promotes a member to committee', async () => {
      const m = await createMember({ email: 'p@test.com', name: 'Pat', role: 'member', parcel_count: 1, password: 'x' });

      const updated = await updateMemberRole(m.id, 'committee');

      expect(updated.role).toBe('committee');
      const row = db.prepare('SELECT role FROM members WHERE id = ?').get(m.id) as any;
      expect(row.role).toBe('committee');
    });
  });

  describe('lock-out protection', () => {
    it('refuses to demote the last remaining owner', async () => {
      const owner = await createMember({ email: 'sole@test.com', name: 'Sole Owner', role: 'owner', parcel_count: 0, password: 'x' });

      await expect(updateMemberRole(owner.id, 'member')).rejects.toThrow();

      const row = db.prepare('SELECT role FROM members WHERE id = ?').get(owner.id) as any;
      expect(row.role).toBe('owner');
    });

    it('refuses to deactivate the last remaining owner', async () => {
      const owner = await createMember({ email: 'sole2@test.com', name: 'Sole Owner 2', role: 'owner', parcel_count: 0, password: 'x' });

      await expect(deactivateMember(owner.id)).rejects.toThrow();

      const row = db.prepare('SELECT status FROM members WHERE id = ?').get(owner.id) as any;
      expect(row.status).toBe('active');
    });

    it('allows demoting an owner when another owner remains', async () => {
      const owner1 = await createMember({ email: 'o1@test.com', name: 'Owner One', role: 'owner', parcel_count: 0, password: 'x' });
      await createMember({ email: 'o2@test.com', name: 'Owner Two', role: 'owner', parcel_count: 0, password: 'x' });

      const updated = await updateMemberRole(owner1.id, 'committee');
      expect(updated.role).toBe('committee');
    });
  });
});
