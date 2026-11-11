import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

// An empty data folder, as on a first run (read by the energy file download below).
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'owid-energy-'));

const { climateFromSnapshot, energyColumns, energyMixValue, oilGasShare, parseOwidEnergy, pickClimateRow, OWID_ENERGY_LEGACY_URL, OWID_ENERGY_URL } = await import('../src/utils/climateEnergy.ts');
const { climateRows, economistBrief, ECONOMIST_SECTIONS } = await import('../src/utils/countryNotes.ts');
const { getSnapshotDataStatus } = await import('../src/utils/dataStatus.ts');
const { buildBaselineOpenData } = await import('../src/data/presetsAndBaselines.ts');
const { figureRows, FIGURES_HEADER } = await import('../src/utils/csvExport.ts');
const { OFFICIAL_FIGURES } = await import('../src/utils/officialHistory.ts');
const { seriesTags, COVERAGE } = await import('../src/utils/seriesDefinitions.ts');
const { figureHelp, panelIntro } = await import('../src/data/glossary.ts');
const { DATA_LICENCES } = await import('../src/data/dataLicences.ts');
const { planCouncil, runCouncil } = await import('../src/utils/askCouncil.ts');
const { checkConnections } = await import('../src/utils/connectionCheck.ts');
type Snap = import('../src/types/council.ts').OpenDataSnapshot;
type Run = import('../src/types/council.ts').CouncilAssessmentRun;
type Item = import('../src/types/council.ts').WatchlistItem;

const WB_LIVE = ['World Bank Open Data v2 (2025 Live)'];

// Both layouts: the current file (columns renamed 2026-09-10) and the older one.
const CURRENT = [
  'country,year,iso_code,population,coal_energy_share_pct,gas_energy_share_pct,nuclear_energy_share_pct,oil_energy_share_pct,renewables_energy_share_pct',
  'Egypt,2023,EGY,1,1.9,52.0,0.0,40.1,5.9',
  'Egypt,2024,EGY,1,1.7,53.3,0.0,39.2,5.8',
  '"Bonaire, Sint Eustatius and Saba",2024,BES,1,,,,,',
  'World,2024,,1,25,23,4,31,15',
  'Kenya,2024,KEN,1,,,,,',
].join('\n');
const LEGACY = ['country,year,iso_code,coal_share_energy,oil_share_energy,gas_share_energy,nuclear_share_energy,renewables_share_energy', 'Turkey,2024,TUR,24.0,31.7,24.5,0,19.8'].join('\r\n');

test('the energy file: both column layouts, the latest year per country, regions and empty rows left out', () => {
  const cur = parseOwidEnergy(CURRENT)!;
  assert.deepEqual(Object.keys(cur), ['EGY']);
  assert.deepEqual(cur.EGY, { year: '2024', shares: { coal: 1.7, oil: 39.2, gas: 53.3, nuclear: 0, renewables: 5.8 } });
  assert.equal(energyMixValue(cur.EGY), 'gas 53.3%, oil 39.2%, renewables 5.8%, coal 1.7%, nuclear 0.0% (2024)');
  assert.equal(oilGasShare(cur.EGY), 92.5);
  assert.equal(parseOwidEnergy(LEGACY)!.TUR.shares.renewables, 19.8);
  assert.equal(parseOwidEnergy('country,year,iso_code,population\nX,2024,XXX,1'), null, 'no energy mix columns');
  assert.equal(energyColumns('a,b'), null);
});

test('World Bank rows: emissions and the renewable share between 0 and 100, the latest year', () => {
  assert.deepEqual(pickClimateRow('ghgPerHeadT', [{ date: '2025', value: null }, { date: '2024', value: 2.31 }]), { value: 2.31, year: '2024' });
  assert.equal(pickClimateRow('renewableSharePct', [{ date: '2022', value: 140 }]), undefined);
  assert.equal(pickClimateRow('renewableSharePct', null), undefined);
});

function snap(tweak: (s: Snap) => void = () => {}, sources = WB_LIVE): Snap {
  const s = buildBaselineOpenData('EGY');
  s.dataStatus = { verifiedLiveSources: sources, checkedAt: '2026-11-11T12:00:00Z' };
  s.liveFields = {};
  tweak(s);
  return s;
}
const all = (s: Snap) => {
  Object.assign(s.worldBankIndicators, { ghgPerHeadT: 3.12, renewableSharePct: 5.4 });
  s.liveFields = { 'wb.ghgPerHeadT': 'World Bank, 2024', 'wb.renewableSharePct': 'World Bank, 2022' };
  s.energyMix = { pulledAt: '2026-11-10T03:00:00Z', file: 'current', mix: parseOwidEnergy(CURRENT)!.EGY };
};
const run = (s: Snap) => ({ iso3: s.iso3, countryName: s.countryName, openData: s }) as unknown as Run;

test('the brief group "Climate and energy": figures with their years and terms, or Missing with a reason', () => {
  assert.deepEqual(climateFromSnapshot(snap(all)), { ghgPerHeadT: { value: 3.12, year: '2024' }, renewableSharePct: { value: 5.4, year: '2022' } });
  const g = economistBrief(run(snap(all))).groups.find((x) => x.title === 'Climate and energy')!;
  const by = (l: string) => g.rows.find((r) => r.label === l)!;
  assert.equal(by('Greenhouse gas emissions per person').value, '3.1 tonnes of CO2 equivalent (2024)');
  assert.equal(by('Renewable share of energy use').value, '5.4% of final energy use (2022)');
  assert.equal(by('Energy mix').value, 'gas 53.3%, oil 39.2%, renewables 5.8%, coal 1.7%, nuclear 0.0% (2024)');
  assert.match(by('Energy mix').source, /Energy Institute terms: private, non-commercial use only; downloaded on this computer, not shipped/);
  assert.match(by('Energy mix').source, /downloaded 2026-11-10/);
  assert.equal(by('Physical climate risk (ND-GAIN)').source, 'ND-GAIN states no licence');
  for (const r of g.rows) assert.ok(figureHelp(r.label), r.label);
  assert.ok(panelIntro('Climate and energy'));
  assert.equal(ECONOMIST_SECTIONS.climate, 'Climate and energy');

  const none = snap();
  const rows = climateRows(getSnapshotDataStatus(none), none);
  assert.ok(rows.every((r) => r.missing));
  assert.equal(rows.find((r) => r.label === 'Energy mix')!.source, 'Energy file not downloaded yet');
  const notCovered = snap((s) => (s.energyMix = { pulledAt: '2026-11-10T03:00:00Z', file: 'legacy' }));
  assert.equal(climateRows(getSnapshotDataStatus(notCovered), notCovered).find((r) => r.label === 'Energy mix')!.source, 'Not in the Energy Institute figures');
  const legacy = snap((s) => (s.energyMix = { pulledAt: '2026-11-10T03:00:00Z', file: 'legacy', mix: parseOwidEnergy(LEGACY)!.TUR }));
  assert.match(climateRows(getSnapshotDataStatus(legacy), legacy).find((r) => r.label === 'Energy mix')!.source, /older file, no longer updated/);
});

test('downloads, History & data series and the licence row', () => {
  const col = (h: string) => FIGURES_HEADER.indexOf(h);
  const g = figureRows(snap(all)).find((r) => r[col('field')] === 'wb.ghgPerHeadT')!;
  assert.equal(g[col('value')], 3.12);
  assert.equal(g[col('period')], '2024');
  for (const id of ['ghg_per_head', 'renewable_share']) {
    assert.ok(OFFICIAL_FIGURES.some((f) => f.id === id && f.source === 'wb'), id);
    assert.notEqual(seriesTags({ id }).definition, COVERAGE.notStated, id);
  }
  const lic = DATA_LICENCES.find((r) => r.id === 'owid_energy')!;
  assert.equal(lic.share, 'restricted');
  assert.match(lic.flag || '', /never ship/);
});

test('the Global Spillover Agent quotes the energy mix when the copy has it; nothing when not', () => {
  const base = { fuelImportsPctMerch: 10, fuelExportsPctMerch: 20, importsPctGdp: 25, exportsPctGdp: 15, wbYear: '2023' };
  const item = { iso3: 'EGY', countryName: 'Egypt', trade: base, energyMix: { pulledAt: '2026-11-10T03:00:00Z', file: 'current', mix: parseOwidEnergy(CURRENT)!.EGY } } as unknown as Item;
  const q = 'How exposed is Egypt to a Hormuz closure?';
  const sp = runCouncil(q, planCouncil(q, [item]), [item]).find((a) => a.id === 'spill')!.findings[0];
  const f = sp.figures.find((x) => x.label === 'Energy mix')!;
  assert.match(f.value, /^gas 53\.3%/);
  assert.match(f.source, /private, non-commercial use only/);
  const bare = { iso3: 'EGY', countryName: 'Egypt', trade: base } as unknown as Item;
  assert.ok(!runCouncil(q, planCouncil(q, [bare]), [bare]).find((a) => a.id === 'spill')!.findings[0].figures.some((x) => x.label === 'Energy mix'));
});

test('the energy file download: the current file first, the older one when it fails, kept for a week', async () => {
  const mod = await import('../src/server/feeds/owidEnergy.ts');
  mod.resetOwidEnergyForTests();
  const asked: string[] = [];
  const realFetch = globalThis.fetch;
  const realWarn = console.warn;
  console.warn = () => {};
  globalThis.fetch = (async (input: unknown) => {
    const url = String(input);
    asked.push(url);
    return url === OWID_ENERGY_URL ? new Response('not found', { status: 404 }) : new Response(LEGACY, { status: 200 });
  }) as typeof fetch;
  try {
    const got = (await mod.fetchOwidEnergyPull())!;
    assert.deepEqual(asked, [OWID_ENERGY_URL, OWID_ENERGY_LEGACY_URL]);
    assert.equal(got.file, 'legacy');
    assert.equal(got.countries.TUR.year, '2024');
    assert.ok(fs.existsSync(path.join(process.env.DATA_DIR!, 'live', 'owid-energy.json')));
    await mod.fetchOwidEnergyPull();
    assert.equal(asked.length, 2, 'a copy less than a week old is not downloaded again');
    mod.resetOwidEnergyForTests();
    assert.equal(mod.loadOwidEnergy()!.countries.TUR.shares.oil, 31.7, 'read back from disk');
  } finally {
    globalThis.fetch = realFetch;
    console.warn = realWarn;
  }
});

test('Data health rows', async () => {
  const fetchFn = async (url: string) =>
    new Response(url.includes('EN.GHG.ALL.PC') ? JSON.stringify([{ page: 1 }, [{ date: '2024', value: 2.31 }]]) : url === OWID_ENERGY_URL ? CURRENT.slice(0, 200) : '[]', { status: url === OWID_ENERGY_URL ? 206 : 200 });
  const rep = await checkConnections({ env: {}, only: ['worldbank_climate', 'owid_energy'], fetchFn } as never);
  const wb = rep.results.find((r) => r.id === 'worldbank_climate')!;
  assert.equal(wb.state, 'connected');
  assert.match(wb.sample || '', /2\.3 tonnes CO2e per person \(2024\)/);
  assert.equal(rep.results.find((r) => r.id === 'owid_energy')!.state, 'connected');
  const renamed = await checkConnections({ env: {}, only: ['owid_energy'], fetchFn: async () => new Response('country,year,iso_code,population\n', { status: 206 }) } as never);
  assert.equal(renamed.results[0].state, 'bad_reply');
});
