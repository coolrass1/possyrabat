'use server';

import { randomUUID } from 'crypto';
import db from './db';
import { Event } from './types';

export async function createEvent(data: {
  title: string;
  description: string | null;
  date: number;
  time: string;
  location: string | null;
  type: 'meeting' | 'event' | 'announcement';
  created_by: string;
}): Promise<Event> {
  const id = randomUUID();
  const now = Date.now();

  db.prepare(`
    INSERT INTO events (id, title, description, date, time, location, type, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.title,
    data.description,
    data.date,
    data.time,
    data.location,
    data.type,
    data.created_by,
    now,
    now
  );

  return {
    id,
    title: data.title,
    description: data.description,
    date: data.date,
    time: data.time,
    location: data.location,
    type: data.type,
    created_by: data.created_by,
    created_at: now,
    updated_at: now,
  };
}

export async function getEvent(eventId: string): Promise<Event | null> {
  const row = db.prepare(`
    SELECT * FROM events WHERE id = ? AND deleted_at IS NULL
  `).get(eventId) as any;

  if (!row) return null;

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    date: row.date,
    time: row.time,
    location: row.location,
    type: row.type,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function getAllEvents(): Promise<Event[]> {
  const rows = db.prepare(`
    SELECT * FROM events
    WHERE deleted_at IS NULL
    ORDER BY date DESC
  `).all() as any[];

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    date: row.date,
    time: row.time,
    location: row.location,
    type: row.type,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

export async function getUpcomingEvents(limit: number = 10): Promise<Event[]> {
  const now = Date.now();
  const rows = db.prepare(`
    SELECT * FROM events
    WHERE date >= ? AND deleted_at IS NULL
    ORDER BY date ASC
    LIMIT ?
  `).all(now, limit) as any[];

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    date: row.date,
    time: row.time,
    location: row.location,
    type: row.type,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}
