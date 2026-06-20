import db from '@/lib/db';
import { hashPassword, createSession } from '@/lib/auth';
import { initializeDb } from '@/lib/db';
import { randomBytes } from 'crypto';

describe('Meetings & Decisions Module', () => {
  beforeAll(() => {
    initializeDb();
  });

  beforeEach(() => {
    db.exec(`
      PRAGMA foreign_keys=OFF;
      DELETE FROM sessions;
      DELETE FROM members;
      DELETE FROM meetings;
      DELETE FROM meeting_documents;
      PRAGMA foreign_keys=ON;
    `);
    initializeDb();
  });

  it('admin can create a meeting with validation', async () => {
    const passwordHash = await hashPassword('password123');
    const adminId = 'admin-meetings-test';
    const now = Date.now();

    db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(adminId, 'admin@example.com', passwordHash, 'Admin', 'committee', now);

    const adminSession = createSession(adminId);
    const meetingsRoute = await import('@/app/api/meetings/route');

    // Act: Create a meeting
    const meetingDate = now + 7 * 24 * 60 * 60 * 1000; // 7 days from now
    const req = {
      cookies: {
        get: (name: string) => (name === 'session_id' ? { value: adminSession.id } : undefined),
      },
      json: async () => ({
        title: 'Quarterly Assembly',
        date: meetingDate,
        location: 'Community Hall',
        agenda: 'Review Q3 performance and approve Q4 budget',
        description: 'All members welcome to attend and participate',
      }),
    } as any;

    const res = await (meetingsRoute.POST as any)(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.title).toBe('Quarterly Assembly');
    expect(body.location).toBe('Community Hall');
    expect(body.status).toBe('planned');
    expect(body.created_by).toBe(adminId);

    // Verify in DB
    const meeting = db.prepare('SELECT * FROM meetings').get() as any;
    expect(meeting).toBeDefined();
    expect(meeting.title).toBe('Quarterly Assembly');
    expect(meeting.status).toBe('planned');
  });

  it('admin can update meeting status', async () => {
    const passwordHash = await hashPassword('password123');
    const adminId = 'admin-status-test';
    const now = Date.now();

    db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(adminId, 'admin@example.com', passwordHash, 'Admin', 'committee', now);

    const adminSession = createSession(adminId);

    // Create a meeting first
    const meetingId = 'meeting-status-test';
    const meetingDate = now + 7 * 24 * 60 * 60 * 1000;
    db.prepare(
      'INSERT INTO meetings (id, title, date, location, agenda, description, status, notes, attendees, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      meetingId,
      'Quarterly Assembly',
      meetingDate,
      'Community Hall',
      'Review Q3',
      'All members welcome',
      'planned',
      null,
      JSON.stringify([]),
      adminId,
      now,
      now
    );

    // Act: Update meeting status to 'completed'
    const meetingRouteUpdate = await import('@/app/api/meetings/[id]/route');
    const req = {
      cookies: {
        get: (name: string) => (name === 'session_id' ? { value: adminSession.id } : undefined),
      },
      json: async () => ({
        status: 'completed',
      }),
    } as any;

    const res = await (meetingRouteUpdate.PATCH as any)(req, { params: Promise.resolve({ id: meetingId }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('completed');

    // Verify in DB
    const meeting = db.prepare('SELECT * FROM meetings WHERE id = ?').get(meetingId) as any;
    expect(meeting.status).toBe('completed');
  });

  it('admin can add document metadata to meeting', async () => {
    const passwordHash = await hashPassword('password123');
    const adminId = 'admin-doc-test';
    const now = Date.now();

    db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(adminId, 'admin@example.com', passwordHash, 'Admin', 'committee', now);

    const adminSession = createSession(adminId);

    // Create a meeting first
    const meetingId = 'meeting-doc-test';
    const meetingDate = now + 7 * 24 * 60 * 60 * 1000;
    db.prepare(
      'INSERT INTO meetings (id, title, date, location, agenda, description, status, notes, attendees, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      meetingId,
      'Quarterly Assembly',
      meetingDate,
      'Community Hall',
      'Review Q3',
      'All members welcome',
      'completed',
      null,
      JSON.stringify([]),
      adminId,
      now,
      now
    );

    // Act: Add document metadata
    const docsRoute = await import('@/app/api/meetings/[id]/documents/route');
    const req = {
      cookies: {
        get: (name: string) => (name === 'session_id' ? { value: adminSession.id } : undefined),
      },
      headers: {
        get: (name: string) => (name === 'content-type' ? 'application/json' : null),
      },
      json: async () => ({
        filename: 'meeting-minutes.pdf',
      }),
    } as any;

    const res = await (docsRoute.POST as any)(req, { params: Promise.resolve({ id: meetingId }) });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.filename).toBe('meeting-minutes.pdf');
    expect(body.meeting_id).toBe(meetingId);
    expect(body.uploaded_by).toBe(adminId);

    // Verify in DB
    const doc = db.prepare('SELECT * FROM meeting_documents WHERE meeting_id = ?').get(meetingId) as any;
    expect(doc).toBeDefined();
    expect(doc.filename).toBe('meeting-minutes.pdf');
  });

  it('member can view upcoming meetings', async () => {
    const passwordHash = await hashPassword('password123');
    const memberId = 'member-view-upcoming';
    const now = Date.now();

    db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(memberId, 'member@example.com', passwordHash, 'Member', 'member', 'active', now);

    const memberSession = createSession(memberId);

    // Create two meetings: one upcoming, one past
    const upcomingDate = now + 7 * 24 * 60 * 60 * 1000;
    const pastDate = now - 7 * 24 * 60 * 60 * 1000;

    const adminId = 'admin-upcoming-test';
    db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(adminId, 'admin@example.com', passwordHash, 'Admin', 'committee', now);

    db.prepare(
      'INSERT INTO meetings (id, title, date, location, agenda, description, status, notes, attendees, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      'meeting-upcoming',
      'Upcoming Meeting',
      upcomingDate,
      'Hall',
      'Agenda',
      'Description',
      'planned',
      null,
      JSON.stringify([]),
      adminId,
      now,
      now
    );

    db.prepare(
      'INSERT INTO meetings (id, title, date, location, agenda, description, status, notes, attendees, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      'meeting-past',
      'Past Meeting',
      pastDate,
      'Hall',
      'Agenda',
      'Description',
      'completed',
      null,
      JSON.stringify([]),
      adminId,
      now,
      now
    );

    // Act: Member views upcoming meetings
    const meetingsRoute = await import('@/app/api/meetings/route');
    const req = {
      cookies: {
        get: (name: string) => (name === 'session_id' ? { value: memberSession.id } : undefined),
      },
    } as any;

    const res = await (meetingsRoute.GET as any)(req);
    expect(res.status).toBe(200);
    const meetings = await res.json();

    // Should get both meetings (the API returns all, filtering is frontend responsibility)
    expect(meetings).toHaveLength(2);
    expect(meetings[0].id).toBe('meeting-upcoming'); // Later dates first (DESC by date)
    expect(meetings[1].id).toBe('meeting-past');
  });

  it('member can view past/completed meetings', async () => {
    const passwordHash = await hashPassword('password123');
    const memberId = 'member-view-past';
    const now = Date.now();

    db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(memberId, 'member@example.com', passwordHash, 'Member', 'member', 'active', now);

    const memberSession = createSession(memberId);

    // Create a completed meeting with documents
    const completedDate = now - 30 * 24 * 60 * 60 * 1000;
    const adminId = 'admin-completed-test';

    db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(adminId, 'admin@example.com', passwordHash, 'Admin', 'committee', now);

    const meetingId = 'meeting-completed';
    db.prepare(
      'INSERT INTO meetings (id, title, date, location, agenda, description, status, notes, attendees, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      meetingId,
      'Completed Quarterly Assembly',
      completedDate,
      'Community Hall',
      'Review Q2 results and approve budget',
      'All members were present',
      'completed',
      null,
      JSON.stringify([]),
      adminId,
      now,
      now
    );

    // Add document to the meeting
    db.prepare(
      'INSERT INTO meeting_documents (id, meeting_id, filename, storage_path, uploaded_by, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('doc-1', meetingId, 'Q2-Minutes.pdf', 'metadata-only', adminId, now);

    db.prepare(
      'INSERT INTO meeting_documents (id, meeting_id, filename, storage_path, uploaded_by, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('doc-2', meetingId, 'Q2-Budget-Report.pdf', 'metadata-only', adminId, now + 1);

    // Act: Member views meetings and can access documents
    const meetingsRoute = await import('@/app/api/meetings/route');
    const req = {
      cookies: {
        get: (name: string) => (name === 'session_id' ? { value: memberSession.id } : undefined),
      },
    } as any;

    const res = await (meetingsRoute.GET as any)(req);
    expect(res.status).toBe(200);
    const meetings = await res.json();

    // Find the completed meeting
    const completed = meetings.find((m: any) => m.id === meetingId);
    expect(completed).toBeDefined();
    expect(completed.status).toBe('completed');

    // Act: Member views documents for this meeting
    const docsRoute = await import('@/app/api/meetings/[id]/documents/route');
    const docReq = {
      cookies: {
        get: (name: string) => (name === 'session_id' ? { value: memberSession.id } : undefined),
      },
    } as any;

    const docRes = await (docsRoute.GET as any)(docReq, { params: Promise.resolve({ id: meetingId }) });
    expect(docRes.status).toBe(200);
    const docs = await docRes.json();

    // Should have both documents (newest first, DESC by created_at)
    expect(docs).toHaveLength(2);
    expect(docs[0].filename).toBe('Q2-Budget-Report.pdf');
    expect(docs[1].filename).toBe('Q2-Minutes.pdf');
  });
});
