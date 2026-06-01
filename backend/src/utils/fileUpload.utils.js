const path = require('path');
const cloudinaryService = require('../services/cloudinary.service');

const FIELD_FILE_RE = /^file_(\d+)$/;
const LEGACY_FIELD_FILE_RE = /^df_(\d+)$/;

function parseFieldIdFromName(fieldname) {
  let m = FIELD_FILE_RE.exec(fieldname);
  if (!m) m = LEGACY_FIELD_FILE_RE.exec(fieldname);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Upload multipart files to Cloudinary (memory buffers only — nothing persisted on disk).
 * @returns {{ fileUrlsByFieldId: Record<number, string>, fileMetaByFieldId: Record<number, { fileUrl: string, fileName: string, fileType: string|null }>, documentUrl: string|null }}
 */
async function processMultipartFiles(files) {
  const fileUrlsByFieldId = {};
  const fileMetaByFieldId = {};
  let documentUrl = null;

  const list = Array.isArray(files) ? files : [];

  for (const f of list) {
    if (!f?.buffer) continue;

    if (f.fieldname === 'document') {
      const uploaded = await cloudinaryService.uploadMulterFile(f);
      documentUrl = uploaded.fileUrl;
      continue;
    }

    const fieldId = parseFieldIdFromName(f.fieldname);
    if (fieldId == null) continue;

    const uploaded = await cloudinaryService.uploadMulterFile(f);
    fileUrlsByFieldId[fieldId] = uploaded.fileUrl;
    fileMetaByFieldId[fieldId] = {
      fileUrl: uploaded.fileUrl,
      fileName: uploaded.fileName,
      fileType: uploaded.fileType,
    };
  }

  return { fileUrlsByFieldId, fileMetaByFieldId, documentUrl };
}

/** Accept Cloudinary URLs already embedded in the JSON responses payload. */
function mergePreuploadedFileMeta(values, fileUrlsByFieldId, fileMetaByFieldId) {
  const urls = { ...fileUrlsByFieldId };
  const meta = { ...fileMetaByFieldId };

  for (const [key, raw] of Object.entries(values || {})) {
    const fieldId = parseInt(key, 10);
    if (Number.isNaN(fieldId)) continue;

    if (typeof raw === 'string' && /^https?:\/\//i.test(raw)) {
      urls[fieldId] = raw;
      if (!meta[fieldId]) {
        meta[fieldId] = {
          fileUrl: raw,
          fileName: path.basename(raw.split('?')[0]) || 'file',
          fileType: null,
        };
      }
      continue;
    }

    if (raw && typeof raw === 'object' && raw.fileUrl) {
      urls[fieldId] = String(raw.fileUrl);
      meta[fieldId] = {
        fileUrl: String(raw.fileUrl),
        fileName: String(raw.fileName || path.basename(String(raw.fileUrl).split('?')[0]) || 'file'),
        fileType: raw.fileType ? String(raw.fileType) : null,
      };
    }
  }

  return { fileUrlsByFieldId: urls, fileMetaByFieldId: meta };
}

module.exports = {
  processMultipartFiles,
  mergePreuploadedFileMeta,
  parseFieldIdFromName,
};
