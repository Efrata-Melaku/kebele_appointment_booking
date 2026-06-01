/**
 * Normalize file URLs stored in the DB (Cloudinary https, legacy /uploads paths, JSON blobs).
 * @param {string|null|undefined} raw
 * @returns {string|null}
 */
function normalizeStoredFileUrl(raw) {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s) return null;

  if ((s.startsWith('{') || s.startsWith('[')) && s.includes('fileUrl')) {
    try {
      const parsed = JSON.parse(s);
      if (parsed && typeof parsed.fileUrl === 'string') {
        return normalizeStoredFileUrl(parsed.fileUrl);
      }
    } catch {
      /* keep original */
    }
  }

  if (/^https?:\/\//i.test(s)) return s;

  if (s.startsWith('uploads/')) return `/${s}`;
  if (s.startsWith('/uploads/')) return s;

  return s;
}

module.exports = { normalizeStoredFileUrl };
