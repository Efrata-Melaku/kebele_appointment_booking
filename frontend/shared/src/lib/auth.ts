import { normalizeEthiopianPhone } from './ethiopianPhone';

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'STAFF';
};

const TOKEN = 'kebele_token';
const USER = 'kebele_user';
const RESIDENT_PHONE = 'kebele_resident_phone';

export function setAuthSession(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN, token);
  localStorage.setItem(USER, JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN);
  localStorage.removeItem(USER);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN);
}

export function getAuthUser(): AuthUser | null {
  const raw = localStorage.getItem(USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setResidentPhone(phone: string) {
  const normalized = normalizeEthiopianPhone(phone) || phone.trim();
  localStorage.setItem(RESIDENT_PHONE, normalized);
}

export function getResidentPhone(): string | null {
  return localStorage.getItem(RESIDENT_PHONE)?.trim() || null;
}
