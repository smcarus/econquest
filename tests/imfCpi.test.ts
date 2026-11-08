/**
 * Fresher inflation (plan G3): IMF monthly CPI found by IMF names, the freshest-source rule, and
 * the Data health inflation list. IMF codes below are made up; the app finds codes by name.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { imfCpiKey, parseImfCpiStructure, pickImfCpiSeries, imfCpiSeries, pullImfCpi } from '../src/utils/imfCpi.ts';
import { parseImfData } from '../src/utils/imfReserves.ts';
import { mergeNationalCpi } from '../src/utils/nationalCpi.ts';
import { cpiFor, cpiSource } from '../src/utils/oecdInflation.ts';
import { daysSinceMonthEnd, inflationHealth } from '../src/utils/inflationHealth.ts';
import { freshnessChecks, type DatedItem } from '../src/utils/freshness.ts';

const urn = (cl: string) => `urn:sdmx:org.sdmx.infomodel.codelist.Codelist=IMF.STA:${cl}(1.0.0)`;
const structure = {
  data: {
    dataStructures: [
      {
        id: 'DSD_CPI',
        dataStructureComponents: {
          dimensionList: {
            dimensions: [
              { id: 'COUNTRY', position: 0, localRepresentation: { enumeration: urn('CL_COUNTRY') } },
              { id: 'INDEX_TYPE', position: 1, localRepresentation: { enumeration: urn('CL_INDEX_TYPE') } },
              { id: 'COICOP_1999', position: 2, localRepresentation: { enumeration: urn('CL_COICOP') } },
              { id: 'TYPE_OF_TRANSFORMATION', position: 3, localRepresentation: { enumeration: urn('CL_TRANSFORMATION') } },
              { id: 'FREQUENCY', position: 4, localRepresentation: { enumeration: urn('CL_FREQ') } },
            ],
          },
        },
      },
    ],
    codelists: [
      { id: 'CL_COUNTRY', codes: [{ id: 'USA', name: 'United States' }] },
      { id: 'CL_INDEX_TYPE', codes: [{ id: 'HICP', name: 'Harmonised index of consumer prices (HICP)' }, { id: 'CPI', name: 'Consumer price index (CPI)' }] },
      { id: 'CL_COICOP', codes: [{ id: 'CP01', name: 'Food and non-alcoholic beverages' }, { id: '_T', name: 'All Items' }] },
      {
        id: 'CL_TRANSFORMATION',
        codes: [
          { id: 'IX', name: 'Index' },
          { id: 'POP_PCH_PA_PT', name: 'Period-over-period percent change' },
          { id: 'YOY_PCH_PA_PT', name: 'Year-over-year percent change' },
        ],
      },
      { id: 'CL_FREQ', codes: [{ id: 'M', name: 'Monthly' }, { id: 'A', name: 'Annual' }] },
    ],
  },
};

const DIMS = ['COUNTRY', 'INDEX_TYPE', 'COICOP_1999', 'TYPE_OF_TRANSFORMATION', 'FREQUENCY'];
const NAMES: Record<string, Record<string, string>> = {
  INDEX_TYPE: { CPI: 'Consumer price index (CPI)' },
  COICOP_1999: { _T: 'All Items', CP01: 'Food and non-alcoholic beverages' },
  TYPE_OF_TRANSFORMATION: { YOY_PCH_PA_PT: 'Year-over-year percent change', IX: 'Index' },
  FREQUENCY: { M: 'Monthly' },
};
function data(rows: Array<{ dims: string[]; obs: Array<[string, number]> }>): unknown {
  const values = DIMS.map((_, i) => [...new Set(rows.map((r) => r.dims[i]))]);
  const periods = [...new Set(rows.flatMap((r) => r.obs.map((o) => o[0])))];
  const series: Record<string, unknown> = {};
  for (const r of rows) series[r.dims.map((v, i) => values[i].indexOf(v)).join(':')] = { observations: Object.fromEntries(r.obs.map(([p, v]) => [String(periods.indexOf(p)), [String(v)]])) };
  return {
    data: {
      structures: [{ dimensions: { series: DIMS.map((d, i) => ({ id: d, values: values[i].map((v) => ({ id: v, name: NAMES[d]?.[v] ?? v })) })), observation: [{ id: 'TIME_PERIOD', values: periods.map((p) => ({ value: p })) }] } }],
      dataSets: [{ series }],
    },
  };
}
const usReply = data([
  { dims: ['USA', 'CPI', '_T', 'YOY_PCH_PA_PT', 'M'], obs: [['2026-M08', 2.912], ['2026-M09', 3.01], ['2026-M10', 2.98]] },
  { dims: ['USA', 'CPI', '_T', 'IX', 'M'], obs: [['2026-M10', 331.2]] },
  { dims: ['USA', 'CPI', 'CP01', 'YOY_PCH_PA_PT', 'M'], obs: [['2026-M10', 2.1]] },
]);

test('IMF CPI: codes picked by IMF name in each dimension, the rest left open', () => {
  const s = parseImfCpiStructure(structure)!;
  assert.deepEqual(s.dims.map((d) => d.id), DIMS);
  const k = imfCpiKey(s, 'USA');
  assert.equal(k.key, 'USA.CPI._T.YOY_PCH_PA_PT.M', 'not the HICP, not food, not period-over-period');
  assert.equal(imfCpiKey({ dims: [{ id: 'COUNTRY', codes: [] }, { id: 'MYSTERY', codes: [{ id: 'X', name: 'Something else' }] }] }, 'IND').key, 'IND.*');
  assert.equal(parseImfCpiStructure({ data: { dataStructures: [] } }), null);
});

test('IMF CPI: keeps the all-items, year-over-year, monthly series as months', () => {
  const picked = pickImfCpiSeries(parseImfData(usReply))!;
  assert.equal(picked.key, 'USA.CPI._T.YOY_PCH_PA_PT.M');
  const s = imfCpiSeries(picked)!;
  assert.deepEqual(s.points.map((p) => `${p.period} ${p.value}`), ['2026-08 2.91', '2026-09 3.01', '2026-10 2.98']);
  assert.equal(s.short, 'IMF CPI');
  assert.match(s.long, /USA\.CPI\._T\.YOY_PCH_PA_PT\.M/);
  assert.equal(pickImfCpiSeries(parseImfData(data([{ dims: ['USA', 'CPI', '_T', 'IX', 'M'], obs: [['2026-M10', 331.2]] }]))), null, 'an index level is not inflation');
});

test('IMF CPI pull: one structure read, then the data; the .env key skips the structure', async () => {
  const urls: string[] = [];
  const fetchFn = async (u: string) => {
    urls.push(u);
    const body = u.includes('/structure/') ? structure : u.includes('/data/') ? usReply : null;
    return body ? new Response(JSON.stringify(body), { status: 200 }) : new Response('no', { status: 404 });
  };
  const r = await pullImfCpi({ fetchFn }, 'USA');
  assert.ok(r.step.ok, r.step.note);
  assert.equal(r.series!.points.length, 3);
  assert.equal(urls.length, 2);
  urls.length = 0;
  const again = await pullImfCpi({ fetchFn, structure: r.structure }, 'USA');
  assert.ok(again.series && urls.length === 1, 'structure reused');
  urls.length = 0;
  await pullImfCpi({ fetchFn, env: { IMF_CPI_KEY: '{ISO3}.CPI._T.YOY_PCH_PA_PT.M' } }, 'USA');
  assert.equal(urls.length, 1);
  assert.match(urls[0], /\/USA\.CPI\._T\.YOY_PCH_PA_PT\.M\?/);
  const down = await pullImfCpi({ fetchFn: async () => new Response('x', { status: 503 }) }, 'USA');
  assert.ok(!down.step.ok && /HTTP 503/.test(down.step.note));
});

const pts = (...ms: string[]) => ms.map((period, i) => ({ period, value: 2 + i / 10 }));

test('the freshest source wins; on the same month national beats IMF beats OECD; never stitched', () => {
  const oecd = { USA: { basis: 'oecd_yoy' as const, points: pts('2026-05', '2026-06') }, IND: { basis: 'oecd_yoy' as const, points: pts('2026-06') }, POL: { basis: 'oecd_yoy' as const, points: pts('2026-06') } };
  const national = { POL: { points: pts('2026-09'), short: 'Eurostat HICP', long: 'Eurostat HICP, annual rate' } };
  const imf = {
    USA: { points: pts('2026-09', '2026-10'), short: 'IMF CPI', long: 'IMF CPI (series X)' },
    IND: { points: pts('2026-04'), short: 'IMF CPI', long: 'IMF CPI (series Y)' },
    POL: { points: pts('2026-09'), short: 'IMF CPI', long: 'IMF CPI (series Z)' },
  };
  const m = mergeNationalCpi(oecd, national, imf)!;
  assert.equal(m.USA.basis, 'imf');
  assert.deepEqual(m.USA.points.map((p) => p.period), ['2026-09', '2026-10'], 'the IMF series whole, not joined to the OECD months');
  assert.equal(m.IND.basis, 'oecd_yoy', 'an older IMF month does not replace a newer OECD one');
  assert.equal(m.POL.basis, 'national', 'Eurostat wins a tie with the IMF');
  const r = cpiFor('USA', m)!;
  assert.equal(cpiSource(r), 'IMF CPI (series X), Oct 2026');
  assert.equal(mergeNationalCpi(null, {}, {}), null);
  // The two-source call keeps working as before.
  assert.equal(mergeNationalCpi(oecd, national)!.POL.basis, 'national');
});

test('Data health inflation list: source, month and age; OECD copies over 90 days flagged first', () => {
  const now = new Date('2026-11-08T12:00:00Z');
  assert.equal(daysSinceMonthEnd('2026-10', now), 8);
  assert.equal(daysSinceMonthEnd('2026-06', now), 131);
  assert.equal(daysSinceMonthEnd('2026', now), null);
  const readings: Record<string, ReturnType<typeof cpiFor>> = {
    USA: { iso3: 'USA', month: '2026-10', yoyPct: 2.98, basis: 'imf', short: 'IMF CPI' },
    IND: { iso3: 'IND', month: '2026-06', yoyPct: 4.1, basis: 'oecd_yoy' },
    BRA: { iso3: 'BRA', month: '2026-07', yoyPct: 5.2, basis: 'national', short: 'BCB IPCA' },
  };
  const h = inflationHealth(['USA', 'IND', 'BRA', 'EGY'], (i) => readings[i] ?? null, now);
  assert.deepEqual(h.rows.map((r) => `${r.iso3} ${r.flag ?? 'ok'}`), ['EGY missing', 'IND old_oecd', 'BRA old', 'USA ok']);
  assert.equal(h.needsLook, 3);
  assert.equal(h.rows.find((r) => r.iso3 === 'USA')!.ageDays, 8);
});

test('freshness: an IMF figure is not blamed on the OECD copy', () => {
  const now = new Date('2026-11-08T12:00:00Z');
  const [imf] = freshnessChecks({ iso3: 'USA', cpiMonth: '2026-06', cpiSource: 'oecd', oecdCpi: { iso3: 'USA', month: '2026-06', yoyPct: 3, basis: 'imf' } } as DatedItem, now);
  assert.ok(imf.stale && !/DBnomics/.test(imf.why || ''));
  const [oecd] = freshnessChecks({ iso3: 'USA', cpiMonth: '2026-06', cpiSource: 'oecd', oecdCpi: { iso3: 'USA', month: '2026-06', yoyPct: 3, basis: 'oecd_yoy' } } as DatedItem, now);
  assert.match(oecd.why || '', /DBnomics/);
  assert.match(oecd.fresher || '', /IMF monthly consumer prices/);
});
