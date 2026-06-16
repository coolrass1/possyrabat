// Shared upload rules for committee-uploaded files (case documents, meeting
// documents). Keeps validation and MIME handling in one place so both features
// behave identically.

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

// extension -> MIME type. The keys double as the allow-list.
const EXTENSION_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  txt: 'text/plain',
  csv: 'text/csv',
};

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf('.');
  if (dot === -1) return '';
  return filename.slice(dot + 1).toLowerCase();
}

export type UploadValidation = { ok: true } | { ok: false; error: string };

export function validateUpload(filename: string, sizeBytes: number): UploadValidation {
  const ext = extensionOf(filename);
  if (!ext || !(ext in EXTENSION_MIME)) {
    return {
      ok: false,
      error: `File type not allowed. Accepted: ${Object.keys(EXTENSION_MIME).join(', ')}`,
    };
  }
  if (sizeBytes > MAX_UPLOAD_BYTES) {
    return { ok: false, error: 'File too large (max 25 MB)' };
  }
  return { ok: true };
}

export function mimeForFilename(filename: string): string {
  return EXTENSION_MIME[extensionOf(filename)] || 'application/octet-stream';
}

export function isInlineMime(mime: string): boolean {
  return mime === 'application/pdf' || mime.startsWith('image/') || mime.startsWith('text/');
}
