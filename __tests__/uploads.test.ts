import { validateUpload, mimeForFilename, isInlineMime, MAX_UPLOAD_BYTES } from '../lib/uploads';

describe('Upload validation & MIME helpers', () => {
  describe('tracer bullet: validateUpload accepts an allowed file under the cap', () => {
    it('accepts a small PDF', () => {
      const result = validateUpload('report.pdf', 1024);
      expect(result.ok).toBe(true);
    });
  });

  describe('rejecting bad uploads', () => {
    it('rejects a disallowed extension', () => {
      const result = validateUpload('malware.exe', 1024);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/type/i);
    });

    it('rejects a file over the size cap', () => {
      const result = validateUpload('huge.pdf', MAX_UPLOAD_BYTES + 1);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/size|large|25/i);
    });

    it('accepts a file exactly at the cap', () => {
      expect(validateUpload('edge.pdf', MAX_UPLOAD_BYTES).ok).toBe(true);
    });

    it('is case-insensitive about extensions', () => {
      expect(validateUpload('REPORT.PDF', 10).ok).toBe(true);
      expect(validateUpload('photo.JPG', 10).ok).toBe(true);
    });
  });

  describe('mimeForFilename', () => {
    it('maps known extensions to MIME types', () => {
      expect(mimeForFilename('a.pdf')).toBe('application/pdf');
      expect(mimeForFilename('a.png')).toBe('image/png');
      expect(mimeForFilename('a.docx')).toBe(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
    });

    it('falls back to octet-stream for unknown extensions', () => {
      expect(mimeForFilename('a.weird')).toBe('application/octet-stream');
    });
  });

  describe('isInlineMime', () => {
    it('treats pdf, images and text as inline-viewable', () => {
      expect(isInlineMime('application/pdf')).toBe(true);
      expect(isInlineMime('image/png')).toBe(true);
      expect(isInlineMime('text/plain')).toBe(true);
    });

    it('treats office docs and unknown types as download-only', () => {
      expect(isInlineMime('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(false);
      expect(isInlineMime('application/octet-stream')).toBe(false);
    });
  });
});
