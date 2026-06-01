/** Stable form keys — always field id, never label */
export function responseFieldId(fieldId: number): string {
  return String(fieldId);
}

/** React Hook Form path: responses.<fieldId> */
export function responseFieldPath(fieldId: number): `responses.${string}` {
  return `responses.${fieldId}`;
}

/** Multer / multipart file field name */
export function responseFileFieldName(fieldId: number): string {
  return `file_${fieldId}`;
}

import type { UploadedFileMeta } from './uploadFile';

export type ResponsesMap = Record<
  string,
  string | number | boolean | File | UploadedFileMeta | undefined
>;
