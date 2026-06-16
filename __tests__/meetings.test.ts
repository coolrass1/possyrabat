import { randomUUID } from 'crypto';
import db from '../lib/db';
import { createMeeting, getMeeting, addDecision, getMeetingDecisions } from '../lib/meetings';
import { Meeting, MeetingDecision } from '../lib/types';

describe('Meetings', () => {
  let committeeId: string;
  let memberId1: string;
  let memberId2: string;

  beforeEach(() => {
    // Clean up (respect foreign keys)
    db.exec(`
      DELETE FROM meeting_decisions;
      DELETE FROM meetings;
      DELETE FROM members;
    `);

    // Create test members
    committeeId = randomUUID();
    memberId1 = randomUUID();
    memberId2 = randomUUID();

    const now = Date.now();
    db.prepare(`
      INSERT INTO members (id, email, password_hash, name, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(committeeId, 'committee@test.com', 'hash', 'Committee', 'committee', now);

    db.prepare(`
      INSERT INTO members (id, email, password_hash, name, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(memberId1, 'member1@test.com', 'hash', 'Member 1', 'member', now);

    db.prepare(`
      INSERT INTO members (id, email, password_hash, name, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(memberId2, 'member2@test.com', 'hash', 'Member 2', 'member', now);
  });

  describe('tracer bullet: createMeeting and getMeeting', () => {
    it('committee creates a meeting and retrieves it with all fields intact', async () => {
      const meetingDate = Date.now();
      const attendees = [memberId1, memberId2, committeeId];

      const meeting = await createMeeting({
        date: meetingDate,
        title: 'Monthly Meeting',
        notes: 'Discussed fund allocation and case updates',
        attendees,
        created_by: committeeId,
      });

      expect(meeting).toBeDefined();
      expect(meeting.id).toBeDefined();
      expect(meeting.date).toBe(meetingDate);
      expect(meeting.title).toBe('Monthly Meeting');
      expect(meeting.notes).toBe('Discussed fund allocation and case updates');
      expect(meeting.attendees).toEqual(attendees);
      expect(meeting.created_by).toBe(committeeId);
      expect(meeting.created_at).toBeDefined();

      // Retrieve the meeting
      const retrieved = await getMeeting(meeting.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(meeting.id);
      expect(retrieved?.title).toBe('Monthly Meeting');
      expect(retrieved?.attendees).toEqual(attendees);
      expect(retrieved?.created_by).toBe(committeeId);
    });
  });

  describe('meeting decisions', () => {
    it('committee adds decisions to a meeting and retrieves them', async () => {
      // Create meeting first
      const meeting = await createMeeting({
        date: Date.now(),
        title: 'Test Meeting',
        notes: null,
        attendees: [memberId1],
        created_by: committeeId,
      });

      // Add decisions
      const decision1 = await addDecision({
        meeting_id: meeting.id,
        description: 'Approved €500 for court case',
        decided_by: committeeId,
      });

      const decision2 = await addDecision({
        meeting_id: meeting.id,
        description: 'Scheduled next hearing for 2026-07-15',
        decided_by: committeeId,
      });

      expect(decision1.id).toBeDefined();
      expect(decision2.id).toBeDefined();

      // Retrieve all decisions for meeting
      const decisions = await getMeetingDecisions(meeting.id);

      expect(decisions).toHaveLength(2);
      expect(decisions[0].description).toBe('Approved €500 for court case');
      expect(decisions[1].description).toBe('Scheduled next hearing for 2026-07-15');
      expect(decisions[0].decided_by).toBe(committeeId);
      expect(decisions[1].decided_by).toBe(committeeId);

      // Verify in DB
      const row = db.prepare('SELECT * FROM meeting_decisions WHERE id = ?').get(decision1.id) as any;
      expect(row).toBeDefined();
      expect(row.meeting_id).toBe(meeting.id);
    });
  });
});
