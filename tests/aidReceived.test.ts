import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { aidProfile, aidSentence, AID_IDS, DONOR_IDS } from '../src/utils/aidReceived.ts';
import { OFFICIAL_FIGURES } from '../src/utils/officialHistory.ts';
import { PANELS } from '../src/i18n/messages/panels.ts';

const pts = (o: Record<number, number>) => Object.entries(o).map(([y, value]) => ({ year: Number(y), value }));

const series = {
  aid_usd: pts({ 2014: 1.0, 2015: 1.2, 2016: 1.5, 2017: 1.4, 2018: 1.3, 2019: 1.25, 2020: 1.6, 2021: 1.8, 2022: 1.5, 2023: 1.2, 2024: 0.9 }),
  aid_gni: pts({ 2023: 6.1, 2024: 4.56 }),
  aid_per_person: pts({ 2024: 18.25 }),
  aid_gov_expense: pts({ 2023: 30, 2024: 21.04 }),
  aid_investment: pts({ 2023: 15 }),
  aid_from_usa: pts({ 2023: 0.3 }),
  aid_from_eu: pts({ 2023: 0.12 }),
  aid_from_fra: pts({ 2023: -0.01 }),
  aid_from_deu: pts({ 2025: 0.5 }),
};

test('latest year with ratios from that same year, ten years, change, peak and six donors', () => {
  const a = aidProfile(series, 2025);
  assert.deepEqual(a.latest, { year: 2024, usd: 0.9, gni: 4.6, perPerson: 18.3, govExpense: 21 });
  assert.equal(a.years.length, 10);
  assert.equal(a.years[0].year, 2015);
  assert.deepEqual(a.years[9], { year: 2024, usd: 0.9, gni: 4.6 });
  assert.equal(a.change1y, -25);
  assert.deepEqual(a.peak, { year: 2021, usd: 1.8, belowPct: 50 });
  assert.equal(a.donorYear, 2023);
  assert.deepEqual(a.donors, [
    { id: 'aid_from_usa', usd: 0.3, sharePct: 25 },
    { id: 'aid_from_eu', usd: 0.12, sharePct: 10 },
    { id: 'aid_from_fra', usd: -0.01, sharePct: -0.8 },
  ]);
  assert.equal(
    aidSentence(a, 'Testland'),
    'Testland received US$900 m in net development aid in 2024; 4.6% of GNI; 21% of central government spending; US$18.3 per person. That is 50% below 2021, the highest of the last ten years. Largest of six listed donors in 2023: United States 25%, EU institutions 10%.',
  );
});

test('a ratio from another year is not used; Missing with the reason', () => {
  const a = aidProfile(series, 2025);
  assert.equal(a.latest?.investment, undefined);
  assert.equal(a.latest?.imports, undefined);
  const none = aidProfile({}, 2026, false);
  assert.match(none.latestMissing!, /No saved World Bank history/);
  assert.match(aidProfile({}, 2026, true).latestMissing!, /no development aid figure/);
  assert.match(aidSentence(none, 'X'), /Missing/);
  assert.deepEqual(none.donors, []);
  // No donor figures at all: no donor year.
  assert.equal(aidProfile({ aid_usd: series.aid_usd }, 2025).donorYear, undefined);
});

test('saved series and wiring: eleven new World Bank figures, the route, the panel and its text', () => {
  const codes: Array<[string, string]> = [
    ['aid_gni', 'DT.ODA.ODAT.GN.ZS'],
    ['aid_per_person', 'DT.ODA.ODAT.PC.ZS'],
    ['aid_gov_expense', 'DT.ODA.ODAT.XP.ZS'],
    ['aid_imports', 'DT.ODA.ODAT.MP.ZS'],
    ['aid_investment', 'DT.ODA.ODAT.GI.ZS'],
    ['aid_from_usa', 'DC.DAC.USAL.CD'],
    ['aid_from_deu', 'DC.DAC.DEUL.CD'],
    ['aid_from_gbr', 'DC.DAC.GBRL.CD'],
    ['aid_from_fra', 'DC.DAC.FRAL.CD'],
    ['aid_from_jpn', 'DC.DAC.JPNL.CD'],
    ['aid_from_eu', 'DC.DAC.CECL.CD'],
  ];
  for (const [id, code] of codes) assert.ok(OFFICIAL_FIGURES.some((f) => f.id === id && f.code === code && f.source === 'wb'), id);
  for (const id of AID_IDS) assert.ok(OFFICIAL_FIGURES.some((f) => f.id === id), id);
  assert.equal(DONOR_IDS.length, 6);
  assert.match(readFileSync('src/server/routes/analysis.ts', 'utf8'), /app\.get\('\/api\/aid\/:iso3'/);
  assert.match(readFileSync('src/components/CountryPage.tsx', 'utf8'), /<AidPanel key=\{`ad-\$\{run\.iso3\}`\}/);
  const panel = readFileSync('src/components/AidPanel.tsx', 'utf8');
  const keys = new Set([...panel.matchAll(/'(ad_[a-zA-Z0-9]+)'/g)].map((m) => m[1]));
  assert.ok(keys.size >= 25, String(keys.size));
  for (const k of keys) assert.ok(k in PANELS.en, k);
});
