import { randomUUID } from 'crypto';
import db from '../lib/db';
import { createCase } from '../app/api/case/actions';
import {
  uploadCaseDocument,
  getCaseDocuments,
  deleteCaseDocument,
  createCaseAction,
  getCaseActions,
  updateCaseActionStatus,
} from '../app/api/case/documents-actions';

describe('Case Documents & Actions', () => {
  let committeeId: string;
  let caseId: string;

  beforeEach(() => {
    // Clean up
    db.exec(`
      DELETE FROM case_actions;
      DELETE FROM case_documents;
      DELETE FROM cases;
      DELETE FROM members;
    `);

    // Create test members
    committeeId = randomUUID();
    const memberId = randomUUID();

    db.prepare(`
      INSERT INTO members (id, email, password_hash, name, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(committeeId, 'committee@test.com', 'hash', 'Committee', 'committee', Date.now());

    db.prepare(`
      INSERT INTO members (id, email, password_hash, name, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(memberId, 'member@test.com', 'hash', 'Member', 'member', Date.now());
  });

  describe('tracer bullet: upload document + create action', () => {
    it('committee uploads document and creates action item, both retrievable', async () => {
      // Create a case first
      const caseData = {
        title: 'Test Case',
        opposing_party: 'Test Party',
        court: 'Test Court',
        stage: 'filed' as const,
        summary: 'Test',
        opened_date: Date.now(),
        next_hearing_date: null,
      };

      const createdCase = await createCase(caseData, committeeId);
      caseId = createdCase.id;

      // Upload document
      const fileContent = Buffer.from('Test document content');
      const doc = await uploadCaseDocument(
        {
          case_id: caseId,
          filename: 'court-filing.pdf',
          fileContent,
        },
        committeeId
      );

      expect(doc).toBeDefined();
      expect(doc.id).toBeDefined();
      expect(doc.case_id).toBe(caseId);
      expect(doc.filename).toBe('court-filing.pdf');
      expect(doc.uploaded_by).toBe(committeeId);

      // Create action item
      const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).getTime(); // 7 days from now

      const action = await createCaseAction(
        {
          case_id: caseId,
          task: 'File response with court',
          assigned_to: committeeId,
          due_date: dueDate,
        },
        committeeId
      );

      expect(action).toBeDefined();
      expect(action.id).toBeDefined();
      expect(action.case_id).toBe(caseId);
      expect(action.task).toBe('File response with court');
      expect(action.status).toBe('open');

      // Retrieve documents
      const documents = await getCaseDocuments(caseId);
      expect(documents).toHaveLength(1);
      expect(documents[0].id).toBe(doc.id);

      // Retrieve actions
      const actions = await getCaseActions(caseId);
      expect(actions).toHaveLength(1);
      expect(actions[0].id).toBe(action.id);
    });
  });

  describe('document management', () => {
    it('committee can delete document', async () => {
      const caseData = {
        title: 'Test Case',
        opposing_party: 'Test Party',
        court: 'Test Court',
        stage: 'filed' as const,
        summary: 'Test',
        opened_date: Date.now(),
        next_hearing_date: null,
      };

      const createdCase = await createCase(caseData, committeeId);

      // Upload document
      const fileContent = Buffer.from('Test content');
      const doc = await uploadCaseDocument(
        {
          case_id: createdCase.id,
          filename: 'test.pdf',
          fileContent,
        },
        committeeId
      );

      // Verify it exists
      let documents = await getCaseDocuments(createdCase.id);
      expect(documents).toHaveLength(1);

      // Delete it
      await deleteCaseDocument(doc.id);

      // Verify it's gone (soft-delete)
      documents = await getCaseDocuments(createdCase.id);
      expect(documents).toHaveLength(0);
    });
  });

  describe('action management', () => {
    it('committee can mark action complete', async () => {
      const caseData = {
        title: 'Test Case',
        opposing_party: 'Test Party',
        court: 'Test Court',
        stage: 'filed' as const,
        summary: 'Test',
        opened_date: Date.now(),
        next_hearing_date: null,
      };

      const createdCase = await createCase(caseData, committeeId);

      const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).getTime();

      const action = await createCaseAction(
        {
          case_id: createdCase.id,
          task: 'File response',
          assigned_to: committeeId,
          due_date: dueDate,
        },
        committeeId
      );

      expect(action.status).toBe('open');

      // Mark as done
      const updated = await updateCaseActionStatus(action.id, 'done');

      expect(updated.status).toBe('done');
      expect(updated.id).toBe(action.id);
    });
  });

  describe('action items sorted by due date', () => {
    it('actions retrieved in due date order', async () => {
      const caseData = {
        title: 'Test Case',
        opposing_party: 'Test Party',
        court: 'Test Court',
        stage: 'filed' as const,
        summary: 'Test',
        opened_date: Date.now(),
        next_hearing_date: null,
      };

      const createdCase = await createCase(caseData, committeeId);

      // Create actions with different due dates (in reverse order)
      const thirdDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).getTime();
      const firstDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).getTime();
      const secondDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).getTime();

      // Create in scrambled order
      await createCaseAction(
        {
          case_id: createdCase.id,
          task: 'Task 3',
          assigned_to: committeeId,
          due_date: thirdDate,
        },
        committeeId
      );

      await createCaseAction(
        {
          case_id: createdCase.id,
          task: 'Task 1',
          assigned_to: committeeId,
          due_date: firstDate,
        },
        committeeId
      );

      await createCaseAction(
        {
          case_id: createdCase.id,
          task: 'Task 2',
          assigned_to: committeeId,
          due_date: secondDate,
        },
        committeeId
      );

      // Retrieve should be sorted by due date
      const actions = await getCaseActions(createdCase.id);

      expect(actions).toHaveLength(3);
      expect(actions[0].task).toBe('Task 1');
      expect(actions[1].task).toBe('Task 2');
      expect(actions[2].task).toBe('Task 3');
    });
  });
});
