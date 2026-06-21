// Land service. Member ownership is keyed on `shares` ONLY — the single source
// of truth. Ownership percentage and allocated surface are DERIVED here, never
// stored as independent columns:
//   percentage = member_shares / total_shares
//   surface    = percentage * land.area
// Supporting documents are real files on disk, reusing the upload rules shared
// with meeting/case documents.

import { randomUUID } from 'crypto';
import { writeFileSync, readFileSync, mkdirSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import db from './db';
import { Land, LandDocument, LandHolding, LandOverview } from './types';
import { validateUpload, mimeForFilename } from './uploads';

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'land-documents');

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function rowToLand(row: any): Land {
  return {
    id: row.id,
    name: row.name,
    reference: row.reference ?? null,
    location: row.location ?? null,
    area: row.area,
    description: row.description ?? null,
    created_at: row.created_at,
  };
}

export interface UpsertLandInput {
  id?: string;
  name: string;
  reference?: string | null;
  location?: string | null;
  area: number;
  description?: string | null;
}

export function upsertLand(input: UpsertLandInput): Land {
  if (!input.name || typeof input.name !== 'string') {
    throw new Error('Name is required');
  }
  if (typeof input.area !== 'number' || input.area <= 0) {
    throw new Error('Area must be a positive number');
  }

  const reference = input.reference ?? null;
  const location = input.location ?? null;
  const description = input.description ?? null;

  if (input.id) {
    const existing = db.prepare('SELECT * FROM land WHERE id = ?').get(input.id);
    if (!existing) {
      throw new Error('Land not found');
    }
    db.prepare(`
      UPDATE land SET name = ?, reference = ?, location = ?, area = ?, description = ?
      WHERE id = ?
    `).run(input.name, reference, location, input.area, description, input.id);
    return rowToLand(db.prepare('SELECT * FROM land WHERE id = ?').get(input.id));
  }

  const id = randomUUID();
  const now = Date.now();
  db.prepare(`
    INSERT INTO land (id, name, reference, location, area, description, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, input.name, reference, location, input.area, description, now);
  return rowToLand(db.prepare('SELECT * FROM land WHERE id = ?').get(id));
}

export function listLand(): Land[] {
  const rows = db.prepare('SELECT * FROM land ORDER BY created_at ASC').all() as any[];
  return rows.map(rowToLand);
}

function totalSharesFor(landId: string): number {
  const r = db
    .prepare('SELECT COALESCE(SUM(shares), 0) as total FROM land_ownership WHERE land_id = ?')
    .get(landId) as { total: number };
  return r.total;
}

export function getMemberLandHoldings(memberId: string): LandHolding[] {
  const rows = db.prepare(`
    SELECT l.*, lo.shares AS member_shares
    FROM land l
    JOIN land_ownership lo ON l.id = lo.land_id
    WHERE lo.member_id = ?
    ORDER BY l.created_at ASC
  `).all(memberId) as any[];

  return rows.map((row) => {
    const land = rowToLand(row);
    const total = totalSharesFor(land.id);
    const percentage = total > 0 ? (row.member_shares / total) * 100 : 0;
    const surface = (percentage / 100) * land.area;
    return {
      land,
      shares: row.member_shares,
      ownership_percentage: round2(percentage),
      surface: round2(surface),
    };
  });
}

export function getLandOverview(): LandOverview {
  const parcels = listLand();
  const total_area = parcels.reduce((sum, p) => sum + p.area, 0);
  const sharesRow = db
    .prepare('SELECT COALESCE(SUM(shares), 0) as total FROM land_ownership')
    .get() as { total: number };
  return {
    total_area: round2(total_area),
    total_shares: sharesRow.total,
    parcels,
  };
}

// --- Supporting documents (real files on disk) ---

function ensureUploadDir(landId: string): string {
  const dir = join(UPLOAD_DIR, landId);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function rowToDocument(row: any): LandDocument {
  return {
    id: row.id,
    land_id: row.land_id,
    filename: row.filename,
    mime_type: row.mime_type ?? null,
    storage_path: row.storage_path,
    uploaded_by: row.uploaded_by,
    created_at: row.created_at,
  };
}

export async function addLandDocument(
  data: { land_id: string; filename: string; fileContent: Buffer },
  committeeId: string
): Promise<LandDocument> {
  const check = validateUpload(data.filename, data.fileContent.length);
  if (!check.ok) {
    throw new Error(check.error);
  }

  const id = randomUUID();
  const now = Date.now();
  const mimeType = mimeForFilename(data.filename);

  const safeName = `${id}-${data.filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const dir = ensureUploadDir(data.land_id);
  const storagePath = join(dir, safeName);
  writeFileSync(storagePath, data.fileContent);

  db.prepare(`
    INSERT INTO land_documents
      (id, land_id, filename, mime_type, storage_path, uploaded_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.land_id, data.filename, mimeType, storagePath, committeeId, now);

  return {
    id,
    land_id: data.land_id,
    filename: data.filename,
    mime_type: mimeType,
    storage_path: storagePath,
    uploaded_by: committeeId,
    created_at: now,
  };
}

export async function getLandDocuments(landId: string): Promise<LandDocument[]> {
  const rows = db.prepare(`
    SELECT * FROM land_documents
    WHERE land_id = ? AND deleted_at IS NULL
    ORDER BY created_at DESC, rowid DESC
  `).all(landId) as any[];
  return rows.map(rowToDocument);
}

export async function getLandDocumentFile(
  documentId: string
): Promise<{ filename: string; mime_type: string; content: Buffer } | null> {
  const doc = db.prepare(`
    SELECT * FROM land_documents WHERE id = ? AND deleted_at IS NULL
  `).get(documentId) as any;

  if (!doc || !doc.storage_path || !existsSync(doc.storage_path)) {
    return null;
  }

  return {
    filename: doc.filename,
    mime_type: doc.mime_type || mimeForFilename(doc.filename),
    content: readFileSync(doc.storage_path),
  };
}

export async function deleteLandDocument(documentId: string): Promise<void> {
  const doc = db.prepare('SELECT * FROM land_documents WHERE id = ?').get(documentId) as any;
  if (doc && doc.storage_path && existsSync(doc.storage_path)) {
    unlinkSync(doc.storage_path);
  }
  db.prepare('UPDATE land_documents SET deleted_at = ? WHERE id = ?').run(Date.now(), documentId);
}
