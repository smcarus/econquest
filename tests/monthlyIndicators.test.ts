import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

// An empty data folder, as on a first run (read by the download below).
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'monthly-activity-'));

const mi = await import('../src/utils/monthlyIndicators.ts');
const { monthlyActivityRows, economistBrief } = await import('../src/utils/countryNotes.ts');
const { buildBaselineOpenData } = await import('../src/data/presetsAndBaselines.ts');
const { figureHelp } = await import('../src/data/glossary.ts');
const { DATA_LICENCES } = await import('../src/data/dataLicences.ts');
const { nextOfficialEvent, releaseGap } = await import('../src/data/officialCalendar.ts');
const { seriesTags } = await import('../src/utils/seriesDefinitions.ts');
const { planCouncil, runCouncil } = await import('../src/utils/askCouncil.ts');
const { checkConnections } = await import('../src/utils/connectionCheck.ts');
type Item = import('../src/types/council.ts').WatchlistItem;
type Run = import('../src/types/council.ts').CouncilAssessmentRun;
type Series = import('../src/utils/seriesHistory.ts').Series;

// Fourteen months, Aug 2025 to Sep 2026.
const MONTHS = Array.from({ length: 14 }, (_, i) => {
  const t = 2025 * 12 + 7 + i;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
});

// Eurostat JSON-stat layout: every filtered dimension of size 1, then geo and time.
function eurostat(values: Record<string, number[]>): unknown {
  const geos = Object.keys(values);
  const value: Record<string, number> = {};
  geos.forEach((g, gi) => values[g].forEach((v, ti) => (value[String(gi * MONTHS.length + ti)] = v)));
  return {
    id: ['freq', 'indic_bt', 'nace_r2', 's_adj', 'unit', 'geo', 'time'],
    size: [1, 1, 1, 1, 1, geos.length, MONTHS.length],
    value,
    dimension: {
      geo: { category: { index: Object.fromEntries(geos.map((g, i) => [g, i])) } },
      time: { category: { index: Object.fromEntries(MONTHS.map((m, i) => [m, i])) } },
    },
  };
}
const ramp = (start: number, step: number) => MONTHS.map((_, i) => Number((start + step * i).toFixed(2)));
const EU_IP = eurostat({ DE: ramp(100, 0.2), PL: ramp(110, 0.5) });
const EU_RETAIL = eurostat({ DE: ramp(98, 0.1) });
const EU_UNEMP = eurostat({ DE: ramp(3.2, 0.05), PL: ramp(2.9, 0) });
const ONS = { months: [{ date: '2014 DEC', value: '90' }, ...MONTHS.map((m, i) => ({ date: `${m.slice(0, 4)} ${['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][Number(m.slice(5)) - 1]}`, value: String(100 + i) })), { date: '2026 Q3', value: '1' }, { date: '2026 OCT', value: '' }] };
const BCB = MONTHS.map((m, i) => ({ data: `01/${m.slice(5)}/${m.slice(0, 4)}`, valor: String(7 - i * 0.1).replace('.', ',') }));
const FRED_CSV = `observation_date,UNRATE\n${MONTHS.map((m, i) => `${m}-01,${(4 + i * 0.05).toFixed(2)}`).join('\n')}\n2026-10-01,.`;

test('parsers: Eurostat, ONS, BCB and FRED become monthly series; blanks and other periods stay out', () => {
  assert.match(mi.eurostatActivityUrl('retail', ['DE']), /sts_trtu_m\?format=JSON&lang=EN&indic_bt=VOL_SLS&nace_r2=G47&s_adj=SCA&unit=I21&geo=DE&sinceTimePeriod=2015-01$/);
  assert.match(mi.eurostatActivityUrl('unemp', ['DE', 'PL']), /une_rt_m\?.*s_adj=SA&age=TOTAL&sex=T&unit=PC_ACT&geo=DE&geo=PL/);
  const ip = mi.parseEurostatActivity('ip', EU_IP, ['DEU', 'POL', 'FRA']);
  assert.deepEqual(Object.keys(ip).sort(), ['DEU', 'POL']);
  assert.equal(ip.DEU.points.length, 14);
  assert.equal(ip.DEU.unit, 'index, 2021 = 100');
  const ons = mi.parseOnsSeries('ip', ONS)!;
  assert.equal(ons.points[0].period, '2025-08', 'before 2015 and quarters left out');
  assert.equal(ons.points.length, 14, 'a blank month stays out');
  assert.equal(mi.onsActivityUrl('unemp'), 'https://www.ons.gov.uk/employmentandlabourmarket/peoplenotinwork/unemployment/timeseries/mgsx/lms/data');
  assert.equal(mi.parseOnsSeries('ip', { nope: 1 }), null);
  const bcb = mi.parseBcbActivity('unemp', BCB)!;
  assert.equal(bcb.points.at(-1)!.value, 5.7);
  assert.equal(bcb.adjusted, false);
  assert.match(mi.bcbActivityUrl('retail'), /bcdata\.sgs\.1455\/dados\?formato=json&dataInicial=01%2F01%2F2015$/);
  const fred = mi.fredToSeries('unemp', [{ date: '2026-09-01', value: 4.4 }, { date: '2026-09-15', value: 9 }]);
  assert.deepEqual(fred!.points, [{ period: '2026-09', value: 4.4 }]);
  assert.equal(mi.fredToSeries('ip', []), null);
});

test('readings: change on a year and on the month for indexes; the rate a year earlier; no month change where adjustment is not stated', () => {
  const ip = mi.indicatorReading('ip', mi.parseEurostatActivity('ip', EU_IP, ['DEU']).DEU)!;
  assert.equal(ip.period, '2026-09');
  assert.equal(ip.yoy, 2.4); // 102.6 against 100.2
  assert.equal(ip.mom, 0.2);
  assert.equal(mi.readingValue('ip', ip), '+2.4% on a year earlier, +0.2% on the month (Sep 2026)');
  const un = mi.indicatorReading('unemp', mi.parseEurostatActivity('unemp', EU_UNEMP, ['DEU']).DEU)!;
  assert.equal(mi.readingValue('unemp', un), '3.9% (Sep 2026); 3.3% a year earlier');
  const br = mi.indicatorReading('retail', mi.parseBcbActivity('retail', BCB)!)!;
  assert.equal(br.mom, undefined);
  assert.ok(br.yoy !== undefined);
  const short = mi.indicatorReading('ip', { points: [{ period: '2026-09', value: 101 }], source: 'ons', long: 'x', unit: 'index' })!;
  assert.equal(mi.readingValue('ip', short), '101.0, index (Sep 2026)');
});

const pull = (): import('../src/utils/monthlyIndicators.ts').MonthlyIndicatorsPull => ({
  pulledAt: '2026-11-12T03:00:00Z',
  countries: {
    DEU: { ip: mi.parseEurostatActivity('ip', EU_IP, ['DEU']).DEU, unemp: mi.parseEurostatActivity('unemp', EU_UNEMP, ['DEU']).DEU },
    USA: { unemp: mi.fredToSeries('unemp', MONTHS.map((m, i) => ({ date: `${m}-01`, value: 4 + i * 0.05 })))! },
  },
});
const run = (iso3: string, tweak: (s: ReturnType<typeof buildBaselineOpenData>) => void = () => {}) => {
  const s = buildBaselineOpenData(iso3);
  s.dataStatus = { verifiedLiveSources: [], checkedAt: '2026-11-12T12:00:00Z' };
  s.liveFields = {};
  tweak(s);
  return s;
};

test('brief: a Monthly activity group with the month, Missing with a reason, and the next release from the calendar', () => {
  const s = run('DEU', (x) => (x.monthlyActivity = mi.activitySnapshot(pull(), 'DEU')));
  const g = economistBrief({ iso3: 'DEU', countryName: 'Germany', openData: s } as unknown as Run, new Date('2026-11-12T12:00:00Z')).groups.find((x) => x.title === 'Monthly activity')!;
  const by = (l: string) => g.rows.find((r) => r.label === l)!;
  assert.equal(by('Industrial production').value, '+2.4% on a year earlier, +0.2% on the month (Sep 2026)');
  assert.match(by('Industrial production').source, /^official, Eurostat industrial production/);
  assert.equal(by('Retail sales').source, 'Not in the Eurostat answer');
  assert.equal(by('Next monthly activity release').source, "Eurostat's release calendar builds its list in the browser, so its dates could not be read.");
  for (const r of g.rows) assert.ok(figureHelp(r.label), r.label);

  const none = monthlyActivityRows('DEU', run('DEU'));
  assert.ok(none.every((r) => r.missing && r.value === 'Missing'));
  assert.equal(none[0].source, 'Eurostat not downloaded yet');
  const notCovered = economistBrief({ iso3: 'JPN', countryName: 'Japan', openData: run('JPN') } as unknown as Run).groups.find((x) => x.title === 'Monthly activity')!;
  assert.equal(notCovered.rows.length, 3, 'no release row where no source is connected');
  assert.equal(notCovered.rows[0].source, 'No monthly source for this country');

  const us = economistBrief({ iso3: 'USA', countryName: 'United States', openData: run('USA', (x) => (x.monthlyActivity = mi.activitySnapshot(pull(), 'USA'))) } as unknown as Run, new Date('2026-11-12T12:00:00Z'));
  const rel = us.groups.find((x) => x.title === 'Monthly activity')!.rows.find((r) => r.label === 'Next monthly activity release')!;
  assert.match(rel.value, /2026-11-17|17 Nov/);
  assert.equal(rel.verified, true);
});

test('release calendar: US dates from the Fed, Census and BLS pages; reasons where a calendar could not be read', () => {
  const now = new Date('2026-11-18T12:00:00Z');
  assert.equal(nextOfficialEvent('USA', 'ACTIVITY_RELEASE', now)!.date, '2026-12-04');
  assert.equal(nextOfficialEvent('USA', 'ACTIVITY_RELEASE', now)!.sourceUrl, 'https://www.bls.gov/schedule/news_release/empsit.htm');
  assert.match(releaseGap('BRA', 'ACTIVITY_RELEASE'), /IBGE/);
  assert.match(releaseGap('GBR', 'ACTIVITY_RELEASE'), /ONS/);
  assert.match(releaseGap('JPN', 'ACTIVITY_RELEASE'), /No monthly activity source/);
});

test('History & data: three monthly series with tags, or Missing with the reason', () => {
  const [ip, retail, unemp] = mi.monthlyIndicatorSeries('DEU', pull());
  assert.ok('points' in ip && ip.points.length === 14 && ip.id === 'industrial_production');
  assert.equal((retail as { reason: string }).reason, 'Eurostat gave no retail sales for this country');
  assert.equal(seriesTags(unemp as Series).seasonalAdjustment, 'Seasonally adjusted');
  assert.equal(seriesTags(ip as Series).seasonalAdjustment, 'Seasonally and calendar adjusted');
  assert.equal(seriesTags({ id: 'retail_sales', source: mi.US_ACTIVITY.retail.long }).currency, 'US dollars at market exchange rates');
  assert.equal(seriesTags({ id: 'retail_sales', source: mi.BCB_ACTIVITY.retail.long }).seasonalAdjustment, 'Not stated by the source');
  assert.equal((mi.monthlyIndicatorSeries('JPN', pull())[0] as { reason: string }).reason, 'No free monthly source connected for this country yet');
  assert.equal((mi.monthlyIndicatorSeries('GBR', null)[0] as { reason: string }).reason, 'Office for National Statistics not downloaded yet');
});

test('the council: the Central Bank Agent quotes industrial production and the monthly unemployment rate', () => {
  const item = { iso3: 'DEU', countryName: 'Germany', policyRatePct: 2, cpiInflationPct: 2.1, cpiSource: 'live', policyRateSource: 'bis', monthlyActivity: mi.activitySnapshot(pull(), 'DEU') } as unknown as Item;
  const q = 'Will the ECB cut rates for Germany?';
  const cb = runCouncil(q, planCouncil(q, [item]), [item]).find((a) => a.id === 'cb')?.findings[0]?.figures || [];
  assert.ok(cb.some((f) => f.label === 'Industrial production' && f.value.startsWith('+2.4%') && f.tag === 'official'));
  assert.ok(cb.some((f) => f.label === 'Unemployment rate, monthly'));
});

test('licence row and Data health rows', async () => {
  const ons = DATA_LICENCES.find((r) => r.id === 'ons')!;
  assert.equal(ons.status, 'open');
  assert.equal(ons.share, 'allowed');
  const fetchFn = async (url: string) =>
    new Response(url.includes('eurostat') ? JSON.stringify(EU_RETAIL) : url.includes('ons.gov.uk') ? JSON.stringify(ONS) : JSON.stringify(BCB), { status: 200 });
  const rep = await checkConnections({ env: {}, only: ['eurostat_activity', 'ons_activity', 'bcb_activity'], fetchFn } as never);
  const row = (id: string) => rep.results.find((r) => r.id === id)!;
  for (const id of ['eurostat_activity', 'ons_activity', 'bcb_activity']) assert.equal(row(id).state, 'connected', id);
  assert.match(row('eurostat_activity').sample || '', /Germany retail trade volume index 99\.3 \(Sep 2026\)/);
  assert.match(row('bcb_activity').sample || '', /Brazil unemployment rate 5\.7% \(Sep 2026\)/);
  const bad = await checkConnections({ env: {}, only: ['ons_activity'], fetchFn: async () => new Response('<html></html>', { status: 200 }) } as never);
  assert.equal(bad.results[0].state, 'bad_reply');
});

test('the download: every source in one copy in data/live, kept when a later run fails', async () => {
  const mod = await import('../src/server/feeds/monthlyIndicators.ts');
  mod.resetMonthlyIndicatorsForTests();
  const asked: string[] = [];
  const realFetch = globalThis.fetch;
  let down = false;
  globalThis.fetch = (async (input: unknown) => {
    const url = String(input);
    asked.push(url);
    if (down) return new Response('busy', { status: 503 });
    if (url.includes('sts_inpr_m')) return new Response(JSON.stringify(EU_IP), { status: 200 });
    if (url.includes('sts_trtu_m')) return new Response(JSON.stringify(EU_RETAIL), { status: 200 });
    if (url.includes('une_rt_m')) return new Response(JSON.stringify(EU_UNEMP), { status: 200 });
    if (url.includes('ons.gov.uk')) return new Response(JSON.stringify(ONS), { status: 200 });
    if (url.includes('bcb.gov.br')) return new Response(JSON.stringify(BCB), { status: 200 });
    if (url.includes('fredgraph')) return new Response(FRED_CSV, { status: 200 });
    return new Response('', { status: 404 });
  }) as typeof fetch;
  try {
    const p = (await mod.fetchMonthlyIndicators())!;
    assert.equal(p.countries.DEU.retail!.points.length, 14);
    assert.equal(p.countries.POL.ip!.source, 'eurostat');
    assert.equal(p.countries.GBR.unemp!.source, 'ons');
    assert.equal(p.countries.BRA.ip!.source, 'bcb');
    assert.equal(p.countries.USA.unemp!.points.at(-1)!.period, '2026-09');
    assert.ok(fs.existsSync(path.join(process.env.DATA_DIR!, 'live', 'monthly-indicators.json')));
    const n = asked.length;
    await mod.fetchMonthlyIndicators();
    assert.equal(asked.length, n, 'a fresh copy is not downloaded again');
    down = true;
    const again = (await mod.fetchMonthlyIndicators({ force: true }))!;
    assert.equal(again.countries.DEU.ip!.points.length, 14, 'a failed run keeps the saved copy');
    mod.resetMonthlyIndicatorsForTests();
    assert.equal(mod.loadMonthlyIndicators()!.countries.GBR.ip!.points.length, 14, 'read back from disk');
  } finally {
    globalThis.fetch = realFetch;
  }
});
