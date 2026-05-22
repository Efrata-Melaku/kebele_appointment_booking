import type { ServiceFormFieldDef } from './formTypes';
import { responseFieldId, responseFileFieldName, type ResponsesMap } from './formPaths';
import type { UploadedFileMeta } from './uploadFile';

function isUploadedMeta(val: unknown): val is UploadedFileMeta {
  return (
    typeof val === 'object' &&
    val !== null &&
    'fileUrl' in val &&
    typeof (val as UploadedFileMeta).fileUrl === 'string'
  );
}

/**
 * Append booking dynamic fields to FormData.
 * Pre-uploaded files are sent in `responses` JSON; new File objects are sent as file_<id> parts.
 */
export function appendResponsesToFormData(
  fd: FormData,
  fields: ServiceFormFieldDef[],
  responses: ResponsesMap
) {
  const payload: Record<string, string | number | boolean | UploadedFileMeta> = {};

  for (const f of fields) {
    const id = responseFieldId(f.id);
    const val = responses[id];

    if (f.fieldType === 'file') {
      if (val instanceof File) {
        fd.append(responseFileFieldName(f.id), val);
      } else if (isUploadedMeta(val)) {
        payload[id] = {
          fileUrl: val.fileUrl,
          fileName: val.fileName,
          fileType: val.fileType ?? null,
        };
      } else if (typeof val === 'string' && val.length > 0) {
        payload[id] = { fileUrl: val, fileName: val.split('/').pop() || 'file', fileType: null };
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
  fd.append('dynamicFields', json);

  if (import.meta.env.DEV) {
    console.debug('[formSubmit] responses payload', payload);
  }
}
