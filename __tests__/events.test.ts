import { randomUUID } from 'crypto';
import db from '../lib/db';
import { createEvent, getEvent, getAllEvents } from '../lib/events';
import { Event } from '../lib/types';

describe('Events', () => {
  let committeeId: string;

  beforeEach(() => {
    // Clean up
    db.exec(`
      DELETE FROM events;
      DELETE FROM members;
    `);

    // Create test committee member
    committeeId = randomUUID();
    const now = Date.now();
    db.prepare(`
      INSERT INTO members (id, email, password_hash, name, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(committeeId, 'committee@test.com', 'hash', 'Committee', 'committee', now);
  });

  describe('tracer bullet: createEvent and getEvent', () => {
    it('committee creates an event and retrieves it with all fields', async () => {
      const eventDate = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days from now

      const event = await createEvent({
        title: 'Monthly Community Gathering',
        description: 'Join us for our monthly gathering to discuss group matters',
        date: eventDate,
        time: '14:30',
        location: 'Community Hall',
        type: 'event',
        created_by: committeeId,
      });

      expect(event).toBeDefined();
      expect(event.id).toBeDefined();
      expect(event.title).toBe('Monthly Community Gathering');
      expect(event.description).toBe('Join us for our monthly gathering to discuss group matters');
      expect(event.date).toBe(eventDate);
      expect(event.time).toBe('14:30');
      expect(event.location).toBe('Community Hall');
      expect(event.type).toBe('event');
      expect(event.created_by).toBe(committeeId);
      expect(event.created_at).toBeDefined();

      // Retrieve the event
      const retrieved = await getEvent(event.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(event.id);
      expect(retrieved?.title).toBe('Monthly Community Gathering');
      expect(retrieved?.time).toBe('14:30');
      expect(retrieved?.created_by).toBe(committeeId);
    });
  });

  describe('list all events', () => {
    it('retrieves all events sorted by date descending', async () => {
      const baseDate = Date.now();

      // Create events with different dates (in scrambled order)
      await createEvent({
        title: 'Event 2',
        description: null,
        date: baseDate + 2 * 24 * 60 * 60 * 1000,
        time: '10:00',
        location: null,
        type: 'event',
        created_by: committeeId,
      });

      await createEvent({
        title: 'Event 1',
        description: null,
        date: baseDate,
        time: '09:00',
        location: null,
        type: 'event',
        created_by: committeeId,
      });

      await createEvent({
        title: 'Event 3',
        description: null,
        date: baseDate + 5 * 24 * 60 * 60 * 1000,
        time: '11:00',
        location: null,
        type: 'event',
        created_by: committeeId,
      });

      const events = await getAllEvents();

      expect(events).toHaveLength(3);
      // Should be sorted by date descending (newest first)
      expect(events[0].title).toBe('Event 3');
      expect(events[1].title).toBe('Event 2');
      expect(events[2].title).toBe('Event 1');
    });
  });

  describe('event types', () => {
    it('supports different event types: meeting, event, announcement', async () => {
      const date = Date.now();

      const meetingEvent = await createEvent({
        title: 'Monthly Meeting',
        description: null,
        date,
        time: '09:00',
        location: null,
        type: 'meeting',
        created_by: committeeId,
      });

      const communityEvent = await createEvent({
        title: 'Community Picnic',
        description: null,
        date,
        time: '12:00',
        location: null,
        type: 'event',
        created_by: committeeId,
      });

      const announcementEvent = await createEvent({
        title: 'Important Update',
        description: null,
        date,
        time: '00:00',
        location: null,
        type: 'announcement',
        created_by: committeeId,
      });

      expect(meetingEvent.type).toBe('meeting');
      expect(communityEvent.type).toBe('event');
      expect(announcementEvent.type).toBe('announcement');

      // Verify in DB
      const retrieved1 = await getEvent(meetingEvent.id);
      const retrieved2 = await getEvent(communityEvent.id);
      const retrieved3 = await getEvent(announcementEvent.id);

      expect(retrieved1?.type).toBe('meeting');
      expect(retrieved2?.type).toBe('event');
      expect(retrieved3?.type).toBe('announcement');
    });
  });
});
