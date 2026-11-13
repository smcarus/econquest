import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { remittanceProfile, remitSentence, REMIT_IDS } from '../src/utils/remittances.ts';
import { OFFICIAL_FIGURES } from '../src/utils/officialHistory.ts';
import { PANELS } from '../src/i18n/messages/panels.ts';

const run = (from: number, vals: number[]) => vals.map((value, i) => ({ year: from + i, value }));

const series = {
  remittances_usd: run(2014, [5, 5.5, 6, 6.2, 7, 7.5, 8, 9, 10, 11, 12]),
  remittances: run(2014, [4, 4.2, 4.4, 4.5, 4.8, 5, 5.2, 5.5, 5.8, 6, 6.1]),
  exports_usd: run(2014, [40, 35, 36, 38, 39, 40, 30, 42, 45, 44, 48]),
  fdi_in_usd: run(2014, [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, -0.5]),
  aid_usd: run(2014, [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.4]),
  remittance_cost: run(2016, [8, 7.5, 7, 6.8, 6.5]),
  remittances_paid_usd: run(2018, [0.4, 0.45]),
};

test('profile: latest year, same-year comparison, ten years, change, years exports fell, cost, paid', () => {
  const p = remittanceProfile(series, 2026);
  assert.deepEqual(p.latest, { year: 2024, usd: 12, pctGdp: 6.1 });
  assert.deepEqual(p.compare, [
    { id: 'exports_usd', usd: 48, ratio: 0.25 },
    { id: 'fdi_in_usd', usd: -0.5 },
    { id: 'aid_usd', usd: 2.4, ratio: 5 },
  ]);
  assert.equal(p.years.length, 10);
  assert.equal(p.years[0].year, 2015);
  assert.deepEqual(p.change, { from: 2015, to: 2024, pct: 118.2 });
  assert.deepEqual(p.exportFalls, [
    { year: 2015, exportsPct: -12.5, remittancesPct: 10 },
    { year: 2020, exportsPct: -25, remittancesPct: 6.7 },
    { year: 2023, exportsPct: -2.2, remittancesPct: 10 },
  ]);
  assert.deepEqual(p.cost, { year: 2020, pct: 6.5, aboveTarget: true });
  assert.deepEqual(p.paid, { year: 2019, usd: 0.45 });
  const s = remitSentence(p, 'Testland');
  assert.match(s, /Testland received US\$12\.0 bn in remittances in 2024 \(6\.1% of GDP\); 25% of exports of goods and services; 5\.0 times net aid\./);
  assert.match(s, /Sending US\$200 cost 6\.5% on average in 2020 \(UN goal below 3%\)/);
  assert.ok(!/direct investment/.test(s), 'no ratio to a net outflow');
});

test('profile: cut at the year asked for, and Missing with the reason', () => {
  const cut = remittanceProfile(series, 2021);
  assert.equal(cut.latest?.year, 2020);
  assert.equal(cut.cost?.year, 2020);
  const none = remittanceProfile({}, 2026, false);
  assert.equal(none.latest, undefined);
  assert.match(none.latestMissing!, /No saved World Bank history/);
  assert.match(none.costMissing!, /does not cover this country/);
  assert.match(remittanceProfile({}, 2026, true).latestMissing!, /publishes no remittance figure/);
  assert.deepEqual(none.compare, []);
  assert.match(remitSentence(none, 'X'), /Missing/);
});

test('saved series and wiring: five new World Bank figures, the route, the panel and its text', () => {
  for (const [id, code] of [['remittances_usd', 'BX.TRF.PWKR.CD.DT'], ['remittances_paid_usd', 'BM.TRF.PWKR.CD.DT'], ['fdi_in_usd', 'BX.KLT.DINV.CD.WD'], ['aid_usd', 'DT.ODA.ODAT.CD'], ['remittance_cost', 'SI.RMT.COST.IB.ZS']]) {
    assert.ok(OFFICIAL_FIGURES.some((f) => f.id === id && f.code === code && f.source === 'wb'), id);
  }
  for (const id of REMIT_IDS) assert.ok(OFFICIAL_FIGURES.some((f) => f.id === id), id);
  assert.equal(OFFICIAL_FIGURES.find((f) => f.id === 'remittances_usd')!.transform!(2_500_000_000), 2.5);
  assert.match(readFileSync('src/server/routes/analysis.ts', 'utf8'), /app\.get\('\/api\/remittances\/:iso3'/);
  assert.match(readFileSync('src/components/CountryPage.tsx', 'utf8'), /<RemittancesPanel key=\{`rm-\$\{run\.iso3\}`\}/);
  const panel = readFileSync('src/components/RemittancesPanel.tsx', 'utf8');
  const keys = new Set([...panel.matchAll(/'(rm_[a-zA-Z]+)'/g)].map((m) => m[1]));
  assert.ok(keys.size >= 25);
  for (const k of keys) assert.ok(k in PANELS.en, k);
});
