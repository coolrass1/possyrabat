import { randomUUID } from 'crypto';
import db from '../lib/db';
import { createPoll, getPoll, vote, closePoll, getPollResults, listPolls } from '../lib/polls';
import { Poll } from '../lib/types';

describe('Polls', () => {
  let committeeId: string;
  let memberId: string;

  beforeEach(() => {
    // Clean up
    db.exec(`
      DELETE FROM votes;
      DELETE FROM polls;
      DELETE FROM members;
    `);

    // Create test committee member
    committeeId = randomUUID();
    const now = Date.now();
    db.prepare(`
      INSERT INTO members (id, email, password_hash, name, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(committeeId, 'committee@test.com', 'hash', 'Committee', 'committee', now);

    // Create test regular member
    memberId = randomUUID();
    db.prepare(`
      INSERT INTO members (id, email, password_hash, name, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(memberId, 'member@test.com', 'hash', 'Member', 'member', now);
  });

  describe('tracer bullet: createPoll and getPoll', () => {
    it('committee creates a poll and retrieves it with all fields', async () => {
      const deadline = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days from now
      const choices = ['Yes', 'No', 'Abstain'];

      const poll = await createPoll({
        question: 'Should we approve the new legal strategy?',
        choices,
        deadline,
        created_by: committeeId,
      });

      expect(poll).toBeDefined();
      expect(poll.id).toBeDefined();
      expect(poll.question).toBe('Should we approve the new legal strategy?');
      expect(poll.choices).toEqual(choices);
      expect(poll.status).toBe('open');
      expect(poll.deadline).toBe(deadline);
      expect(poll.created_by).toBe(committeeId);
      expect(poll.created_at).toBeDefined();

      // Retrieve the poll
      const retrieved = await getPoll(poll.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(poll.id);
      expect(retrieved?.question).toBe('Should we approve the new legal strategy?');
      expect(retrieved?.choices).toEqual(choices);
      expect(retrieved?.status).toBe('open');
      expect(retrieved?.deadline).toBe(deadline);
      expect(retrieved?.created_by).toBe(committeeId);
    });
  });

  describe('voting on polls', () => {
    it('member can vote once on an open poll', async () => {
      const deadline = Date.now() + 7 * 24 * 60 * 60 * 1000;
      const choices = ['Yes', 'No'];

      const poll = await createPoll({
        question: 'Approve building repairs?',
        choices,
        deadline,
        created_by: committeeId,
      });

      const voteResult = await vote({
        poll_id: poll.id,
        member_id: memberId,
        choice: 'Yes',
      });

      expect(voteResult).toBeDefined();
      expect(voteResult.id).toBeDefined();
      expect(voteResult.poll_id).toBe(poll.id);
      expect(voteResult.member_id).toBe(memberId);
      expect(voteResult.choice).toBe('Yes');
      expect(voteResult.created_at).toBeDefined();
    });

    it('member cannot vote twice on the same poll', async () => {
      const deadline = Date.now() + 7 * 24 * 60 * 60 * 1000;
      const choices = ['Yes', 'No'];

      const poll = await createPoll({
        question: 'Approve building repairs?',
        choices,
        deadline,
        created_by: committeeId,
      });

      // First vote succeeds
      await vote({
        poll_id: poll.id,
        member_id: memberId,
        choice: 'Yes',
      });

      // Second vote should fail
      await expect(
        vote({
          poll_id: poll.id,
          member_id: memberId,
          choice: 'No',
        })
      ).rejects.toThrow();
    });

    it('member cannot vote on a closed poll', async () => {
      const deadline = Date.now() + 7 * 24 * 60 * 60 * 1000;
      const choices = ['Yes', 'No'];

      const poll = await createPoll({
        question: 'Approve building repairs?',
        choices,
        deadline,
        created_by: committeeId,
      });

      // Committee closes the poll
      await closePoll(poll.id);

      // Attempt to vote on closed poll should fail
      await expect(
        vote({
          poll_id: poll.id,
          member_id: memberId,
          choice: 'Yes',
        })
      ).rejects.toThrow();
    });
  });

  describe('poll results', () => {
    it('retrieves vote counts per choice in real-time', async () => {
      const deadline = Date.now() + 7 * 24 * 60 * 60 * 1000;
      const choices = ['Agree', 'Disagree', 'Abstain'];

      const poll = await createPoll({
        question: 'Approve new fee structure?',
        choices,
        deadline,
        created_by: committeeId,
      });

      // Create multiple members and vote
      const member2Id = randomUUID();
      const member3Id = randomUUID();
      const now = Date.now();
      db.prepare(`
        INSERT INTO members (id, email, password_hash, name, role, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(member2Id, 'member2@test.com', 'hash', 'Member 2', 'member', now);
      db.prepare(`
        INSERT INTO members (id, email, password_hash, name, role, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(member3Id, 'member3@test.com', 'hash', 'Member 3', 'member', now);

      await vote({
        poll_id: poll.id,
        member_id: memberId,
        choice: 'Agree',
      });

      await vote({
        poll_id: poll.id,
        member_id: member2Id,
        choice: 'Agree',
      });

      await vote({
        poll_id: poll.id,
        member_id: member3Id,
        choice: 'Disagree',
      });

      const results = await getPollResults(poll.id);

      expect(results).toEqual({
        'Agree': 2,
        'Disagree': 1,
        'Abstain': 0,
      });
    });
  });

  describe('listing polls', () => {
    it('lists all open and closed polls', async () => {
      const deadline = Date.now() + 7 * 24 * 60 * 60 * 1000;
      const choices = ['Yes', 'No'];

      // Create an open poll
      const openPoll = await createPoll({
        question: 'Open question?',
        choices,
        deadline,
        created_by: committeeId,
      });

      // Create and close a poll
      const closedPoll = await createPoll({
        question: 'Closed question?',
        choices,
        deadline,
        created_by: committeeId,
      });
      await closePoll(closedPoll.id);

      const allPolls = await listPolls('all');
      const openPolls = await listPolls('open');
      const closedPolls = await listPolls('closed');

      expect(allPolls).toHaveLength(2);
      expect(openPolls).toHaveLength(1);
      expect(closedPolls).toHaveLength(1);

      expect(openPolls[0].id).toBe(openPoll.id);
      expect(closedPolls[0].id).toBe(closedPoll.id);
    });
  });
});
