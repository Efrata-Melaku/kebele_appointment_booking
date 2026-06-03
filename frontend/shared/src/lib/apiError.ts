/** Extract a user-facing message from apiFetch or axios errors. */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object') {
    const ax = error as {
      response?: {
        data?: {
          error?: string;
          message?: string;
          details?: Array<{ message?: string; field?: string } | string>;
        };
      };
      message?: string;
    };
    const data = ax.response?.data;
    if (data?.details && Array.isArray(data.details)) {
      const parts = data.details.map((d) =>
        typeof d === 'string' ? d : d.message || d.field || ''
      );
      const joined = parts.filter(Boolean).join(' · ');
      if (joined) return joined;
    }
    if (typeof data?.error === 'string' && data.error.trim()) return data.error;
    if (typeof data?.message === 'string' && data.message.trim()) return data.message;
    if (
      ax.message &&
      !ax.message.includes('status code') &&
      !ax.message.startsWith('Request failed')
    ) {
      return ax.message;
    }
  }
  if (error instanceof Error && !error.message.includes('status code')) {
    return error.message;
  }
  return fallback;
}
