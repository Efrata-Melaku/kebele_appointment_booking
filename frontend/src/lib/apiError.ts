import type { ApiEnvelope } from './api';

export function getApiErrorMessage(
  body: ApiEnvelope | null | undefined,
  fallback = 'Request failed'
): string {
  if (!body) return fallback;
  const details = (body as ApiEnvelope & { details?: { message?: string }[] }).details;
  if (Array.isArray(details) && details.length > 0) {
    return details.map((d) => d.message).filter(Boolean).join('. ');
  }
  if (typeof body.error === 'string' && body.error.trim()) return body.error;
  return fallback;
}
