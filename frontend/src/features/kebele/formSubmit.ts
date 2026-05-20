import type { ServiceFormFieldDef } from './formTypes';
import { responseFieldId, responseFileFieldName, type ResponsesMap } from './formPaths';

/**
 * Append booking dynamic fields to FormData.
 * Sends `responses` JSON + separate file parts as file_<id>.
 */
export function appendResponsesToFormData(
  fd: FormData,
  fields: ServiceFormFieldDef[],
  responses: ResponsesMap
) {
  const payload: Record<string, string | number | boolean> = {};

  for (const f of fields) {
    const id = responseFieldId(f.id);
    const val = responses[id];

    if (f.fieldType === 'file') {
      if (val instanceof File) {
        fd.append(responseFileFieldName(f.id), val);
      } else if (typeof val === 'string' && val.length > 0) {
        payload[id] = val;
      }
      continue;
    }

    if (val === undefined || val === null || val === '') continue;
    if (f.fieldType === 'checkbox') {
      payload[id] = Boolean(val);
    } else {
      payload[id] = val as string | number | boolean;
    }
  }

  const json = JSON.stringify(payload);
  fd.append('responses', json);
  // Legacy alias for older backend handlers
  fd.append('dynamicFields', json);

  if (import.meta.env.DEV) {
    console.debug('[formSubmit] responses payload', payload);
  }
}
