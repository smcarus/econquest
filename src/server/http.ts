/**
 * Small fetch helpers shared by the feed readers. Each one gives up after a time limit.
 */

/** Names the app and where its code lives, for sources that refuse a client that does not say who it is. */
export const RESEARCH_USER_AGENT = 'EconQuest/1.0 (open-source research terminal; +https://github.com/smcarus/econquest)';

export async function fetchWithTimeout(url: string, timeoutMs = 4200, headers: Record<string, string> = { Accept: 'application/json' }): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchJsonWithTimeout(url: string, ms = 8000): Promise<unknown | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(ms) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
export async function fetchTextWithTimeout(url: string, ms = 8000): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(ms) });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}
