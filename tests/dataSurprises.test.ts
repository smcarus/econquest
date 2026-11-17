import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import {
  focusMatches,
  kalshiCpiPeriod,
  kalshiImpliedMeans,
  nowcastMatches,
  parseBlsCpi,
  parseFocusMonthly,
  parseSgsMonthly,
  scoreSurprises,
  snapshotMatches,
  spfMatches,
  spfTargetMonth,
  stampFirstSeen,
  surpriseSeriesFor,
  MIN_SPREAD_CASES,
} from '../src/utils/dataSurprises';

test('Focus monthly: medians by survey day and month, all-respondents base only', () => {
  const json = { value: [
    { Indicador: 'IPCA', Data: '2026-10-02', DataReferencia: '10/2026', Mediana: 0.35, baseCalculo: 0 },
    { Indicador: 'IPCA', Data: '2026-10-02', DataReferencia: '10/2026', Mediana: 0.4, baseCalculo: 1 },
    { Indicador: 'IPCA', Data: '2026-11-06', DataReferencia: '10/2026', Mediana: 0.38, baseCalculo: 0 },
    { Indicador: 'IPCA', Data: '2026-11-09', DataReferencia: '10/2026', Mediana: 0.39, baseCalculo: 0 },
    { Indicador: 'IGP-M', Data: '2026-11-06', DataReferencia: '10/2026', Mediana: 1, baseCalculo: 0 },
  ] };
  const e = parseFocusMonthly(json);
  assert.equal(e.length, 3);
  const out = parseSgsMonthly([{ data: '01/10/2026', valor: '0.45' }]);
  assert.deepEqual(out, [{ period: '2026-10', value: 0.45 }]);
  // The 7 November survey cut-off: the 9 November median came after it.
  assert.deepEqual(focusMatches(e, out), [{ period: '2026-10', expected: 0.38, expectedAt: '2026-11-06', actual: 0.45 }]);
  assert.deepEqual(parseFocusMonthly({}), []);
});

test('SPF rolling one-year horizon targets', () => {
  assert.equal(spfTargetMonth('2026Q1'), '2026-12');
  assert.equal(spfTargetMonth('2026-Q2'), '2027-03');
  assert.equal(spfTargetMonth('2026Q4'), '2027-09');
  assert.equal(spfTargetMonth('2026-13'), null);
  const m = spfMatches([{ date: '2025Q3', value: 2.0 }, { date: '2026Q3', value: 2.1 }], [{ period: '2026-06', value: 2.4 }]);
  assert.deepEqual(m, [{ period: '2026-06', expected: 2.0, expectedAt: '2025-07-01', actual: 2.4 }]);
});

test('BLS CPI month-on-month to one decimal; first-seen days kept', () => {
  const json = { Results: { series: [{ data: [{ year: '2026', period: 'M10', value: '330.0' }, { year: '2026', period: 'M09', value: '329.0' }, { year: '2026', period: 'M13', value: '1' }] }] } };
  const cpi = parseBlsCpi(json);
  assert.deepEqual(cpi, [{ period: '2026-10', value: 0.3 }]);
  const a = stampFirstSeen(undefined, cpi, '2026-11-13');
  const b = stampFirstSeen(a, [...cpi, { period: '2026-11', value: 0.2 }], '2026-12-10');
  assert.deepEqual(b.map((o) => o.firstSeen), ['2026-11-13', '2026-12-10']);
});

test('Kalshi ladder: period from the ticker, implied mean, only snapshots before the release count', () => {
  assert.equal(kalshiCpiPeriod('KXCPI-26OCT'), '2026-10');
  assert.equal(kalshiCpiPeriod('KXCPI'), null);
  const ladder = { markets: [
    { event_ticker: 'KXCPI-26NOV', floor_strike: 0.1, strike_type: 'greater', yes_bid: 88, yes_ask: 92 },
    { event_ticker: 'KXCPI-26NOV', floor_strike: 0.2, strike_type: 'greater', yes_bid: 48, yes_ask: 52 },
    { event_ticker: 'KXCPI-26NOV', floor_strike: 0.3, strike_type: 'greater', yes_bid: 8, yes_ask: 12 },
  ] };
  const [k] = kalshiImpliedMeans(ladder);
  assert.equal(k.period, '2026-11');
  assert.equal(k.strikes, 3);
  // 10% at 0.05, 40% at 0.15, 40% at 0.25, 10% at 0.35 -> 0.2
  assert.ok(Math.abs(k.mean - 0.2) < 1e-9);
  const snaps = [{ period: '2026-11', value: 0.2, at: '2026-12-09' }, { period: '2026-11', value: 0.25, at: '2026-12-10' }];
  assert.deepEqual(snapshotMatches(snaps, [{ period: '2026-11', value: 0.3, firstSeen: '2026-12-10' }]), [{ period: '2026-11', expected: 0.2, expectedAt: '2026-12-09', actual: 0.3 }]);
});

test('scaling: Missing until 8 earlier surprises, then surprise / spread of the earlier ones', () => {
  const matches = Array.from({ length: 10 }, (_, i) => ({ period: `2026-${String(i + 1).padStart(2, '0')}`, expected: 0, expectedAt: '2026-01-01', actual: i % 2 ? 0.1 : -0.1 }));
  const s = scoreSurprises({ source: 'focus', place: 'Brazil', indicator: 'IPCA', unit: 'pp' }, matches);
  assert.equal(s[7].scaled, undefined);
  assert.equal(s[8].priorCases, MIN_SPREAD_CASES);
  assert.ok(typeof s[8].scaled === 'number' && Math.abs(s[8].scaled + 0.94) < 0.02);
});

test('which series a country page gets, with reasons; nowcast from the forward record', () => {
  assert.deepEqual(surpriseSeriesFor('BRA', null, null, null).map((x) => [x.source, x.reason]), [['focus', 'the surprise inputs have not been downloaded yet (daily step world:surprises)']]);
  assert.equal(surpriseSeriesFor('DEU', null, null, null)[0].source, 'spf');
  assert.equal(surpriseSeriesFor('USA', { pulledAt: 'x', problems: [] }, null, null)[0].source, 'kalshi');
  assert.deepEqual(surpriseSeriesFor('IND', null, null, null), []);
  const calls = [{ test: 'gdp_nowcast v1', where: 'MEX', when: '2026Q2', forecast: { model: 0.4 }, at: '2026-07-20T00:00:00Z' }];
  const nm = nowcastMatches(calls, 'MEX', [{ period: '2026-Q2', value: 0.6 }])!;
  assert.deepEqual(nm, [{ period: '2026-Q2', expected: 0.4, expectedAt: '2026-07-20', actual: 0.6 }]);
  assert.equal(nowcastMatches(calls, 'BRA', []), null);
});

test('wiring: step, route, checks, licences, panel, translations', () => {
  assert.match(fs.readFileSync('server.ts', 'utf8'), /case 'world:surprises'/);
  assert.match(fs.readFileSync('src/server/routes/analysis.ts', 'utf8'), /\/api\/surprises\/:iso3/);
  const cc = fs.readFileSync('src/utils/connectionCheck.ts', 'utf8');
  for (const id of ['focus_monthly', 'bls_cpi']) assert.match(cc, new RegExp(`'${id}'`));
  assert.match(fs.readFileSync('src/data/dataLicences.ts', 'utf8'), /id: 'bls'/);
  assert.match(fs.readFileSync('src/components/CountryPage.tsx', 'utf8'), /import\('\.\/SurprisesPanel'\)/);
  for (const f of ['es', 'fr', 'pt']) {
    assert.match(fs.readFileSync(`src/i18n/${f}/panels.ts`, 'utf8'), /sp_method/);
    assert.match(fs.readFileSync(`src/i18n/${f}/panelText.ts`, 'utf8'), /no Kalshi CPI market snapshot saved yet/);
  }
});

test('R10 inflation surprise index: half-life weights, 3 needed, a year at most, inflation sources only', async () => {
  const { surpriseIndex } = await import('../src/utils/dataSurprises');
  const mk = (period: string, scaled: number) => ({ source: 'focus' as const, place: 'Brazil', indicator: 'IPCA', unit: 'pp', period, expected: 0, expectedAt: '', actual: 0, surprise: 0, scaled, priorCases: 8 });
  const series = [
    { source: 'focus' as const, sourceLabel: '', place: 'Brazil', indicator: '', unit: 'pp', surprises: [mk('2026-01', 1), mk('2026-02', 1), mk('2026-03', -2)] },
    { source: 'nowcast' as const, sourceLabel: '', place: 'BRA', indicator: '', unit: 'pp', surprises: [mk('2026-03', 9)] },
  ];
  const idx = surpriseIndex(series, '2026-05-15');
  // Releases on 10 Feb, 10 Mar, 10 Apr: the first month end with 3 is 30 April.
  assert.equal(idx[0].date, '2026-04-30');
  assert.equal(idx[0].n, 3);
  const w = (d: number) => Math.pow(0.5, d / 90);
  const expect = (w(79) * 1 + w(51) * 1 + w(20) * -2) / (w(79) + w(51) + w(20));
  assert.ok(Math.abs(idx[0].value - Math.round(expect * 100) / 100) < 1e-9);
  assert.equal(idx[idx.length - 1].date, '2026-05-15');
  assert.equal(surpriseIndex(series, '2027-06-01').pop()!.date, '2027-01-31', 'the last month end before the 10 February release turns a year old');
});

test('R10 test registered before the index, Today card loads on its own', () => {
  const m = JSON.parse(fs.readFileSync('docs/validation/pending/manifest.json', 'utf8'));
  assert.ok(m.files['surprise_index.json']);
  assert.match(fs.readFileSync('src/components/TodayPage.tsx', 'utf8'), /lazyNamed\(\(\) => import\('\.\/SurpriseIndexCard'\)/);
  assert.match(fs.readFileSync('src/server/routes/analysis.ts', 'utf8'), /\/api\/surprise-index/);
});
