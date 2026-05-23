const serviceFormFieldModel = require('../models/serviceFormField.model');

const ALLOWED_TYPES = new Set([
  'text',
  'textarea',
  'number',
  'select',
  'radio',
  'checkbox',
  'date',
  'file',
]);

/**
 * Active fields only — used for resident booking and validation.
 */
async function loadActiveFormFieldDefinitions(serviceId) {
  return serviceFormFieldModel.findManyFormFields({
    where: { serviceId: Number(serviceId), isActive: true },
    orderBy: [{ order: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      label: true,
      fieldType: true,
      placeholder: true,
      required: true,
      options: true,
      order: true,
      isActive: true,
    },
  });
}

async function getFormFieldsForService(serviceId) {
  return loadActiveFormFieldDefinitions(serviceId);
}

function parseOptions(optionsStr) {
  if (!optionsStr || typeof optionsStr !== 'string') return [];
  try {
    const arr = JSON.parse(optionsStr);
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
}

function serializeValue(fieldType, raw, fileUrl) {
  if (fieldType === 'file') {
    return fileUrl || null;
  }
  if (fieldType === 'checkbox') {
    const b = raw === true || raw === 'true' || raw === '1' || raw === 1;
    return b ? 'true' : 'false';
  }
  if (fieldType === 'number') {
    return String(raw);
  }
  return String(raw).trim();
}

/**
 * Validate and return rows for relational storage.
 * @returns {{ formFieldId: number, value: string }[]}
 */
function validateResponsesWithDefinitions(fieldRows, values, fileUrlsByFieldId = {}) {
  const rows = [];
  const errors = [];

  for (const field of fieldRows) {
    const key = String(field.id);
    const raw = values[key];
    const fileUrl = fileUrlsByFieldId[field.id];

    if (field.fieldType === 'file') {
      let resolvedUrl = fileUrlsByFieldId[field.id];
      if (!resolvedUrl && raw != null) {
        if (typeof raw === 'string' && /^https?:\/\//i.test(raw.trim())) {
          resolvedUrl = raw.trim();
        } else if (typeof raw === 'object' && raw.fileUrl) {
          resolvedUrl = String(raw.fileUrl).trim();
        }
      }

      if (field.required && !resolvedUrl) {
        errors.push({ fieldId: field.id, label: field.label, message: 'File is required' });
      } else if (resolvedUrl) {
        rows.push({ formFieldId: field.id, value: resolvedUrl });
      }
      continue;
    }

    const empty =
      raw === undefined ||
      raw === null ||
      (typeof raw === 'string' && raw.trim() === '') ||
      (Array.isArray(raw) && raw.length === 0);

    if (field.required && empty) {
      errors.push({ fieldId: field.id, label: field.label, message: 'This field is required' });
      continue;
    }

    if (empty) continue;

    switch (field.fieldType) {
      case 'text':
      case 'textarea': {
        rows.push({ formFieldId: field.id, value: serializeValue(field.fieldType, raw) });
        break;
      }
      case 'number': {
        const n = Number(raw);
        if (Number.isNaN(n)) {
          errors.push({ fieldId: field.id, label: field.label, message: 'Must be a valid number' });
        } else {
          rows.push({ formFieldId: field.id, value: serializeValue(field.fieldType, n) });
        }
        break;
      }
      case 'date': {
        const d = new Date(String(raw));
        if (Number.isNaN(d.getTime())) {
          errors.push({ fieldId: field.id, label: field.label, message: 'Invalid date' });
        } else {
          rows.push({ formFieldId: field.id, value: String(raw) });
        }
        break;
      }
      case 'select':
      case 'radio': {
        const opts = parseOptions(field.options);
        const v = String(raw);
        if (!opts.includes(v)) {
          errors.push({ fieldId: field.id, label: field.label, message: 'Invalid option' });
        } else {
          rows.push({ formFieldId: field.id, value: v });
        }
        break;
      }
      case 'checkbox': {
        rows.push({ formFieldId: field.id, value: serializeValue(field.fieldType, raw) });
        break;
      }
      default:
        errors.push({ fieldId: field.id, label: field.label, message: 'Unsupported field type' });
    }
  }

  if (errors.length) {
    const err = new Error('Dynamic form validation failed');
    err.code = 'DYNAMIC_FORM_VALIDATION';
    err.details = errors;
    throw err;
  }

  return rows;
}

async function validateAndBuildResponseRows(serviceId, values, fileUrlsByFieldId = {}) {
  const fieldRows = await loadActiveFormFieldDefinitions(serviceId);
  return validateResponsesWithDefinitions(fieldRows, values, fileUrlsByFieldId);
}

/**
 * For editing: validate against active fields; allow keeping file URLs without re-upload.
 */
async function validateUpdateResponseRows(
  serviceId,
  values,
  fileUrlsByFieldId = {},
  existingByFieldId = {}
) {
  const fieldRows = await loadActiveFormFieldDefinitions(serviceId);
  const mergedFiles = { ...fileUrlsByFieldId };
  for (const field of fieldRows) {
    if (field.fieldType !== 'file') continue;
    if (mergedFiles[field.id]) continue;

    const key = String(field.id);
    const raw = values[key];
    if (typeof raw === 'string' && /^https?:\/\//i.test(raw.trim())) {
      mergedFiles[field.id] = raw.trim();
      continue;
    }
    if (raw && typeof raw === 'object' && raw.fileUrl) {
      mergedFiles[field.id] = String(raw.fileUrl).trim();
      continue;
    }

    const prev = existingByFieldId[field.id];
    if (prev) mergedFiles[field.id] = prev;
  }
  return validateResponsesWithDefinitions(fieldRows, values, mergedFiles);
}

function assertValidFieldType(t) {
  if (!ALLOWED_TYPES.has(t)) {
    throw new Error(`Invalid field type: ${t}`);
  }
}

module.exports = {
  getFormFieldsForService,
  loadActiveFormFieldDefinitions,
  loadFormFieldDefinitions: loadActiveFormFieldDefinitions,
  validateResponsesWithDefinitions,
  validateAndBuildResponseRows,
  validateUpdateResponseRows,
  parseOptions,
  assertValidFieldType,
  ALLOWED_TYPES,
};
