/**
 * src/server/lastGood.ts: a feed's last good answer stands in, with its own dates, while the source
 * does not answer; the source is asked again after 15 min, 1 h, then 4 h; a saved answer that is
 * too old is not served (the figure reads Missing).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { currentStandIns, lastGoodCache, missWaitMs } from '../src/server/lastGood.ts';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

function setup(maxAgeMs = 10 * DAY) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'last-good-'));
  let t = Date.parse('2026-11-24T08:00:00Z');
  const clock = { now: () => t, add: (ms: number) => (t += ms) };
  const cache = lastGoodCache<{ fetchedAt: string; v: number }>({ name: 'test-feed', freshMs: 12 * HOUR, maxAgeMs, dataDir: () => dir, now: clock.now });
  return { dir, clock, cache, done: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

test('last good: waits grow 15 min, 1 h, 4 h', () => {
  assert.equal(missWaitMs(1), 15 * MIN);
  assert.equal(missWaitMs(2), HOUR);
  assert.equal(missWaitMs(3), 4 * HOUR);
  assert.equal(missWaitMs(9), 4 * HOUR);
});

test('last good: a failed download serves the saved answer as it was, and asks again on schedule', async () => {
  const { dir, clock, cache, done } = setup();
  try {
    let calls = 0;
    let answer: { fetchedAt: string; v: number } | null = { fetchedAt: '2026-11-24T08:00:00Z', v: 1 };
    const pull = async () => (calls++, answer);
    assert.deepEqual(await cache.get('BRA', pull), answer);
    assert.ok(fs.existsSync(path.join(dir, 'live', 'last-good', 'test-feed', 'BRA.json')));
    // Fresh for 12 hours: no new download.
    clock.add(HOUR);
    await cache.get('BRA', pull);
    assert.equal(calls, 1);
    // The source fails: the saved answer stands in with its own fetchedAt, and is listed.
    clock.add(12 * HOUR);
    const saved = answer;
    answer = null;
    assert.deepEqual(await cache.get('BRA', pull), saved);
    assert.equal(calls, 2);
    const si = currentStandIns().find((x) => x.feed === 'test-feed' && x.key === 'BRA');
    assert.ok(si);
    assert.equal(si.savedAt, '2026-11-24T08:00:00.000Z');
    // Asked again only after 15 minutes, then after 1 hour.
    clock.add(10 * MIN);
    await cache.get('BRA', pull);
    assert.equal(calls, 2);
    clock.add(6 * MIN);
    await cache.get('BRA', pull);
    assert.equal(calls, 3);
    clock.add(30 * MIN);
    await cache.get('BRA', pull);
    assert.equal(calls, 3);
    clock.add(31 * MIN);
    await cache.get('BRA', pull);
    assert.equal(calls, 4);
    // Back: the new answer is used and the stand-in is gone.
    clock.add(4 * HOUR + MIN);
    answer = { fetchedAt: '2026-11-24T22:00:00Z', v: 2 };
    assert.equal((await cache.get('BRA', pull))?.v, 2);
    assert.equal(currentStandIns().some((x) => x.feed === 'test-feed' && x.key === 'BRA'), false);
  } finally {
    cache.clear();
    done();
  }
});

test('last good: a saved answer older than the limit is not served; nothing saved means Missing', async () => {
  const { clock, cache, done } = setup(2 * DAY);
  try {
    await cache.get('KEN', async () => ({ fetchedAt: 'x', v: 1 }));
    clock.add(3 * DAY);
    assert.equal(await cache.get('KEN', async () => null), null);
    assert.equal(currentStandIns().some((x) => x.key === 'KEN'), false);
    assert.equal(await cache.get('GHA', async () => null), null);
    assert.equal(
      await cache.get('TZA', async () => {
        throw new Error('boom');
      }),
      null
    );
  } finally {
    cache.clear();
    done();
  }
});

test('last good: the saved file outlives the app (a new cache reads it)', async () => {
  const { dir, clock, cache, done } = setup();
  try {
    await cache.get('IND', async () => ({ fetchedAt: 'a', v: 7 }));
    const again = lastGoodCache<{ fetchedAt: string; v: number }>({ name: 'test-feed', freshMs: HOUR, maxAgeMs: 10 * DAY, dataDir: () => dir, now: clock.now });
    assert.equal((await again.get('IND', async () => null))?.v, 7);
    again.clear();
  } finally {
    cache.clear();
    done();
  }
});
