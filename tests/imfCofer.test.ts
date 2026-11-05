/**
 * IMF COFER: world code found by name, currency read from indicator names, IMF shares used as
 * given or worked out from claims over allocated reserves, and Missing with a reason otherwise.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseImfData, parseImfStructure } from '../src/utils/imfReserves.ts';
import { coferKey, coferLine, findWorldCode, pullCofer, readCofer } from '../src/utils/imfCofer.ts';
import { coferDataJson, coferStructureJson, imfFetch } from './helpers/imfFixtures.ts';

test('finds the world code by name and builds a world, quarterly key', () => {
  const s = parseImfStructure('COFER', coferStructureJson())!;
  assert.deepEqual(findWorldCode(s), { id: 'G001', name: 'World' });
  assert.equal(coferKey(s, 'G001'), 'G001.*.*.Q');
});

test("reads the IMF's own shares with the change on the year, largest first", () => {
  const s = parseImfStructure('COFER', coferStructureJson())!;
  const c = readCofer(parseImfData(coferDataJson()), { id: 'G001', name: 'World' }, s)!;
  assert.equal(c.method, 'imf share');
  assert.equal(c.period, '2025-Q2');
  assert.deepEqual(c.shares.map((x) => x.ccy), ['USD', 'EUR', 'JPY', 'GBP', 'CNY']);
  assert.deepEqual(c.shares[0], { ccy: 'USD', pct: 56.3, change4qPts: -1.9 });
  assert.equal(c.shares.find((x) => x.ccy === 'JPY')!.change4qPts, 0.3);
  assert.equal(coferLine(c, 3), 'US dollar 56.3%, euro 20.1%, yen 5.9%');
});

test('without share series, works shares out as claims over allocated reserves', () => {
  const c = readCofer(parseImfData(coferDataJson(false)), { id: 'G001', name: 'World' })!;
  assert.equal(c.method, 'claims over allocated');
  assert.equal(c.shares[0].ccy, 'USD');
  assert.equal(c.shares[0].pct, 56.3); // 6,756,000 / 12,000,000
  assert.equal(c.shares[0].change4qPts, -1.88); // 56.3 - 6,400,000 / 11,000,000
  assert.equal(c.totalAllocatedUsdBn, 12000);
});

test('the whole pull with a fake IMF, and Missing with a reason when it does not answer', async () => {
  const urls: string[] = [];
  const r = await pullCofer({ fetchFn: imfFetch(urls), env: {} });
  assert.equal(r.cofer!.shares[0].ccy, 'USD');
  assert.ok(urls.some((u) => u.includes('/data/dataflow/IMF.STA/COFER/+/G001.*.*.Q')));
  assert.match(r.note, /IMF COFER for G001 \("World"\)/);
  const down = await pullCofer({ fetchFn: async () => new Response('busy', { status: 503 }), env: {} });
  assert.equal(down.cofer, null);
  assert.match(down.note, /COFER structure: HTTP 503/);
  const key = await pullCofer({ fetchFn: imfFetch([]), env: { IMF_COFER_KEY: 'G001.*.*.Q' } });
  assert.match(key.note, /series key from IMF_COFER_KEY/);
});
