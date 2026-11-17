import { test } from 'node:test';
import assert from 'node:assert/strict';
import { peopleFromSnapshot, peopleTag, pickPeopleRow, povertyLineFromName, povertyValue, PEOPLE_CODES } from '../src/utils/peopleLiving.ts';
import { peopleRows, economistBrief, ECONOMIST_SECTIONS, buildEconomistSections } from '../src/utils/countryNotes.ts';
import { getSnapshotDataStatus } from '../src/utils/dataStatus.ts';
import { buildBaselineOpenData } from '../src/data/presetsAndBaselines.ts';
import { figureRows, FIGURES_HEADER } from '../src/utils/csvExport.ts';
import { OFFICIAL_FIGURES } from '../src/utils/officialHistory.ts';
import { seriesTags, COVERAGE } from '../src/utils/seriesDefinitions.ts';
import { figureHelp } from '../src/data/glossary.ts';
import { planCouncil, runCouncil } from '../src/utils/askCouncil.ts';
import { checkConnections } from '../src/utils/connectionCheck.ts';
import type { CouncilAssessmentRun, OpenDataSnapshot, WatchlistItem } from '../src/types/council.ts';

const NOW = new Date('2026-11-11T12:00:00Z');
const WB_LIVE = ['World Bank Open Data v2 (2025 Live)'];
const NAME = 'Poverty headcount ratio at $3.00 a day (2021 PPP) (% of population)';
const rows = (...r: Array<[string, number | null, string?]>) => r.map(([date, value, footnote]) => ({ date, value, indicator: { id: 'SI.POV.DDAY', value: NAME }, ...(footnote ? { footnote } : {}) }));

test('the poverty line comes from the World Bank indicator name, or is left out', () => {
  assert.equal(povertyLineFromName(NAME), '$3.00 a day, 2021 PPP');
  assert.equal(povertyLineFromName('Poverty headcount ratio at $8.3 a day (2021 PPP) (% of population)'), '$8.30 a day, 2021 PPP');
  assert.equal(povertyLineFromName('Poverty headcount ratio at $4.20 a day (% of population)'), '$4.20 a day');
  assert.equal(povertyLineFromName('Poverty headcount ratio (% of population)'), undefined);
  assert.equal(povertyLineFromName(undefined), undefined);
});

test('poverty: the latest survey within 15 years, with its year, kind and line', () => {
  assert.deepEqual(pickPeopleRow('povertyLowestPct', rows(['2026', null], ['2022', 36.1, 'Consumption survey.']), NOW), { value: 36.1, year: '2022', welfare: 'consumption', line: '$3.00 a day, 2021 PPP' });
  assert.equal(pickPeopleRow('povertyLowestPct', rows(['2010', 40]), NOW), undefined, 'older than 15 years is left out');
  assert.equal(pickPeopleRow('povertyLowestPct', null, NOW), undefined);
  assert.ok(PEOPLE_CODES.filter((c) => c.survey).every((c) => c.perPage >= 16));
});

test('other series: the latest number in range', () => {
  assert.deepEqual(pickPeopleRow('remittancesPctGdp', [{ date: '2025', value: null }, { date: '2024', value: 18.4 }], NOW), { value: 18.4, year: '2024' });
  assert.equal(pickPeopleRow('youthUnemploymentPct', [{ date: '2024', value: 120 }], NOW), undefined, 'a share above 100 is not used');
  assert.deepEqual(pickPeopleRow('ageDependencyRatio', [{ date: '2024', value: 104.2 }], NOW), { value: 104.2, year: '2024' }, 'the dependency ratio can pass 100');
  assert.equal(pickPeopleRow('labourParticipationPct', [{ date: '2010', value: 60 }], NOW)?.year, '2010', 'no look-back limit outside the surveys');
});

test('source tags: the year first, then the line; ILO series say they are modelled', () => {
  assert.equal(peopleTag('povertyLowestPct', { value: 36.1, year: '2022', line: '$3.00 a day, 2021 PPP' }), 'World Bank (household survey), 2022; line $3.00 a day, 2021 PPP');
  assert.equal(peopleTag('youthUnemploymentPct', { value: 17, year: '2025' }), 'World Bank (ILO modelled estimate), 2025');
  assert.equal(peopleTag('remittancesPctGdp', { value: 3, year: '2024' }), 'World Bank, 2024');
});

function snap(tweak: (s: OpenDataSnapshot) => void = () => {}, sources = WB_LIVE): OpenDataSnapshot {
  const s = buildBaselineOpenData('KEN');
  s.dataStatus = { verifiedLiveSources: sources, checkedAt: '2026-11-11T12:00:00Z' };
  s.liveFields = {};
  tweak(s);
  return s;
}
const all = (s: OpenDataSnapshot) => {
  Object.assign(s.worldBankIndicators, { povertyLowestPct: 36.1, povertyLowerMiddlePct: 58.4, povertyUpperMiddlePct: 81.9, povertyWelfare: 'consumption', remittancesPctGdp: 3.6, labourParticipationPct: 72.1, youthUnemploymentPct: 12.5, ageDependencyRatio: 70.4 });
  s.liveFields = {
    'wb.povertyLowestPct': 'World Bank (household survey), 2015; line $3.00 a day, 2021 PPP',
    'wb.povertyLowerMiddlePct': 'World Bank (household survey), 2015; line $4.20 a day, 2021 PPP',
    'wb.povertyUpperMiddlePct': 'World Bank (household survey), 2015; line $8.30 a day, 2021 PPP',
    'wb.remittancesPctGdp': 'World Bank, 2024',
    'wb.labourParticipationPct': 'World Bank (ILO modelled estimate), 2025',
    'wb.youthUnemploymentPct': 'World Bank (ILO modelled estimate), 2025',
    'wb.ageDependencyRatio': 'World Bank, 2024',
  };
};
const run = (s: OpenDataSnapshot) => ({ iso3: s.iso3, countryName: s.countryName, openData: s }) as unknown as CouncilAssessmentRun;

test('only live figures, each with the year from its source; the line from the tag', () => {
  const p = peopleFromSnapshot(snap(all))!;
  assert.deepEqual(p.povertyLowestPct, { value: 36.1, year: '2015', line: '$3.00 a day, 2021 PPP', welfare: 'consumption' });
  assert.deepEqual(p.youthUnemploymentPct, { value: 12.5, year: '2025' });
  assert.equal(peopleFromSnapshot(snap()), undefined, 'nothing live, nothing shown');
  assert.equal(povertyValue(p.povertyLowestPct!, NOW), '36.1% of people below $3.00 a day, 2021 PPP (2015 consumption survey, 11 years old)');
  assert.equal(povertyValue({ value: 2.1, year: '2023' }, NOW), '2.1% of people (2023 survey)');
});

test('the brief group "People": figures with their years, or Missing with a reason', () => {
  const g = economistBrief(run(snap(all)), NOW).groups.find((x) => x.title === 'People')!;
  const by = (l: string) => g.rows.find((r) => r.label === l)!;
  assert.equal(by('Poverty rate, upper-middle-income line').value, '81.9% of people below $8.30 a day, 2021 PPP (2015 consumption survey, 11 years old)');
  assert.equal(by('Remittances received').value, '3.6% of GDP');
  assert.equal(by('Youth unemployment').value, '12.5% of workers aged 15-24');
  assert.equal(by('Youth unemployment').source, 'World Bank (ILO modelled estimate), 2025');
  assert.equal(by('Labour force participation').value, '72.1% of people aged 15 and over');
  assert.equal(by('Age dependency ratio').value, '70 per 100 people aged 15-64');
  assert.ok(g.rows.every((r) => r.verified && !r.missing));
  for (const r of g.rows) assert.ok(figureHelp(r.label), r.label);

  const part = snap((s) => {
    s.worldBankIndicators.remittancesPctGdp = 3.6;
    s.worldBankIndicators.answeredFields = ['remittancesPctGdp', 'povertyLowestPct'];
    s.liveFields = { 'wb.remittancesPctGdp': 'World Bank, 2024' };
  });
  const pr = peopleRows(getSnapshotDataStatus(part), part, NOW);
  assert.equal(pr[0].value, 'Missing');
  assert.equal(pr[0].source, 'No survey in the last 15 years');
  // The other poverty lines' requests did not answer: never "no survey" for those.
  assert.equal(pr[1].source, 'World Bank did not answer for this figure');
  assert.match(pr[0].help || '', /household surveys/);
  assert.equal(pr.find((r) => r.label === 'Youth unemployment')!.source, 'Not in World Bank data');
  const off = snap(() => {}, []);
  assert.notEqual(peopleRows(getSnapshotDataStatus(off), off, NOW)[0].source, 'No survey in the last 15 years', 'World Bank down: the usual reason');

  assert.equal(ECONOMIST_SECTIONS.people, 'People');
  const sec = buildEconomistSections(run(snap(all)), (id) => id === 'people', NOW);
  assert.match(sec[0].lines.join('\n'), /- Remittances received: 3\.6% of GDP \(World Bank, 2024\)/);
});

test('downloads, History & data series and labels', () => {
  const col = (h: string) => FIGURES_HEADER.indexOf(h);
  const pov = figureRows(snap(all)).find((r) => r[col('field')] === 'wb.povertyLowestPct')!;
  assert.equal(pov[col('value')], 36.1);
  assert.equal(pov[col('period')], '2015', 'the survey year, not the 2021 of the PPP prices');
  assert.equal(figureRows(snap()).find((r) => r[col('field')] === 'wb.ageDependencyRatio')![col('status')], 'Missing');
  for (const id of ['poverty_lowest', 'poverty_lower_middle', 'poverty_upper_middle', 'remittances', 'labour_participation', 'youth_unemployment', 'age_dependency']) {
    assert.ok(OFFICIAL_FIGURES.some((f) => f.id === id && f.source === 'wb'), id);
    assert.notEqual(seriesTags({ id }).definition, COVERAGE.notStated, id);
  }
  assert.equal(seriesTags({ id: 'youth_unemployment' }).coverage, COVERAGE.model, 'ILO modelled estimate');
});

test('the council: poverty and youth unemployment for Politics & Events, remittances for FX Valuation; nothing when not live', () => {
  const people = peopleFromSnapshot(snap(all));
  const item = { iso3: 'KEN', countryName: 'Kenya', politics: { stability: { percentile: 30, year: '2024' } }, people } as unknown as WatchlistItem;
  const q = 'Kenya protests and the currency';
  const ans = runCouncil(q, planCouncil(q, [item]), [item]);
  const pol = ans.find((a) => a.id === 'politics')!.findings[0];
  assert.match(pol.figures.find((f) => f.label.startsWith('Poverty rate'))!.value, /^36\.1% of people below \$3\.00 a day/);
  assert.match(pol.figures.find((f) => f.label.startsWith('Youth unemployment'))!.source, /ILO modelled estimate/);
  const fx = ans.find((a) => a.id === 'fx')!.findings[0];
  assert.equal(fx.figures.find((f) => f.label === 'Remittances received')!.value, '3.6% of GDP');
  assert.match(fx.reading, /sent home by people working abroad equals 3\.6% of GDP \(World Bank, 2024\)/);
  const none = { iso3: 'KEN', countryName: 'Kenya', politics: { stability: { percentile: 30, year: '2024' } } } as unknown as WatchlistItem;
  const b = runCouncil(q, planCouncil(q, [none]), [none]);
  assert.ok(!b.flatMap((a) => a.findings.flatMap((f) => f.figures)).some((f) => /Poverty|Youth unemployment|Remittances/.test(f.label)));
});

test('Data health row', async () => {
  const fetchFn = async (url: string) => new Response(JSON.stringify(url.includes('BX.TRF.PWKR') ? [{ page: 1 }, [{ date: '2024', value: 0.29 }]] : []), { status: 200 });
  const rep = await checkConnections({ env: {}, only: ['worldbank_people'], fetchFn } as never);
  const row = rep.results.find((r) => r.id === 'worldbank_people')!;
  assert.equal(row.state, 'connected');
  assert.match(row.sample || '', /remittances received 0\.3% of GDP \(2024\)/);
});
