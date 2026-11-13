import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { financialInclusion, fiSentence, FI_IDS } from '../src/utils/financialInclusion.ts';
import { OFFICIAL_FIGURES } from '../src/utils/officialHistory.ts';
import { PANELS } from '../src/i18n/messages/panels.ts';

const pts = (o: Record<number, number>) => Object.entries(o).map(([y, value]) => ({ year: Number(y), value }));

const series = {
  account_all: pts({ 2014: 28.6, 2017: 42.1, 2021: 54.37, 2025: 61 }),
  account_women: pts({ 2017: 36, 2021: 49.2 }),
  account_men: pts({ 2017: 48, 2021: 59.6 }),
  account_poorest40: pts({ 2021: 41.5 }),
  account_richest60: pts({ 2021: 63.1 }),
  bank_branches: pts({ 2022: 5.1, 2023: 5.3 }),
  atms: pts({ 2023: 10.2 }),
  private_credit_wb: pts({ 2023: 21.44 }),
};

test('latest survey before the year, previous survey, gaps within that same survey', () => {
  const f = financialInclusion(series, 2025);
  assert.deepEqual(f.account, { year: 2021, value: 54.4, previous: { year: 2017, value: 42.1 } });
  assert.deepEqual(f.genderGap, { year: 2021, women: 49.2, men: 59.6, gap: 10.4 });
  assert.deepEqual(f.incomeGap, { year: 2021, poorest40: 41.5, richest60: 63.1, gap: 21.6 });
  assert.deepEqual(f.branches, { year: 2023, value: 5.3 });
  assert.deepEqual(f.atms, { year: 2023, value: 10.2 });
  assert.deepEqual(f.privateCredit, { year: 2023, value: 21.4 });
  assert.equal(
    fiSentence(f, 'Testland'),
    'In Testland, 54.4% of adults had an account in 2021 (42.1% in 2017); women 49.2%, men 59.6%; poorest 40% of households 41.5%, richest 60% 63.1%. Credit to households and firms from domestic lenders was 21.4% of GDP in 2023.',
  );
});

test('no gap when the split is from another survey year; Missing with the reason', () => {
  const f = financialInclusion(series, 2026);
  assert.equal(f.account?.year, 2025);
  assert.equal(f.genderGap, undefined);
  assert.equal(f.incomeGap, undefined);
  const none = financialInclusion({}, 2026, false);
  assert.match(none.accountMissing!, /No saved World Bank history/);
  assert.match(financialInclusion({}, 2026, true).accountMissing!, /Global Findex survey has not covered/);
  assert.match(fiSentence(none, 'X'), /Missing/);
});

test('saved series and wiring: eight World Bank figures, the route, the panel and its text', () => {
  for (const [id, code] of [['account_all', 'FX.OWN.TOTL.ZS'], ['account_women', 'FX.OWN.TOTL.FE.ZS'], ['account_men', 'FX.OWN.TOTL.MA.ZS'], ['account_poorest40', 'FX.OWN.TOTL.40.ZS'], ['account_richest60', 'FX.OWN.TOTL.60.ZS'], ['bank_branches', 'FB.CBK.BRCH.P5'], ['atms', 'FB.ATM.TOTL.P5'], ['private_credit_wb', 'FS.AST.PRVT.GD.ZS']]) {
    assert.ok(OFFICIAL_FIGURES.some((f) => f.id === id && f.code === code && f.source === 'wb'), id);
  }
  for (const id of FI_IDS) assert.ok(OFFICIAL_FIGURES.some((f) => f.id === id), id);
  assert.match(readFileSync('src/server/routes/analysis.ts', 'utf8'), /app\.get\('\/api\/financial-inclusion\/:iso3'/);
  assert.match(readFileSync('src/components/CountryPage.tsx', 'utf8'), /<FinancialInclusionPanel key=\{`fi-\$\{run\.iso3\}`\}/);
  const panel = readFileSync('src/components/FinancialInclusionPanel.tsx', 'utf8');
  const keys = new Set([...panel.matchAll(/'(fi_[a-zA-Z0-9]+)'/g)].map((m) => m[1]));
  assert.ok(keys.size >= 20);
  for (const k of keys) assert.ok(k in PANELS.en, k);
});
