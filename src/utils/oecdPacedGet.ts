/**
 * Paced, retrying downloads from the OECD Data Explorer API for `npm run oecd:vintages` (CG15).
 *
 * The OECD limits how many requests one computer may send per minute. Asking for 76 country
 * files back to back gets HTTP 429 ("too many requests") after about 20, and a busy OECD server
 * also answers HTTP 500 or 503 now and then. So this:
 * - waits a fixed gap between requests (default 4 seconds, about 15 a minute),
 * - on 429 waits as long as the OECD's Retry-After says, else 60 seconds, doubling each try,
 * - on 500, 502, 503 or 504 waits 15 seconds, doubling each try,
 * - tries each file at most 4 times, then reports the last answer.
 * Pure apart from the injected `get` and `sleep`, so the tests run without the network.
 */

export interface PacedReply {
  status: number;
  text: string;
  retryAfter: string | null;
}

export type PacedFetch = (url: string) => Promise<PacedReply>;

export interface PacerOptions {
  get: PacedFetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  /** Gap between the start of one request and the next. */
  gapMs?: number;
  maxTries?: number;
  log?: (line: string) => void;
}

export const OECD_GAP_MS = 4_000;
export const OECD_MAX_TRIES = 4;
const RETRY_5XX = new Set([500, 502, 503, 504]);

/** How long to wait before try number `attempt + 1` (attempt counts from 1), or null when not worth retrying. */
export function oecdRetryDelayMs(status: number, attempt: number, retryAfter: string | null): number | null {
  if (status === 429) {
    const secs = Number(retryAfter);
    if (Number.isFinite(secs) && secs > 0) return Math.min(secs, 600) * 1000;
    const at = retryAfter ? Date.parse(retryAfter) : NaN;
    if (Number.isFinite(at)) return Math.min(Math.max(at - Date.now(), 1_000), 600_000);
    return 60_000 * 2 ** (attempt - 1);
  }
  if (RETRY_5XX.has(status)) return 15_000 * 2 ** (attempt - 1);
  return null;
}

/** A downloader that keeps the gap between requests and retries 429 and 5xx answers. */
export function makeOecdPacer(o: PacerOptions) {
  const sleep = o.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const now = o.now ?? Date.now;
  const gap = o.gapMs ?? OECD_GAP_MS;
  const maxTries = o.maxTries ?? OECD_MAX_TRIES;
  let lastStart = -Infinity;
  const paced = async (url: string): Promise<PacedReply> => {
    const wait = lastStart + gap - now();
    if (wait > 0) await sleep(wait);
    lastStart = now();
    return o.get(url);
  };
  return async (url: string, label = url): Promise<PacedReply & { tries: number }> => {
    let attempt = 1;
    for (;;) {
      let r: PacedReply;
      let what: string;
      try {
        r = await paced(url);
        what = `HTTP ${r.status}`;
      } catch (e) {
        // A dropped connection or timeout: treat like a busy server.
        if (attempt >= maxTries) throw e;
        r = { status: 503, text: '', retryAfter: null };
        what = `no answer (${(e as Error)?.message || e})`;
      }
      const delay = oecdRetryDelayMs(r.status, attempt, r.retryAfter);
      if (delay === null || attempt >= maxTries) return { ...r, tries: attempt };
      o.log?.(`${label}: ${what}, waiting ${Math.round(delay / 1000)} s before try ${attempt + 1} of ${maxTries}`);
      await sleep(delay);
      attempt++;
    }
  };
}
