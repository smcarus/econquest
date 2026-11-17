/**
 * Country snapshot (console integration item 6) on recorded inputs: Missing keeps its reason,
 * projections are never the latest value, your own files carry no "official" badge, and sharing
 * mode holds back values whose source does not allow passing them on.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCountrySnapshot, HELD_BACK } from '../src/server/countrySnapshot';

const cells = [
  { iso3: 'BRA', country: 'Brazil', figureId: 'policy_rate', figure: 'Policy rate', value: 15, unit: '%', status: 'Live', period: '2026-10', source: 'BIS central bank policy rates', reason: '' },
  { iso3: 'BRA', country: 'Brazil', figureId: 'yield_10y', figure: '10-year yield', value: null, unit: '%', status: 'Missing', period: '', source: '', reason: 'No official yield saved yet' },
] as never;
const series = {
  iso3: 'BRA',
  series: [
    { id: 'debt_gdp', label: 'Debt', unit: '% of GDP', freq: 'annual', source: 'IMF World Economic Outlook', points: [{ date: '2025', value: 87.1 }, { date: '2026', value: 90, note: 'IMF projection' }] },
    { id: 'own_spread', label: 'My spread', unit: 'bps', freq: 'daily', source: 'Your file spread.csv', own: true, points: [{ date: '2026-11-12', value: 210 }] },
    { id: 'restricted', label: 'Restricted', unit: '', freq: 'monthly', source: 'A source nobody has checked', points: [{ date: '2026-10', value: 3 }] },
  ],
  missing: [{ id: 'cli', label: 'OECD leading indicator', reason: 'OECD does not publish one for Brazil' }],
} as never;

test('values carry source, date, badge and shareable; Missing keeps its reason; projections are not the latest', () => {
  const s = buildCountrySnapshot({ iso3: 'BRA', name: 'Brazil', cells, series, signals: { 'BRA:cycle_clock': { state: 'Cutting', asOf: '2026-10', source: 'BIS central bank policy rates' }, 'MEX:cycle_clock': { state: 'Hold', asOf: '2026-10', source: 'x' } }, badges: { cycle_clock: 'provisional' }, sharingMode: false, councilRunId: null, now: new Date('2026-11-13T00:00:00Z') });
  assert.deepEqual(s.country, { iso2: 'BR', iso3: 'BRA', name: 'Brazil' });
  assert.equal(s.figures[0]!.badge, 'official');
  assert.equal(s.figures[0]!.as_of, '2026-10');
  assert.equal(s.figures[1]!.value, null);
  assert.equal(s.figures[1]!.reason, 'No official yield saved yet');
  const debt = s.series.find((x) => x.id === 'debt_gdp')!;
  assert.equal(debt.value, 87.1);
  assert.equal(debt.as_of, '2025');
  assert.equal(debt.projected_to, '2026');
  const own = s.series.find((x) => x.id === 'own_spread')!;
  assert.equal(own.origin, 'own_file');
  assert.equal(own.badge, 'not_validated');
  assert.equal(own.shareable, false);
  assert.equal(s.series.find((x) => x.id === 'cli')!.reason, 'OECD does not publish one for Brazil');
  assert.deepEqual(s.signals.map((x) => [x.signal, x.state, x.badge]), [['cycle_clock', 'Cutting', 'provisional']]);
  assert.match(s.council.note, /do not need one/);
});

test('sharing mode holds back values whose source does not allow passing them on, with the reason', () => {
  const s = buildCountrySnapshot({ iso3: 'BRA', name: 'Brazil', cells, series, signals: null, badges: {}, sharingMode: true, councilRunId: 'run-1' });
  const r = s.series.find((x) => x.id === 'restricted')!;
  assert.equal(r.value, null);
  assert.equal(r.reason, HELD_BACK);
  assert.equal(s.sharing_mode, true);
  assert.match(s.council.note, /integration\/bundle\/BRA/);
});
