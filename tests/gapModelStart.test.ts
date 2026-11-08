import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gapStartFromSnapshot } from '../src/utils/gapModelStart.ts';
import type { OpenDataSnapshot } from '../src/types/council.ts';

const base = {
  iso3: 'BRA',
  fetchedAt: '2026-11-08T00:00:00Z',
  dataStatus: { verifiedLiveSources: ['IMF', 'World Bank'], checkedAt: '2026-11-08T00:00:00Z' },
  imfIndicators: { cpiInflationPct: 4.6, outputGapPct: 0.4, years: { 'imf.cpiInflationPct': '2025', 'imf.outputGapPct': '2025' } },
  monetaryAndMarket: { policyRatePct: 15 },
  bisPolicyRate: { ratePct: 15, date: '2026-11-05', freq: 'daily', stale: false, pulledAt: '2026-11-08' },
} as unknown as OpenDataSnapshot;

test('only live figures fill the starting point, each with its source and period', () => {
  const s = { ...base, liveFields: { 'imf.cpiInflationPct': 'IMF WEO', 'imf.outputGapPct': 'IMF WEO', 'market.policyRatePct': 'BIS, 2026-11-05' } } as OpenDataSnapshot;
  const r = Object.fromEntries(gapStartFromSnapshot(s).map((f) => [f.key, f]));
  assert.deepEqual(r.p0, { key: 'p0', value: 4.6, source: 'IMF WEO', period: '2025' });
  assert.deepEqual(r.y0, { key: 'y0', value: 0.4, source: 'IMF WEO', period: '2025' });
  assert.deepEqual(r.i0, { key: 'i0', value: 15, source: 'BIS, 2026-11-05', period: '2026-11-05' });
  assert.ok('missing' in r.q0!);
});

test('a built-in value (not in liveFields) is never used: it reads Missing with a reason', () => {
  const r = gapStartFromSnapshot({ ...base, liveFields: {} } as OpenDataSnapshot);
  assert.deepEqual(r.map((f) => ('missing' in f ? f.missing : 'filled')), ['no_imf_gap', 'no_cpi', 'no_rate', 'judgement']);
  const est = gapStartFromSnapshot({ ...base, liveFields: { 'market.policyRatePct': 'AI estimate' } } as OpenDataSnapshot);
  assert.ok('missing' in est.find((f) => f.key === 'i0')!);
});
