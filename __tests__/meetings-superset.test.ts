import { randomUUID } from 'crypto';
import db, { initializeDb } from '../lib/db';
import {
  createMeeting,
  getMeeting,
  getAllMeetings,
  updateMeeting,
} from '../lib/meetings';
import { createSession } from '../lib/auth';
import { GET as listMeetings, POST as createMeetingApi } from '../app/api/meetings/route';
import { GET as getMeetingApi, PATCH as updateMeetingApi } from '../app/api/meetings/[id]/route';

describe('Meetings superset (fields + status)', () => {
  let committeeId: string;
  let memberId: string;

  beforeAll(() => {
    initializeDb();
  });

  beforeEach(() => {
    db.exec(`
      PRAGMA foreign_keys=OFF;
      DELETE FROM meeting_decisions;
      DELETE FROM meeting_actions;
      DELETE FROM meetings;
      DELETE FROM sessions;
      DELETE FROM members;
      PRAGMA foreign_keys=ON;
    `);

    committeeId = randomUUID();
    memberId = randomUUID();
    const now = Date.now();
    db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(committeeId, 'committee@test.com', 'hash', 'Committee', 'committee', now);
    db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(memberId, 'member@test.com', 'hash', 'Member', 'member', now);
  });

  const mockReq = (sessionId: string | null, body?: any) =>
    ({
      cookies: {
        get: (name: string) =>
          name === 'session_id' && sessionId ? { value: sessionId } : undefined,
      },
      json: async () => body,
    }) as any;

  describe('lib seam: field persistence', () => {
    it('persists location, agenda, description and status on create and read', async () => {
      const date = Date.now();
      const meeting = await createMeeting({
        date,
        title: 'AGM',
        notes: 'Free notes',
        location: 'Town Hall',
        agenda: 'Budget review',
        description: 'Annual general meeting',
        status: 'Planned',
        attendees: [memberId],
        created_by: committeeId,
      });

      expect(meeting.location).toBe('Town Hall');
      expect(meeting.agenda).toBe('Budget review');
      expect(meeting.description).toBe('Annual general meeting');
      expect(meeting.status).toBe('Planned');

      const read = await getMeeting(meeting.id);
      expect(read?.location).toBe('Town Hall');
      expect(read?.agenda).toBe('Budget review');
      expect(read?.description).toBe('Annual general meeting');
      expect(read?.status).toBe('Planned');
      // existing fields intact
      expect(read?.title).toBe('AGM');
      expect(read?.notes).toBe('Free notes');
      expect(read?.attendees).toEqual([memberId]);
    });

    it('defaults status to Planned and optional fields to null when omitted', async () => {
      const meeting = await createMeeting({
        date: Date.now(),
        title: 'Quick sync',
        notes: null,
        attendees: [],
        created_by: committeeId,
      });
      expect(meeting.status).toBe('Planned');
      expect(meeting.location).toBeNull();
      expect(meeting.agenda).toBeNull();
      expect(meeting.description).toBeNull();

      const read = await getMeeting(meeting.id);
      expect(read?.status).toBe('Planned');
      expect(read?.location).toBeNull();
    });

    it('getAllMeetings returns the new fields', async () => {
      await createMeeting({
        date: Date.now(),
        title: 'M1',
        notes: null,
        location: 'Office',
        status: 'Completed',
        attendees: [],
        created_by: committeeId,
      });
      const all = await getAllMeetings();
      expect(all).toHaveLength(1);
      expect(all[0].location).toBe('Office');
      expect(all[0].status).toBe('Completed');
    });
  });

  describe('lib seam: status transitions via updateMeeting', () => {
    it('updates status and fields without dropping others', async () => {
      const meeting = await createMeeting({
        date: Date.now(),
        title: 'Planning',
        notes: 'note',
        location: 'Room A',
        agenda: 'agenda',
        description: 'desc',
        status: 'Planned',
        attendees: [memberId],
        created_by: committeeId,
      });

      const updated = await updateMeeting(meeting.id, { status: 'Completed' });
      expect(updated?.status).toBe('Completed');
      // untouched fields preserved
      expect(updated?.title).toBe('Planning');
      expect(updated?.location).toBe('Room A');
      expect(updated?.agenda).toBe('agenda');
      expect(updated?.attendees).toEqual([memberId]);

      const reUpdated = await updateMeeting(meeting.id, {
        status: 'Cancelled',
        location: 'Room B',
        title: 'Planning v2',
      });
      expect(reUpdated?.status).toBe('Cancelled');
      expect(reUpdated?.location).toBe('Room B');
      expect(reUpdated?.title).toBe('Planning v2');
      expect(reUpdated?.agenda).toBe('agenda');
    });

    it('returns null when updating a non-existent meeting', async () => {
      const res = await updateMeeting('nope', { status: 'Completed' });
      expect(res).toBeNull();
    });
  });

  describe('API routes', () => {
    it('POST creates with full fields for committee', async () => {
      const sid = createSession(committeeId).id;
      const res = await createMeetingApi(
        mockReq(sid, {
          date: Date.now(),
          title: 'Board',
          notes: 'n',
          location: 'HQ',
          agenda: 'a',
          description: 'd',
          status: 'Planned',
          attendees: [],
        })
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.location).toBe('HQ');
      expect(body.status).toBe('Planned');
    });

    it('POST rejects an invalid status', async () => {
      const sid = createSession(committeeId).id;
      const res = await createMeetingApi(
        mockReq(sid, {
          date: Date.now(),
          title: 'Board',
          status: 'Bogus',
          attendees: [],
        })
      );
      expect(res.status).toBe(400);
    });

    it('PATCH lets committee change status', async () => {
      const meeting = await createMeeting({
        date: Date.now(),
        title: 'M',
        notes: null,
        attendees: [],
        created_by: committeeId,
      });
      const sid = createSession(committeeId).id;
      const res = await updateMeetingApi(mockReq(sid, { status: 'Completed' }), {
        params: Promise.resolve({ id: meeting.id }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('Completed');
    });

    it('PATCH forbids members from editing', async () => {
      const meeting = await createMeeting({
        date: Date.now(),
        title: 'M',
        notes: null,
        attendees: [],
        created_by: committeeId,
      });
      const sid = createSession(memberId).id;
      const res = await updateMeetingApi(mockReq(sid, { status: 'Completed' }), {
        params: Promise.resolve({ id: meeting.id }),
      });
      expect(res.status).toBe(403);
    });

    it('PATCH rejects an invalid status', async () => {
      const meeting = await createMeeting({
        date: Date.now(),
        title: 'M',
        notes: null,
        attendees: [],
        created_by: committeeId,
      });
      const sid = createSession(committeeId).id;
      const res = await updateMeetingApi(mockReq(sid, { status: 'Nope' }), {
        params: Promise.resolve({ id: meeting.id }),
      });
      expect(res.status).toBe(400);
    });

    it('GET list is readable by members and includes new fields', async () => {
      await createMeeting({
        date: Date.now(),
        title: 'M',
        notes: null,
        location: 'Loc',
        status: 'Cancelled',
        attendees: [],
        created_by: committeeId,
      });
      const sid = createSession(memberId).id;
      const res = await listMeetings(mockReq(sid));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body[0].location).toBe('Loc');
      expect(body[0].status).toBe('Cancelled');
    });

    it('GET single returns new fields', async () => {
      const meeting = await createMeeting({
        date: Date.now(),
        title: 'M',
        notes: null,
        agenda: 'Ag',
        status: 'Planned',
        attendees: [],
        created_by: committeeId,
      });
      const sid = createSession(memberId).id;
      const res = await getMeetingApi(mockReq(sid), {
        params: Promise.resolve({ id: meeting.id }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.agenda).toBe('Ag');
    });
  });
});
