'use server';

import { randomUUID } from 'crypto';
import { writeFileSync, readFileSync, mkdirSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import db from '@/lib/db';
import { CaseDocument, CaseAction } from '@/lib/types';
import { validateUpload, mimeForFilename } from '@/lib/uploads';

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'case-documents');

function ensureUploadDir(caseId: string) {
  const caseDir = join(UPLOAD_DIR, caseId);
  mkdirSync(caseDir, { recursive: true });
  return caseDir;
}

function rowToDocument(row: any): CaseDocument {
  return {
    id: row.id,
    case_id: row.case_id,
    filename: row.filename,
    mime_type: row.mime_type ?? null,
    storage_path: row.storage_path,
    uploaded_by: row.uploaded_by,
    created_at: row.created_at,
  };
}

function rowToAction(row: any): CaseAction {
  return {
    id: row.id,
    case_id: row.case_id,
    task: row.task,
    assigned_to: row.assigned_to,
    due_date: row.due_date,
    status: row.status,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function uploadCaseDocument(
  data: {
    case_id: string;
    filename: string;
    fileContent: Buffer;
  },
  committeeId: string
): Promise<CaseDocument> {
  const check = validateUpload(data.filename, data.fileContent.length);
  if (!check.ok) {
    throw new Error(check.error);
  }

  const id = randomUUID();
  const now = Date.now();
  const mimeType = mimeForFilename(data.filename);

  // Sanitize filename
  const safeName = `${id}-${data.filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const caseDir = ensureUploadDir(data.case_id);
  const storagePath = join(caseDir, safeName);

  // Write file
  writeFileSync(storagePath, data.fileContent);

  // Record in database
  db.prepare(`
    INSERT INTO case_documents (
      id, case_id, filename, mime_type, storage_path, uploaded_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.case_id,
    data.filename,
    mimeType,
    storagePath,
    committeeId,
    now
  );

  return {
    id,
    case_id: data.case_id,
    filename: data.filename,
    mime_type: mimeType,
    storage_path: storagePath,
    uploaded_by: committeeId,
    created_at: now,
  };
}

export async function getCaseDocuments(caseId: string): Promise<CaseDocument[]> {
  const rows = db.prepare(`
    SELECT * FROM case_documents
    WHERE case_id = ? AND deleted_at IS NULL
    ORDER BY created_at DESC
  `).all(caseId) as any[];

  return rows.map(rowToDocument);
}

export async function getCaseDocumentFile(
  documentId: string
): Promise<{ filename: string; mime_type: string; content: Buffer } | null> {
  const doc = db.prepare(`
    SELECT * FROM case_documents WHERE id = ? AND deleted_at IS NULL
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

export async function deleteCaseDocument(documentId: string): Promise<void> {
  const doc = db.prepare(`
    SELECT * FROM case_documents WHERE id = ?
  `).get(documentId) as any;

  if (doc && doc.storage_path && existsSync(doc.storage_path)) {
    unlinkSync(doc.storage_path);
  }

  db.prepare(`
    UPDATE case_documents SET deleted_at = ? WHERE id = ?
  `).run(Date.now(), documentId);
}

export async function createCaseAction(
  data: {
    case_id: string;
    task: string;
    assigned_to: string;
    due_date: number;
  },
  createdBy: string
): Promise<CaseAction> {
  const id = randomUUID();
  const now = Date.now();

  db.prepare(`
    INSERT INTO case_actions (
      id, case_id, task, assigned_to, due_date, status, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.case_id,
    data.task,
    data.assigned_to,
    data.due_date,
    'open',
    createdBy,
    now,
    now
  );

  return {
    id,
    case_id: data.case_id,
    task: data.task,
    assigned_to: data.assigned_to,
    due_date: data.due_date,
    status: 'open',
    created_by: createdBy,
    created_at: now,
    updated_at: now,
  };
}

export async function getCaseActions(caseId: string): Promise<CaseAction[]> {
  const rows = db.prepare(`
    SELECT * FROM case_actions
    WHERE case_id = ? AND deleted_at IS NULL
    ORDER BY due_date ASC
  `).all(caseId) as any[];

  return rows.map(rowToAction);
}

export async function updateCaseActionStatus(
  actionId: string,
  status: 'open' | 'done'
): Promise<CaseAction> {
  const now = Date.now();

  db.prepare(`
    UPDATE case_actions SET status = ?, updated_at = ? WHERE id = ?
  `).run(status, now, actionId);

  const row = db.prepare(`
    SELECT * FROM case_actions WHERE id = ?
  `).get(actionId) as any;

  return rowToAction(row);
}
