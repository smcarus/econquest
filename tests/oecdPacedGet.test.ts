import test from 'node:test';
import assert from 'node:assert/strict';
import { makeOecdPacer, oecdRetryDelayMs, type PacedReply } from '../src/utils/oecdPacedGet.ts';

/** A fake clock: sleep moves time forward and records each wait. */
function clock() {
  let t = 0;
  const waits: number[] = [];
  return { now: () => t, sleep: async (ms: number) => { waits.push(ms); t += ms; }, waits, tick: (ms: number) => { t += ms; } };
}
const reply = (status: number, retryAfter: string | null = null): PacedReply => ({ status, text: status === 200 ? 'ok' : '', retryAfter });

test('retry waits: 429 follows Retry-After, else 60 s doubling; 5xx 15 s doubling; others not retried', () => {
  assert.equal(oecdRetryDelayMs(429, 1, '30'), 30_000);
  assert.equal(oecdRetryDelayMs(429, 1, '9999'), 600_000);
  assert.equal(oecdRetryDelayMs(429, 1, null), 60_000);
  assert.equal(oecdRetryDelayMs(429, 3, null), 240_000);
  assert.equal(oecdRetryDelayMs(500, 1, null), 15_000);
  assert.equal(oecdRetryDelayMs(503, 2, null), 30_000);
  assert.equal(oecdRetryDelayMs(404, 1, null), null);
  assert.equal(oecdRetryDelayMs(400, 1, null), null);
  assert.equal(oecdRetryDelayMs(200, 1, null), null);
});

test('requests are spaced by the gap, measured from the start of the previous one', async () => {
  const c = clock();
  const starts: number[] = [];
  const get = makeOecdPacer({ get: async () => { starts.push(c.now()); c.tick(1_000); return reply(200); }, sleep: c.sleep, now: c.now, gapMs: 4_000 });
  for (let i = 0; i < 3; i++) assert.equal((await get('u')).status, 200);
  assert.deepEqual(starts, [0, 4_000, 8_000]);
});

test('a 429 then a 500 are retried, and the file arrives on the third try', async () => {
  const c = clock();
  const answers = [reply(429, '20'), reply(500), reply(200)];
  const lines: string[] = [];
  const get = makeOecdPacer({ get: async () => answers.shift()!, sleep: c.sleep, now: c.now, gapMs: 4_000, log: (l) => lines.push(l) });
  const r = await get('u', 'gdp AUS');
  assert.equal(r.status, 200);
  assert.equal(r.tries, 3);
  assert.deepEqual(c.waits, [20_000, 30_000]);
  assert.match(lines[0], /^gdp AUS: HTTP 429, waiting 20 s before try 2 of 4$/);
});

test('gives up after the last try and hands back the last answer; 404 is not retried', async () => {
  const c = clock();
  let calls = 0;
  const get = makeOecdPacer({ get: async () => { calls++; return reply(429); }, sleep: c.sleep, now: c.now, gapMs: 0, maxTries: 3 });
  const r = await get('u');
  assert.equal(r.status, 429);
  assert.equal(r.tries, 3);
  assert.equal(calls, 3);
  calls = 0;
  const get404 = makeOecdPacer({ get: async () => { calls++; return reply(404); }, sleep: c.sleep, now: c.now, gapMs: 0 });
  assert.equal((await get404('u')).tries, 1);
  assert.equal(calls, 1);
});

test('a dropped connection is retried like a busy server, and thrown after the last try', async () => {
  const c = clock();
  let calls = 0;
  const flaky = makeOecdPacer({ get: async () => { if (calls++ === 0) throw new Error('ECONNRESET'); return reply(200); }, sleep: c.sleep, now: c.now, gapMs: 0 });
  assert.equal((await flaky('u')).status, 200);
  const dead = makeOecdPacer({ get: async () => { throw new Error('ECONNRESET'); }, sleep: c.sleep, now: c.now, gapMs: 0, maxTries: 2 });
  await assert.rejects(dead('u'), /ECONNRESET/);
});
