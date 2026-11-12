import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { driversManrUrl, driversMinrUrl, driversSentence, inflationDrivers, parseEurostatYears, yoyFromIndex, BLS_NO_WEIGHTS, OECD_NO_WEIGHTS, type InflationDrivers, type MonthValue } from '../src/utils/inflationDrivers.ts';
import { registerEntry } from '../src/data/modelRegister.ts';
import { READY_BY_ID } from '../src/data/toolsCatalog.ts';
import { GLOSSARY } from '../src/data/glossary.ts';

const months = (from: string, values: number[]): MonthValue[] => {
  const y0 = Number(from.slice(0, 4));
  const m0 = Number(from.slice(5, 7)) - 1;
  return values.map((value, i) => ({ period: `${y0 + Math.floor((m0 + i) / 12)}-${String(((m0 + i) % 12) + 1).padStart(2, '0')}`, value }));
};

test('annual rates from an index 12 months apart', () => {
  const idx = months('2024-01', [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 103, 104]);
  assert.deepEqual(yoyFromIndex(idx), [
    { period: '2025-01', value: 3 },
    { period: '2025-02', value: 2.97 },
  ]);
});

test('Eurostat: headline against core, core trend, and contributions from same-year item weights', () => {
  const r = inflationDrivers({
    source: 'eurostat',
    rates: {
      headline: months('2025-01', [2.4, 2.5, 2.6, 2.4, 2.3, 2.2, 2.1, 2.0, 2.2, 2.3, 2.5, 2.6, 2.7, 2.8, 3.0, 3.1, 3.2, 3.0, 2.9, 3.1, 3.3]),
      core: months('2025-01', [2.7, 2.7, 2.6, 2.6, 2.5, 2.5, 2.4, 2.4, 2.4, 2.3, 2.3, 2.3, 2.3, 2.4, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 3.0]),
      food: months('2025-01', Array(21).fill(3)),
      energy: months('2025-01', [...Array(20).fill(0), 6]),
    },
    weights: { core: { 2026: 700 }, food: { 2026: 200 }, energy: { 2026: 100 } },
    labels: { headline: 'Eurostat HICP (prc_hicp_minr)', core: 'Eurostat HICP (prc_hicp_minr)' },
  }) as InflationDrivers;
  assert.equal(r.ok, true);
  assert.deepEqual(r.latest, { period: '2026-09', headline: 3.3, core: 3, food: 3, energy: 6 });
  assert.deepEqual(r.yearAgo, { period: '2025-09', headline: 2.2, core: 2.4, food: 3, energy: 0 });
  assert.equal(r.coreGapPts, -0.3);
  assert.deepEqual(r.coreChange3m, { pts: 0.3, trend: 'steady' });
  // 0.7 × 3.0 + 0.2 × 3.0 + 0.1 × 6.0 = 2.1 + 0.6 + 0.6 = 3.3: the residual is 0.
  assert.deepEqual(r.contributions, { year: '2026', core: 2.1, food: 0.6, energy: 0.6, residual: 0, weights: { core: 700, food: 200, energy: 100 } });
  assert.deepEqual(r.missing, []);
  assert.equal(r.months.length, 21);
  assert.ok(r.sources.includes('Eurostat HICP item weights (prc_hicp_inw)'));
  const s = driversSentence(r, 'Testland');
  assert.equal(s, 'Testland: headline inflation was 3.3% in 2026-09 and core inflation (excluding food and energy) 3.0%. Core is steady (+0.3 points over 3 months). Of the headline rate, about +0.6 points came from food, +0.6 from energy and +2.1 from everything else.');
});

test('weights for an older year are never used; the reason is given', () => {
  const r = inflationDrivers({
    source: 'eurostat',
    rates: { headline: months('2026-01', [2]), core: months('2026-01', [2]), food: months('2026-01', [2]), energy: months('2026-01', [2]) },
    weights: { core: { 2025: 700 }, food: { 2025: 200 }, energy: { 2025: 100 } },
    labels: {},
  }) as InflationDrivers;
  assert.equal(r.contributions, undefined);
  assert.match(r.missing[0], /item weights for 2026 have not answered/);
});

test('BLS and OECD: no weights, so contributions read Missing; a part a month behind is named', () => {
  const us = inflationDrivers({ source: 'bls', rates: { headline: months('2026-07', [2.9, 3.0, 3.1]), core: months('2026-07', [3.1, 3.1, 3.0]), food: months('2026-07', [2.5, 2.6, 2.7]), energy: months('2026-07', [-1, 0.5]) }, labels: {} }) as InflationDrivers;
  assert.ok(us.missing.includes(BLS_NO_WEIGHTS));
  assert.ok(us.missing.some((m) => m === 'Energy: not yet published for 2026-09; the newest month is 2026-08'));
  assert.match(driversSentence(us, 'US'), /^US: headline inflation was 3\.1% in 2026-09 and core inflation \(excluding food and energy\) 3\.0%\.$/);
  const o = inflationDrivers({ source: 'oecd', rates: { headline: months('2026-08', [4]) }, labels: {} }) as InflationDrivers;
  assert.ok(o.missing.includes(OECD_NO_WEIGHTS));
  assert.ok(o.missing.some((m) => /^Core \(excluding food and energy\): the source did not answer/.test(m)));
  assert.equal(o.coreChange3m, undefined);
});

test('Missing with the reason when headline is not there; nothing is filled', () => {
  const r = inflationDrivers({ source: 'oecd', rates: {}, labels: {}, problems: ['OECD consumer prices via DBnomics (HTTP 503)'] });
  assert.deepEqual(r, { ok: false, reason: 'Headline consumer prices did not answer: OECD consumer prices via DBnomics (HTTP 503)' });
  assert.ok(!/probab|forecast to|will rise/i.test(JSON.stringify(r)));
});

test('Eurostat addresses and the yearly weights reader', () => {
  assert.match(driversMinrUrl('core', 'DE', '2023-01'), /prc_hicp_minr\?.*coicop18=TOT_X_NRG_FOOD&geo=DE/);
  assert.match(driversManrUrl('headline', 'EL', '2023-01'), /prc_hicp_manr\?.*coicop=CP00&geo=EL/);
  const body = { id: ['freq', 'coicop', 'geo', 'time'], size: [1, 1, 1, 2], value: { 0: 702.5, 1: 699.1 }, dimension: { time: { category: { index: { 2025: 0, 2026: 1 } } } } };
  assert.deepEqual(parseEurostatYears(body), { 2025: 702.5, 2026: 699.1 });
});

test('wired: register, tool, panel, route, glossary', () => {
  assert.equal(registerEntry('inflation_drivers')!.status, 'descriptive');
  assert.equal(READY_BY_ID.inflation_drivers.target.anchor, 'tool-inflation-drivers');
  const page = fs.readFileSync('src/components/CountryPage.tsx', 'utf8');
  assert.match(page, /id="tool-inflation-drivers"/);
  assert.match(page, /InflationDriversPanel/);
  assert.match(fs.readFileSync('src/server/routes/analysis.ts', 'utf8'), /\/api\/inflation-drivers\/:iso3/);
  assert.ok(GLOSSARY.some((g) => g.id === 'core_inflation'));
});
