import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

// An empty data folder, as on a first run (read by the downloads below).
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wages-housing-'));

const { bisPropertyAllUrl, buildWages, housePriceValue, iloEarningsUrl, parseBisPropertyAll, parseIloEarnings, parseWbInflation, wageGrowthValue, wageReading } = await import('../src/utils/wagesHousing.ts');
const { wagesHousingRows, economistBrief } = await import('../src/utils/countryNotes.ts');
const { parseBisProperty, bisCreditSeries } = await import('../src/utils/bisCreditCycle.ts');
const { buildBaselineOpenData } = await import('../src/data/presetsAndBaselines.ts');
const { figureHelp } = await import('../src/data/glossary.ts');
const { DATA_LICENCES } = await import('../src/data/dataLicences.ts');
const { planCouncil, runCouncil } = await import('../src/utils/askCouncil.ts');
const { checkConnections } = await import('../src/utils/connectionCheck.ts');
type Item = import('../src/types/council.ts').WatchlistItem;
type Run = import('../src/types/council.ts').CouncilAssessmentRun;

// ILOSTAT layout: codes, both sexes and by sex, several activity totals and currencies, a break.
const ILO = [
  'ref_area,source,indicator,sex,classif1,classif2,time,obs_value,obs_status,note_classif,note_indicator,note_source',
  'BRA,BA:123,EAR_4MTH_SEX_ECO_CUR_NB_A,SEX_T,ECO_AGGREGATE_TOTAL,CUR_TYPE_LCU,2023,2900,,,,',
  'BRA,BA:123,EAR_4MTH_SEX_ECO_CUR_NB_A,SEX_T,ECO_AGGREGATE_TOTAL,CUR_TYPE_LCU,2024,3190,,,,',
  'BRA,BA:123,EAR_4MTH_SEX_ECO_CUR_NB_A,SEX_T,ECO_SECTOR_TOTAL,CUR_TYPE_LCU,2024,9999,,,,',
  'BRA,BA:123,EAR_4MTH_SEX_ECO_CUR_NB_A,SEX_T,ECO_AGGREGATE_TOTAL,CUR_TYPE_USD,2024,600,,,,',
  'BRA,BA:123,EAR_4MTH_SEX_ECO_CUR_NB_A,SEX_F,ECO_AGGREGATE_TOTAL,CUR_TYPE_LCU,2024,2800,,,,',
  'BRA,BA:123,EAR_4MTH_SEX_ECO_CUR_NB_A,SEX_T,ECO_AGGREGATE_AGR,CUR_TYPE_LCU,2024,1500,,,,',
  'TUR,LFS,EAR_4MTH_SEX_ECO_CUR_NB_A,SEX_T,ECO_SECTOR_TOTAL,CUR_TYPE_LCU,2023,10000,,,,',
  'TUR,LFS,EAR_4MTH_SEX_ECO_CUR_NB_A,SEX_T,ECO_SECTOR_TOTAL,CUR_TYPE_LCU,2024,15000,B,,,',
  'KEN,LFS,EAR_4MTH_SEX_ECO_CUR_NB_A,SEX_T,ECO_AGGREGATE_TOTAL,CUR_TYPE_LCU,2021,25000,,,,',
  'X_WORLD,X,EAR_4MTH_SEX_ECO_CUR_NB_A,SEX_T,ECO_AGGREGATE_TOTAL,CUR_TYPE_LCU,2024,1,,,,',
].join('\r\n');
const WB = [{ page: 1 }, [{ countryiso3code: 'BRA', date: '2024', value: 4.4 }, { countryiso3code: 'BRA', date: '2023', value: 4.6 }, { countryiso3code: 'TUR', date: '2024', value: 58.5 }, { countryiso3code: '', date: '2024', value: 5 }]];
// BIS WS_SPP layout, as answered on 2026-11-07 (Brazil), plus one country with only a nominal row and one not in the catalogue.
const SPP = `FREQ,REF_AREA,VALUE,UNIT_MEASURE,UNIT_MULT,BREAKS,COVERAGE,TITLE_TS,TIME_PERIOD,OBS_VALUE,OBS_STATUS,OBS_CONF,OBS_PRE_BREAK
Q,BR,R,771,0,,,,2026-Q1,0.9362,A,F,
Q,BR,R,771,0,,,,2026-Q2,0.6215,A,F,
Q,BR,N,771,0,,,,2026-Q1,5.1,A,F,
Q,BR,N,771,0,,,,2026-Q2,5.2362,A,F,
Q,BR,N,628,0,,,,2026-Q2,221.6281,A,F,
Q,ZA,N,771,0,,,,2026-Q2,3.04,A,F,
Q,XM,R,771,0,,,,2026-Q2,1.0,A,F,`;

test('ILOSTAT: both sexes, local currency, the activity total; growth on the year before, real with World Bank inflation', () => {
  const e = parseIloEarnings(ILO)!;
  assert.deepEqual(Object.keys(e).sort(), ['BRA', 'KEN', 'TUR']);
  assert.equal(e.BRA['2024'].value, 3190, 'the aggregate total wins over the sector total');
  const w = buildWages(e, parseWbInflation(WB));
  assert.deepEqual(w.BRA, { year: '2024', monthly: 3190, nominalGrowthPct: 10, inflationPct: 4.4, realGrowthPct: 5.4 });
  assert.equal(wageGrowthValue(w.BRA, 'nominal'), '+10.0% on a year earlier (2024)');
  assert.equal(wageGrowthValue(w.BRA, 'real'), '+5.4% on a year earlier (2024)');
  assert.equal(w.TUR.growthNote, 'break');
  assert.equal(w.TUR.nominalGrowthPct, undefined);
  assert.equal(w.KEN.growthNote, 'no_previous_year');
  assert.equal(wageReading({ '2023': { value: 100, brk: false }, '2024': { value: 90, brk: false } }, undefined)!.growthNote, 'no_inflation');
  assert.equal(parseIloEarnings('country,year\nBRA,2024'), null, 'not the ILOSTAT layout');
  assert.match(iloEarningsUrl(2018), /rplumber\.ilo\.org\/data\/indicator\?id=EAR_4MTH_SEX_ECO_CUR_NB_A&sex=SEX_T&timefrom=2018/);
});

test('BIS: all countries in one answer; the latest quarter with both figures; catalogue countries only', () => {
  const all = parseBisPropertyAll(SPP);
  assert.deepEqual(all.BRA, { quarter: '2026Q2', realYoyPct: 0.6, nominalYoyPct: 5.2 });
  assert.deepEqual(all.ZAF, { quarter: '2026Q2', nominalYoyPct: 3 });
  assert.equal(Object.keys(all).length, 2);
  assert.equal(housePriceValue(all.BRA, 'real'), '+0.6% on a year earlier (2026 Q2)');
  assert.equal(housePriceValue(all.ZAF, 'real'), undefined);
  assert.match(bisPropertyAllUrl(2023), /WS_SPP\/Q\.\.N\+R\.771\/all\?format=csv&startPeriod=2023$/);
  // History & data: the nominal series next to the real one.
  const p = parseBisProperty(SPP.split('\n').filter((l) => !/^Q,(ZA|XM),/.test(l)).join('\n'));
  assert.deepEqual(p.nominalHousePricesYoy, { '2026Q1': 5.1, '2026Q2': 5.2362 });
  const nom = bisCreditSeries({ fetchedAt: '2026-11-11T00:00:00Z', ...p }, true).find((s) => s.id === 'house_prices_nominal_yoy');
  assert.ok(nom && 'points' in nom && nom.points.length === 2);
});

const run = (tweak: (s: ReturnType<typeof buildBaselineOpenData>) => void) => {
  const s = buildBaselineOpenData('BRA');
  s.dataStatus = { verifiedLiveSources: [], checkedAt: '2026-11-11T12:00:00Z' };
  s.liveFields = {};
  tweak(s);
  return s;
};

test('brief rows under Growth and inflation: the year or quarter, or Missing with a reason', () => {
  const w = buildWages(parseIloEarnings(ILO), parseWbInflation(WB));
  const h = parseBisPropertyAll(SPP);
  const s = run((x) => {
    x.wages = { pulledAt: '2026-11-10T03:00:00Z', reading: w.BRA };
    x.housePrices = { pulledAt: '2026-11-10T03:00:00Z', reading: h.BRA };
  });
  const g = economistBrief({ iso3: 'BRA', countryName: 'Brazil', openData: s } as unknown as Run).groups.find((x) => x.title === 'Growth and inflation')!;
  const by = (l: string) => g.rows.find((r) => r.label === l)!;
  assert.equal(by('Wage growth, nominal').value, '+10.0% on a year earlier (2024)');
  assert.match(by('Wage growth, nominal').source, /ILOSTAT.*CC BY 4\.0/);
  assert.equal(by('Wage growth, real').value, '+5.4% on a year earlier (2024); inflation 4.4%');
  assert.equal(by('Wage growth, real').verified, false, 'worked out by the app');
  assert.equal(by('House prices, real').value, '+0.6% on a year earlier (2026 Q2)');
  assert.equal(by('House prices, nominal').value, '+5.2% on a year earlier (2026 Q2)');
  for (const r of g.rows.slice(-4)) assert.ok(figureHelp(r.label), r.label);

  const none = wagesHousingRows(run(() => {}));
  assert.ok(none.every((r) => r.missing));
  assert.equal(none[0].source, 'ILOSTAT not downloaded yet');
  assert.equal(none[2].source, 'BIS file not downloaded yet');
  const brk = wagesHousingRows(run((x) => { x.wages = { pulledAt: 'x', reading: w.TUR }; x.housePrices = { pulledAt: 'x' }; }));
  assert.equal(brk[0].source, 'Break in the series');
  assert.equal(brk[2].source, 'Not in the BIS series');
  assert.equal(wagesHousingRows(run((x) => (x.wages = { pulledAt: 'x' })))[0].source, 'Not in ILOSTAT');
  assert.equal(wagesHousingRows(run((x) => (x.wages = { pulledAt: 'x', reading: w.KEN })))[1].source, 'No figure for the year before');
});

test('the council: the Central Bank Agent quotes nominal pay and real house prices, the Politics Agent real pay', () => {
  const w = buildWages(parseIloEarnings(ILO), parseWbInflation(WB));
  const item = {
    iso3: 'BRA', countryName: 'Brazil', policyRatePct: 15, cpiInflationPct: 4.4, cpiSource: 'live', policyRateSource: 'bis',
    wages: { pulledAt: 'x', reading: w.BRA }, housePrices: { pulledAt: 'x', reading: parseBisPropertyAll(SPP).BRA },
    politics: { stability: { percentile: 40, year: '2024' } },
  } as unknown as Item;
  const q = 'Will Brazil cut rates, and is there a risk of unrest?';
  const agents = runCouncil(q, planCouncil(q, [item]), [item]);
  const cb = agents.find((a) => a.id === 'cb')?.findings[0]?.figures || [];
  assert.ok(cb.some((f) => f.label === 'Wage growth, nominal' && f.value.startsWith('+10.0%')), 'cb nominal wages');
  assert.ok(cb.some((f) => f.label === 'House prices, real'), 'cb house prices');
  const pol = agents.find((a) => a.id === 'politics')?.findings[0]?.figures || [];
  assert.ok(pol.some((f) => f.label === 'Wage growth, real' && f.tag === 'model'), 'politics real wages');
});

test('licence row and Data health rows', async () => {
  const lic = DATA_LICENCES.find((r) => r.id === 'ilostat')!;
  assert.equal(lic.status, 'open');
  assert.equal(lic.share, 'allowed');
  const fetchFn = async (url: string) =>
    new Response(url.includes('rplumber.ilo.org') ? ILO : url.includes('WS_SPP') ? SPP : '[]', { status: 200 });
  const rep = await checkConnections({ env: {}, only: ['ilostat_wages', 'bis_property'], fetchFn } as never);
  const ilo = rep.results.find((r) => r.id === 'ilostat_wages')!;
  assert.equal(ilo.state, 'connected');
  assert.match(ilo.sample || '', /Brazil average monthly earnings 3,190 in local currency \(2024\), \+10\.0%/);
  const bis = rep.results.find((r) => r.id === 'bis_property')!;
  assert.equal(bis.state, 'connected');
  assert.match(bis.sample || '', /\+0\.6% real, \+5\.2% nominal .*2026 Q2/);
  const bad = await checkConnections({ env: {}, only: ['ilostat_wages'], fetchFn: async () => new Response('a,b\n1,2', { status: 200 }) } as never);
  assert.equal(bad.results[0].state, 'bad_reply');
});

test('the downloads: saved to data/live, kept, read back from disk', async () => {
  const mod = await import('../src/server/feeds/wagesHousing.ts');
  mod.resetWagesHousingForTests();
  const asked: string[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (input: unknown) => {
    const url = String(input);
    asked.push(url);
    return new Response(url.includes('rplumber') ? ILO : url.includes('worldbank') ? JSON.stringify(WB) : SPP, { status: 200 });
  }) as typeof fetch;
  try {
    const w = (await mod.fetchWagesPull())!;
    assert.equal(w.countries.BRA.realGrowthPct, 5.4);
    const h = (await mod.fetchHousePricesPull())!;
    assert.equal(h.countries.BRA.nominalYoyPct, 5.2);
    assert.equal(asked.length, 3);
    await mod.fetchWagesPull();
    await mod.fetchHousePricesPull();
    assert.equal(asked.length, 3, 'fresh copies are not downloaded again');
    assert.ok(fs.existsSync(path.join(process.env.DATA_DIR!, 'live', 'ilostat-wages.json')));
    mod.resetWagesHousingForTests();
    assert.equal(mod.loadHousePrices()!.countries.BRA.realYoyPct, 0.6, 'read back from disk');
    assert.equal(mod.loadWages()!.countries.KEN.growthNote, 'no_previous_year');
  } finally {
    globalThis.fetch = realFetch;
  }
});
