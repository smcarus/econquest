/**
 * Scenario API (console integration item 9): shocks and historical replays on a supplied
 * portfolio, worked out per position, labelled hypothetical, Missing with a reason where a move has
 * no saved source. The replay series are parsed from a recorded FRED reply; the calculator is fed
 * small test series so each number can be checked by hand.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';
import { iso3FromCode } from '../src/data/iso3166Alpha2';
import { parseFredCsvSeries } from '../src/utils/fedBalanceSheet';
import { parseApiHoldings } from '../src/utils/holdingsApi';
import type { Holding } from '../src/utils/holdings';
import {
  EPISODES,
  episodeById,
  fredMonths,
  monthlyAverages,
  parseScenarioRequest,
  replayCoverage,
  replayFredSeries,
  runScenario,
  type ReplayFile,
  type ReplayInputs,
} from '../src/utils/scenarioReplay';
import { shareableSource } from '../src/utils/consoleEvents';
import { licenceRowsForSource } from '../src/utils/licenceLookup';

const positions = (list: unknown[]): Holding[] => {
  const p = parseApiHoldings(list);
  assert.deepEqual(p.errors, []);
  return p.holdings.map((h, i) => ({ ...h, id: `p${i + 1}` }));
};
const noData: ReplayInputs = { file: null, ecbMonthly: () => null, shareable: shareableSource };

test('the recorded FRED reply reads as monthly values keyed YYYY-MM', () => {
  const csv = gunzipSync(readFileSync(path.join('tests', 'fixtures', 'recorded', 'bodies', '1056fbaa19734fdc.gz'))).toString('utf8');
  const months = fredMonths(parseFredCsvSeries(csv));
  assert.equal(months['2024-11'], 4.36);
  assert.equal(months['2025-01'], 4.63);
  assert.ok(Object.keys(months).every((k) => /^\d{4}-\d{2}$/.test(k)));
});

test('the episodes are the ones asked for, with whole-month windows in order', () => {
  assert.deepEqual(EPISODES.map((e) => e.id), ['asia_1997', 'russia_1998', 'year_2001', 'gfc_2008', 'taper_2013', 'covid_2020', 'year_2022']);
  for (const e of EPISODES) {
    assert.match(e.from, /^\d{4}-\d{2}$/);
    assert.ok(e.from < e.to, e.id);
  }
  assert.deepEqual([episodeById('gfc_2008')!.from, episodeById('gfc_2008')!.to], ['2008-08', '2008-11']);
  assert.deepEqual([episodeById('covid_2020')!.from, episodeById('covid_2020')!.to], ['2020-01', '2020-03']);
  assert.ok(replayFredSeries().includes('IRLTLT01USM156N'));
  assert.ok(replayFredSeries().includes('EXBZUS'));
});

test('monthly averages of daily rates', () => {
  const m = monthlyAverages([{ date: '2008-08-01', value: 2 }, { date: '2008-08-29', value: 4 }, { date: '2008-11-03', value: 5 }]);
  assert.deepEqual(m, { '2008-08': 3, '2008-11': 5 });
});

test('request checks: kind, episode, bounds, country codes, and a shock that moves nothing', () => {
  assert.match(parseScenarioRequest({}, iso3FromCode).errors[0]!, /kind/);
  assert.match(parseScenarioRequest({ scenario: { kind: 'replay', episode: '1929' } }, iso3FromCode).errors[0]!, /asia_1997/);
  assert.match(parseScenarioRequest({ scenario: { kind: 'shock' } }, iso3FromCode).errors[0]!, /moves nothing/);
  assert.match(parseScenarioRequest({ scenario: { kind: 'shock', em_fx_pct: 400 } }, iso3FromCode).errors[0]!, /between -95 and 95/);
  assert.match(parseScenarioRequest({ scenario: { kind: 'shock', countries: { ZZZ: { spread_bp: 1 } } } }, iso3FromCode).errors[0]!, /not an ISO/);
  const ok = parseScenarioRequest({ scenario: { kind: 'shock', em_fx_pct: -10, countries: { tr: { spread_bp: 300 } } } }, iso3FromCode);
  assert.deepEqual(ok.errors, []);
  assert.deepEqual(ok.request, { kind: 'shock', em_fx_pct: -10, us_rates_bp: 0, countries: { TUR: { spread_bp: 300 } } });
});

test('shock: emerging currencies move, advanced ones do not unless named; P&L is first order', () => {
  const req = parseScenarioRequest({ scenario: { kind: 'shock', em_fx_pct: -10, us_rates_bp: 50, countries: { TUR: { spread_bp: 300 }, JPN: { fx_pct: 5 } } } }, iso3FromCode).request!;
  const book = positions([
    { country: 'BRA', type: 'lc_bond', notional_usd_mm: 10, duration: 5, entity_id: 'a' }, // fx: -10% on 10mm = -1,000,000
    { country: 'TUR', type: 'hc_bond', notional_usd_mm: 10, duration: 6 }, // 6,000 per bp: rates 50bp = -300,000; spread 300bp = -1,800,000
    { country: 'KOR', type: 'fx', notional_usd_mm: 4 }, // Korea is advanced (IMF): no move
    { country: 'JPN', type: 'fx', notional_usd_mm: -2 }, // short yen, yen +5%: -100,000
    { country: 'TUR', type: 'cds', notional_usd_mm: 5, duration: 4 }, // bought protection, +300bp: +600,000
  ]);
  const r = runScenario(book, req, noData);
  assert.equal(r.hypothetical, true);
  assert.match(r.note, /Hypothetical/);
  const [lc, hc, kor, jpn, cds] = r.positions;
  assert.equal(lc!.entity_id, 'a');
  assert.deepEqual(lc!.components.map((c) => [c.factor, c.move, c.pnl_usd]), [['local_yield', 0, 0], ['fx', -10, -1_000_000]]);
  assert.deepEqual(hc!.components.map((c) => [c.factor, c.pnl_usd]), [['us_rates', -300_000], ['spread', -1_800_000]]);
  assert.equal(kor!.pnl_usd, 0);
  assert.equal(jpn!.pnl_usd, -100_000);
  assert.equal(cds!.pnl_usd, 600_000);
  assert.equal(r.totals.pnl_usd, -1_000_000 - 2_100_000 + 0 - 100_000 + 600_000);
  assert.equal(r.totals.complete, 5);
});

test('a position without a duration has its rate and spread moves Missing, and the total is left blank', () => {
  const req = parseScenarioRequest({ scenario: { kind: 'shock', us_rates_bp: 100 } }, iso3FromCode).request!;
  const r = runScenario(positions([{ country: 'MEX', type: 'hc_bond', notional_usd_mm: 10 }, { country: 'MEX', type: 'other', notional_usd_mm: 1 }]), req, noData);
  assert.equal(r.positions[0]!.components[0]!.status, 'Missing');
  assert.match(r.positions[0]!.components[0]!.reason!, /No duration/);
  assert.equal(r.positions[0]!.pnl_usd, null);
  assert.match(r.positions[1]!.components[0]!.reason!, /type OTHER/);
  assert.equal(r.totals.pnl_usd, null);
  assert.equal(r.totals.partial, 2);
});

const series = (source: string, months: Record<string, number>) => ({ source, url: 'https://fred.stlouisfed.org/', unit: '', months, pulledAt: '2026-11-13T00:00:00Z' });
const file: ReplayFile = {
  version: 1,
  savedAt: '2026-11-13T00:00:00Z',
  series: {
    IRLTLT01USM156N: series('OECD long-term interest rates (monthly average, via FRED), IRLTLT01USM156N', { '2008-08': 4.0, '2008-11': 3.0 }),
    IRLTLT01MXM156N: series('OECD long-term interest rates (monthly average, via FRED), IRLTLT01MXM156N', { '2008-08': 8.0, '2008-11': 9.5 }),
    EXMXUS: series('Federal Reserve Board H.10 exchange rates (monthly average, via FRED), EXMXUS', { '2008-08': 10, '2008-11': 12.5 }),
    EXUSEU: series('Federal Reserve Board H.10 exchange rates (monthly average, via FRED), EXUSEU', { '2008-08': 1.5, '2008-11': 1.25 }),
    'embig:MEX': series('J.P. Morgan EMBI Global via Banco Central de Reserva del Perú (BCRPData), PN43678XM', { '2020-01': 300, '2020-03': 500 }),
  },
};
const inputs = (over: Partial<ReplayInputs> = {}): ReplayInputs => ({ file, ecbMonthly: () => null, shareable: shareableSource, ...over });

test('replay 2008: US and Mexican yields, the peso from H.10, the euro turned round; moves and P&L by hand', () => {
  const ep = episodeById('gfc_2008')!;
  const r = runScenario(
    positions([
      { country: 'MEX', type: 'lc_bond', notional_usd_mm: 10, duration: 5 },
      { country: 'MEX', type: 'hc_bond', notional_usd_mm: 10, duration: 8 },
      { country: 'DEU', type: 'fx', notional_usd_mm: 2 },
    ]),
    { kind: 'replay', episode: ep },
    inputs()
  );
  const [lc, hc, eur] = r.positions;
  // Mexico 10Y +150bp on 5,000 per bp = -750,000; peso 10 -> 12.5 per USD = -20% = -2,000,000.
  assert.deepEqual(lc!.components.map((c) => [c.factor, c.move, c.pnl_usd]), [['local_yield', 150, -750_000], ['fx', -20, -2_000_000]]);
  assert.deepEqual(lc!.components[1]!.from, { period: '2008-08', value: 10 });
  assert.equal(lc!.pnl_usd, -2_750_000);
  // US 10Y -100bp on 8,000 per bp = +800,000; the spread series starts in 2020: Missing.
  assert.deepEqual([hc!.components[0]!.move, hc!.components[0]!.pnl_usd], [-100, 800_000]);
  assert.equal(hc!.components[1]!.status, 'Missing');
  assert.match(hc!.components[1]!.reason!, /no value for 2008-08 \(it starts in 2020-01\)/);
  assert.equal(hc!.pnl_usd, null);
  assert.equal(hc!.pnl_known_usd, 800_000);
  // Euro: 1.5 -> 1.25 USD per EUR = 0.6667 -> 0.8 EUR per USD, -16.67%: -333,333.
  assert.equal(eur!.components[0]!.move, -16.67);
  assert.equal(eur!.pnl_usd, -333_333);
  assert.equal(r.scenario.episode, 'gfc_2008');
  assert.match(String(r.scenario.note), /monthly averages/);
});

test('replay: CDS has no source; a currency outside H.10 uses the ECB monthly averages; 1997 has no ECB rates', () => {
  const r = runScenario(
    positions([
      { country: 'TUR', type: 'cds', notional_usd_mm: 5, duration: 4 },
      { country: 'TUR', type: 'fx', notional_usd_mm: 1 },
      { country: 'MEX', type: 'hc_bond', notional_usd_mm: 1, duration: 1 },
    ]),
    { kind: 'replay', episode: episodeById('covid_2020')! },
    inputs({ ecbMonthly: (ccy) => (ccy === 'TRY' ? { '2020-01': 6, '2020-03': 6.25 } : null) })
  );
  assert.match(r.positions[0]!.components[0]!.reason!, /No free CDS history/);
  assert.equal(r.positions[1]!.components[0]!.move, -4);
  assert.match(r.positions[1]!.components[0]!.source!, /ECB/);
  assert.equal(r.positions[1]!.components[0]!.pnl_usd, -40_000);
  // The spread 300 -> 500 on 100 per bp = -20,000.
  assert.equal(r.positions[2]!.components[1]!.pnl_usd, -20_000);
  assert.equal(r.positions[2]!.components[1]!.shareable, false, 'EMBI levels are not cleared for sharing');
  const asia = runScenario(positions([{ country: 'IDN', type: 'fx', notional_usd_mm: 1 }]), { kind: 'replay', episode: episodeById('asia_1997')! }, inputs());
  assert.match(asia.positions[0]!.components[0]!.reason!, /ECB reference rates start in January 1999/);
});

test('replay with nothing downloaded: every move is Missing with the reason, nothing filled in', () => {
  const r = runScenario(positions([{ country: 'BRA', type: 'lc_bond', notional_usd_mm: 1, duration: 2 }]), { kind: 'replay', episode: episodeById('taper_2013')! }, noData);
  assert.ok(r.positions[0]!.components.every((c) => c.status === 'Missing' && c.pnl_usd === null));
  assert.match(r.positions[0]!.components[0]!.reason!, /No free monthly 10Y yield history for BRA/);
  assert.match(r.positions[0]!.components[1]!.reason!, /not been downloaded yet/);
  assert.equal(r.totals.pnl_known_usd, 0);
});

test('coverage lists what the saved series cover per episode; H.10 and OECD sources map to the licence register', () => {
  const cov = replayCoverage(file, '1999-01');
  const gfc = cov.find((e) => e.id === 'gfc_2008')!;
  assert.equal(gfc.covered.us_rates, true);
  assert.deepEqual(gfc.covered.local_yields, ['MEX', 'USA']);
  assert.ok(gfc.covered.fx.includes('MEX') && gfc.covered.fx.includes('TUR') && gfc.covered.fx.includes('DEU'));
  assert.deepEqual(cov.find((e) => e.id === 'covid_2020')!.covered.spreads, ['MEX']);
  assert.deepEqual(cov.find((e) => e.id === 'asia_1997')!.covered.fx, []);
  assert.ok(licenceRowsForSource(file.series.EXMXUS!.source).some((r) => r.id === 'fed_h10'));
  assert.ok(licenceRowsForSource(file.series.IRLTLT01MXM156N!.source).some((r) => r.id === 'fred'));
});
