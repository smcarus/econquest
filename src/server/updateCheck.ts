/**
 * Asks GitHub for the project's newest public release, at most once a day (src/utils/updateCheck.ts
 * has the rules). Only runs when the page asks /api/update, so the one-off preload and daily modes
 * never call it. Off with UPDATE_CHECK=off.
 */
import { APP_CITATION } from '../utils/citation';
import { PUBLIC_REPO } from '../utils/successMeasures';
import { parseLatestRelease, updateCheckOff, updateStatusFrom, type UpdateStatus } from '../utils/updateCheck';
import { RESEARCH_USER_AGENT } from './http';

const DAY_MS = 24 * 60 * 60 * 1000;
/** After no answer, ask again in an hour rather than a day. */
const RETRY_MS = 60 * 60 * 1000;

let cached: { status: UpdateStatus; at: number; ok: boolean } | null = null;
let pending: Promise<UpdateStatus> | null = null;

export const LATEST_RELEASE_URL = `https://api.github.com/repos/${PUBLIC_REPO}/releases/latest`;

async function ask(fetchImpl: typeof fetch): Promise<UpdateStatus> {
  const now = new Date().toISOString();
  try {
    const res = await fetchImpl(LATEST_RELEASE_URL, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': RESEARCH_USER_AGENT },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 404) return updateStatusFrom(APP_CITATION.version, null, now, 'No public release yet.');
    if (!res.ok) return updateStatusFrom(APP_CITATION.version, null, now, `GitHub did not answer (HTTP ${res.status}).`);
    const latest = parseLatestRelease(await res.json());
    return updateStatusFrom(APP_CITATION.version, latest, now, latest ? undefined : 'The newest release has no version number.');
  } catch (e: any) {
    return updateStatusFrom(APP_CITATION.version, null, now, `GitHub could not be reached (${e?.name === 'TimeoutError' ? 'no answer in 10 s' : e?.code || e?.message || 'unknown error'}).`);
  }
}

export async function getUpdateStatus(env: Record<string, string | undefined> = process.env, fetchImpl: typeof fetch = fetch, nowMs = Date.now()): Promise<UpdateStatus> {
  if (updateCheckOff(env)) return { current: APP_CITATION.version, off: true, newer: false };
  if (cached && nowMs - cached.at < (cached.ok ? DAY_MS : RETRY_MS)) return cached.status;
  if (!pending) {
    pending = ask(fetchImpl).then((status) => {
      cached = { status, at: nowMs, ok: !status.error || status.error === 'No public release yet.' };
      pending = null;
      return status;
    });
  }
  return pending;
}

/** Tests only. */
export function resetUpdateCheck(): void {
  cached = null;
  pending = null;
}
