/**
 * Small fetch helpers shared by the feed readers. Each one gives up after a time limit, and asks
 * once more after a short wait when there was no answer in time or the server was busy (429, 5xx;
 * src/utils/retryPolicy.ts FEED_RETRY). The time limits stay short so a page does not hang.
 * A source that still fails is reported as failing by the caller; nothing is filled in.
 */
import { FEED_RETRY, pauseBefore, retryAfterMs, sleep, worthRetrying, type RetryPlan } from '../utils/retryPolicy';

/** Names the app and where its code lives, for sources that refuse a client that does not say who it is. */
export const RESEARCH_USER_AGENT = 'EconQuest/1.0 (open-source research terminal; +https://github.com/e-conquest/econquest)';

/** True for a fetch failure that may pass by waiting (timeout, cut connection), not "not found" or "refused". */
function transient(err: unknown): boolean {
  const e = err as { name?: string; cause?: { code?: string } };
  if (e?.name === 'AbortError' || e?.name === 'TimeoutError') return true;
  return ['ECONNRESET', 'UND_ERR_SOCKET', 'ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT', 'EAI_AGAIN', 'EPIPE'].includes(e?.cause?.code || '');
}

/**
 * fetch with a time limit per try, asked again by the plan when the answer was a timeout, a cut
 * connection, 429 or 5xx. Returns the last answer (which may be an error status) or throws the last
 * network error, as plain fetch would.
 */
export async function fetchRetrying(url: string, init: RequestInit = {}, timeoutMs = 8000, plan: RetryPlan = FEED_RETRY): Promise<Response> {
  const limit = timeoutMs;
  for (let tries = 1; ; tries++) {
    let res: Response | null = null;
    let err: unknown = null;
    try {
      res = await fetch(url, { ...init, signal: AbortSignal.timeout(limit) });
    } catch (e) {
      err = e;
    }
    if (res && (res.ok || !worthRetrying(res.status))) return res;
    if (err && !transient(err)) throw err;
    const wait = pauseBefore(tries + 1, plan, res ? retryAfterMs(res.headers.get('retry-after')) : null);
    if (wait === null) {
      if (res) return res;
      throw err;
    }
    // Free the unread body before asking again.
    await res?.body?.cancel().catch(() => undefined);
    await sleep(wait);
  }
}

export async function fetchWithTimeout(url: string, timeoutMs = 4200, headers: Record<string, string> = { Accept: 'application/json' }): Promise<Response> {
  return fetchRetrying(url, { headers }, timeoutMs);
}

export async function fetchJsonWithTimeout(url: string, ms = 8000): Promise<unknown | null> {
  try {
    const res = await fetchRetrying(url, {}, ms);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
export async function fetchTextWithTimeout(url: string, ms = 8000): Promise<string | null> {
  try {
    const res = await fetchRetrying(url, {}, ms);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}
