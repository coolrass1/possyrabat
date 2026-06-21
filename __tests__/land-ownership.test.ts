import { randomUUID } from 'crypto';
import { existsSync } from 'fs';
import db from '../lib/db';
import { initializeDb } from '../lib/db';
import { createSession } from '../lib/auth';
import {
  upsertLand,
  getLandOverview,
  getMemberLandHoldings,
  addLandDocument,
  getLandDocuments,
  getLandDocumentFile,
  deleteLandDocument,
} from '../lib/land';

describe('Land (shares-as-truth, derived %/surface, documents)', () => {
  let committeeId: string;

  beforeAll(() => {
    initializeDb();
  });

  beforeEach(() => {
    db.exec(`
      PRAGMA foreign_keys=OFF;
      DELETE FROM land_documents;
      DELETE FROM land_ownership;
      DELETE FROM land;
      DELETE FROM members;
      PRAGMA foreign_keys=ON;
    `);
    initializeDb();
    committeeId = randomUUID();
    db.prepare(`
      INSERT INTO members (id, email, password_hash, name, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(committeeId, 'c@test.com', 'h', 'Committee', 'committee', Date.now());
  });

  describe('land record with reference and description', () => {
    it('creates land with reference, location, area and description', () => {
      const land = upsertLand({
        name: 'Main Parcel',
        reference: 'TF-12345/DK',
        location: 'Dakar',
        area: 5000,
        description: 'A nice cooperative parcel.',
      });

      expect(land.id).toBeDefined();
      expect(land.reference).toBe('TF-12345/DK');
      expect(land.description).toBe('A nice cooperative parcel.');
      expect(land.area).toBe(5000);

      const row = db.prepare('SELECT * FROM land WHERE id = ?').get(land.id) as any;
      expect(row.reference).toBe('TF-12345/DK');
      expect(row.description).toBe('A nice cooperative parcel.');
    });

    it('updates an existing land record by id', () => {
      const land = upsertLand({ name: 'P1', area: 1000 });
      const updated = upsertLand({
        id: land.id,
        name: 'P1 renamed',
        reference: 'REF-9',
        area: 2000,
        description: 'updated',
      });
      expect(updated.id).toBe(land.id);
      expect(updated.name).toBe('P1 renamed');
      expect(updated.area).toBe(2000);
      expect(updated.reference).toBe('REF-9');

      const count = db.prepare('SELECT COUNT(*) as c FROM land').get() as { c: number };
      expect(count.c).toBe(1);
    });
  });

  describe('derived percentage and surface from shares', () => {
    function makeMember(name: string): string {
      const id = randomUUID();
      db.prepare(`
        INSERT INTO members (id, email, password_hash, name, role, status, created_at)
        VALUES (?, ?, ?, ?, 'member', 'active', ?)
      `).run(id, `${name}@test.com`, 'h', name, Date.now());
      return id;
    }

    it('derives percentage and surface for each member holding', () => {
      const land = upsertLand({ name: 'Shared', area: 2000 });
      const alice = makeMember('alice');
      const bob = makeMember('bob');

      const now = Date.now();
      db.prepare(`
        INSERT INTO land_ownership (id, member_id, land_id, shares, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), alice, land.id, 50, now, now);
      db.prepare(`
        INSERT INTO land_ownership (id, member_id, land_id, shares, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), bob, land.id, 150, now, now);

      const holdings = getMemberLandHoldings(alice);
      expect(holdings).toHaveLength(1);
      // 50 / 200 = 25%
      expect(holdings[0].shares).toBe(50);
      expect(holdings[0].ownership_percentage).toBe(25);
      // 25% of 2000 = 500
      expect(holdings[0].surface).toBe(500);
      expect(holdings[0].land.area).toBe(2000);
    });
  });

  describe('cooperative overview totals', () => {
    it('reports total area and total shares (derived)', () => {
      const p1 = upsertLand({ name: 'P1', area: 1000 });
      const p2 = upsertLand({ name: 'P2', area: 3000 });

      const m1 = randomUUID();
      const m2 = randomUUID();
      db.prepare(`INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, 'h', ?, 'member', ?)`)
        .run(m1, 'm1@test.com', 'M1', Date.now());
      db.prepare(`INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, 'h', ?, 'member', ?)`)
        .run(m2, 'm2@test.com', 'M2', Date.now());

      const now = Date.now();
      db.prepare(`INSERT INTO land_ownership (id, member_id, land_id, shares, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`)
        .run(randomUUID(), m1, p1.id, 30, now, now);
      db.prepare(`INSERT INTO land_ownership (id, member_id, land_id, shares, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`)
        .run(randomUUID(), m2, p2.id, 70, now, now);

      const overview = getLandOverview();
      expect(overview.total_area).toBe(4000);
      expect(overview.total_shares).toBe(100);
      expect(overview.parcels).toHaveLength(2);
    });
  });

  describe('supporting documents (real files on disk)', () => {
    it('stores, lists, reads back and deletes a land document', async () => {
      const land = upsertLand({ name: 'Doc Parcel', area: 100 });

      const doc = await addLandDocument(
        {
          land_id: land.id,
          filename: 'title-deed.pdf',
          fileContent: Buffer.from('%PDF- pretend'),
        },
        committeeId
      );
      expect(doc.id).toBeDefined();
      expect(doc.land_id).toBe(land.id);
      expect(doc.mime_type).toBe('application/pdf');
      expect(existsSync(doc.storage_path)).toBe(true);

      const list = await getLandDocuments(land.id);
      expect(list).toHaveLength(1);
      expect(list[0].filename).toBe('title-deed.pdf');

      const file = await getLandDocumentFile(doc.id);
      expect(file).not.toBeNull();
      expect(file!.content.toString()).toBe('%PDF- pretend');

      await deleteLandDocument(doc.id);
      expect(existsSync(doc.storage_path)).toBe(false);
      expect(await getLandDocuments(land.id)).toHaveLength(0);
      expect(await getLandDocumentFile(doc.id)).toBeNull();
    });

    it('rejects disallowed types and oversize files', async () => {
      const land = upsertLand({ name: 'P', area: 1 });
      await expect(
        addLandDocument({ land_id: land.id, filename: 'evil.exe', fileContent: Buffer.from('x') }, committeeId)
      ).rejects.toThrow(/type/i);

      const big = Buffer.alloc(25 * 1024 * 1024 + 1);
      await expect(
        addLandDocument({ land_id: land.id, filename: 'huge.pdf', fileContent: big }, committeeId)
      ).rejects.toThrow(/size|large|25/i);
    });
  });

  describe('document upload route is admin-only', () => {
    function makeMemberSession(): string {
      const id = randomUUID();
      db.prepare(`
        INSERT INTO members (id, email, password_hash, name, role, status, created_at)
        VALUES (?, ?, 'h', ?, 'member', 'active', ?)
      `).run(id, `${id}@test.com`, 'Reader', Date.now());
      return createSession(id).id;
    }

    function fileReq(sessionId: string) {
      const file = new File([Buffer.from('%PDF- deed')], 'deed.pdf', { type: 'application/pdf' });
      const fd = new FormData();
      fd.set('file', file);
      return {
        cookies: { get: (n: string) => (n === 'session_id' ? { value: sessionId } : undefined) },
        formData: async () => fd,
      } as any;
    }

    it('forbids members and accepts committee', async () => {
      const land = upsertLand({ name: 'Routed', area: 10 });
      const { POST } = await import('@/app/api/land/[id]/documents/route');

      const memberRes = await POST(fileReq(makeMemberSession()), {
        params: Promise.resolve({ id: land.id }),
      });
      expect(memberRes.status).toBe(403);

      const committeeRes = await POST(fileReq(createSession(committeeId).id), {
        params: Promise.resolve({ id: land.id }),
      });
      expect(committeeRes.status).toBe(201);
      const body = await committeeRes.json();
      expect(body.land_id).toBe(land.id);
      expect(existsSync(body.storage_path)).toBe(true);
    });
  });
});
