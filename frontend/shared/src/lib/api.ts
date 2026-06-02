import { getToken } from './auth';
import { apiBaseUrl } from './apiBaseUrl';

export { apiBaseUrl };

/** Normalize stored file paths (Cloudinary URL, /uploads/…, or JSON with fileUrl). */
export function normalizeUploadPath(path: string | null | undefined): string {
  if (!path) return '';
  let s = String(path).trim();
  if (!s) return '';

  if ((s.startsWith('{') || s.startsWith('[')) && s.includes('fileUrl')) {
    try {
      const parsed = JSON.parse(s) as { fileUrl?: string };
      if (parsed?.fileUrl) return normalizeUploadPath(parsed.fileUrl);
    } catch {
      /* use raw string */
    }
  }

  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('uploads/')) return `/${s}`;
  return s;
}

/** Resolve stored upload paths (e.g. /uploads/documents/…) to absolute URLs. */
export function resolveUploadUrl(path: string | null | undefined): string {
  const normalized = normalizeUploadPath(path);
  if (!normalized) return '';
  if (/^https?:\/\//i.test(normalized)) return normalized;
  const base = apiBaseUrl();
  return normalized.startsWith('/') ? `${base}${normalized}` : `${base}/${normalized}`;
}

/** Cloudinary URL with inline delivery (no forced download). */
function cloudinaryInlineUrl(url: string): string {
  if (!url.includes('res.cloudinary.com')) return url;
  if (url.includes('fl_attachment:false')) return url;

  if (url.includes('/raw/upload/')) {
    return url.replace('/raw/upload/', '/image/upload/fl_attachment:false/');
  }
  if (url.includes('/image/upload/')) {
    return url.replace('/image/upload/', '/image/upload/fl_attachment:false/');
  }
  if (url.includes('/upload/')) {
    return url.replace('/upload/', '/upload/fl_attachment:false/');
  }
  return url;
}

/**
 * URL suited for inline viewing in browser (PDFs/images).
 */
export function browserViewUrl(path: string | null | undefined): string {
  const url = resolveUploadUrl(path);
  if (!url) return '';
  return cloudinaryInlineUrl(url);
}

/** Open a file in a new browser tab (inline when the server allows it). */
export function openFileInBrowser(path: string | null | undefined): boolean {
  const url = browserViewUrl(path);
  if (!url) return false;
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  a.remove();
  return true;
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
  const res = await fetch(`${apiBaseUrl()}${path}`, {
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
