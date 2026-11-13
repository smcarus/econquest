import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { commodityTerms, ctSentence, CT_IDS, DEPENDENCE_LINE, GROUP_PRICES } from '../src/utils/commodityTerms.ts';
import { PINK_COMMODITIES, type PriceMove } from '../src/utils/commodityPrices.ts';
import { OFFICIAL_FIGURES } from '../src/utils/officialHistory.ts';
import { PANELS } from '../src/i18n/messages/panels.ts';

const pts = (o: Record<number, number>) => Object.entries(o).map(([y, value]) => ({ year: Number(y), value }));

const series = {
  export_fuel: pts({ 2022: 35, 2023: 40 }),
  export_ores_metals: pts({ 2022: 9, 2023: 10 }),
  export_food: pts({ 2022: 18, 2023: 20 }),
  import_fuel: pts({ 2023: 15 }),
  import_ores_metals: pts({ 2023: 2 }),
  import_food: pts({ 2023: 12 }),
  merch_exports_usd: pts({ 2023: 30 }),
  merch_imports_usd: pts({ 2023: 25 }),
  gdp_usd: pts({ 2023: 100, 2025: 120 }),
  terms_of_trade: pts({ 2017: 90, 2018: 95, 2022: 100, 2023: 110 }),
};

const mv = (code: string, change12mPct?: number, change1mPct?: number, source: PriceMove['source'] = 'pink_sheet', asOf = '2026-10'): PriceMove => ({
  code,
  name: code,
  unit: '$/mt',
  source,
  asOf,
  latest: 1,
  ...(change12mPct !== undefined ? { change12mPct } : {}),
  ...(change1mPct !== undefined ? { change1mPct } : {}),
});

const moves = [mv('CRUDE_PETRO', -20, 2), mv('COPPER', 10), mv('IRON_ORE', -10), mv('ALUMINUM', 5), mv('NICKEL', undefined, 1), mv('MAIZE', 5, -1, 'pink_sheet', '2026-09'), mv('CRUDE_BRENT', 50, 50, 'eia', '2026-11-10')];

test('shares, trade against GDP, price moves and effect for one year; dependence against the UNCTAD line', () => {
  const c = commodityTerms(series, moves, 2025);
  assert.equal(c.mixYear, 2023);
  assert.equal(c.commodityExportShare, 70);
  assert.equal(c.dependent, true);
  assert.equal(DEPENDENCE_LINE, 60);
  assert.equal(c.exportsPctGdp, 30);
  assert.equal(c.importsPctGdp, 25);
  assert.equal(c.pricesAsOf, '2026-10');
  const [fuel, ores, food] = c.groups;
  assert.deepEqual({ id: fuel.id, m12: fuel.move12m, m1: fuel.move1m, x: fuel.exportShare, m: fuel.importShare, e: fuel.effectPctGdp }, { id: 'fuel', m12: -20, m1: 2, x: 40, m: 15, e: -1.65 });
  assert.equal(ores.move12m, 1.7);
  assert.equal(ores.move1m, 1);
  assert.equal(ores.effectPctGdp, 0.04);
  assert.equal(ores.prices.length, 4);
  assert.equal(food.effectPctGdp, 0.15);
  assert.equal(c.netEffectPctGdp, -1.46);
  assert.deepEqual({ ...c.tot, years: c.tot!.years.length }, { year: 2023, value: 110, change1y: 10, change5y: 15.8, years: 4 });
  assert.equal(
    ctSentence(c, 'Testland'),
    "In 2023, fuel 40%, ores and metals 10%, food 20% of Testland's goods exports (70% together); at the 12-month price moves to 2026-10, the net effect is about -1.5% of GDP a year if prices hold. Terms of trade index 110 in 2023 (2015 = 100), +10.0% on the year.",
  );
});

test('EIA daily prices are not mixed in; no prices, no GDP, no history each say Missing with the reason', () => {
  const noPink = commodityTerms(series, [mv('CRUDE_BRENT', 50, 50, 'eia')], 2025);
  assert.match(noPink.pricesMissing!, /Pink Sheet has not answered/);
  assert.equal(noPink.netEffectPctGdp, undefined);
  assert.equal(noPink.groups[0].move12m, undefined);
  assert.equal(commodityTerms(series, null, 2025).pricesMissing, noPink.pricesMissing);
  const noGdp = commodityTerms({ ...series, gdp_usd: [] }, moves, 2025);
  assert.match(noGdp.effectMissing!, /year of the trade shares/);
  assert.equal(noGdp.groups[0].effectPctGdp, undefined);
  assert.equal(noGdp.mixYear, 2023);
  const none = commodityTerms({}, moves, 2026, false);
  assert.match(none.mixMissing!, /No saved World Bank history/);
  assert.match(none.totMissing!, /No saved World Bank history/);
  assert.match(commodityTerms({}, moves, 2026, true).mixMissing!, /no goods trade breakdown/);
  assert.match(ctSentence(none, 'X'), /Missing/);
  // A year at or after beforeYear is never used.
  assert.equal(commodityTerms(series, moves, 2023).mixYear, 2022);
});

test('every group price is a Pink Sheet commodity the app reads', () => {
  const codes = new Set(PINK_COMMODITIES.map((c) => c.code));
  for (const list of Object.values(GROUP_PRICES)) for (const c of list) assert.ok(codes.has(c), c);
});

test('saved series and wiring: goods trade in US$, the route, the panel and its text', () => {
  for (const [id, code] of [['merch_exports_usd', 'TX.VAL.MRCH.CD.WT'], ['merch_imports_usd', 'TM.VAL.MRCH.CD.WT']]) {
    assert.ok(OFFICIAL_FIGURES.some((f) => f.id === id && f.code === code && f.source === 'wb'), id);
  }
  for (const id of CT_IDS) assert.ok(OFFICIAL_FIGURES.some((f) => f.id === id), id);
  assert.match(readFileSync('src/server/routes/analysis.ts', 'utf8'), /app\.get\('\/api\/commodity-terms\/:iso3'/);
  assert.match(readFileSync('src/components/CountryPage.tsx', 'utf8'), /<CommodityTermsPanel key=\{`ct-\$\{run\.iso3\}`\}/);
  const panel = readFileSync('src/components/CommodityTermsPanel.tsx', 'utf8');
  const keys = new Set([...panel.matchAll(/'(ct_[a-zA-Z0-9_]+)'/g)].map((m) => m[1]));
  assert.ok(keys.size >= 25, String(keys.size));
  for (const k of keys) assert.ok(k in PANELS.en, k);
});
