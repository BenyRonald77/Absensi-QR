export type UserRole = 'ADMIN' | 'TRAINER' | 'KARYAWAN';

export interface AuthUser {
  id: string;
  nama: string;
  email: string;
  role: UserRole;
  departemen?: { id: string; nama: string };
  departemenId?: string;
}

export interface AuthSession {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  user: AuthUser;
}

export interface PageResult<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export type ComplianceStatus = 'SUDAH_MEMENUHI' | 'BELUM_MEMENUHI';

export interface ComplianceSummary {
  employeeId: string;
  year: number;
  totalHours: number;
  targetHours: number;
  status: ComplianceStatus;
  progressPercent: number;
  attendedSessionsCount: number;
}

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
const sessionKey = 'absensi-training-session';

export function getStoredSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  const value = window.localStorage.getItem(sessionKey);
  if (!value) return null;
  try {
    return JSON.parse(value) as AuthSession;
  } catch {
    window.localStorage.removeItem(sessionKey);
    return null;
  }
}

export function storeSession(session: AuthSession) {
  window.localStorage.setItem(sessionKey, JSON.stringify(session));
}

export function clearSession() {
  if (typeof window !== 'undefined') window.localStorage.removeItem(sessionKey);
}

async function refreshAccessToken(): Promise<AuthSession | null> {
  const response = await fetch(`${apiBase}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (!response.ok) {
    clearSession();
    return null;
  }
  const session = (await response.json()) as AuthSession;
  storeSession(session);
  return session;
}

async function makeRequest(path: string, init: RequestInit, token?: string) {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(`${apiBase}${path}`, { ...init, headers, credentials: 'include' });
}

async function readResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const candidate =
      payload && typeof payload === 'object' && 'message' in payload
        ? (payload as { message?: unknown }).message
        : undefined;
    const message =
      typeof candidate === 'string'
        ? candidate
        : Array.isArray(candidate)
          ? candidate.filter((item): item is string => typeof item === 'string').join(', ')
          : undefined;
    throw new Error(message || 'Permintaan gagal.');
  }
  return payload as T;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = getStoredSession();
  let response = await makeRequest(path, init, session?.accessToken);
  const authEndpoints = ['/auth/login', '/auth/refresh', '/auth/logout'];
  if (response.status === 401 && !authEndpoints.includes(path)) {
    const refreshed = await refreshAccessToken();
    if (refreshed) response = await makeRequest(path, init, refreshed.accessToken);
  }
  return readResponse<T>(response);
}

export function roleHome(role: UserRole) {
  if (role === 'ADMIN') return '/admin';
  if (role === 'TRAINER') return '/trainer';
  return '/karyawan';
}
