import { createCase, getCaseById, logCaseStep, getCaseTimeline, editCase, deleteCase } from '../app/api/case/actions';
import db from '../lib/db';
import { randomUUID } from 'crypto';

describe('Case Management', () => {
  beforeEach(() => {
    // Initialize fresh DB for each test
    db.exec(`
      DELETE FROM case_steps;
      DELETE FROM cases;
      DELETE FROM members;
    `);

    // Create a test committee member
    db.prepare(`
      INSERT INTO members (id, email, password_hash, name, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      'committee-1',
      'committee@test.com',
      'hash',
      'Committee Member',
      'committee',
      Date.now()
    );
  });

  describe('tracer bullet: committee creates and retrieves a case', () => {
    it('committee can create a case and retrieve it with all fields intact', async () => {
      const openedDate = new Date('2024-01-15').getTime();
      const nextHearingDate = new Date('2024-06-30').getTime();

      const caseData = {
        title: 'Members v. Occupiers',
        opposing_party: 'Unauthorized Occupiers Group',
        court: 'District Court of Lagos',
        stage: 'in progress' as const,
        summary: 'Dispute over land parcels taken without consent',
        opened_date: openedDate,
        next_hearing_date: nextHearingDate,
      };

      // Create case
      const created = await createCase(caseData, 'committee-1');

      expect(created).toBeDefined();
      expect(created.id).toBeDefined();
      expect(created.title).toBe(caseData.title);
      expect(created.opposing_party).toBe(caseData.opposing_party);
      expect(created.court).toBe(caseData.court);
      expect(created.stage).toBe(caseData.stage);
      expect(created.summary).toBe(caseData.summary);
      expect(created.opened_date).toBe(openedDate);
      expect(created.next_hearing_date).toBe(nextHearingDate);

      // Retrieve case
      const retrieved = await getCaseById(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.title).toBe(caseData.title);
      expect(retrieved?.opposing_party).toBe(caseData.opposing_party);
      expect(retrieved?.created_by).toBe('committee-1');
    });
  });

  describe('committee logs case steps', () => {
    it('committee can log a case step with all fields', async () => {
      // First create a case
      const caseData = {
        title: 'Members v. Occupiers',
        opposing_party: 'Unauthorized Occupiers Group',
        court: 'District Court of Lagos',
        stage: 'in progress' as const,
        summary: 'Dispute over land parcels',
        opened_date: Date.now(),
        next_hearing_date: null,
      };

      const createdCase = await createCase(caseData, 'committee-1');

      // Now log a case step
      const stepDate = new Date('2024-03-10').getTime();
      const step = await logCaseStep(
        {
          case_id: createdCase.id,
          date: stepDate,
          description: 'Court hearing held, judge requested evidence of original ownership',
          type: 'hearing',
          document_url: null,
        },
        'committee-1'
      );

      expect(step).toBeDefined();
      expect(step.id).toBeDefined();
      expect(step.case_id).toBe(createdCase.id);
      expect(step.date).toBe(stepDate);
      expect(step.description).toContain('Court hearing held');
      expect(step.type).toBe('hearing');
      expect(step.logged_by).toBe('committee-1');
      expect(step.document_url).toBeNull();
    });
  });

  describe('case timeline', () => {
    it('timeline displays steps in chronological order regardless of logging order', async () => {
      const caseData = {
        title: 'Members v. Occupiers',
        opposing_party: 'Unauthorized Occupiers Group',
        court: 'District Court of Lagos',
        stage: 'in progress' as const,
        summary: 'Dispute over land parcels',
        opened_date: Date.now(),
        next_hearing_date: null,
      };

      const createdCase = await createCase(caseData, 'committee-1');

      // Log steps out of chronological order
      const firstEventDate = new Date('2024-01-10').getTime();
      const secondEventDate = new Date('2024-03-15').getTime();
      const thirdEventDate = new Date('2024-02-20').getTime();

      // Log in order: second, first, third (scrambled)
      await logCaseStep(
        {
          case_id: createdCase.id,
          date: secondEventDate,
          description: 'Court hearing held',
          type: 'hearing',
          document_url: null,
        },
        'committee-1'
      );

      await logCaseStep(
        {
          case_id: createdCase.id,
          date: firstEventDate,
          description: 'Case filed',
          type: 'filing',
          document_url: null,
        },
        'committee-1'
      );

      await logCaseStep(
        {
          case_id: createdCase.id,
          date: thirdEventDate,
          description: 'Lawyer advises on evidence',
          type: 'lawyer_advice',
          document_url: null,
        },
        'committee-1'
      );

      // Get timeline
      const timeline = await getCaseTimeline(createdCase.id);

      expect(timeline).toHaveLength(3);
      expect(timeline[0].date).toBe(firstEventDate);
      expect(timeline[0].type).toBe('filing');
      expect(timeline[1].date).toBe(thirdEventDate);
      expect(timeline[1].type).toBe('lawyer_advice');
      expect(timeline[2].date).toBe(secondEventDate);
      expect(timeline[2].type).toBe('hearing');
    });
  });

  describe('committee edits case', () => {
    it('committee can update case stage and next hearing date', async () => {
      const caseData = {
        title: 'Members v. Occupiers',
        opposing_party: 'Unauthorized Occupiers Group',
        court: 'District Court of Lagos',
        stage: 'in progress' as const,
        summary: 'Dispute over land parcels',
        opened_date: Date.now(),
        next_hearing_date: null,
      };

      const createdCase = await createCase(caseData, 'committee-1');

      // Edit the case
      const newHearingDate = new Date('2024-09-15').getTime();
      const updated = await editCase(
        createdCase.id,
        {
          stage: 'hearing scheduled' as const,
          next_hearing_date: newHearingDate,
        },
        'committee-1'
      );

      expect(updated.id).toBe(createdCase.id);
      expect(updated.stage).toBe('hearing scheduled');
      expect(updated.next_hearing_date).toBe(newHearingDate);

      // Verify in database
      const retrieved = await getCaseById(createdCase.id);
      expect(retrieved?.stage).toBe('hearing scheduled');
      expect(retrieved?.next_hearing_date).toBe(newHearingDate);
    });
  });

  describe('soft delete', () => {
    it('deleted case is not retrieved, but stays in database for audit', async () => {
      const caseData = {
        title: 'Members v. Occupiers',
        opposing_party: 'Unauthorized Occupiers Group',
        court: 'District Court of Lagos',
        stage: 'in progress' as const,
        summary: 'Dispute over land parcels',
        opened_date: Date.now(),
        next_hearing_date: null,
      };

      const createdCase = await createCase(caseData, 'committee-1');

      // Delete the case
      await deleteCase(createdCase.id);

      // Case should not be retrievable
      const retrieved = await getCaseById(createdCase.id);
      expect(retrieved).toBeNull();

      // But timeline should also be empty (soft-deleted cases don't show their steps)
      const timeline = await getCaseTimeline(createdCase.id);
      expect(timeline).toHaveLength(0);
    });
  });
});
