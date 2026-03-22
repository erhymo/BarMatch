'use client';

export const ADMIN_SESSION_KEY = 'w2w_admin_login_time';
export const ADMIN_MAX_SESSION_MS = 48 * 60 * 60 * 1000;

const ADMIN_SESSION_EXPIRED_NOTICE_KEY = 'w2w_admin_session_expired_notice';
export const ADMIN_SESSION_EXPIRED_MESSAGE = 'Adminøkten er utløpt. Logg inn på nytt.';

export function getAdminLoginTime(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(ADMIN_SESSION_KEY);
  if (!raw) return null;

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function isAdminSessionExpired(loginTime: number | null, now = Date.now()): boolean {
  return loginTime !== null && now - loginTime > ADMIN_MAX_SESSION_MS;
}

export function rememberAdminLogin(now = Date.now()) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ADMIN_SESSION_KEY, String(now));
}

export function clearAdminLogin() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ADMIN_SESSION_KEY);
}

export function markAdminSessionExpiredNotice() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(ADMIN_SESSION_EXPIRED_NOTICE_KEY, '1');
}

export function consumeAdminSessionExpiredNotice(): string | null {
  if (typeof window === 'undefined') return null;
  const hasNotice = window.sessionStorage.getItem(ADMIN_SESSION_EXPIRED_NOTICE_KEY);
  if (!hasNotice) return null;
  window.sessionStorage.removeItem(ADMIN_SESSION_EXPIRED_NOTICE_KEY);
  return ADMIN_SESSION_EXPIRED_MESSAGE;
}