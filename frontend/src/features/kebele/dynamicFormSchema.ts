import { z } from 'zod';
import { parseFieldOptions, type FormResponseRow, type ServiceFormFieldDef } from './formTypes';
import { responseFieldId } from './formPaths';

function buildSingleFieldZod(f: ServiceFormFieldDef): z.ZodTypeAny {
  const label = f.label;

  switch (f.fieldType) {
    case 'text':
    case 'textarea': {
      if (f.required) {
        return z.string().min(1, `${label} is required`);
      }
      return z.string().optional().or(z.literal(''));
    }
    case 'number': {
      if (f.required) {
        return z.coerce.number({ invalid_type_error: `${label} must be a number` });
      }
      return z
        .union([z.literal(''), z.coerce.number({ invalid_type_error: `${label} must be a number` })])
        .optional();
    }
    case 'date': {
      if (f.required) {
        return z.string().min(1, `${label} is required`);
      }
      return z.string().optional().or(z.literal(''));
    }
    case 'select':
    case 'radio': {
      const opts = parseFieldOptions(f.options);
      if (opts.length >= 2) {
        const e = z.enum([opts[0], opts[1], ...opts.slice(2)] as [string, ...string[]], {
          required_error: `${label} is required`,
        });
        return f.required ? e : e.optional().or(z.literal(''));
      }
      if (opts.length === 1) {
        const lit = z.literal(opts[0]);
        return f.required ? lit : lit.optional();
      }
      return f.required ? z.string().min(1, `${label} is required`) : z.string().optional();
    }
    case 'checkbox': {
      if (f.required) {
        return z.boolean().refine((v) => v === true, { message: `${label} is required` });
      }
      return z.boolean().default(false);
    }
    case 'file': {
      if (f.required) {
        return z.custom<File | string>(
          (v) => v instanceof File || (typeof v === 'string' && v.length > 0),
          { message: `${label} is required` }
        );
      }
      return z.custom<File | string | undefined>(
        (v) => v === undefined || v === '' || v instanceof File || typeof v === 'string',
        { message: 'Invalid file' }
      ).optional();
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
      responses[id] = ex.value ?? '';
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
