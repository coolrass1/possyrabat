'use server';

import { randomUUID } from 'crypto';
import db from './db';
import { Poll, Vote } from './types';

function rowToPoll(row: any): Poll {
  return {
    id: row.id,
    question: row.question,
    choices: JSON.parse(row.choices),
    status: row.status,
    deadline: row.deadline,
    created_by: row.created_by,
    created_at: row.created_at,
  };
}

export async function createPoll(data: {
  question: string;
  choices: string[];
  deadline: number;
  created_by: string;
}): Promise<Poll> {
  const id = randomUUID();
  const now = Date.now();

  db.prepare(`
    INSERT INTO polls (id, question, choices, status, deadline, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.question,
    JSON.stringify(data.choices),
    'open',
    data.deadline,
    data.created_by,
    now
  );

  return {
    id,
    question: data.question,
    choices: data.choices,
    status: 'open',
    deadline: data.deadline,
    created_by: data.created_by,
    created_at: now,
  };
}

export async function getPoll(pollId: string): Promise<Poll | null> {
  const row = db.prepare(`
    SELECT * FROM polls WHERE id = ? AND deleted_at IS NULL
  `).get(pollId) as any;

  if (!row) return null;

  return rowToPoll(row);
}

export async function vote(data: {
  poll_id: string;
  member_id: string;
  choice: string;
}): Promise<Vote> {
  const poll = db.prepare(`
    SELECT status FROM polls WHERE id = ? AND deleted_at IS NULL
  `).get(data.poll_id) as any;

  if (!poll) {
    throw new Error('Poll not found');
  }

  if (poll.status === 'closed') {
    throw new Error('Poll is closed');
  }

  const existingVote = db.prepare(`
    SELECT id FROM votes
    WHERE poll_id = ? AND member_id = ? AND deleted_at IS NULL
  `).get(data.poll_id, data.member_id);

  if (existingVote) {
    throw new Error('Member has already voted on this poll');
  }

  const id = randomUUID();
  const now = Date.now();

  db.prepare(`
    INSERT INTO votes (id, poll_id, member_id, choice, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, data.poll_id, data.member_id, data.choice, now);

  return {
    id,
    poll_id: data.poll_id,
    member_id: data.member_id,
    choice: data.choice,
    created_at: now,
  };
}

export async function closePoll(pollId: string): Promise<Poll> {
  db.prepare(`
    UPDATE polls SET status = 'closed' WHERE id = ?
  `).run(pollId);

  const row = db.prepare(`
    SELECT * FROM polls WHERE id = ? AND deleted_at IS NULL
  `).get(pollId) as any;

  return rowToPoll(row);
}

export async function getPollResults(pollId: string): Promise<Record<string, number>> {
  const poll = await getPoll(pollId);
  if (!poll) {
    throw new Error('Poll not found');
  }

  const votes = db.prepare(`
    SELECT choice, COUNT(*) as count
    FROM votes
    WHERE poll_id = ? AND deleted_at IS NULL
    GROUP BY choice
  `).all(pollId) as Array<{ choice: string; count: number }>;

  const results: Record<string, number> = {};
  poll.choices.forEach((choice) => {
    results[choice] = 0;
  });

  votes.forEach((vote) => {
    results[vote.choice] = vote.count;
  });

  return results;
}

export async function listPolls(
  filter: 'open' | 'closed' | 'all' = 'all'
): Promise<Poll[]> {
  let query = `
    SELECT * FROM polls WHERE deleted_at IS NULL
  `;

  if (filter === 'open') {
    query += ` AND status = 'open'`;
  } else if (filter === 'closed') {
    query += ` AND status = 'closed'`;
  }

  query += ` ORDER BY created_at DESC`;

  const rows = db.prepare(query).all() as any[];

  return rows.map(rowToPoll);
}
