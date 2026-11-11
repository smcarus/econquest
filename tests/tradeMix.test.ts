import { test } from 'node:test';
import assert from 'node:assert/strict';
import { concentrationValue, netEnergyValue, pickTradeMixRow, shareSplitValue, topPartnersValue, tradeMixFromSnapshot, EXPORT_FIELDS, TRADE_MIX_CODES } from '../src/utils/tradeMix.ts';
import { buildProfile, exportHerfindahl, type ComtradeRow } from '../src/utils/comtradeTrade.ts';
import { tradeRows, economistBrief, ECONOMIST_SECTIONS } from '../src/utils/countryNotes.ts';
import { getSnapshotDataStatus } from '../src/utils/dataStatus.ts';
import { buildBaselineOpenData } from '../src/data/presetsAndBaselines.ts';
import { figureRows, FIGURES_HEADER } from '../src/utils/csvExport.ts';
import { OFFICIAL_FIGURES } from '../src/utils/officialHistory.ts';
import { seriesTags, COVERAGE } from '../src/utils/seriesDefinitions.ts';
import { figureHelp, panelIntro } from '../src/data/glossary.ts';
import { scenarioImpact } from '../src/utils/scenarioExposure.ts';
import { planCouncil, runCouncil } from '../src/utils/askCouncil.ts';
import { checkConnections } from '../src/utils/connectionCheck.ts';
import type { CouncilAssessmentRun, OpenDataSnapshot, WatchlistItem } from '../src/types/council.ts';

const NOW = new Date('2026-11-11T12:00:00Z');
const WB_LIVE = ['World Bank Open Data v2 (2025 Live)'];

test('World Bank rows: shares between 0 and 100; net energy imports at most 100 and may be far below 0', () => {
  assert.deepEqual(pickTradeMixRow('exportFuelPct', [{ date: '2025', value: null }, { date: '2024', value: 62.4 }]), { value: 62.4, year: '2024' });
  assert.equal(pickTradeMixRow('exportFoodPct', [{ date: '2024', value: -3 }]), undefined);
  assert.equal(pickTradeMixRow('importManufPct', [{ date: '2024', value: 101 }]), undefined);
  assert.deepEqual(pickTradeMixRow('netEnergyImportsPct', [{ date: '2015', value: -458.2 }]), { value: -458.2, year: '2015' });
  assert.equal(pickTradeMixRow('netEnergyImportsPct', [{ date: '2015', value: 140 }]), undefined, 'cannot import more than it uses');
  assert.equal(pickTradeMixRow('exportFuelPct', 'nope'), undefined);
  assert.ok(TRADE_MIX_CODES.find((c) => c.field === 'netEnergyImportsPct')!.perPage >= 15, 'energy balances can stop years back');
});

function snap(tweak: (s: OpenDataSnapshot) => void = () => {}, sources = WB_LIVE): OpenDataSnapshot {
  const s = buildBaselineOpenData('SAU');
  s.dataStatus = { verifiedLiveSources: sources, checkedAt: '2026-11-11T12:00:00Z' };
  s.liveFields = {};
  tweak(s);
  return s;
}
const all = (s: OpenDataSnapshot) => {
  Object.assign(s.worldBankIndicators, { exportFuelPct: 77.1, exportOresMetalsPct: 2.3, exportFoodPct: 1.4, exportManufPct: 18.2, importFuelPct: 3.2, importOresMetalsPct: 2.9, importFoodPct: 14.8, importManufPct: 76.5, netEnergyImportsPct: -158.4 });
  s.liveFields = Object.fromEntries(
    ['exportFuelPct', 'exportOresMetalsPct', 'exportFoodPct', 'exportManufPct', 'importFuelPct', 'importOresMetalsPct', 'importFoodPct', 'importManufPct'].map((f) => [`wb.${f}`, 'World Bank, 2023'])
  );
  s.liveFields['wb.netEnergyImportsPct'] = 'World Bank, 2015';
};
const run = (s: OpenDataSnapshot) => ({ iso3: s.iso3, countryName: s.countryName, openData: s }) as unknown as CouncilAssessmentRun;

test('only live figures, each with its year; values in plain words', () => {
  const t = tradeMixFromSnapshot(snap(all))!;
  assert.deepEqual(t.exportFuelPct, { value: 77.1, year: '2023' });
  assert.equal(tradeMixFromSnapshot(snap()), undefined);
  assert.equal(shareSplitValue(t, EXPORT_FIELDS), 'fuel 77.1%, manufactures 18.2%, ores and metals 2.3%, food 1.4% (2023)');
  assert.equal(shareSplitValue({ exportFuelPct: { value: 5, year: '2022' }, exportFoodPct: { value: 9, year: '2023' } }, EXPORT_FIELDS), 'food 9.0%, fuel 5.0% (2022-2023)');
  assert.equal(netEnergyValue(t.netEnergyImportsPct!, NOW), 'Net exporter: produces 2.6 times the energy it uses (2015, 11 years old)');
  assert.equal(netEnergyValue({ value: 45.2, year: '2023' }, NOW), 'Net importer: imports 45% of the energy it uses (2023)');
});

const row = (flowCode: 'X' | 'M', cmdCode: string, value: number, partnerCode = 0, partnerName?: string): ComtradeRow => ({ period: '2024', flowCode, partnerCode, cmdCode, value, ...(partnerName ? { partnerName } : {}) });

test('export concentration: the Herfindahl index over HS chapters, only when they cover nearly all exports', () => {
  // Two chapters at 60% and 40%: 0.36 + 0.16 = 0.52.
  const h = exportHerfindahl([row('X', '27', 60), row('X', '84', 40), row('X', 'TOTAL', 100), row('M', '27', 50)], 100)!;
  assert.deepEqual(h, { value: 0.52, chapters: 2, coveredPct: 100 });
  assert.equal(concentrationValue(h, '2024'), '0.52, as concentrated as about 1.9 equal-sized product groups (UN Comtrade 2024, 2 HS chapters)');
  assert.equal(exportHerfindahl([row('X', '27', 50), row('X', '84', 30)], 100), undefined, '80% covered is too little');
  assert.equal(exportHerfindahl([], 100), undefined);

  const partners = [row('X', 'TOTAL', 100), row('M', 'TOTAL', 80), row('X', 'TOTAL', 30, 156, 'China'), row('X', 'TOTAL', 20, 842, 'USA'), row('X', 'TOTAL', 10, 392), row('X', 'TOTAL', 8, 699), row('X', 'TOTAL', 7, 410), row('X', 'TOTAL', 6, 276)];
  const chapters = [row('X', 'TOTAL', 100), row('M', 'TOTAL', 80), ...Array.from({ length: 10 }, (_, i) => row('X', String(10 + i), 10))];
  const p = buildProfile('BRA', partners, chapters)!;
  assert.deepEqual(p.exportHhi, { value: 0.1, chapters: 10, coveredPct: 100 });
  assert.equal(topPartnersValue(p), 'China 30.0%, USA 20.0%, Japan 10.0%, India 8.0%, Korea 7.0% (2024)');
  // The commodity chapters only (the fallback request): no concentration.
  assert.equal(buildProfile('BRA', partners, [row('X', 'TOTAL', 100), row('X', '27', 20)])!.exportHhi, undefined);
});

test('the brief group "Trade": figures with their years, or Missing with a reason', () => {
  const s = snap(all);
  s.comtrade = { ...buildProfile('SAU', [row('X', 'TOTAL', 100), row('M', 'TOTAL', 80), row('X', 'TOTAL', 20, 156, 'China')], [row('X', 'TOTAL', 100), row('X', '27', 76), row('X', '39', 24)])!, pulledAt: '2026-11-10T03:00:00Z' };
  const g = economistBrief(run(s), NOW).groups.find((x) => x.title === 'Trade')!;
  const by = (l: string) => g.rows.find((r) => r.label === l)!;
  assert.equal(by('Goods exports by group').value, 'fuel 77.1%, manufactures 18.2%, ores and metals 2.3%, food 1.4% (2023)');
  assert.match(by('Goods imports by group').source, /do not add up to 100%/);
  assert.equal(by('Net energy imports').value, 'Net exporter: produces 2.6 times the energy it uses (2015, 11 years old)');
  assert.match(by('Export concentration (app calculation)').value, /^0\.64, as concentrated as about 1\.6/);
  assert.equal(by('Export concentration (app calculation)').verified, false, 'the app\'s calculation is not tagged as official');
  assert.match(by('Export concentration (app calculation)').source, /^App calculation: the Herfindahl index/);
  assert.equal(by('Top five export markets').value, 'China 20.0% (2024)');
  assert.match(by('Top five export markets').source, /UN Comtrade 2024 \(pulled 2026-11-10\)/);
  for (const r of g.rows) assert.ok(figureHelp(r.label), r.label);
  assert.ok(panelIntro('Trade'));
  assert.equal(ECONOMIST_SECTIONS.trade, 'Trade');

  const none = snap();
  const nr = tradeRows(getSnapshotDataStatus(none), none, NOW);
  assert.ok(nr.every((r) => r.missing));
  assert.equal(nr.find((r) => r.label === 'Goods exports by group')!.source, 'Not in World Bank data');
  assert.equal(nr.find((r) => r.label === 'Top five export markets')!.source, 'Comtrade did not answer');
  const partial = snap((x) => {
    x.comtrade = { ...buildProfile('SAU', [row('X', 'TOTAL', 100), row('M', 'TOTAL', 80)], [row('X', 'TOTAL', 100), row('X', '27', 50)])!, pulledAt: '2026-11-10T03:00:00Z' };
  });
  assert.equal(tradeRows(getSnapshotDataStatus(partial), partial, NOW).find((r) => r.label.startsWith('Export concentration'))!.source, 'Comtrade gave too few product groups');
});

test('downloads, History & data series and labels', () => {
  const col = (h: string) => FIGURES_HEADER.indexOf(h);
  const e = figureRows(snap(all)).find((r) => r[col('field')] === 'wb.netEnergyImportsPct')!;
  assert.equal(e[col('value')], -158.4);
  assert.equal(e[col('period')], '2015');
  for (const id of ['export_fuel', 'export_ores_metals', 'export_food', 'export_manuf', 'import_fuel', 'import_ores_metals', 'import_food', 'import_manuf', 'net_energy_imports']) {
    assert.ok(OFFICIAL_FIGURES.some((f) => f.id === id && f.source === 'wb'), id);
    assert.notEqual(seriesTags({ id }).definition, COVERAGE.notStated, id);
  }
});

test('the Hormuz scenario names the energy position; the Global Spillover agent quotes trade figures when live', () => {
  const base = { fuelImportsPctMerch: 3, fuelExportsPctMerch: 77, importsPctGdp: 25, exportsPctGdp: 35, wbYear: '2023' };
  assert.match(scenarioImpact('hormuz', { ...base, netEnergyImportsPct: -158.4, netEnergyYear: '2015' })!.basis, /produces 2\.6 times the energy it uses \(World Bank, 2015\)/);
  assert.match(scenarioImpact('hormuz', { ...base, netEnergyImportsPct: 60, netEnergyYear: '2022' })!.basis, /imports 60% of the energy it uses \(World Bank, 2022\)/);
  assert.doesNotMatch(scenarioImpact('hormuz', base)!.basis, /energy it uses/);

  const tradeMix = tradeMixFromSnapshot(snap(all));
  const comtrade = { ...buildProfile('SAU', [row('X', 'TOTAL', 100), row('M', 'TOTAL', 80), row('X', 'TOTAL', 20, 156, 'China')], [row('X', 'TOTAL', 100), row('X', '27', 76), row('X', '39', 24)])!, pulledAt: '2026-11-10T03:00:00Z' };
  const item = { iso3: 'SAU', countryName: 'Saudi Arabia', trade: base, tradeMix, comtrade } as unknown as WatchlistItem;
  const q = 'How exposed is Saudi Arabia to a Hormuz closure?';
  const sp = runCouncil(q, planCouncil(q, [item]), [item]).find((a) => a.id === 'spill')!.findings[0];
  assert.equal(sp.figures.find((f) => f.label === 'Goods exports by group')!.tag, 'official');
  assert.match(sp.figures.find((f) => f.label === 'Net energy imports')!.value, /^Net exporter/);
  assert.equal(sp.figures.find((f) => f.label === 'Top five export markets')!.value, 'China 20.0% (2024)');
  assert.equal(sp.figures.find((f) => f.label.startsWith('Export concentration'))!.tag, 'model');
  assert.match(sp.reading, /Fuel: 77% of its goods exports \(World Bank, 2023\)/);
  const bare = { iso3: 'SAU', countryName: 'Saudi Arabia', trade: base } as unknown as WatchlistItem;
  const b = runCouncil(q, planCouncil(q, [bare]), [bare]).find((a) => a.id === 'spill')!.findings[0];
  assert.ok(!b.figures.some((f) => /Goods exports|Net energy|Top five|Export concentration/.test(f.label)));
});

test('Data health row', async () => {
  const fetchFn = async (url: string) => new Response(JSON.stringify(url.includes('TX.VAL.FUEL') ? [{ page: 1 }, [{ date: '2024', value: 5.12 }]] : []), { status: 200 });
  const rep = await checkConnections({ env: {}, only: ['worldbank_trade'], fetchFn } as never);
  const r = rep.results.find((x) => x.id === 'worldbank_trade')!;
  assert.equal(r.state, 'connected');
  assert.match(r.sample || '', /fuel 5\.1% of goods exports \(2024\)/);
});
