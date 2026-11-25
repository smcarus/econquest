/** "A newer version is out" in Menu > About (src/utils/updateCheck.ts, src/server/updateCheck.ts). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareVersions, parseLatestRelease, parseVersion, updateCheckOff } from '../src/utils/updateCheck';
import { getUpdateStatus, resetUpdateCheck, LATEST_RELEASE_URL } from '../src/server/updateCheck';
import { APP_CITATION } from '../src/utils/citation';

test('versions compare by number, with or without a v', () => {
  assert.deepEqual(parseVersion('v0.3.0'), [0, 3, 0]);
  assert.deepEqual(parseVersion('1.2'), [1, 2, 0]);
  assert.equal(parseVersion('0.3.0-beta'), null);
  assert.ok(compareVersions('0.10.0', '0.9.0') > 0);
  assert.ok(compareVersions('v0.3.0', '0.4.0') < 0);
  assert.equal(compareVersions('0.3.0', 'v0.3'), 0);
  assert.equal(compareVersions('nonsense', '0.3.0'), 0);
});

test('only a published, numbered release on github.com counts', () => {
  assert.deepEqual(parseLatestRelease({ tag_name: 'v0.4.0', html_url: 'https://github.com/e-conquest/econquest/releases/tag/v0.4.0', published_at: '2026-12-01T00:00:00Z' }), {
    version: '0.4.0',
    url: 'https://github.com/e-conquest/econquest/releases/tag/v0.4.0',
    publishedAt: '2026-12-01T00:00:00Z',
  });
  assert.equal(parseLatestRelease({ tag_name: 'v0.4.0', html_url: 'https://github.com/x/y/releases/tag/v0.4.0', prerelease: true }), null);
  assert.equal(parseLatestRelease({ tag_name: 'v0.4.0', html_url: 'https://evil.example/' }), null);
  assert.equal(parseLatestRelease({ tag_name: 'nightly', html_url: 'https://github.com/x/y' }), null);
  assert.equal(parseLatestRelease(null), null);
});

test('UPDATE_CHECK=off asks nothing', async () => {
  resetUpdateCheck();
  assert.equal(updateCheckOff({ UPDATE_CHECK: 'OFF' }), true);
  let asked = 0;
  const s = await getUpdateStatus({ UPDATE_CHECK: 'off' }, (async () => {
    asked++;
    return new Response('{}');
  }) as typeof fetch);
  assert.equal(s.off, true);
  assert.equal(s.newer, false);
  assert.equal(asked, 0);
});

test('a higher release is reported once and kept for a day', async () => {
  resetUpdateCheck();
  const urls: string[] = [];
  const fake = (async (url: string) => {
    urls.push(url);
    return new Response(JSON.stringify({ tag_name: 'v99.0.0', html_url: 'https://github.com/e-conquest/econquest/releases/tag/v99.0.0' }), { status: 200 });
  }) as unknown as typeof fetch;
  const t0 = Date.parse('2026-11-24T12:00:00Z');
  const a = await getUpdateStatus({}, fake, t0);
  assert.equal(a.newer, true);
  assert.equal(a.latest?.version, '99.0.0');
  assert.equal(a.current, APP_CITATION.version);
  await getUpdateStatus({}, fake, t0 + 23 * 3600_000);
  assert.equal(urls.length, 1);
  await getUpdateStatus({}, fake, t0 + 25 * 3600_000);
  assert.equal(urls.length, 2);
  assert.equal(urls[0], LATEST_RELEASE_URL);
});

test('the same version, no release yet, or no answer is not "newer"', async () => {
  resetUpdateCheck();
  const same = await getUpdateStatus({}, (async () => new Response(JSON.stringify({ tag_name: `v${APP_CITATION.version}`, html_url: 'https://github.com/a/b' }))) as unknown as typeof fetch);
  assert.equal(same.newer, false);
  resetUpdateCheck();
  const none = await getUpdateStatus({}, (async () => new Response('{}', { status: 404 })) as unknown as typeof fetch);
  assert.equal(none.newer, false);
  assert.match(none.error ?? '', /No public release/);
  resetUpdateCheck();
  const down = await getUpdateStatus({}, (async () => {
    throw Object.assign(new Error('x'), { code: 'ENOTFOUND' });
  }) as unknown as typeof fetch);
  assert.equal(down.newer, false);
  assert.match(down.error ?? '', /could not be reached \(ENOTFOUND\)/);
});
