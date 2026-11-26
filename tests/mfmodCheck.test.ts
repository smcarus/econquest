import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { checkBaseUrl, checkSummary, judgeMfmodReproduction, type BaselineCheckReply, type BookOilReply, type MfmodCheckSpec } from '../src/utils/mfmodCheck';

const dir = 'docs/validation/models';
const raw = fs.readFileSync(`${dir}/mfmod_reproduction.json`);
const spec = JSON.parse(raw.toString('utf8')) as MfmodCheckSpec;

test('the check file is registered: its hash is in the manifest', () => {
  const manifest = JSON.parse(fs.readFileSync(`${dir}/manifest.json`, 'utf8'));
  assert.equal(manifest.files['mfmod_reproduction.json'], createHash('sha256').update(raw).digest('hex'));
  assert.equal(spec.method, 'mfmod_reproduction');
  // 4 series x 16 years, as printed in the manual.
  assert.equal(Object.values(spec.checks.bookOil.published).reduce((n, s) => n + Object.keys(s).length, 0), 64);
});

const series = (v: number) => ({ real_gdp: { code: 'X', maxRelativeDifference: v, periods: 10 }, gov_debt: { code: 'Y', maxRelativeDifference: v / 2, periods: 10 } });
const baseline = (v: number, models = ['BOL', 'HRV', 'IRQ', 'NPL', 'PAK', 'TUR']): BaselineCheckReply => ({ models: models.map((iso3) => ({ iso3, series: series(v) })), problems: [], modelflow: '2.97' });

/** The service's answer: the published figures plus an offset. */
function book(offset: number, drop?: { code: string; year: number }): BookOilReply {
  const years = Array.from({ length: 16 }, (_, i) => 2020 + i);
  const out: Record<string, Array<number | null>> = {};
  for (const [code, byYear] of Object.entries(spec.checks.bookOil.published)) out[code] = years.map((y) => (drop && drop.code === code && drop.year === y ? null : byYear[String(y)] + offset));
  return { years, series: out, publicCopy: { years: years.slice(0, 11), series: Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.slice(0, 11)])) } };
}

test('passed: baseline within 1e-5 and every published figure within 0.006 points', () => {
  const r = judgeMfmodReproduction(spec, baseline(3e-7), book(0.004));
  assert.equal(r.status, 'passed');
  assert.equal(r.bookOil.compared, 64);
  assert.equal(r.publicCopy.compared, 44);
  assert.match(checkSummary(r), /PASSED/);
});

test('failed: either check outside its pass mark fails the whole check', () => {
  assert.equal(judgeMfmodReproduction(spec, baseline(2e-5), book(0)).status, 'failed');
  const b = judgeMfmodReproduction(spec, baseline(1e-9), book(0.007));
  assert.equal(b.status, 'failed');
  assert.equal(b.bookOil.status, 'failed');
});

test('a published figure the service did not give back is a miss, never a match', () => {
  const r = judgeMfmodReproduction(spec, baseline(1e-9), book(0, { code: 'PAKNYGDPMKTPKN', year: 2027 }));
  assert.equal(r.bookOil.status, 'failed');
  assert.match(r.bookOil.note, /2027: no figure/);
});

test('not run: service silent or a model missing is not a verdict', () => {
  assert.equal(judgeMfmodReproduction(spec, null, null).status, 'not_run');
  const r = judgeMfmodReproduction(spec, baseline(1e-9, ['BOL', 'PAK']), book(0));
  assert.equal(r.status, 'not_run');
  assert.match(r.baseline.note, /HRV, IRQ, NPL, TUR/);
  assert.match(checkSummary(r), /NOT RUN/);
});

test('outside Docker the check asks the port published on 127.0.0.1, not the Docker name', () => {
  assert.equal(checkBaseUrl('http://mfmod:8765', false), 'http://127.0.0.1:8765');
  assert.equal(checkBaseUrl('http://mfmod:8765', false, '9001'), 'http://127.0.0.1:9001');
  assert.equal(checkBaseUrl('http://mfmod:8765', false, 'x; rm'), 'http://127.0.0.1:8765');
  assert.equal(checkBaseUrl('http://mfmod:8765', true), 'http://mfmod:8765');
  assert.equal(checkBaseUrl('http://127.0.0.1:8765/', false), 'http://127.0.0.1:8765');
});

test('docker-compose.yml publishes the models service on this computer only', () => {
  const compose = fs.readFileSync(new URL('../docker-compose.yml', import.meta.url), 'utf8');
  assert.match(compose, /mfmod:[\s\S]*?ports:\s*\n\s*- "127\.0\.0\.1:\$\{MFMOD_PORT:-8765\}:8765"/);
});
