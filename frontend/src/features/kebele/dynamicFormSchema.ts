import { z } from 'zod';
import { parseFieldOptions, type FormResponseRow, type ServiceFormFieldDef } from './formTypes';
import { responseFieldId } from './formPaths';
import type { UploadedFileMeta } from './uploadFile';

function hasFileValue(v: unknown): boolean {
  if (v instanceof File) return true;
  if (typeof v === 'string' && v.trim().length > 0) return true;
  if (typeof v === 'object' && v !== null && 'fileUrl' in v) {
    const url = String((v as UploadedFileMeta).fileUrl || '').trim();
    return url.length > 0;
  }
  return false;
}

function buildSingleFieldZod(f: ServiceFormFieldDef): z.ZodTypeAny {
  const label = f.label;

  switch (f.fieldType) {
    case 'text':
    case 'textarea': {
      const base = z.string().trim();
      return f.required ? base.min(1, `${label} is required`) : base.optional().or(z.literal(''));
    }
    case 'number': {
      if (f.required) {
        return z
          .union([z.literal(''), z.coerce.number({ invalid_type_error: `${label} must be a number` })])
          .refine((v) => v !== '' && v !== null && !Number.isNaN(Number(v)), {
            message: `${label} is required`,
          });
      }
      return z
        .union([z.literal(''), z.coerce.number({ invalid_type_error: `${label} must be a number` })])
        .optional();
    }
    case 'date': {
      const base = z.string().trim();
      return f.required ? base.min(1, `${label} is required`) : base.optional().or(z.literal(''));
    }
    case 'select':
    case 'radio': {
      const opts = parseFieldOptions(f.options);
      if (opts.length > 0) {
        const base = z
          .string()
          .trim()
          .refine((v) => !v || opts.includes(v), { message: `${label}: choose a valid option` });
        return f.required
          ? base.refine((v) => v.length > 0, { message: `${label} is required` })
          : base.optional().or(z.literal(''));
      }
      const base = z.string().trim();
      return f.required ? base.min(1, `${label} is required`) : base.optional().or(z.literal(''));
    }
    case 'checkbox': {
      if (f.required) {
        return z.boolean().refine((v) => v === true, { message: `${label} is required` });
      }
      return z.boolean().default(false);
    }
    case 'file': {
      if (f.required) {
        return z.custom<unknown>((v) => hasFileValue(v), { message: `${label} is required` });
      }
      return z
        .custom<unknown>(
          (v) => v === undefined || v === '' || hasFileValue(v),
          { message: 'Invalid file' }
        )
        .optional();
    }
    default:
      return z.any().optional();
  }
}

/** Nested Zod object: responses[fieldId] */
export function buildResponsesZodSchema(fields: ServiceFormFieldDef[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of fields) {
    shape[responseFieldId(f.id)] = buildSingleFieldZod(f);
  }
  if (Object.keys(shape).length === 0) {
    return z.record(z.unknown()).optional();
  }
  return z.object(shape);
}

export function buildEmptyResponsesDefaults(fields: ServiceFormFieldDef[]): Record<string, unknown> {
  const responses: Record<string, unknown> = {};
  for (const f of fields) {
    const id = responseFieldId(f.id);
    if (f.fieldType === 'checkbox') {
      responses[id] = false;
    } else if (f.fieldType === 'number') {
      responses[id] = '';
    } else {
      responses[id] = '';
    }
  }
  return responses;
}

export function buildResponsesDefaultsFromExisting(
  fields: ServiceFormFieldDef[],
  existing?: FormResponseRow[]
): Record<string, unknown> {
  const responses = buildEmptyResponsesDefaults(fields);
  const byField = new Map((existing || []).map((r) => [r.formFieldId, r]));

  for (const f of fields) {
    const id = responseFieldId(f.id);
    const ex = byField.get(f.id);
    if (!ex) continue;

    if (f.fieldType === 'checkbox') {
      responses[id] = ex.displayValue === true || ex.value === 'true';
    } else if (f.fieldType === 'file') {
      if (ex.value) {
        responses[id] = {
          fileUrl: ex.value,
          fileName: ex.value.split('/').pop() || 'file',
          fileType: null,
        };
      }
    } else if (f.fieldType === 'number') {
      responses[id] = ex.displayValue ?? ex.value ?? '';
    } else {
      responses[id] = ex.displayValue ?? ex.value ?? '';
    }
  }
  return responses;
}

/** @deprecated use buildResponsesZodSchema — kept for imports */
export function buildDynamicZodFields(fields: ServiceFormFieldDef[]) {
  return { responses: buildResponsesZodSchema(fields) };
}

export function defaultValuesForFields(
  fields: ServiceFormFieldDef[],
  existing?: FormResponseRow[]
) {
  return {
    responses: buildResponsesDefaultsFromExisting(fields, existing),
  };
}
