import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

// An empty data folder, as on a first run.
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'comtrade-pause-'));
process.env.COMTRADE_API_KEY = '';

const THROTTLE = '{ "statusCode": 429, "message": "Rate limit is exceeded. Try again in 1 seconds." }';

test('comtradeRetrySeconds: Retry-After, else the seconds in the message, plus one', async () => {
  const { comtradeRetrySeconds } = await import('../src/server/feeds/comtrade.ts');
  assert.equal(comtradeRetrySeconds(null, THROTTLE), 2);
  assert.equal(comtradeRetrySeconds('4', THROTTLE), 5);
  assert.equal(comtradeRetrySeconds(null, ''), 2);
  assert.equal(comtradeRetrySeconds('9999', ''), 31);
});

async function withFetch(reply: (url: string) => Response, body: () => Promise<void>): Promise<string[]> {
  const realFetch = globalThis.fetch;
  const realWarn = console.warn;
  const warnings: string[] = [];
  globalThis.fetch = (async (input: unknown) => reply(String(input))) as typeof fetch;
  console.warn = (...a: unknown[]) => void warnings.push(a.join(' '));
  try {
    await body();
  } finally {
    globalThis.fetch = realFetch;
    console.warn = realWarn;
  }
  return warnings;
}

test('Comtrade: a 429 is waited out and sent once more; three countries refused in a row pause it for 6 hours', { timeout: 60000 }, async () => {
  const mod = await import('../src/server/feeds/comtrade.ts');
  mod.resetComtradeForTests();
  const urls: string[] = [];
  const t0 = Date.now();
  const warnings = await withFetch(
    (url) => {
      urls.push(url);
      return new Response(THROTTLE, { status: 429 });
    },
    async () => {
      await mod.fetchComtrade();
    },
  );
  assert.equal(urls.length, 6, 'two tries for each of three countries, then stop');
  assert.equal(urls[0], urls[1], 'the throttled request is sent again');
  assert.notEqual(urls[1], urls[2]);
  assert.ok(Date.now() - t0 >= 3 * 2000, 'waits the seconds Comtrade asks for');
  assert.equal(warnings.filter((w) => w.includes('also after waiting')).length, 3);
  assert.equal(warnings.filter((w) => w.includes('pausing Comtrade for 6 hours')).length, 1);
  assert.ok(mod.comtradePausedUntil > Date.now() + 5 * 60 * 60 * 1000);
  const again = await withFetch(
    (url) => {
      urls.push(url);
      return new Response(THROTTLE, { status: 429 });
    },
    async () => {
      await mod.fetchComtrade();
    },
  );
  assert.equal(urls.length, 6, 'nothing sent during the pause');
  assert.equal(again.length, 0);
  mod.resetComtradeForTests();
});
