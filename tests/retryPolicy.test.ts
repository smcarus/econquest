/** src/utils/retryPolicy.ts: which answers are asked again, and how long to wait. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHECK_RETRY, pauseBefore, retryAfterMs, slowHostTimeout, worthRetrying } from '../src/utils/retryPolicy.ts';

test('retry policy: busy and timed-out answers are retried; refusals and bot checks are not', () => {
  for (const s of [429, 500, 502, 503, 504, 408]) assert.equal(worthRetrying(s), true, String(s));
  for (const s of [400, 401, 403, 404, 410]) assert.equal(worthRetrying(s), false, String(s));
  assert.equal(worthRetrying(undefined), true);
  assert.equal(worthRetrying(503, true), false);
});

test('retry policy: waits grow, Retry-After is followed up to the cap, tries run out', () => {
  assert.equal(pauseBefore(2, CHECK_RETRY, null), 3000);
  assert.equal(pauseBefore(3, CHECK_RETRY, null), 10_000);
  assert.equal(pauseBefore(4, CHECK_RETRY, null), null);
  assert.equal(pauseBefore(2, CHECK_RETRY, 20_000), 20_000);
  assert.equal(pauseBefore(2, CHECK_RETRY, 120_000), null);
  assert.equal(retryAfterMs('5'), 5000);
  assert.equal(retryAfterMs('Wed, 25 Nov 2026 00:00:30 GMT', Date.parse('2026-11-25T00:00:00Z')), 30_000);
  assert.equal(retryAfterMs('soon'), null);
  assert.equal(retryAfterMs(null), null);
});

test('retry policy: slow servers get at least 30 s', () => {
  assert.equal(slowHostTimeout('https://api.worldbank.org/v2/country/BRA', 10_000), 30_000);
  assert.equal(slowHostTimeout('https://data-api.ecb.europa.eu/service/data/x', 45_000), 45_000);
  assert.equal(slowHostTimeout('https://example.org/', 10_000), 10_000);
});

test('feed helper: one more try after a 503, the last answer returned when it stays busy', async () => {
  const { fetchRetrying } = await import('../src/server/http.ts');
  const real = globalThis.fetch;
  let n = 0;
  globalThis.fetch = (async () => (++n === 1 ? new Response('busy', { status: 503 }) : new Response('ok'))) as typeof fetch;
  try {
    const plan = { tries: 2, pausesMs: [0], maxRetryAfterMs: 0 };
    const r = await fetchRetrying('https://example.org/a', {}, 1000, plan);
    assert.equal(await r.text(), 'ok');
    assert.equal(n, 2);
    n = 0;
    globalThis.fetch = (async () => (n++, new Response('busy', { status: 503 }))) as typeof fetch;
    const r2 = await fetchRetrying('https://example.org/a', {}, 1000, plan);
    assert.equal(r2.status, 503);
    assert.equal(n, 2);
    n = 0;
    globalThis.fetch = (async () => (n++, new Response('gone', { status: 404 }))) as typeof fetch;
    assert.equal((await fetchRetrying('https://example.org/a', {}, 1000, plan)).status, 404);
    assert.equal(n, 1);
  } finally {
    globalThis.fetch = real;
  }
});
