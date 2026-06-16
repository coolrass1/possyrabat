import { randomUUID } from 'crypto';
import db from '../lib/db';
import {
  createMeeting,
  addMeetingAction,
  getMeetingActions,
  setMeetingActionStatus,
  getOpenMeetingActions,
} from '../lib/meetings';

describe('Meeting action items', () => {
  let committeeId: string;
  let meetingId: string;

  beforeEach(async () => {
    db.exec(`
      DELETE FROM meeting_actions;
      DELETE FROM meetings;
      DELETE FROM members;
    `);

    committeeId = randomUUID();
    db.prepare(`
      INSERT INTO members (id, email, password_hash, name, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(committeeId, 'c@test.com', 'h', 'Committee', 'committee', Date.now());

    const meeting = await createMeeting({
      date: Date.now(),
      title: 'Monthly meeting',
      notes: null,
      attendees: [committeeId],
      created_by: committeeId,
    });
    meetingId = meeting.id;
  });

  describe('tracer bullet: add and read an action', () => {
    it('records an action item on a meeting', async () => {
      const action = await addMeetingAction({
        meeting_id: meetingId,
        task: 'Call the lawyer',
        assigned_to: committeeId,
        due_date: Date.now() + 86400000,
      });

      expect(action.id).toBeDefined();
      expect(action.task).toBe('Call the lawyer');
      expect(action.assigned_to).toBe(committeeId);
      expect(action.status).toBe('open');

      const actions = await getMeetingActions(meetingId);
      expect(actions).toHaveLength(1);
      expect(actions[0].task).toBe('Call the lawyer');
    });
  });

  describe('completing an action', () => {
    it('marks an action as done', async () => {
      const action = await addMeetingAction({
        meeting_id: meetingId,
        task: 'Send minutes',
        assigned_to: null,
        due_date: null,
      });

      const updated = await setMeetingActionStatus(action.id, 'done');
      expect(updated.status).toBe('done');

      const actions = await getMeetingActions(meetingId);
      expect(actions[0].status).toBe('done');
    });
  });

  describe('open actions for the home screen', () => {
    it('returns only open actions across all meetings', async () => {
      const a1 = await addMeetingAction({ meeting_id: meetingId, task: 'Open one', assigned_to: null, due_date: null });
      await addMeetingAction({ meeting_id: meetingId, task: 'Open two', assigned_to: null, due_date: null });
      await setMeetingActionStatus(a1.id, 'done');

      const open = await getOpenMeetingActions();
      expect(open).toHaveLength(1);
      expect(open[0].task).toBe('Open two');
    });
  });
});
