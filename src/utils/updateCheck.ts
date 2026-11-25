/**
 * "A newer version is out" (standard features check, 24 November 2026). The server asks GitHub for
 * the newest public release of the project at most once a day, only while the app runs and someone
 * opens it, and Menu > About says whether this copy is behind. The request names no person: it is the
 * same public page anyone can read. Off with UPDATE_CHECK=off (docs/PRIVACY.md).
 *
 * Browser-safe: the rules live here; src/server/updateCheck.ts does the asking.
 */

export interface LatestRelease {
  version: string;
  url: string;
  publishedAt?: string;
}

export interface UpdateStatus {
  current: string;
  /** True when UPDATE_CHECK=off. */
  off?: boolean;
  latest?: LatestRelease;
  /** True only when the latest release is a higher version than this copy. */
  newer: boolean;
  checkedAt?: string;
  /** Why the newest release is not known (no answer, no public release yet). */
  error?: string;
}

/** "v0.3.0", "0.3.0" or "0.3" as [0, 3, 0]; null when it is not a plain version number. */
export function parseVersion(v: string): number[] | null {
  const m = /^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?$/.exec(String(v ?? '').trim());
  if (!m) return null;
  return [Number(m[1]), Number(m[2] ?? 0), Number(m[3] ?? 0)];
}

/** Positive when a is a higher version than b, negative when lower, 0 when the same or unreadable. */
export function compareVersions(a: string, b: string): number {
  const x = parseVersion(a);
  const y = parseVersion(b);
  if (!x || !y) return 0;
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
}

/** The fields used from GitHub's "latest release" answer; drafts, pre-releases and odd tags are skipped. */
export function parseLatestRelease(json: unknown): LatestRelease | null {
  if (!json || typeof json !== 'object') return null;
  const r = json as Record<string, unknown>;
  if (r.draft === true || r.prerelease === true) return null;
  const tag = typeof r.tag_name === 'string' ? r.tag_name : '';
  const v = parseVersion(tag);
  if (!v) return null;
  const url = typeof r.html_url === 'string' && /^https:\/\/github\.com\//.test(r.html_url) ? r.html_url : '';
  if (!url) return null;
  return { version: v.join('.'), url, ...(typeof r.published_at === 'string' ? { publishedAt: r.published_at } : {}) };
}

export function updateCheckOff(env: Record<string, string | undefined>): boolean {
  return String(env.UPDATE_CHECK ?? '').trim().toLowerCase() === 'off';
}

export function updateStatusFrom(current: string, latest: LatestRelease | null, checkedAt: string, error?: string): UpdateStatus {
  return {
    current,
    newer: Boolean(latest && compareVersions(latest.version, current) > 0),
    checkedAt,
    ...(latest ? { latest } : {}),
    ...(error ? { error } : {}),
  };
}
