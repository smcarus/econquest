import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseSaved, YOUR_PRICES_KEY } from '../src/utils/yourPricesStore.ts';

test('PY5 parseSaved keeps numbers only and drops anything else', () => {
  const s = parseSaved(JSON.stringify({ shares: { DEU: { CP01: 20, CP07: 'x', CP04: -1 }, bad: { CP01: 1 } }, loan: { balance: 1000, ratePct: '5', type: 'fixed', kind: 'nope' } }));
  assert.deepEqual(s, { shares: { DEU: { CP01: 20 } }, loan: { balance: 1000, type: 'fixed' } });
  assert.deepEqual(parseSaved(null), { shares: {}, loan: {} });
  assert.deepEqual(parseSaved('{not json'), { shares: {}, loan: {} });
});

test('PY5 what you enter stays in this browser: never sent, never in Backup or For people', () => {
  const dialog = fs.readFileSync('src/components/YourPricesDialog.tsx', 'utf8');
  // The dialog only reads the groups; it never sends what you enter.
  assert.doesNotMatch(dialog, /method:\s*['"](POST|PUT|PATCH)/);
  assert.match(dialog, /fetch\(`\/api\/your-prices\/\$\{encodeURIComponent\(iso3\)\}`\)/);
  for (const f of ['src/utils/backup.ts', 'src/utils/backupStore.ts']) {
    assert.doesNotMatch(fs.readFileSync(f, 'utf8'), /yourPrices|your-prices|econquest\.yourPrices/, `${f} must not hold What this means for you`);
  }
  assert.equal(YOUR_PRICES_KEY, 'econquest.yourPrices.v1');
  const route = fs.readFileSync('src/server/routes/analysis.ts', 'utf8');
  assert.match(route, /app\.get\('\/api\/your-prices\/:iso3'/);
  assert.doesNotMatch(route, /app\.(post|put)\('\/api\/your-prices/);
});
