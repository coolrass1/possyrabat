import { randomUUID } from 'crypto';
import { existsSync } from 'fs';
import db from '../lib/db';
import {
  addMeetingDocument,
  getMeetingDocuments,
  getMeetingDocumentFile,
  deleteMeetingDocument,
} from '../lib/meeting-documents';

describe('Meeting documents', () => {
  let committeeId: string;
  let meetingId: string;

  beforeEach(() => {
    db.exec(`
      DELETE FROM meeting_documents;
      DELETE FROM meetings;
      DELETE FROM members;
    `);
    committeeId = randomUUID();
    db.prepare(`
      INSERT INTO members (id, email, password_hash, name, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(committeeId, 'c@test.com', 'h', 'Committee', 'committee', Date.now());

    meetingId = randomUUID();
    db.prepare(`
      INSERT INTO meetings (id, date, title, notes, attendees, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(meetingId, Date.now(), 'Monthly', null, '[]', committeeId, Date.now(), Date.now());
  });

  describe('tracer bullet: add and list a document', () => {
    it('stores a document with kind and mime, and lists it', async () => {
      const doc = await addMeetingDocument(
        {
          meeting_id: meetingId,
          filename: 'AGM report.pdf',
          fileContent: Buffer.from('%PDF- pretend'),
          kind: 'report',
        },
        committeeId
      );

      expect(doc.id).toBeDefined();
      expect(doc.meeting_id).toBe(meetingId);
      expect(doc.filename).toBe('AGM report.pdf');
      expect(doc.kind).toBe('report');
      expect(doc.mime_type).toBe('application/pdf');
      expect(doc.uploaded_by).toBe(committeeId);

      const list = await getMeetingDocuments(meetingId);
      expect(list).toHaveLength(1);
      expect(list[0].filename).toBe('AGM report.pdf');
      expect(list[0].kind).toBe('report');
    });
  });

  describe('reading the file back', () => {
    it('returns content, filename and mime for inline serving', async () => {
      const doc = await addMeetingDocument(
        { meeting_id: meetingId, filename: 'notes.txt', fileContent: Buffer.from('hello'), kind: 'minutes' },
        committeeId
      );

      const file = await getMeetingDocumentFile(doc.id);
      expect(file).not.toBeNull();
      expect(file!.filename).toBe('notes.txt');
      expect(file!.mime_type).toBe('text/plain');
      expect(file!.content.toString()).toBe('hello');
    });

    it('returns null for an unknown document', async () => {
      expect(await getMeetingDocumentFile('nope')).toBeNull();
    });
  });

  describe('deleting a document', () => {
    it('soft-deletes the row and removes the file from disk', async () => {
      const doc = await addMeetingDocument(
        { meeting_id: meetingId, filename: 'old.pdf', fileContent: Buffer.from('x'), kind: 'other' },
        committeeId
      );
      const path = doc.storage_path;
      expect(existsSync(path)).toBe(true);

      await deleteMeetingDocument(doc.id);

      expect(existsSync(path)).toBe(false);
      expect(await getMeetingDocuments(meetingId)).toHaveLength(0);
      expect(await getMeetingDocumentFile(doc.id)).toBeNull();
    });
  });

  describe('validation', () => {
    it('rejects a disallowed file type', async () => {
      await expect(
        addMeetingDocument(
          { meeting_id: meetingId, filename: 'evil.exe', fileContent: Buffer.from('x'), kind: 'other' },
          committeeId
        )
      ).rejects.toThrow(/type/i);
    });

    it('rejects a file over the size cap', async () => {
      const big = Buffer.alloc(25 * 1024 * 1024 + 1);
      await expect(
        addMeetingDocument(
          { meeting_id: meetingId, filename: 'huge.pdf', fileContent: big, kind: 'report' },
          committeeId
        )
      ).rejects.toThrow(/size|large|25/i);
    });
  });
});
