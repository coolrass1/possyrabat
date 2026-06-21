'use server';

import { randomUUID } from 'crypto';
import db from './db';
import { Meeting, MeetingStatus, MeetingDecision, MeetingAction } from './types';

function rowToMeeting(row: any): Meeting {
  return {
    id: row.id,
    date: row.date,
    title: row.title,
    notes: row.notes ?? null,
    location: row.location ?? null,
    agenda: row.agenda ?? null,
    description: row.description ?? null,
    status: (row.status as MeetingStatus) ?? 'Planned',
    attendees: JSON.parse(row.attendees),
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function createMeeting(data: {
  date: number;
  title: string;
  notes: string | null;
  location?: string | null;
  agenda?: string | null;
  description?: string | null;
  status?: MeetingStatus;
  attendees: string[];
  created_by: string;
}): Promise<Meeting> {
  const id = randomUUID();
  const now = Date.now();
  const status: MeetingStatus = data.status ?? 'Planned';

  db.prepare(`
    INSERT INTO meetings (id, date, title, notes, location, agenda, description, status, attendees, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.date,
    data.title,
    data.notes,
    data.location ?? null,
    data.agenda ?? null,
    data.description ?? null,
    status,
    JSON.stringify(data.attendees),
    data.created_by,
    now,
    now
  );

  return rowToMeeting(
    db.prepare('SELECT * FROM meetings WHERE id = ?').get(id)
  );
}

export async function getMeeting(meetingId: string): Promise<Meeting | null> {
  const row = db.prepare(`
    SELECT * FROM meetings WHERE id = ? AND deleted_at IS NULL
  `).get(meetingId) as any;

  if (!row) return null;

  return rowToMeeting(row);
}

export async function updateMeeting(
  meetingId: string,
  data: {
    title?: string;
    date?: number;
    notes?: string | null;
    location?: string | null;
    agenda?: string | null;
    description?: string | null;
    status?: MeetingStatus;
    attendees?: string[];
  }
): Promise<Meeting | null> {
  const existing = db.prepare(
    'SELECT * FROM meetings WHERE id = ? AND deleted_at IS NULL'
  ).get(meetingId) as any;
  if (!existing) return null;

  const fields: string[] = [];
  const values: any[] = [];
  const setField = (col: string, value: any) => {
    fields.push(`${col} = ?`);
    values.push(value);
  };

  if (data.title !== undefined) setField('title', data.title);
  if (data.date !== undefined) setField('date', data.date);
  if (data.notes !== undefined) setField('notes', data.notes);
  if (data.location !== undefined) setField('location', data.location);
  if (data.agenda !== undefined) setField('agenda', data.agenda);
  if (data.description !== undefined) setField('description', data.description);
  if (data.status !== undefined) setField('status', data.status);
  if (data.attendees !== undefined) setField('attendees', JSON.stringify(data.attendees));

  setField('updated_at', Date.now());

  db.prepare(`UPDATE meetings SET ${fields.join(', ')} WHERE id = ?`).run(
    ...values,
    meetingId
  );

  return rowToMeeting(
    db.prepare('SELECT * FROM meetings WHERE id = ?').get(meetingId)
  );
}

export async function addDecision(data: {
  meeting_id: string;
  description: string;
  decided_by: string;
}): Promise<MeetingDecision> {
  const id = randomUUID();
  const now = Date.now();

  db.prepare(`
    INSERT INTO meeting_decisions (id, meeting_id, description, decided_by, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, data.meeting_id, data.description, data.decided_by, now);

  return {
    id,
    meeting_id: data.meeting_id,
    description: data.description,
    decided_by: data.decided_by,
    created_at: now,
  };
}

export async function getMeetingDecisions(meetingId: string): Promise<MeetingDecision[]> {
  const rows = db.prepare(`
    SELECT * FROM meeting_decisions
    WHERE meeting_id = ? AND deleted_at IS NULL
    ORDER BY created_at ASC
  `).all(meetingId) as any[];

  return rows.map((row) => ({
    id: row.id,
    meeting_id: row.meeting_id,
    description: row.description,
    decided_by: row.decided_by,
    created_at: row.created_at,
  }));
}

function rowToAction(row: any): MeetingAction {
  return {
    id: row.id,
    meeting_id: row.meeting_id,
    task: row.task,
    assigned_to: row.assigned_to ?? null,
    due_date: row.due_date ?? null,
    status: row.status,
    created_at: row.created_at,
  };
}

export async function addMeetingAction(data: {
  meeting_id: string;
  task: string;
  assigned_to: string | null;
  due_date: number | null;
}): Promise<MeetingAction> {
  const id = randomUUID();
  const now = Date.now();

  db.prepare(`
    INSERT INTO meeting_actions (id, meeting_id, task, assigned_to, due_date, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.meeting_id, data.task, data.assigned_to, data.due_date, 'open', now);

  return {
    id,
    meeting_id: data.meeting_id,
    task: data.task,
    assigned_to: data.assigned_to,
    due_date: data.due_date,
    status: 'open',
    created_at: now,
  };
}

export async function getMeetingActions(meetingId: string): Promise<MeetingAction[]> {
  const rows = db.prepare(`
    SELECT * FROM meeting_actions
    WHERE meeting_id = ? AND deleted_at IS NULL
    ORDER BY created_at ASC
  `).all(meetingId) as any[];
  return rows.map(rowToAction);
}

export async function setMeetingActionStatus(
  actionId: string,
  status: 'open' | 'done'
): Promise<MeetingAction> {
  db.prepare('UPDATE meeting_actions SET status = ? WHERE id = ?').run(status, actionId);
  return rowToAction(db.prepare('SELECT * FROM meeting_actions WHERE id = ?').get(actionId));
}

export async function getOpenMeetingActions(): Promise<MeetingAction[]> {
  const rows = db.prepare(`
    SELECT * FROM meeting_actions
    WHERE status = 'open' AND deleted_at IS NULL
    ORDER BY due_date ASC, created_at ASC
  `).all() as any[];
  return rows.map(rowToAction);
}

export async function getAllMeetings(): Promise<Meeting[]> {
  const rows = db.prepare(`
    SELECT * FROM meetings
    WHERE deleted_at IS NULL
    ORDER BY date DESC
  `).all() as any[];

  return rows.map(rowToMeeting);
}
