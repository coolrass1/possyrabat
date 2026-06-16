'use server';

import { randomUUID } from 'crypto';
import { writeFileSync, readFileSync, mkdirSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import db from './db';
import { MeetingDocument } from './types';
import { validateUpload, mimeForFilename } from './uploads';

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'meeting-documents');

function ensureUploadDir(meetingId: string): string {
  const dir = join(UPLOAD_DIR, meetingId);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function rowToDocument(row: any): MeetingDocument {
  return {
    id: row.id,
    meeting_id: row.meeting_id,
    filename: row.filename,
    kind: row.kind,
    mime_type: row.mime_type ?? null,
    storage_path: row.storage_path,
    uploaded_by: row.uploaded_by,
    created_at: row.created_at,
  };
}

export async function addMeetingDocument(
  data: {
    meeting_id: string;
    filename: string;
    fileContent: Buffer;
    kind: MeetingDocument['kind'];
  },
  committeeId: string
): Promise<MeetingDocument> {
  const check = validateUpload(data.filename, data.fileContent.length);
  if (!check.ok) {
    throw new Error(check.error);
  }

  const id = randomUUID();
  const now = Date.now();
  const mimeType = mimeForFilename(data.filename);

  const safeName = `${id}-${data.filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const dir = ensureUploadDir(data.meeting_id);
  const storagePath = join(dir, safeName);
  writeFileSync(storagePath, data.fileContent);

  db.prepare(`
    INSERT INTO meeting_documents
      (id, meeting_id, filename, kind, mime_type, storage_path, uploaded_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.meeting_id, data.filename, data.kind, mimeType, storagePath, committeeId, now);

  return {
    id,
    meeting_id: data.meeting_id,
    filename: data.filename,
    kind: data.kind,
    mime_type: mimeType,
    storage_path: storagePath,
    uploaded_by: committeeId,
    created_at: now,
  };
}

export async function getMeetingDocuments(meetingId: string): Promise<MeetingDocument[]> {
  const rows = db.prepare(`
    SELECT * FROM meeting_documents
    WHERE meeting_id = ? AND deleted_at IS NULL
    ORDER BY created_at DESC, rowid DESC
  `).all(meetingId) as any[];
  return rows.map(rowToDocument);
}

export async function getMeetingDocumentFile(
  documentId: string
): Promise<{ filename: string; mime_type: string; content: Buffer } | null> {
  const doc = db.prepare(`
    SELECT * FROM meeting_documents WHERE id = ? AND deleted_at IS NULL
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

export async function deleteMeetingDocument(documentId: string): Promise<void> {
  const doc = db.prepare('SELECT * FROM meeting_documents WHERE id = ?').get(documentId) as any;

  if (doc && doc.storage_path && existsSync(doc.storage_path)) {
    unlinkSync(doc.storage_path);
  }

  db.prepare('UPDATE meeting_documents SET deleted_at = ? WHERE id = ?').run(Date.now(), documentId);
}
