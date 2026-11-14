/**
 * Loaded into the server under test with NODE_OPTIONS="--import ...". Answers every feed request
 * with the reply recorded on a computer that reached the feeds (tests/fixtures/recorded/), and fails
 * anything not recorded, as if offline. The clock is set back to when the recording was made, so
 * date ranges the server asks for match and "how old is this" rules judge as they did then.
 *
 * Match: the exact URL (keys taken out) first; otherwise the same address and path whose query differs
 * only in dates or counts, the one with most values in common (ranges that moved by a day still match;
 * a different series id or country does not).
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { maskUrl, rangeOnlyDiffers, sharedParams, skipHost, urlStem } from './feedRecording.mjs';

const dir = process.env.REPLAY_DIR;
if (!dir) throw new Error('REPLAY_DIR is not set');
const index = JSON.parse(readFileSync(path.join(dir, 'index.json'), 'utf8'));
const byUrl = new Map();
const byStem = new Map();
for (const r of index.requests) {
  if (!r.body) continue;
  byUrl.set(`${r.method} ${r.url}`, r);
  const k = `${r.method} ${urlStem(r.url)}`;
  if (!byStem.has(k)) byStem.set(k, []);
  byStem.get(k).push(r);
}

// The clock as it was when the recording was made (timers still run in real time).
const RealDate = Date;
const shift = RealDate.parse(index.recordedAt) - RealDate.now();
class ShiftedDate extends RealDate {
  constructor(...args) {
    if (args.length === 0) super(RealDate.now() + shift);
    else super(...args);
  }
  static now() {
    return RealDate.now() + shift;
  }
}
globalThis.Date = ShiftedDate;

const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init = {}) => {
  const url = String(input instanceof Request ? input.url : input);
  if (skipHost(url)) return realFetch(input, init);
  const method = String(init.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  const masked = maskUrl(url);
  // Reachability probes (HEAD) are not recorded: a host with recorded replies counts as reachable.
  if (method === 'HEAD') {
    let origin = '';
    try {
      origin = new URL(masked).origin;
    } catch {
      // not a URL
    }
    if (origin && index.requests.some((r) => r.url.startsWith(origin))) return new Response(null, { status: 200 });
  }
  let hit = byUrl.get(`${method} ${masked}`);
  if (!hit) {
    // Only replies whose query differs in dates or counts: another series id or country never stands in.
    const near = (byStem.get(`${method} ${urlStem(masked)}`) || []).filter((r) => rangeOnlyDiffers(r.url, masked));
    hit = near.slice().sort((a, b) => sharedParams(b.url, masked) - sharedParams(a.url, masked))[0];
  }
  const file = hit ? path.join(dir, 'bodies', hit.body) : '';
  if (!hit || !existsSync(file)) {
    process.stderr.write(`[replay-fetch] not recorded: ${method} ${masked}\n`);
    throw new TypeError('fetch failed (not in the recorded replies)');
  }
  return new Response(gunzipSync(readFileSync(file)), { status: hit.status, headers: hit.contentType ? { 'Content-Type': hit.contentType } : {} });
};
