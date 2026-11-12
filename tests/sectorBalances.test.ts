import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

// An empty data folder, as on a first run (read by the download below).
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'sector-balances-'));

const { bisPrivateDebtAllUrl, bisPrivateDebtUrl, parseBisPrivateDebt, parseBisPrivateDebtAll, privateDebtSeries, sectorBalanceSeries, sectorBalances } = await import('../src/utils/sectorBalances.ts');
const { sectorRows, economistBrief } = await import('../src/utils/countryNotes.ts');
const { getSnapshotDataStatus } = await import('../src/utils/dataStatus.ts');
const { buildBaselineOpenData } = await import('../src/data/presetsAndBaselines.ts');
const { figureHelp } = await import('../src/data/glossary.ts');
const { planCouncil, runCouncil } = await import('../src/utils/askCouncil.ts');
const { checkConnections } = await import('../src/utils/connectionCheck.ts');
type Item = import('../src/types/council.ts').WatchlistItem;
type Run = import('../src/types/council.ts').CouncilAssessmentRun;
type Series = import('../src/utils/seriesHistory.ts').Series;

// BIS WS_TC layout: households (H) and companies (N), all lenders (A), market value, % of GDP (770),
// adjusted for breaks; plus rows the app must skip (banks only, US dollars, a country not in the catalogue).
const TC = `FREQ,BORROWERS_CTY,TC_BORROWERS,TC_LENDERS,VALUATION,UNIT_TYPE,TC_ADJUST,TIME_FORMAT,TITLE_TS,TIME_PERIOD,OBS_VALUE,OBS_STATUS,OBS_CONF,OBS_PRE_BREAK
Q,BR,H,A,M,770,A,P3M,,2026-Q1,36.84,A,F,
Q,BR,H,A,M,770,A,P3M,,2026-Q2,37.12,A,F,
Q,BR,N,A,M,770,A,P3M,,2026-Q1,53.0,A,F,
Q,BR,N,A,M,770,A,P3M,,2026-Q2,53.46,A,F,
Q,BR,N,B,M,770,A,P3M,,2026-Q2,30.1,A,F,
Q,BR,N,A,M,799,A,P3M,,2026-Q2,999,A,F,
Q,ZA,H,A,M,770,A,P3M,,2026-Q1,33.2,A,F,
Q,ZA,N,A,M,770,A,P3M,,2026-Q1,31.0,A,F,
Q,ZA,H,A,M,770,A,P3M,,2026-Q2,33.4,A,F,
Q,XM,H,A,M,770,A,P3M,,2026-Q2,55,A,F,
Q,TR,N,A,M,770,A,P3M,,2026-Q2,NaN,A,F,`;

const imfSnapshot = (tweak: (s: ReturnType<typeof buildBaselineOpenData>) => void = () => {}) => {
  const s = buildBaselineOpenData('BRA');
  s.dataStatus = { verifiedLiveSources: [], checkedAt: '2026-11-12T00:00:00Z' };
  s.liveFields = {};
  tweak(s);
  return s;
};
const liveImf = (gov: number, ca: number, yGov = '2025', yCa = '2025') => (s: ReturnType<typeof buildBaselineOpenData>) => {
  s.imfIndicators.overallBalancePct = gov;
  s.imfIndicators.currentAccountImfPct = ca;
  s.imfIndicators.years = { 'imf.overallBalancePct': yGov, 'imf.currentAccountImfPct': yCa };
  s.liveFields = { 'imf.overallBalancePct': 'IMF Fiscal Monitor', 'imf.currentAccountImfPct': 'IMF WEO' };
};

test('sector balances: government + private = current account, foreign = minus the current account, same year only', () => {
  const sb = sectorBalances(-7.6, -2.8, '2025', '2025')!;
  assert.deepEqual(sb, { year: '2025', governmentPct: -7.6, currentAccountPct: -2.8, foreignPct: 2.8, privatePct: 4.8 });
  assert.equal(Number((sb.governmentPct + sb.privatePct).toFixed(1)), sb.currentAccountPct, 'the identity holds');
  assert.equal(sectorBalances(-7.6, -2.8, '2025', '2024'), undefined, 'different years');
  assert.equal(sectorBalances(undefined, -2.8, '2025', '2025'), undefined);
  assert.equal(sectorBalances(-7.6, Number.NaN, '2025', '2025'), undefined);
});

test('sector balance series: years in common only, IMF projections stay marked; Missing with the reason', () => {
  const s = (id: string, points: Series['points']): Series => ({ id, label: id, unit: '% of GDP', freq: 'annual', source: id === 'gov' ? 'IMF Fiscal Monitor' : 'IMF WEO', pulledAt: '2026-11-12', points });
  const gov = s('gov', [{ date: '2024', value: -6.5 }, { date: '2025', value: -7.6 }, { date: '2026', value: -8, note: 'IMF projection' }]);
  const ca = s('ca', [{ date: '2023', value: -1.3 }, { date: '2024', value: -2.6 }, { date: '2025', value: -2.8 }, { date: '2026', value: -2.5, note: 'IMF projection' }]);
  const [priv, foreign] = sectorBalanceSeries(gov, ca) as Series[];
  assert.equal(priv.id, 'private_balance');
  assert.deepEqual(priv.points, [{ date: '2024', value: 3.9 }, { date: '2025', value: 4.8 }, { date: '2026', value: 5.5, note: 'IMF projection' }]);
  assert.match(priv.about!, /remainder of an accounting identity/);
  assert.equal(foreign.points.length, 4);
  assert.deepEqual(foreign.points[0], { date: '2023', value: 1.3 });
  const noGov = sectorBalanceSeries({ id: 'overall_balance', label: 'x', reason: 'IMF did not answer' }, ca);
  assert.match((noGov[0] as { reason: string }).reason, /^Needs the IMF overall fiscal balance series: iMF did not answer$/);
  assert.ok('points' in noGov[1], 'the foreign balance needs only the current account');
  const none = sectorBalanceSeries(undefined, undefined);
  assert.ok(none.every((x) => 'reason' in x));
});

test('BIS total credit: one country with full history; all countries with the latest quarter; catalogue countries only', () => {
  assert.match(bisPrivateDebtUrl('BR'), /WS_TC\/Q\.BR\.H\+N\.A\.M\.770\.A\/all\?format=csv$/);
  assert.match(bisPrivateDebtAllUrl(2023), /WS_TC\/Q\.\.H\+N\.A\.M\.770\.A\/all\?format=csv&startPeriod=2023$/);
  const one = parseBisPrivateDebt(TC.split('\n').filter((l, i) => i === 0 || l.startsWith('Q,BR,')).join('\n'));
  assert.deepEqual(one.householdDebt, { '2026Q1': 36.84, '2026Q2': 37.12 });
  assert.deepEqual(one.corporateDebt, { '2026Q1': 53, '2026Q2': 53.46 }, 'banks-only and other units skipped');
  const all = parseBisPrivateDebtAll(TC);
  assert.deepEqual(all.BRA, { quarter: '2026Q2', householdPct: 37.1, corporatePct: 53.5 });
  assert.deepEqual(all.ZAF, { quarter: '2026Q1', householdPct: 33.2, corporatePct: 31 }, 'the latest quarter with both figures');
  assert.equal(all.TUR, undefined, 'NaN is not a figure');
  assert.equal(Object.keys(all).length, 2);
  assert.deepEqual(parseBisPrivateDebtAll('<html>blocked</html>'), {});
});

test('History & data: quarterly debt series, or Missing with the reason', () => {
  const [h, c] = privateDebtSeries({ fetchedAt: '2026-11-12', ...parseBisPrivateDebt(TC.split('\n').filter((l, i) => i === 0 || l.startsWith('Q,BR,')).join('\n')) }, true) as Series[];
  assert.equal(h.id, 'household_debt');
  assert.equal(h.freq, 'quarterly');
  assert.deepEqual(h.points.map((p) => p.date), ['2026Q1', '2026Q2']);
  assert.equal(c.label, 'Company debt');
  assert.equal((privateDebtSeries(null, false)[0] as { reason: string }).reason, 'Not a BIS reporting country in the catalogue');
  assert.equal((privateDebtSeries(null, true)[0] as { reason: string }).reason, 'The BIS has not answered yet');
  assert.match((privateDebtSeries({ fetchedAt: 'x', householdDebt: { '2026Q2': 1 } }, true)[1] as { reason: string }).reason, /no company debt series/);
});

test('brief rows: balances for one IMF year, debt by quarter; Missing with a reason, never a number', () => {
  const debt = parseBisPrivateDebtAll(TC);
  const s = imfSnapshot((x) => {
    liveImf(-7.6, -2.8)(x);
    x.privateDebt = { pulledAt: '2026-11-12T03:00:00Z', reading: debt.BRA };
  });
  const g = economistBrief({ iso3: 'BRA', countryName: 'Brazil', openData: s } as unknown as Run).groups.find((x) => x.title === 'Sector balances and private debt')!;
  const by = (l: string) => g.rows.find((r) => r.label === l)!;
  assert.equal(by('Government balance').value, '-7.6% of GDP (2025)');
  assert.equal(by('Government balance').verified, true);
  assert.equal(by('Private sector balance (remainder)').value, '+4.8% of GDP (2025)');
  assert.equal(by('Private sector balance (remainder)').verified, false, 'worked out by the app');
  assert.match(by('Private sector balance (remainder)').source, /remainder of the identity/);
  assert.equal(by('Foreign balance').value, '+2.8% of GDP (2025)');
  assert.equal(by('Household debt').value, '37.1% of GDP (2026 Q2)');
  assert.equal(by('Company debt').value, '53.5% of GDP (2026 Q2)');
  assert.match(by('Company debt').source, /BIS total credit statistics/);
  for (const r of g.rows) assert.ok(figureHelp(r.label), r.label);

  const rows = (tweak: (x: ReturnType<typeof buildBaselineOpenData>) => void) => {
    const o = imfSnapshot(tweak);
    return sectorRows(getSnapshotDataStatus(o), o);
  };
  const none = rows(() => {});
  assert.ok(none.every((r) => r.missing && r.value === 'Missing'));
  assert.equal(none[3].source, 'BIS file not downloaded yet');
  const mixed = rows(liveImf(-7.6, -2.8, '2025', '2024'));
  assert.equal(mixed[1].source, 'IMF figures are for different years');
  const noCa = rows((x) => {
    liveImf(-7.6, -2.8)(x);
    delete (x.liveFields as Record<string, string>)['imf.currentAccountImfPct'];
  });
  assert.equal(noCa[1].source, 'Needs a live IMF current account');
  const notCovered = rows((x) => (x.privateDebt = { pulledAt: 'x' }));
  assert.equal(notCovered[4].source, 'Not in the BIS total credit series');
});

test('the council: the Fiscal & Debt Agent quotes the private balance and private debt when on hand', () => {
  const item = (extra: object) => ({ iso3: 'BRA', countryName: 'Brazil', fiscal: { debtPctGdp: { value: 87, year: '2025' } }, ...extra }) as unknown as Item;
  const q = 'Is Brazil debt sustainable?';
  const withAll = item({ sectorBalances: sectorBalances(-7.6, -2.8, '2025', '2025'), privateDebt: { pulledAt: 'x', reading: parseBisPrivateDebtAll(TC).BRA } });
  const f = runCouncil(q, planCouncil(q, [withAll]), [withAll]).find((a) => a.id === 'fiscal')!.findings[0];
  const fig = (l: string) => f.figures.find((x) => x.label === l);
  assert.equal(fig('Private sector balance (remainder)')!.tag, 'model');
  assert.equal(fig('Household debt')!.value, '37.1% of GDP (2026 Q2)');
  assert.equal(fig('Company debt')!.tag, 'official');
  assert.match(f.reading, /In 2025 the private sector saved more than it invested \(\+4\.8% of GDP\), and the rest of the world lent the country 2\.8% of GDP\./);
  const bare = item({});
  const b = runCouncil(q, planCouncil(q, [bare]), [bare]).find((a) => a.id === 'fiscal')!.findings[0];
  assert.ok(!b.figures.some((x) => /Private sector|Household debt|Company debt/.test(x.label)));
});

test('Data health row', async () => {
  const rep = await checkConnections({ env: {}, only: ['bis_private_debt'], fetchFn: async () => new Response(TC, { status: 200 }) } as never);
  assert.equal(rep.results[0].state, 'connected');
  assert.match(rep.results[0].sample || '', /Brazil household debt 37\.1% of GDP, company debt 53\.5% of GDP \(2026 Q2\)/);
  const bad = await checkConnections({ env: {}, only: ['bis_private_debt'], fetchFn: async () => new Response('a,b\n1,2', { status: 200 }) } as never);
  assert.equal(bad.results[0].state, 'bad_reply');
});

test('the download: saved to data/live, kept, read back from disk', async () => {
  const mod = await import('../src/server/feeds/wagesHousing.ts');
  mod.resetWagesHousingForTests();
  const asked: string[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (input: unknown) => {
    asked.push(String(input));
    return new Response(TC, { status: 200 });
  }) as typeof fetch;
  try {
    const p = (await mod.fetchPrivateDebtPull())!;
    assert.equal(p.countries.BRA.householdPct, 37.1);
    assert.match(asked[0], /WS_TC\/Q\.\.H\+N/);
    await mod.fetchPrivateDebtPull();
    assert.equal(asked.length, 1, 'a fresh copy is not downloaded again');
    assert.ok(fs.existsSync(path.join(process.env.DATA_DIR!, 'live', 'bis-private-debt.json')));
    mod.resetWagesHousingForTests();
    assert.equal(mod.loadPrivateDebt()!.countries.ZAF.quarter, '2026Q1', 'read back from disk');
  } finally {
    globalThis.fetch = realFetch;
  }
});
