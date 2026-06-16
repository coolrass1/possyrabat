'use server';

import { randomUUID } from 'crypto';
import db from './db';
import { Meeting, MeetingDecision } from './types';

export async function createMeeting(data: {
  date: number;
  title: string;
  notes: string | null;
  attendees: string[];
  created_by: string;
}): Promise<Meeting> {
  const id = randomUUID();
  const now = Date.now();

  db.prepare(`
    INSERT INTO meetings (id, date, title, notes, attendees, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.date,
    data.title,
    data.notes,
    JSON.stringify(data.attendees),
    data.created_by,
    now,
    now
  );

  return {
    id,
    date: data.date,
    title: data.title,
    notes: data.notes,
    attendees: data.attendees,
    created_by: data.created_by,
    created_at: now,
    updated_at: now,
  };
}

export async function getMeeting(meetingId: string): Promise<Meeting | null> {
  const row = db.prepare(`
    SELECT * FROM meetings WHERE id = ? AND deleted_at IS NULL
  `).get(meetingId) as any;

  if (!row) return null;

  return {
    id: row.id,
    date: row.date,
    title: row.title,
    notes: row.notes,
    attendees: JSON.parse(row.attendees),
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
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

export async function getAllMeetings(): Promise<Meeting[]> {
  const rows = db.prepare(`
    SELECT * FROM meetings
    WHERE deleted_at IS NULL
    ORDER BY date DESC
  `).all() as any[];

  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    title: row.title,
    notes: row.notes,
    attendees: JSON.parse(row.attendees),
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}
