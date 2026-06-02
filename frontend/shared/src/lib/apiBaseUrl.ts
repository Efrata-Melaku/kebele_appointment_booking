/** API origin — empty in dev uses Vite proxy (/api → backend). */
export function apiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_URL;
  if (configured) return String(configured).replace(/\/$/, '');
  if (import.meta.env.DEV) return '';
  return 'http://localhost:5000';
}
