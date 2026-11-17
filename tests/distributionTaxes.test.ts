import { test } from 'node:test';
import assert from 'node:assert/strict';
import { distTaxFromSnapshot, giniValue, pickDistTaxRow, welfareFromNote, DIST_TAX_CODES, GINI_CODE } from '../src/utils/distributionTaxes.ts';
import { distTaxRows, economistBrief, ECONOMIST_SECTIONS, buildEconomistSections } from '../src/utils/countryNotes.ts';
import { getSnapshotDataStatus } from '../src/utils/dataStatus.ts';
import { buildBaselineOpenData } from '../src/data/presetsAndBaselines.ts';
import { figureRows, FIGURES_HEADER } from '../src/utils/csvExport.ts';
import { OFFICIAL_FIGURES } from '../src/utils/officialHistory.ts';
import { seriesTags, COVERAGE } from '../src/utils/seriesDefinitions.ts';
import { figureHelp } from '../src/data/glossary.ts';
import { planCouncil, runCouncil } from '../src/utils/askCouncil.ts';
import { licenceRowsForSource } from '../src/utils/licenceLookup.ts';
import type { CouncilAssessmentRun, OpenDataSnapshot, WatchlistItem } from '../src/types/council.ts';

const NOW = new Date('2026-11-11T12:00:00Z');
const WB_LIVE = ['World Bank Open Data v2 (2025 Live)'];

/** A World Bank reply's rows, newest first, as the API sends them. */
const rows = (...pairs: Array<[string, number | null, string?]>) => pairs.map(([date, value, footnote]) => ({ date, value, ...(footnote ? { footnote } : {}) }));

test('the Gini is the latest survey within 15 years, with its year and kind', () => {
  const recent = pickDistTaxRow(GINI_CODE, rows(['2026', null], ['2025', null], ['2023', 52.0, 'Data are based on income survey.'], ['2021', 48.9]), NOW);
  assert.deepEqual(recent, { value: 52, year: '2023', welfare: 'income' });
  const old = pickDistTaxRow(GINI_CODE, rows(['2026', null], ['2014', 41.3, 'Consumption data.']), NOW);
  assert.deepEqual(old, { value: 41.3, year: '2014', welfare: 'consumption' }, 'twelve years back is still within the look-back');
  assert.equal(pickDistTaxRow(GINI_CODE, rows(['2026', null], ['2010', 39.0]), NOW), undefined, 'older than 15 years is left out');
  assert.equal(pickDistTaxRow(GINI_CODE, rows(['2026', null], ['2025', null]), NOW), undefined, 'no survey at all');
  assert.equal(pickDistTaxRow(GINI_CODE, null, NOW), undefined);
  assert.equal(DIST_TAX_CODES.find((c) => c.code === GINI_CODE)!.perPage >= 16, true, 'asks for enough years to look back 15');
});

test('income or consumption only when the footnote says one of them', () => {
  assert.equal(welfareFromNote('Welfare measure is consumption.'), 'consumption');
  assert.equal(welfareFromNote('Welfare measure is income.'), 'income');
  assert.equal(welfareFromNote('Income and consumption surveys combined'), undefined);
  assert.equal(welfareFromNote(undefined), undefined);
});

test('tax and tariff rows: the latest number between 0 and 100', () => {
  assert.deepEqual(pickDistTaxRow('GC.TAX.TOTL.GD.ZS', rows(['2025', null], ['2024', 14.6], ['2023', 14.1]), NOW), { value: 14.6, year: '2024' });
  assert.equal(pickDistTaxRow('GC.TAX.INTT.RV.ZS', rows(['2024', 140]), NOW), undefined, 'a share above 100 is not used');
  assert.equal(pickDistTaxRow('TM.TAX.MRCH.WM.AR.ZS', rows(['2024', null]), NOW), undefined);
});

function snap(tweak: (s: OpenDataSnapshot) => void = () => {}, sources = WB_LIVE): OpenDataSnapshot {
  const s = buildBaselineOpenData('KEN');
  s.dataStatus = { verifiedLiveSources: sources, checkedAt: '2026-11-11T12:00:00Z' };
  s.liveFields = {};
  tweak(s);
  return s;
}
const all = (s: OpenDataSnapshot) => {
  Object.assign(s.worldBankIndicators, { giniIndex: 38.7, giniWelfare: 'consumption', taxRevenuePctGdp: 14.6, taxIncomePctRevenue: 38.2, taxGoodsPctRevenue: 35.1, taxTradePctRevenue: 9.4, tariffWeightedPct: 7.85, tariffSimplePct: 11.2 });
  s.liveFields = {
    'wb.giniIndex': 'World Bank (household survey), 2015',
    'wb.taxRevenuePctGdp': 'World Bank, 2024',
    'wb.taxIncomePctRevenue': 'World Bank, 2024',
    'wb.taxGoodsPctRevenue': 'World Bank, 2024',
    'wb.taxTradePctRevenue': 'World Bank, 2024',
    'wb.tariffWeightedPct': 'World Bank, 2022',
    'wb.tariffSimplePct': 'World Bank, 2022',
  };
};
const run = (s: OpenDataSnapshot) => ({ iso3: s.iso3, countryName: s.countryName, openData: s }) as unknown as CouncilAssessmentRun;

test('only live figures, each with the year from its source', () => {
  const d = distTaxFromSnapshot(snap(all))!;
  assert.deepEqual(d.gini, { value: 38.7, year: '2015', welfare: 'consumption' });
  assert.deepEqual(d.taxTradePctRevenue, { value: 9.4, year: '2024' });
  assert.deepEqual(d.tariffWeightedPct, { value: 7.85, year: '2022' });
  assert.equal(distTaxFromSnapshot(snap()), undefined, 'nothing live, nothing shown');
  assert.equal(giniValue(d.gini!, NOW), '38.7 (2015 consumption survey, 11 years old)');
  assert.equal(giniValue({ value: 33.1, year: '2023' }, NOW), '33.1 (2023 survey)');
});

test('the brief group "Distribution and taxes": figures with their years, or Missing with a reason', () => {
  const live = economistBrief(run(snap(all)), NOW).groups.find((g) => g.title === 'Distribution and taxes')!;
  const by = (l: string) => live.rows.find((r) => r.label === l)!;
  assert.equal(by('Inequality (Gini index)').value, '38.7 (2015 consumption survey, 11 years old)');
  assert.equal(by('Inequality (Gini index)').source, 'World Bank (household survey), 2015');
  assert.equal(by('Tax revenue, central government').value, '14.6% of GDP');
  assert.equal(by('Taxes on trade').value, '9.4% of revenue');
  assert.equal(by('Applied tariff, weighted mean').value, '7.85%');
  assert.equal(by('Applied tariff, weighted mean').source, 'World Bank, 2022');
  assert.ok(live.rows.every((r) => r.verified && !r.missing));

  // Tax split missing, tax revenue present; no Gini survey in 15 years.
  const part = snap((s) => {
    s.worldBankIndicators.taxRevenuePctGdp = 14.6;
    s.worldBankIndicators.answeredFields = ['taxRevenuePctGdp', 'giniIndex'];
    s.liveFields = { 'wb.taxRevenuePctGdp': 'World Bank, 2024' };
  });
  const rowsPart = distTaxRows(getSnapshotDataStatus(part), part, NOW);
  const g = rowsPart.find((r) => r.label === 'Inequality (Gini index)')!;
  assert.equal(g.value, 'Missing');
  assert.equal(g.source, 'No survey in the last 15 years');
  assert.match(g.help || '', /household surveys/);
  assert.equal(rowsPart.find((r) => r.label === 'Tax revenue, central government')!.value, '14.6% of GDP');
  for (const l of ['Taxes on income and profits', 'Taxes on goods and services', 'Taxes on trade']) {
    const r = rowsPart.find((x) => x.label === l)!;
    assert.equal(r.value, 'Missing', l);
    assert.equal(r.source, 'Not in World Bank data');
  }
  // The World Bank answered for other figures, but the Gini request itself failed: say so, not "no survey".
  const failed = snap((s) => {
    s.worldBankIndicators.taxRevenuePctGdp = 14.6;
    s.worldBankIndicators.answeredFields = ['taxRevenuePctGdp'];
    s.liveFields = { 'wb.taxRevenuePctGdp': 'World Bank, 2024' };
  });
  assert.equal(distTaxRows(getSnapshotDataStatus(failed), failed, NOW)[0].source, 'World Bank did not answer for this figure');
  // World Bank did not answer at all: the usual reason, not the survey one.
  const off = snap(() => {}, []);
  const gOff = distTaxRows(getSnapshotDataStatus(off), off, NOW)[0];
  assert.equal(gOff.missing, true);
  assert.notEqual(gOff.source, 'No survey in the last 15 years');
});

test('the economist note has the section, and every row has a glossary entry', () => {
  assert.equal(ECONOMIST_SECTIONS.distribution, 'Distribution and taxes');
  const s = buildEconomistSections(run(snap(all)), (id) => id === 'distribution', NOW);
  assert.match(s[0].lines.join('\n'), /- Tax revenue, central government: 14\.6% of GDP \(World Bank, 2024\)/);
  for (const r of distTaxRows(getSnapshotDataStatus(snap(all)), snap(all), NOW)) assert.ok(figureHelp(r.label), r.label);
  assert.equal(figureHelp('Applied tariff, simple mean')!.id, 'tariff');
  assert.equal(figureHelp('Taxes on goods and services')!.id, 'tax_split');
});

test('downloads, History & data series and labels', () => {
  const fr = figureRows(snap(all));
  const col = (h: string) => FIGURES_HEADER.indexOf(h);
  const gini = fr.find((r) => r[col('field')] === 'wb.giniIndex')!;
  assert.equal(gini[col('value')], 38.7);
  assert.equal(gini[col('period')], '2015');
  const missing = figureRows(snap()).find((r) => r[col('field')] === 'wb.tariffSimplePct')!;
  assert.equal(missing[col('status')], 'Missing');
  for (const id of ['gini', 'tax_revenue', 'tax_income', 'tax_goods', 'tax_trade', 'tariff_weighted', 'tariff_simple']) {
    assert.ok(OFFICIAL_FIGURES.some((f) => f.id === id && f.source === 'wb'), id);
    assert.notEqual(seriesTags({ id }).definition, COVERAGE.notStated, id);
  }
  assert.equal(seriesTags({ id: 'tax_revenue' }).coverage, COVERAGE.centralGov, 'central government, not general government');
  assert.match(OFFICIAL_FIGURES.find((f) => f.id === 'tax_revenue')!.about || '', /lower than the IMF general government revenue/);
  assert.match(OFFICIAL_FIGURES.find((f) => f.id === 'tariff_weighted')!.about || '', /tariff changes made since/);
  assert.match(licenceRowsForSource('World Bank (household survey), 2015').map((r) => r.usedFor).join(' '), /Gini/);
});

test('the Fiscal & Debt Agent reads taxes, tariffs and the Gini when they are live, and adds nothing when not', () => {
  const s = snap(all);
  const item = (distTax?: ReturnType<typeof distTaxFromSnapshot>) =>
    ({ iso3: 'KEN', countryName: 'Kenya', fiscal: { debtPctGdp: { value: 70, year: '2025' } }, ...(distTax ? { distTax } : {}) }) as unknown as WatchlistItem;
  const q = 'Is Kenya debt sustainable?';
  const withDt = item(distTaxFromSnapshot(s));
  const a = runCouncil(q, planCouncil(q, [withDt]), [withDt]).find((x) => x.id === 'fiscal')!;
  const fig = (l: string) => a.findings[0].figures.find((f) => f.label.startsWith(l));
  assert.equal(fig('Tax revenue, central government')!.value, '14.6% of GDP');
  assert.match(fig('Tax revenue, central government')!.source, /2024; central government only/);
  assert.equal(fig('Taxes on international trade')!.value, '9.4% of central government revenue');
  assert.match(fig('Applied tariff, weighted by imports')!.source, /2022; tariff changes made since that year are not included/);
  assert.match(fig('Inequality (Gini index')!.value, /^38\.7 \(2015 consumption survey/);
  const none = item();
  const b = runCouncil(q, planCouncil(q, [none]), [none]).find((x) => x.id === 'fiscal')!;
  assert.ok(!b.findings[0].figures.some((f) => /Tax|tariff|Gini/.test(f.label)));
});
