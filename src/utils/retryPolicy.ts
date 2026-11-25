/**
 * When to ask a source again, and how long to wait first. Shared by the connection check
 * (src/utils/connectionCheck.ts) and the feed readers' fetch helpers (src/server/http.ts).
 *
 * Asked again: no answer in time, a cut connection, HTTP 408, 425, 429 (too many requests) and
 * 500, 502, 503, 504 (a busy or failing server). Not asked again: a bot-check page (asking again
 * only keeps the block going), 401/403/404 and other refusals, which do not change by waiting.
 * A "Retry-After" answer from the server is followed, up to a cap; otherwise the waits grow.
 * Nothing here makes up a figure: after the last try the failure is reported as it was.
 */
export interface RetryPlan {
  /** Total tries, the first included. */
  tries: number;
  /** Wait before try 2, 3, ... (the last value repeats). */
  pausesMs: number[];
  /** The longest "Retry-After" the plan will wait for; a longer one ends the tries. */
  maxRetryAfterMs: number;
}

export const RETRY_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

/** Connection check (npm run check:data, nightly check): three tries, 3 s then 10 s apart. */
export const CHECK_RETRY: RetryPlan = { tries: 3, pausesMs: [3000, 10_000], maxRetryAfterMs: 60_000 };
/** Feed readers inside the app: one more try after 1.5 s, so a page does not wait long. */
export const FEED_RETRY: RetryPlan = { tries: 2, pausesMs: [1500], maxRetryAfterMs: 10_000 };
/** No retries (tests, or a caller that handles them itself). */
export const NO_RETRY: RetryPlan = { tries: 1, pausesMs: [], maxRetryAfterMs: 0 };

/**
 * Servers known to answer slowly from home connections: the time limit for one try is raised to
 * this many ms (the World Bank API, the ECB Data Portal and GDELT often take 15-25 s).
 */
export const SLOW_HOSTS: Record<string, number> = {
  'api.worldbank.org': 30_000,
  'data-api.ecb.europa.eu': 30_000,
  'api.gdeltproject.org': 30_000,
  'data.gdeltproject.org': 30_000,
};

export function slowHostTimeout(url: string, timeoutMs: number): number {
  try {
    const host = new URL(url).host;
    return Math.max(timeoutMs, SLOW_HOSTS[host] ?? 0);
  } catch {
    return timeoutMs;
  }
}

/** "Retry-After" as ms: a number of seconds or an HTTP date; null when absent or unreadable. */
export function retryAfterMs(header: string | null | undefined, now = Date.now()): number | null {
  if (!header) return null;
  const v = header.trim();
  if (/^\d+(\.\d+)?$/.test(v)) return Math.round(Number(v) * 1000);
  const t = Date.parse(v);
  return Number.isFinite(t) ? Math.max(0, t - now) : null;
}

/** True for an answer worth asking again (status), or no answer at all (status undefined). */
export function worthRetrying(status: number | undefined, botCheck = false): boolean {
  if (botCheck) return false;
  return status === undefined || RETRY_STATUSES.has(status);
}

/**
 * How long to wait before try number `next` (2 = the first retry), or null to stop: no tries left,
 * or the server asked for a longer wait than the plan allows.
 */
export function pauseBefore(next: number, plan: RetryPlan, retryAfter: number | null): number | null {
  if (next > plan.tries) return null;
  if (retryAfter !== null) return retryAfter <= plan.maxRetryAfterMs ? retryAfter : null;
  const p = plan.pausesMs;
  return p.length ? p[Math.min(next - 2, p.length - 1)] : 0;
}

export const sleep = (ms: number): Promise<void> => (ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve());
