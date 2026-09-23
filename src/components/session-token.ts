'use client';

export const ADMIN_TOKEN_KEY = 'ep_admin_session';
export const USER_TOKEN_KEY = 'ep_user_session';

/*
 * In-memory backup channel: environments that block cookies very often also
 * restrict localStorage (sandboxed iframes, strict private modes). A token
 * kept in module state still keeps you signed in for the lifetime of the tab.
 */
const memoryStore = new Map<string, string>();

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage blocked — memory channel already covers this tab */
  }
}
function safeDel(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

const isToken = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/i.test(v);

/**
 * Patches window.fetch once so every same-origin API call carries the session
 * tokens (cookie → localStorage → in-memory). Works even when the browser
 * blocks cookies and/or storage entirely.
 */
export function patchFetchWithSessionTokens() {
  if (typeof window === 'undefined') return;
  const w = window as unknown as { __epFetchPatched?: boolean };
  if (w.__epFetchPatched) return;
  w.__epFetchPatched = true;
  const raw = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    try {
      const urlStr = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
      const u = new URL(urlStr, window.location.origin);
      if (u.origin === window.location.origin && u.pathname.startsWith('/api/')) {
        const h = new Headers(init.headers as HeadersInit | undefined);
        const admin = safeGet(ADMIN_TOKEN_KEY) ?? memoryStore.get(ADMIN_TOKEN_KEY);
        const user = safeGet(USER_TOKEN_KEY) ?? memoryStore.get(USER_TOKEN_KEY);
        if (admin && !h.has('x-admin-session')) h.set('x-admin-session', admin);
        if (user && !h.has('x-user-session')) h.set('x-user-session', user);
        return raw(input, { ...init, headers: h });
      }
    } catch {
      /* fall through to raw fetch */
    }
    return raw(input, init);
  };
}

export function saveSessionToken(kind: 'admin' | 'user', token: unknown) {
  if (typeof window === 'undefined' || !isToken(token)) return;
  const key = kind === 'admin' ? ADMIN_TOKEN_KEY : USER_TOKEN_KEY;
  memoryStore.set(key, token); // always available within this tab
  safeSet(key, token); // persists across reloads where storage is allowed
}

export function clearSessionToken(kind: 'admin' | 'user') {
  if (typeof window === 'undefined') return;
  const key = kind === 'admin' ? ADMIN_TOKEN_KEY : USER_TOKEN_KEY;
  memoryStore.delete(key);
  safeDel(key);
}

export function loginUrl(kind: 'admin' | 'user', path: string, token: unknown) {
  const url = new URL(path, window.location.origin);
  if (isToken(token)) url.searchParams.set(kind === 'admin' ? 'ep_admin' : 'ep_user', token);
  return url.toString();
}

/**
 * Absolute failsafe for browsers that block cookies AND storage:
 * a login URL that hands the session over through the query string itself.
 * A one-time `ep_bootstrap` page.then consumes it, saves it into this new tab,
 * and the URL is cleaned immediately.
 */

export function captureTokenFromUrl() {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    const admin = url.searchParams.get('ep_admin');
    const user = url.searchParams.get('ep_user');
    if (isToken(admin)) {
      memoryStore.set(ADMIN_TOKEN_KEY, admin);
      safeSet(ADMIN_TOKEN_KEY, admin);
      url.searchParams.delete('ep_admin');
    }
    if (isToken(user)) {
      memoryStore.set(USER_TOKEN_KEY, user);
      safeSet(USER_TOKEN_KEY, user);
      url.searchParams.delete('ep_user');
    }
    if (admin || user) window.history.replaceState({}, '', url.pathname + url.search + url.hash);
  } catch {
    /* ignore */
  }
}
