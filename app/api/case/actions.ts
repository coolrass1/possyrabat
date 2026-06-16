'use server';

import { randomUUID } from 'crypto';
import db from '@/lib/db';
import { Case, CaseStep } from '@/lib/types';

function rowToCase(row: any): Case {
  return {
    id: row.id,
    title: row.title,
    opposing_party: row.opposing_party,
    court: row.court,
    stage: row.stage,
    summary: row.summary,
    opened_date: row.opened_date,
    next_hearing_date: row.next_hearing_date,
    lawyer_name: row.lawyer_name ?? null,
    lawyer_contact: row.lawyer_contact ?? null,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function rowToCaseStep(row: any): CaseStep {
  return {
    id: row.id,
    case_id: row.case_id,
    date: row.date,
    description: row.description,
    type: row.type,
    document_url: row.document_url,
    logged_by: row.logged_by,
    created_at: row.created_at,
  };
}

export async function createCase(
  data: {
    title: string;
    opposing_party: string;
    court: string;
    stage: Case['stage'];
    summary: string | null;
    opened_date: number;
    next_hearing_date: number | null;
  },
  committeeId: string
): Promise<Case> {
  const id = randomUUID();
  const now = Date.now();

  db.prepare(`
    INSERT INTO cases (
      id, title, opposing_party, court, stage, summary,
      opened_date, next_hearing_date, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.title,
    data.opposing_party,
    data.court,
    data.stage,
    data.summary,
    data.opened_date,
    data.next_hearing_date,
    committeeId,
    now,
    now
  );

  return {
    id,
    title: data.title,
    opposing_party: data.opposing_party,
    court: data.court,
    stage: data.stage,
    summary: data.summary,
    opened_date: data.opened_date,
    next_hearing_date: data.next_hearing_date,
    lawyer_name: null,
    lawyer_contact: null,
    created_by: committeeId,
    created_at: now,
    updated_at: now,
  };
}

export async function getCaseById(caseId: string): Promise<Case | null> {
  const row = db.prepare(`
    SELECT * FROM cases WHERE id = ? AND deleted_at IS NULL
  `).get(caseId) as any;

  return row ? rowToCase(row) : null;
}

export async function logCaseStep(
  data: {
    case_id: string;
    date: number;
    description: string;
    type: CaseStep['type'];
    document_url: string | null;
  },
  committeeId: string
): Promise<CaseStep> {
  const id = randomUUID();
  const now = Date.now();

  db.prepare(`
    INSERT INTO case_steps (
      id, case_id, date, description, type, document_url, logged_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.case_id,
    data.date,
    data.description,
    data.type,
    data.document_url,
    committeeId,
    now
  );

  return {
    id,
    case_id: data.case_id,
    date: data.date,
    description: data.description,
    type: data.type,
    document_url: data.document_url,
    logged_by: committeeId,
    created_at: now,
  };
}

export async function getCaseTimeline(caseId: string): Promise<CaseStep[]> {
  const rows = db.prepare(`
    SELECT * FROM case_steps
    WHERE case_id = ? AND deleted_at IS NULL
    ORDER BY date ASC
  `).all(caseId) as any[];

  return rows.map(rowToCaseStep);
}

export async function editCase(
  caseId: string,
  updates: Partial<{
    title: string;
    opposing_party: string;
    court: string;
    stage: Case['stage'];
    summary: string | null;
    next_hearing_date: number | null;
    lawyer_name: string | null;
    lawyer_contact: string | null;
  }>,
  committeeId: string
): Promise<Case> {
  const now = Date.now();
  const existing = await getCaseById(caseId);

  if (!existing) throw new Error('Case not found');

  const updated = {
    title: updates.title ?? existing.title,
    opposing_party: updates.opposing_party ?? existing.opposing_party,
    court: updates.court ?? existing.court,
    stage: updates.stage ?? existing.stage,
    summary: updates.summary !== undefined ? updates.summary : existing.summary,
    next_hearing_date:
      updates.next_hearing_date !== undefined
        ? updates.next_hearing_date
        : existing.next_hearing_date,
    lawyer_name:
      updates.lawyer_name !== undefined ? updates.lawyer_name : existing.lawyer_name,
    lawyer_contact:
      updates.lawyer_contact !== undefined ? updates.lawyer_contact : existing.lawyer_contact,
  };

  db.prepare(`
    UPDATE cases SET
      title = ?, opposing_party = ?, court = ?, stage = ?,
      summary = ?, next_hearing_date = ?, lawyer_name = ?, lawyer_contact = ?, updated_at = ?
    WHERE id = ?
  `).run(
    updated.title,
    updated.opposing_party,
    updated.court,
    updated.stage,
    updated.summary,
    updated.next_hearing_date,
    updated.lawyer_name,
    updated.lawyer_contact,
    now,
    caseId
  );

  return {
    id: caseId,
    ...updated,
    opened_date: existing.opened_date,
    created_by: existing.created_by,
    created_at: existing.created_at,
    updated_at: now,
  };
}

/**
 * Case costs are the legal spend pulled from the ledger: the sum of expenses
 * filed under the court_case aim. (Derived, never stored — keeps the books
 * reconciled, per the PRD.)
 */
export async function getCaseCosts(): Promise<number> {
  const row = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM expenses
    WHERE aim = 'court_case' AND deleted_at IS NULL
  `).get() as any;
  return row.total || 0;
}

export async function deleteCase(caseId: string): Promise<void> {
  const now = Date.now();
  db.prepare(`
    UPDATE cases SET deleted_at = ? WHERE id = ?
  `).run(now, caseId);
}
