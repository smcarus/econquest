/**
 * Browser side of sign-in: reads the account status and sends people back to the sign-in page when
 * their session ends (a 401 that says signIn from any /api call). Types only from src/utils/auth.ts.
 */
import type { AuthMode, PublicAccount } from './auth';

export interface AuthStatus {
  mode: AuthMode;
  account: PublicAccount | null;
  setupNeedsCode: boolean;
  canCreateFirstAccount: boolean;
  sessionIdleHours: number;
}

export async function fetchAuthStatus(fetchFn: typeof fetch = fetch): Promise<AuthStatus | null> {
  try {
    const res = await fetchFn('/api/auth/status', { credentials: 'same-origin' });
    if (!res.ok) return null;
    return (await res.json()) as AuthStatus;
  } catch {
    return null;
  }
}

/** Whether the app must show the sign-in page instead of itself. */
export function needsSignIn(status: AuthStatus | null): boolean {
  return Boolean(status && status.mode !== 'off' && !status.account);
}

export async function postAuth<T = unknown>(path: string, body: unknown): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(path, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: String((data as { error?: string })?.error || `The server answered ${res.status}.`) };
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, error: 'The app server did not answer. Is it running?' };
  }
}

/**
 * Wraps window.fetch once: a 401 carrying `signIn: true` from this app's API means the session
 * ended (timed out, signed out elsewhere, password changed), so the page reloads onto the sign-in form.
 */
export function watchForSignedOut(win: Window = window): void {
  const w = win as Window & { __eqSignInWatch?: boolean };
  if (w.__eqSignInWatch) return;
  w.__eqSignInWatch = true;
  const original = win.fetch.bind(win);
  let reloading = false;
  win.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const res = await original(input, init);
    if (res.status === 401 && !reloading) {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const sameApp = url.startsWith('/api/') || url.startsWith(`${win.location.origin}/api/`);
      if (sameApp && !url.includes('/api/auth/')) {
        const body = await res.clone().json().catch(() => null);
        if (body && (body as { signIn?: boolean }).signIn) {
          reloading = true;
          win.location.reload();
        }
      }
    }
    return res;
  };
}
