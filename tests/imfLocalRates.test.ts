/**
 * IMF monthly local market rates (LP1): Treasury bill, government bond and money market rates,
 * found by IMF names, only for countries with no official 10Y yield, never shown as a 10Y yield.
 * IMF codes below are made up.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseImfCpiStructure } from '../src/utils/imfCpi.ts';
import { imfMonthlyKey, type ImfMonthlyPull } from '../src/utils/imfMonthly.ts';
import { IMF_POLICY_SPEC } from '../src/utils/imfPolicyRate.ts';
import { IMF_LOCAL_RATE_SPECS, imfLocalRatesWanted, localRateFor, localRatesFor, localRateMissing } from '../src/utils/imfLocalRates.ts';
import { countrySeries } from '../src/utils/seriesHistory.ts';
import { localRateRows } from '../src/utils/countryNotes.ts';
import { councilInputs } from '../src/utils/councilInputs.ts';
import { buildMarketReadings } from '../src/utils/policyCouncil.ts';
import { buildBaselineOpenData } from '../src/data/presetsAndBaselines.ts';
import { WORLD_STEPS } from '../src/utils/preload.ts';
import { SOURCE_IDS } from '../src/utils/connectionCheck.ts';

const urn = (cl: string) => `urn:sdmx:org.sdmx.infomodel.codelist.Codelist=IMF.STA:${cl}(1.0.0)`;
const structure = {
  data: {
    dataStructures: [
      {
        id: 'DSD_MFS_IR',
        dataStructureComponents: {
          dimensionList: {
            dimensions: [
              { id: 'COUNTRY', position: 0, localRepresentation: { enumeration: urn('CL_COUNTRY') } },
              { id: 'INDICATOR', position: 1, localRepresentation: { enumeration: urn('CL_INDICATOR') } },
              { id: 'FREQUENCY', position: 2, localRepresentation: { enumeration: urn('CL_FREQ') } },
            ],
          },
        },
      },
    ],
    codelists: [
      { id: 'CL_COUNTRY', codes: [{ id: 'KEN', name: 'Kenya' }] },
      {
        id: 'CL_INDICATOR',
        codes: [
          { id: 'LR', name: 'Lending rate, Percent per annum' },
          { id: 'DR', name: 'Deposit rate, Percent per annum' },
          { id: 'MPRR', name: 'Monetary policy-related interest rate, Percent per annum' },
          { id: 'TB', name: 'Treasury bill rate, Percent per annum' },
          { id: 'GB', name: 'Government bonds yield, Percent per annum' },
          { id: 'MM', name: 'Money market rate, Percent per annum' },
          { id: 'MMF', name: 'Money market funds rate, Percent per annum' },
        ],
      },
      { id: 'CL_FREQ', codes: [{ id: 'M', name: 'Monthly' }] },
    ],
  },
};

test('IMF local rates: each rate picked by IMF name, none taking another or the policy rate', () => {
  const s = parseImfCpiStructure(structure)!;
  assert.equal(imfMonthlyKey(IMF_LOCAL_RATE_SPECS.tbill, s, 'KEN').key, 'KEN.TB.M');
  assert.equal(imfMonthlyKey(IMF_LOCAL_RATE_SPECS.govbond, s, 'KEN').key, 'KEN.GB.M');
  assert.equal(imfMonthlyKey(IMF_LOCAL_RATE_SPECS.money, s, 'KEN').key, 'KEN.MM.M');
  assert.equal(imfMonthlyKey(IMF_POLICY_SPEC, s, 'KEN').key, 'KEN.MPRR.M', 'policy rate unchanged');
  assert.equal(IMF_LOCAL_RATE_SPECS.tbill.accept('INDICATOR TB Treasury bill rate'), true);
  assert.equal(IMF_LOCAL_RATE_SPECS.govbond.accept('INDICATOR TB Treasury bill rate'), false);
});

test('IMF local rates: asked only for countries with no official 10Y yield', () => {
  for (const iso3 of ['KEN', 'NGA', 'GHA', 'EGY', 'PAK', 'BGD', 'TUR']) assert.equal(imfLocalRatesWanted(iso3), true, iso3);
  for (const iso3 of ['USA', 'DEU', 'BRA', 'IND', 'MEX']) assert.equal(imfLocalRatesWanted(iso3), false, iso3);
});

const pull = (key: string, points: Array<{ period: string; value: number }>): ImfMonthlyPull => ({
  pulledAt: '2026-11-18T00:00:00Z',
  series: { KEN: { key, short: 'IMF MFS', long: `IMF MFS long (series ${key})`, points } },
});
const tbill = pull('KEN.TB.M', [
  { period: '2025-09', value: 15.2 },
  { period: '2026-08', value: 9.1 },
  { period: '2026-09', value: 8.6 },
]);
const govbond = pull('KEN.GB.M', [{ period: '2026-09', value: 13.4 }]);

test('IMF local rates: latest figure, 12-month change, out of date after four months', () => {
  const r = localRateFor(tbill, 'ken', new Date('2026-11-18'))!;
  assert.equal(r.ratePct, 8.6);
  assert.equal(r.date, '2026-09');
  assert.equal(r.change12mPts, -6.6);
  assert.equal(r.stale, false);
  assert.equal(localRateFor(tbill, 'KEN', new Date('2027-03-01'))!.stale, true);
  const all = localRatesFor({ tbill, govbond, money: null }, 'KEN', new Date('2026-11-18'))!;
  assert.equal(all.tbill?.ratePct, 8.6);
  assert.equal(all.govbond?.ratePct, 13.4);
  assert.equal(all.money, undefined);
  assert.equal(localRatesFor({ tbill }, 'NGA'), null);
});

test('IMF local rates: History has the three series for Kenya, Missing with the reason when not saved; nothing for Germany', () => {
  const ken = countrySeries('KEN', { localRates: { tbill, govbond, money: { pulledAt: '2026-11-18T00:00:00Z', series: {} } } });
  assert.equal(ken.series.find((s) => s.id === 'tbill_rate')?.points.length, 3);
  assert.equal(ken.series.find((s) => s.id === 'gov_bond_yield')?.source, 'IMF MFS long (series KEN.GB.M)');
  assert.equal(ken.missing.find((m) => m.id === 'money_market_rate')?.reason, 'Not in IMF data');
  assert.equal(countrySeries('KEN', {}).missing.find((m) => m.id === 'tbill_rate')?.reason, 'Not downloaded yet');
  const deu = countrySeries('DEU', { localRates: { tbill } });
  assert.ok(![...deu.series, ...deu.missing].some((x) => x.id === 'tbill_rate'));
});

test('IMF local rates: country rows show the figures, Missing with the reason, and the stock index Missing; the 10Y yield stays empty', () => {
  const open = buildBaselineOpenData('KEN');
  open.localRates = { ...localRatesFor({ tbill, govbond }, 'KEN', new Date('2026-11-18'))! };
  const rows = localRateRows(open);
  assert.deepEqual(rows.map((r) => r.label), ['Treasury bill rate', 'Government bond yield', 'Money market rate', 'Stock index']);
  assert.equal(rows[0].value, '8.60% (-6.60 pts in 12 months)');
  assert.match(rows[0].source, /^IMF monthly \(MFS\), Sep 2026$/);
  assert.equal(rows[2].missing, true);
  assert.equal(rows[2].source, 'Not in IMF data');
  assert.equal(rows[3].missing, true);
  assert.equal(rows[3].source, 'No free source');
  assert.equal(open.liveFields?.['market.sovereign10YBondYieldPct'], undefined, 'the government bond yield never fills the 10Y field');
  assert.deepEqual(localRateRows(buildBaselineOpenData('DEU')), [], 'no rows where an official 10Y yield exists');
  assert.equal(localRateMissing('tbill', 'KEN', false).short, 'Not downloaded yet');
});

test('IMF local rates: the council is told the saved rates; the prompt is unchanged without them', () => {
  const open = buildBaselineOpenData('KEN');
  const before = councilInputs(open).lines;
  open.localRates = localRatesFor({ tbill, govbond }, 'KEN', new Date('2026-11-18'))!;
  const after = councilInputs(open).lines;
  const added = after.filter((l) => !before.includes(l));
  assert.deepEqual(added, [
    '- Treasury bill rate: 8.6% (IMF monthly, Sep 2026; -6.6 pts in 12 months)',
    '- Government bond yield (maturity as the country reports it, not a 10-year yield): 13.4% (IMF monthly, Sep 2026)',
  ]);
});

test('IMF local rates: the market council lists them where the country has them and skips them elsewhere', () => {
  const ken = countrySeries('KEN', { localRates: { tbill } });
  const r = buildMarketReadings('local_bonds', '2026-11-18', ken);
  assert.equal(r.readings.find((x) => x.id === 'tbill_rate')?.value, 8.6);
  assert.match(r.readings.find((x) => x.id === 'money_market_rate')?.reason || '', /Not downloaded yet/);
  const deu = buildMarketReadings('local_bonds', '2026-11-18', countrySeries('DEU', {}));
  assert.ok(!deu.readings.some((x) => x.id === 'tbill_rate'));
  assert.ok(!buildMarketReadings('dollar_bonds', '2026-11-18', ken).readings.some((x) => x.id === 'tbill_rate'));
});

test('IMF local rates: the daily run asks after the IMF policy rates, and check:data has a row', () => {
  const policy = WORLD_STEPS.findIndex((s) => s.id === 'world:imf_policy');
  assert.equal(WORLD_STEPS.findIndex((s) => s.id === 'world:imf_rates'), policy + 1);
  assert.ok(SOURCE_IDS.includes('imf_rates' as never));
});
