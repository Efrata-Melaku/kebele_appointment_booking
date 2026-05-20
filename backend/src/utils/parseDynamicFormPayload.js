/**
 * Parse dynamic form values from multipart body.
 * Accepts `responses` (preferred) or legacy `dynamicFields` JSON string.
 */
function parseDynamicFormPayload(body) {
  const raw = body.responses ?? body.dynamicFields;
  if (!raw) return {};

  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
    return raw;
  }

  if (typeof raw === 'string' && raw.trim() !== '') {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('responses must be a JSON object');
    }
    return parsed;
  }

  return {};
}

function collectFileUrlsByFieldId(files) {
  const fileUrlsByFieldId = {};
  const list = Array.isArray(files) ? files : [];

  for (const f of list) {
    let m = /^file_(\d+)$/.exec(f.fieldname);
    if (!m) m = /^df_(\d+)$/.exec(f.fieldname);
    if (m) {
      fileUrlsByFieldId[parseInt(m[1], 10)] = `/uploads/documents/${f.filename}`;
    }
  }

  return fileUrlsByFieldId;
}

module.exports = {
  parseDynamicFormPayload,
  collectFileUrlsByFieldId,
};
