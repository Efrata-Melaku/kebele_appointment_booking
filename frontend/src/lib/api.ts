import { getToken } from './auth';

// const baseUrl = () => import.meta.env.VITE_API_URL || '';
const baseUrl = () => 'http://localhost:5000';

/** Resolve stored upload paths (e.g. /uploads/documents/…) to absolute URLs. */
export function resolveUploadUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const base = baseUrl().replace(/\/$/, '');
  return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
}

export type ApiEnvelope<T = unknown> = {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
};

export async function apiFetch(path: string, init: RequestInit & { skipAuth?: boolean } = {}) {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (!init.skipAuth && token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers,
  });
  const text = await res.text();
  let parsed: ApiEnvelope | null = null;
  try {
    parsed = text ? (JSON.parse(text) as ApiEnvelope) : null;
  } catch {
    parsed = { success: false, error: text || 'Invalid JSON response' };
  }
  return { res, body: parsed };
}

export async function apiJson<T>(path: string, init?: RequestInit & { skipAuth?: boolean }): Promise<T> {
  const { res, body } = await apiFetch(path, init);
  if (!body) {
    throw new Error('Empty response');
  }
  if (!res.ok || body.success === false) {
    const msg =
      typeof body.error === 'string'
        ? body.error
        : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return body.data as T;
}
