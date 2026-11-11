import { test } from 'node:test';
import assert from 'node:assert/strict';
import { currencyValue, debtStructureFromSnapshot, debtStructureUrl, parseDebtStructure, usdShare } from '../src/utils/debtStructure.ts';
import { debtStructureRows, economistBrief } from '../src/utils/countryNotes.ts';
import { getSnapshotDataStatus } from '../src/utils/dataStatus.ts';
import { buildBaselineOpenData } from '../src/data/presetsAndBaselines.ts';
import { figureRows, FIGURES_HEADER } from '../src/utils/csvExport.ts';
import { OFFICIAL_FIGURES } from '../src/utils/officialHistory.ts';
import { seriesTags, COVERAGE } from '../src/utils/seriesDefinitions.ts';
import { figureHelp } from '../src/data/glossary.ts';
import { planCouncil, runCouncil } from '../src/utils/askCouncil.ts';
import { checkConnections } from '../src/utils/connectionCheck.ts';
import { DATA_LICENCES, PLANNED_LICENCES } from '../src/data/dataLicences.ts';
import type { CouncilAssessmentRun, OpenDataSnapshot, WatchlistItem } from '../src/types/council.ts';

/** An IDS sources answer, shaped like the D6 answers read on 2026-11-07. */
const row = (series: string, year: string, value: number | null) => ({
  variable: [
    { concept: 'Country', id: 'ZMB' },
    { concept: 'Series', id: series },
    { concept: 'Counterpart-Area', id: 'WLD' },
    { concept: 'Time', id: `YR${year}` },
  ],
  value,
});
const ids = (...rows: ReturnType<typeof row>[]) => ({ source: [{ data: rows }] });
const ZMB = ids(
  row('DT.CUR.USDL.ZS', '2024', 84.04),
  row('DT.CUR.EURO.ZS', '2024', 6.1),
  row('DT.CUR.SDRW.ZS', '2024', 3.2),
  row('DT.CUR.MULC.ZS', '2024', 5.2),
  row('DT.CUR.JYEN.ZS', '2024', 0),
  row('DT.CUR.OTHC.ZS', '2024', 1.46),
  row('DT.CUR.USDL.ZS', '2023', 85),
  row('DT.CUR.USDL.ZS', '2025', null),
  row('DT.MAT.DPPG', '2024', 0),
  row('DT.MAT.DPPG', '2023', 18.36)
);

test('IDS answer: the latest year with a currency split, largest first; maturity skips years with no new loans', () => {
  const d = parseDebtStructure(ZMB, 't')!;
  assert.deepEqual(d.currency, {
    year: '2024',
    shares: [
      { label: 'US dollar', pct: 84 },
      { label: 'euro', pct: 6.1 },
      { label: 'several currencies', pct: 5.2 },
      { label: 'SDR (IMF basket)', pct: 3.2 },
      { label: 'other currencies', pct: 1.5 },
    ],
  });
  assert.deepEqual(d.newLoanMaturity, { years: 18.4, year: '2023' }, '0 years means no new loans that year');
  assert.equal(currencyValue(d.currency!), 'US dollar 84.0%, euro 6.1%, several currencies 5.2%, SDR (IMF basket) 3.2%, other currencies 1.5% (2024)');
  assert.equal(usdShare(d), 84);
  assert.deepEqual(parseDebtStructure(ids(), 't'), { fetchedAt: 't' }, 'answered with nothing: an empty reading');
  assert.equal(parseDebtStructure({ nope: 1 }, 't'), null);
  assert.match(debtStructureUrl('ZMB'), /sources\/6\/country\/ZMB\/series\/DT\.CUR\.USDL\.ZS;.*DT\.MAT\.DPPG\/counterpart-area\/WLD/);
});

function snap(iso3 = 'ZMB', tweak: (s: OpenDataSnapshot) => void = () => {}): OpenDataSnapshot {
  const s = buildBaselineOpenData(iso3);
  s.dataStatus = { verifiedLiveSources: ['World Bank Open Data v2 (2025 Live)'], checkedAt: '2026-11-11T12:00:00Z' };
  s.liveFields = {};
  tweak(s);
  return s;
}
const all = (s: OpenDataSnapshot) => {
  s.worldBankIndicators.interestPctRevenue = 27.4;
  s.liveFields = { 'wb.interestPctRevenue': 'World Bank, 2023' };
  s.debtStructure = parseDebtStructure(ZMB, 't')!;
};
const run = (s: OpenDataSnapshot) => ({ iso3: s.iso3, countryName: s.countryName, openData: s }) as unknown as CouncilAssessmentRun;

test('brief rows under Fiscal and debt: figures with their years, or Missing with the reason', () => {
  const g = economistBrief(run(snap('ZMB', all))).groups.find((x) => x.title === 'Fiscal and debt')!;
  const by = (l: string) => g.rows.find((r) => r.label === l)!;
  assert.equal(by('Interest payments, central government').value, '27.4% of revenue');
  assert.equal(by('Interest payments, central government').source, 'World Bank, 2023');
  assert.match(by('Public external debt by currency').value, /^US dollar 84\.0%, euro 6\.1%/);
  assert.equal(by('Maturity of new public external loans').value, '18.4 years on average (2023)');
  assert.match(by('Maturity of new public external loans').source, /not the debt already owed/);
  const who = by('Who holds government debt');
  assert.equal(who.missing, true);
  assert.equal(who.source, 'IMF investor base file not downloaded');
  for (const l of ['Interest payments, central government', 'Public external debt by currency', 'Maturity of new public external loans', 'Who holds government debt']) assert.ok(figureHelp(l), l);

  const rich = snap('DEU', (s) => { s.debtStructure = { fetchedAt: 't' }; });
  const r = debtStructureRows(getSnapshotDataStatus(rich), rich);
  assert.equal(r[1].source, 'Not in World Bank IDS', 'IDS answered: low- and middle-income countries only');
  const down = snap('ZMB');
  assert.equal(debtStructureRows(getSnapshotDataStatus(down), down)[1].source, 'World Bank IDS did not answer');
  const us = snap('USA');
  assert.match(debtStructureRows(getSnapshotDataStatus(us), us)[3].help || '', /TIC/);
});

test('downloads, History & data and the licence row', () => {
  const col = (h: string) => FIGURES_HEADER.indexOf(h);
  const fr = figureRows(snap('ZMB', all)).find((x) => x[col('field')] === 'wb.interestPctRevenue')!;
  assert.equal(fr[col('value')], 27.4);
  assert.equal(fr[col('period')], '2023');
  assert.ok(OFFICIAL_FIGURES.some((f) => f.id === 'interest_revenue' && f.code === 'GC.XPN.INTP.RV.ZS'));
  assert.equal(seriesTags({ id: 'interest_revenue' }).coverage, COVERAGE.centralGov);
  assert.equal(DATA_LICENCES.find((l) => l.id === 'imf_investor_base')?.status, 'permission');
  assert.ok(!PLANNED_LICENCES.some((l) => l.id === 'imf_investor_base'));
});

test('the Fiscal & Debt Agent quotes interest, currency mix and maturity when live; nothing when not', () => {
  const item = (debtStructure?: ReturnType<typeof debtStructureFromSnapshot>) =>
    ({ iso3: 'ZMB', countryName: 'Zambia', fiscal: { debtPctGdp: { value: 110, year: '2025' } }, ...(debtStructure ? { debtStructure } : {}) }) as unknown as WatchlistItem;
  const q = 'Is Zambia debt sustainable?';
  const withDs = item(debtStructureFromSnapshot(snap('ZMB', all)));
  const f = runCouncil(q, planCouncil(q, [withDs]), [withDs]).find((a) => a.id === 'fiscal')!.findings[0];
  assert.equal(f.figures.find((x) => x.label === 'Interest payments, central government')!.value, '27.4% of revenue');
  assert.match(f.figures.find((x) => x.label === 'Public external debt by currency')!.value, /US dollar 84\.0%/);
  assert.match(f.reading, /84% of its public external debt is in US dollars \(World Bank IDS, 2024\)/);
  const none = item();
  const b = runCouncil(q, planCouncil(q, [none]), [none]).find((a) => a.id === 'fiscal')!.findings[0];
  assert.ok(!b.figures.some((x) => /Interest payments|by currency|new public external/.test(x.label)));
  assert.equal(debtStructureFromSnapshot(snap('ZMB')), undefined);
});

test('Data health row', async () => {
  const fetchFn = async (url: string) => new Response(JSON.stringify(url.includes('/sources/6/') ? ZMB : []), { status: 200 });
  const rep = await checkConnections({ env: {}, only: ['worldbank_debt_structure'], fetchFn } as never);
  const r = rep.results.find((x) => x.id === 'worldbank_debt_structure')!;
  assert.equal(r.state, 'connected');
  assert.match(r.sample || '', /public external debt: US dollar 84\.0%/);
});
