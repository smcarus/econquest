import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dpiTable, politicalFeasibility, type DpiTable } from '../src/utils/politicalFeasibility';
import type { OfficialCalendarEvent } from '../src/data/officialCalendar';
import type { V1Series } from '../src/utils/gdeltDaily';

const ev = (iso3: string, date: string, title: string, dateKind?: 'legal_deadline'): OfficialCalendarEvent => ({ iso3, category: 'ELECTION', title, date, sourceName: 'Electoral court', sourceUrl: 'https://example.org/e', primarySource: true, retrieved: '2026-11-04', ...(dateKind ? { dateKind } : {}) });
const CAL = [ev('BRA', '2022-10-02', 'General election'), ev('BRA', '2026-10-04', 'General election'), ev('BRA', '2030-10-06', 'General election', 'legal_deadline'), { ...ev('BRA', '2026-03-01', 'Budget'), category: 'BUDGET' as const }];

const DPI_ROWS = [
  ['countryname', 'ifs', 'year', 'system', 'checks', 'frac', 'polariz', 'yrcurnt'],
  ['Brazil', 'BRA', '2018', '0', '4', '0.94', '0', '0'],
  ['Brazil', 'BRA', '2019', '0', '5', '0.95', '-999', '3'],
  ['Brazil', 'BRA', '2020', '0', '5', '0.94', '0', '2'],
  ['Nowhere', '', '2020', '0', '1', '0', '0', '1'],
];

test('the DPI file: header found, -999 and blanks left out, rows by country', () => {
  const t = dpiTable(DPI_ROWS, 'DPI2020.csv') as DpiTable;
  assert.ok('countries' in t);
  assert.equal(t.countries.size, 1);
  assert.deepEqual(t.countries.get('BRA')![1], { year: 2019, values: { system: 0, checks: 5, frac: 0.95, yrcurnt: 3 } });
  assert.deepEqual([t.firstYear, t.lastYear], [2018, 2020]);
  assert.deepEqual(dpiTable([['a', 'b']], 'x.csv'), { reason: 'no header row with ifs, year and the DPI columns (checks, frac, ...)' });
});

test('everything is cut at the As of day: elections either side, the DPI year before, GDELT months before', () => {
  const months = Array.from({ length: 40 }, (_, i) => {
    const d = new Date(Date.UTC(2017, i, 1));
    return d.toISOString().slice(0, 7);
  });
  const gdelt: V1Series = { iso3: 'BRA', points: months.map((m, i) => ({ month: m, events: 100, sharePct: 1, protests: 5, sanctions: 0, violence: 1, protestPct: i === 23 ? 20 : 5, violencePct: 1, goldsteinMean: 1, toneMean: -1 })) };
  const dpi = dpiTable(DPI_ROWS, 'DPI2020.csv') as DpiTable;
  // The saved months run 2017-01 to 2020-04; as of 2020-01-15 only 2017-01 to 2019-12 are read.
  const r = politicalFeasibility('BRA', '2020-01-15T00:00:00Z', { calendar: CAL, dpi: { table: dpi }, gdelt });
  assert.equal(r.nextElection?.date, '2022-10-02');
  assert.equal(r.nextElection?.daysAway, 991);
  assert.equal(r.lastElection, undefined);
  assert.equal(r.dpi?.year, 2019, 'the 2020 row is not read before 2020');
  assert.equal(r.unrest?.month, '2019-12');
  assert.equal(r.unrest?.months, 35);
  assert.equal(r.unrest?.from, '2017-01');
  const later = politicalFeasibility('BRA', '2026-11-13', { calendar: CAL, dpi: { table: dpi }, gdelt });
  assert.equal(later.lastElection?.date, '2026-10-04');
  assert.equal(later.nextElection?.legalDeadline, true);
  assert.equal(later.dpi?.year, 2020);
  assert.ok(later.sources.some((s) => /Database of Political Institutions 2020/.test(s)));
});

test('Missing says why: no election on file, no DPI file or row, too few GDELT months', () => {
  const r = politicalFeasibility('KEN', '2026-11-13', { calendar: CAL, dpi: { table: null }, gdelt: null });
  assert.equal(r.electionMissing, 'No election date for this country is on file in the official calendar');
  assert.equal(r.dpiCode, 'no_file');
  assert.match(r.dpiMissing!, /data\/local\/dpi\//);
  assert.match(r.unrestMissing!, /No GDELT monthly event files/);
  const dpi = dpiTable(DPI_ROWS, 'DPI2020.csv') as DpiTable;
  assert.equal(politicalFeasibility('KEN', '2026-11-13', { calendar: CAL, dpi: { table: dpi }, gdelt: null }).dpiCode, 'no_row');
  assert.equal(politicalFeasibility('BRA', '2017-06-01', { calendar: CAL, dpi: { table: dpi }, gdelt: null }).dpiCode, 'no_year');
  const short: V1Series = { iso3: 'BRA', points: [{ month: '2026-01', events: 1, sharePct: 1, protests: 0, sanctions: 0, violence: 0, protestPct: 0, violencePct: 0, goldsteinMean: 0, toneMean: 0 }] };
  assert.match(politicalFeasibility('BRA', '2026-11-13', { calendar: CAL, dpi: { table: null, reason: 'x.csv (bad)' }, gdelt: short }).unrestMissing!, /Fewer than 24 complete months/);
  assert.equal(politicalFeasibility('BRA', '2026-11-13', { calendar: CAL, dpi: { table: null, reason: 'x.csv (bad)' }, gdelt: null }).dpiCode, 'unreadable');
});

test('the data check row and the wiring', async () => {
  const { checkConnections } = await import('../src/utils/connectionCheck');
  const t = dpiTable(DPI_ROWS, 'DPI2020.csv') as DpiTable;
  const rep = await checkConnections({ env: {}, only: ['dpi'], dpi: () => ({ table: t, skipped: [] }), fetchFn: async () => new Response('') } as never);
  assert.equal(rep.results[0].state, 'connected');
  assert.match(rep.results[0].detail, /Read DPI2020\.csv: 1 countries, 2018-2020/);
  assert.equal(rep.results[0].sample, 'BRA 2020: system 0, checks 5, frac 0.94, polariz 0, yrcurnt 2');
  const { readFileSync } = await import('node:fs');
  assert.match(readFileSync('src/server/routes/reviews.ts', 'utf8'), /app\.get\('\/api\/reviews\/:id\/political'/);
  const ui = readFileSync('src/components/PolicyReviews.tsx', 'utf8');
  assert.ok(ui.indexOf('data-review-step="options"') < ui.indexOf('data-review-step="political"') && ui.indexOf('data-review-step="political"') < ui.indexOf('data-review-step="evidence"'), 'beside the options, before Evidence');
});
