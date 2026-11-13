import test from 'node:test';
import assert from 'node:assert/strict';
import { median, parsePeerList, peerTable, MAX_PEERS } from '../src/utils/reviewPeers.ts';
import type { Diagnosis, DiagnosisFigure } from '../src/utils/reviewDiagnosis.ts';
import { REPORTS } from '../src/i18n/messages/reports.ts';

const fig = (ref: number, field: string, value: number | null): DiagnosisFigure => ({
  ref, field, group: 'Prices and policy', label: field, unit: '%', value, status: value === null ? 'Missing' : 'Live', period: value === null ? '' : '2026-09', source: 's', reason: value === null ? 'not in this pull' : '',
});
const diag = (iso3: string, pullDate: string, a: number | null, b: number | null): Diagnosis => ({
  iso3, asOf: '2026-10-01', pullDate, pulledAt: `${pullDate}T00:00:00Z`, incomplete: false, readings: [], coverage: '',
  figures: [fig(1, 'imf.cpiInflationPct', a), fig(2, 'market.policyRatePct', b)],
});

test('median and the peer list', () => {
  assert.equal(median([]), undefined);
  assert.equal(median([3]), 3);
  assert.equal(median([5, 1, 3]), 3);
  assert.equal(median([4, 1, 2, 3]), 2.5);
  assert.deepEqual(parsePeerList('bra, MEX,ken,BRA,x1,COLO', 'KEN'), ['BRA', 'MEX']);
  assert.equal(parsePeerList('AAA,BBB,CCC,DDD,EEE,FFF,GGG,HHH', 'KEN').length, MAX_PEERS);
  assert.deepEqual(parsePeerList(undefined, 'KEN'), []);
});

test('peerTable sets each figure beside the peers, with median and rank', () => {
  const own = diag('KEN', '2026-09-30', 7, 10);
  const t = peerTable(own, [
    { iso3: 'UGA', diagnosis: diag('UGA', '2026-09-28', 4, 9.75) },
    { iso3: 'TZA', diagnosis: diag('TZA', '2026-09-29', 3, null) },
    { iso3: 'RWA', diagnosis: null, reason: 'no saved pull on or before 2026-10-01' },
  ]);
  assert.equal(t.asOf, '2026-10-01');
  assert.deepEqual(t.peers, [{ iso3: 'UGA', pullDate: '2026-09-28' }, { iso3: 'TZA', pullDate: '2026-09-29' }, { iso3: 'RWA', missing: 'no saved pull on or before 2026-10-01' }]);
  const [cpi, rate] = t.rows;
  assert.deepEqual(cpi.peers.map((c) => c.value), [4, 3, null]);
  assert.equal(cpi.median, 3.5);
  assert.equal(cpi.rank, 1);
  assert.equal(cpi.of, 3);
  // One peer with the figure: no median, rank still shown.
  assert.equal(rate.median, undefined);
  assert.equal(rate.rank, 1);
  assert.equal(rate.of, 2);
  // Review country missing a figure: no rank.
  const t2 = peerTable(diag('KEN', '2026-09-30', null, 8), [{ iso3: 'UGA', diagnosis: diag('UGA', '2026-09-28', 4, 9) }]);
  assert.equal(t2.rows[0].rank, undefined);
  assert.equal(t2.rows[0].of, 1);
  assert.equal(t2.rows[1].rank, 2);
});

test('Peers has its text', () => {
  for (const k of ['pe_title', 'pe_hint', 'pe_noPull', 'pe_rankNote'] as const) assert.ok(k in REPORTS.en, k);
});
