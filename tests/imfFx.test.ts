/**
 * IMF monthly exchange rates (LI3): found by IMF names, used only where no daily official rate
 * exists. IMF codes below are made up; the app finds codes by name.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseImfCpiStructure } from '../src/utils/imfCpi.ts';
import { imfMonthlyKey, pullImfMonthly, readImfMonthlyPull, type ImfMonthlyPull } from '../src/utils/imfMonthly.ts';
import { IMF_FX_SPEC, imfFxSeries } from '../src/utils/imfFx.ts';
import { countrySeries } from '../src/utils/seriesHistory.ts';
import { WORLD_STEPS as PRELOAD_WORLD_STEPS } from '../src/utils/preload.ts';
import { SOURCE_IDS as CONNECTION_IDS } from '../src/utils/connectionCheck.ts';

const urn = (cl: string) => `urn:sdmx:org.sdmx.infomodel.codelist.Codelist=IMF.STA:${cl}(1.0.0)`;
const structure = {
  data: {
    dataStructures: [
      {
        id: 'DSD_ER',
        dataStructureComponents: {
          dimensionList: {
            dimensions: [
              { id: 'COUNTRY', position: 0, localRepresentation: { enumeration: urn('CL_COUNTRY') } },
              { id: 'INDICATOR', position: 1, localRepresentation: { enumeration: urn('CL_INDICATOR') } },
              { id: 'TYPE_OF_TRANSFORMATION', position: 2, localRepresentation: { enumeration: urn('CL_TRANSFORMATION') } },
              { id: 'FREQUENCY', position: 3, localRepresentation: { enumeration: urn('CL_FREQ') } },
            ],
          },
        },
      },
    ],
    codelists: [
      { id: 'CL_COUNTRY', codes: [{ id: 'NGA', name: 'Nigeria' }] },
      {
        id: 'CL_INDICATOR',
        codes: [
          { id: 'XDC_EUR', name: 'Domestic currency per Euro' },
          { id: 'XDC_XDR', name: 'Domestic currency per SDR' },
          { id: 'USD_XDC', name: 'Domestic currency per US Dollar' },
          { id: 'NEER', name: 'Nominal effective exchange rate index' },
        ],
      },
      {
        id: 'CL_TRANSFORMATION',
        codes: [
          { id: 'EOP_RT', name: 'End-of-period, Rate' },
          { id: 'PA_RT', name: 'Period average, Rate' },
        ],
      },
      { id: 'CL_FREQ', codes: [{ id: 'M', name: 'Monthly' }, { id: 'A', name: 'Annual' }] },
    ],
  },
};

const DIMS = ['COUNTRY', 'INDICATOR', 'TYPE_OF_TRANSFORMATION', 'FREQUENCY'];
const NAMES: Record<string, Record<string, string>> = {
  INDICATOR: { USD_XDC: 'Domestic currency per US Dollar', XDC_EUR: 'Domestic currency per Euro' },
  TYPE_OF_TRANSFORMATION: { PA_RT: 'Period average, Rate', EOP_RT: 'End-of-period, Rate' },
  FREQUENCY: { M: 'Monthly', A: 'Annual' },
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
const ngReply = data([
  { dims: ['NGA', 'USD_XDC', 'PA_RT', 'M'], obs: [['2026-M08', 1531.25], ['2026-M09', 1520.4], ['2026-M10', 1498.123456789]] },
  { dims: ['NGA', 'USD_XDC', 'EOP_RT', 'M'], obs: [['2026-M10', 1490]] },
  { dims: ['NGA', 'XDC_EUR', 'PA_RT', 'M'], obs: [['2026-M10', 1720]] },
  { dims: ['NGA', 'USD_XDC', 'PA_RT', 'A'], obs: [['2025', 1480]] },
]);

const reply = (json: unknown) => ({ ok: true, status: 200, json: async () => json, text: async () => JSON.stringify(json) }) as unknown as Response;

test('IMF FX: the dollar rate and the period average picked by IMF name; not the euro, the SDR or an index', () => {
  const s = parseImfCpiStructure(structure)!;
  assert.equal(imfMonthlyKey(IMF_FX_SPEC, s, 'NGA').key, 'NGA.USD_XDC.PA_RT.M');
});

test('IMF FX: a pull keeps the monthly average series per US dollar, with its IMF key', async () => {
  const asked: string[] = [];
  const fetchFn = async (u: string) => {
    asked.push(u);
    return reply(u.includes('/structure/') ? structure : ngReply);
  };
  const r = await pullImfMonthly(IMF_FX_SPEC, { fetchFn: fetchFn as never }, 'NGA');
  assert.equal(r.step.ok, true, r.step.note);
  assert.equal(r.series!.key, 'NGA.USD_XDC.PA_RT.M');
  assert.deepEqual(r.series!.points, [
    { period: '2026-08', value: 1531.25 },
    { period: '2026-09', value: 1520.4 },
    { period: '2026-10', value: 1498.123457 },
  ]);
  assert.match(asked[1], /\/data\/dataflow\/IMF\.STA\/ER\/\+\/NGA\.USD_XDC\.PA_RT\.M\?/);
  // The .env key wins, and then no structure is read.
  asked.length = 0;
  const own = await pullImfMonthly(IMF_FX_SPEC, { fetchFn: fetchFn as never, env: { IMF_FX_KEY: '{ISO3}.USD_XDC.PA_RT.M' } }, 'NGA');
  assert.equal(own.step.ok, true);
  assert.equal(asked.length, 1);
});

test('IMF FX: nothing that fits gives a reason that names the .env setting', async () => {
  const fetchFn = async (u: string) => reply(u.includes('/structure/') ? structure : data([{ dims: ['NGA', 'XDC_EUR', 'PA_RT', 'M'], obs: [['2026-M10', 1720]] }]));
  const r = await pullImfMonthly(IMF_FX_SPEC, { fetchFn: fetchFn as never }, 'NGA');
  assert.equal(r.series, null);
  assert.match(r.step.note, /none that fits.*IMF_FX_KEY/);
});

const pull: ImfMonthlyPull = {
  pulledAt: '2026-11-17T00:00:00Z',
  series: { NGA: { key: 'NGA.USD_XDC.PA_RT.M', short: 'IMF ER', long: 'IMF ER long (series NGA.USD_XDC.PA_RT.M)', points: [{ period: '2026-09', value: 1520.4 }, { period: '2026-10', value: 1498.1 }] } },
};

test('IMF FX: the exchange rate history uses the IMF monthly rate only when no daily rate exists', () => {
  const s = imfFxSeries(pull, 'nga', 'NGN')!;
  assert.equal(s.freq, 'monthly');
  assert.equal(s.unit, 'NGN per USD');
  assert.deepEqual(s.points.map((p) => p.date), ['2026-09', '2026-10']);
  assert.equal(imfFxSeries(pull, 'KEN', 'KES'), null);
  const fx = (inputs: Parameters<typeof countrySeries>[1]) => countrySeries('NGA', inputs).series.find((x) => x.id === 'fx_per_usd');
  assert.equal(fx({ currency: 'NGN', imfFx: pull })?.freq, 'monthly');
  assert.equal(fx({ currency: 'NGN' }), undefined, 'no IMF copy: Missing as before');
  // The ECB daily run wins where it has the currency.
  const ecb = { version: 1 as const, chunks: { '2026-Q4': { pulledAt: '2026-11-17T00:00:00Z', rates: { '2026-10-01': { NGN: 1500 } } } } };
  assert.equal(fx({ currency: 'NGN', imfFx: pull, fxHistory: ecb })?.freq, 'daily');
});

test('IMF FX: a saved copy of another shape is not read; the daily run and check:data have their rows', () => {
  assert.equal(readImfMonthlyPull({ series: {} }), null);
  assert.equal(readImfMonthlyPull(pull), pull);
  assert.ok(PRELOAD_WORLD_STEPS.some((s) => s.id === 'world:imf_fx'));
  const ecb = PRELOAD_WORLD_STEPS.findIndex((s) => s.id === 'world:fx_history');
  assert.ok(PRELOAD_WORLD_STEPS.findIndex((s) => s.id === 'world:imf_fx') > ecb, 'after the ECB run, so its currencies are known');
  assert.ok(CONNECTION_IDS.includes('imf_fx' as never));
});

test('IMF FX: a live reply without dimension names or with day-dated months is still read', async () => {
  const bare = data([{ dims: ['NGA', 'USD_XDC', 'PA_RT', 'M'], obs: [['2026-09-01', 1520.4], ['2026-10-01', 1498.1]] }]) as {
    data: { structures: Array<{ dimensions: { series: Array<{ values: Array<{ id: string; name?: string }> }> } }> };
  };
  for (const d of bare.data.structures[0].dimensions.series) for (const v of d.values) delete v.name;
  const fetchFn = async (u: string) => reply(u.includes('/structure/') ? structure : bare);
  const r = await pullImfMonthly(IMF_FX_SPEC, { fetchFn: fetchFn as never }, 'NGA');
  assert.equal(r.step.ok, true, r.step.note);
  assert.deepEqual(r.series!.points.map((p) => p.period), ['2026-09', '2026-10']);
  // With the .env key and no structure read, the key itself says which series it is.
  const own = await pullImfMonthly(IMF_FX_SPEC, { fetchFn: fetchFn as never, env: { IMF_FX_KEY: '{ISO3}.USD_XDC.PA_RT.M' } }, 'NGA');
  assert.equal(own.step.ok, true, own.step.note);
});

test('IMF FX: a series that is not monthly says so in the reason', async () => {
  const fetchFn = async (u: string) => reply(u.includes('/structure/') ? structure : data([{ dims: ['NGA', 'USD_XDC', 'PA_RT', 'M'], obs: [['2025', 1480]] }]));
  const r = await pullImfMonthly(IMF_FX_SPEC, { fetchFn: fetchFn as never }, 'NGA');
  assert.match(r.step.note, /none that fits \(no monthly figures \(periods such as 2025\)\)/);
});
