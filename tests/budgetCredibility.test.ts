import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { budgetCredibility, bcSentence, bandFor, gradeOf, BC_IDS } from '../src/utils/budgetCredibility.ts';
import { OFFICIAL_FIGURES } from '../src/utils/officialHistory.ts';
import { PANELS } from '../src/i18n/messages/panels.ts';
import { checkConnections } from '../src/utils/connectionCheck.ts';

const pts = (o: Record<number, number>) => Object.entries(o).map(([y, value]) => ({ year: Number(y), value }));

test('PEFA PI-1 bands and the two-of-three grade', () => {
  assert.equal(bandFor(100), 'A');
  assert.equal(bandFor(95), 'A');
  assert.equal(bandFor(105), 'A');
  assert.equal(bandFor(94.9), 'B');
  assert.equal(bandFor(110), 'B');
  assert.equal(bandFor(85), 'C');
  assert.equal(bandFor(115.1), 'D');
  assert.equal(bandFor(60), 'D');
  assert.equal(gradeOf(['A', 'A', 'D']), 'A');
  assert.equal(gradeOf(['A', 'C', 'D']), 'C');
  assert.equal(gradeOf(['D', 'B', 'B']), 'B');
  assert.equal(gradeOf(['D', 'D', 'A']), 'D');
});

test('years, latest, grade over the latest three years, average gap and the sentence', () => {
  const b = budgetCredibility({ budget_outturn: pts({ 2012: 120, 2013: 99, 2019: 92.5, 2020: 81.04, 2021: 97, 2026: 100 }) }, 2026);
  assert.deepEqual(b.latest, { year: 2021, pct: 97, gap: -3, band: 'A' });
  assert.equal(b.years.length, 5);
  assert.deepEqual(b.years[3], { year: 2020, pct: 81, gap: -19, band: 'D' });
  assert.deepEqual(b.grade, { band: 'B', from: 2019, to: 2021 });
  assert.equal(b.underYears, 4);
  assert.equal(b.avgAbsGap, 10.1);
  assert.equal(
    bcSentence(b, 'Testland'),
    "Testland's government spent 97% of its approved budget in 2021, 3% less than parliament approved (PEFA band A). On the PEFA PI-1 rule, 2019-2021 grades B (worked out by the app, not the official PEFA score). Over the 5 published years, spending was 10.1% from the budget on average, and below it in 4.",
  );
});

test('no grade without three years in a row; Missing with the reason; only 15 years shown', () => {
  const gap = budgetCredibility({ budget_outturn: pts({ 2018: 90, 2020: 95, 2021: 101 }) }, 2026);
  assert.equal(gap.grade, undefined);
  assert.match(gap.gradeMissing!, /latest three years in a row/);
  const none = budgetCredibility({}, 2026, false);
  assert.match(none.latestMissing!, /No saved World Bank history/);
  assert.match(budgetCredibility({ budget_outturn: [] }, 2026, true).latestMissing!, /PEFA assessments/);
  assert.match(bcSentence(none, 'X'), /Missing/);
  const long = budgetCredibility({ budget_outturn: pts(Object.fromEntries(Array.from({ length: 20 }, (_, i) => [2000 + i, 100]))) }, 2026);
  assert.equal(long.years.length, 15);
  assert.equal(long.years[0].year, 2005);
  assert.match(bcSentence(long, 'X'), /exactly parliament approved/);
});

test('wiring: World Bank figure, route, panel, tool slot, register and text keys', () => {
  assert.ok(OFFICIAL_FIGURES.some((f) => f.id === 'budget_outturn' && f.code === 'GF.XPD.BUDG.ZS' && f.source === 'wb'));
  for (const id of BC_IDS) assert.ok(OFFICIAL_FIGURES.some((f) => f.id === id), id);
  assert.match(readFileSync('src/server/routes/analysis.ts', 'utf8'), /app\.get\('\/api\/budget-credibility\/:iso3'/);
  const page = readFileSync('src/components/CountryPage.tsx', 'utf8');
  assert.match(page, /<BudgetCredibilityPanel key=\{`bc-\$\{run\.iso3\}`\}/);
  assert.match(page, /lazyNamed\(\(\) => import\('\.\/BudgetCredibilityPanel'\)/);
  assert.match(readFileSync('src/utils/countryTools.ts', 'utf8'), /'tool-budget-credibility'/);
  assert.match(readFileSync('src/data/modelRegister.ts', 'utf8'), /id: 'budget_credibility'/);
  assert.match(readFileSync('src/data/toolsCatalog.ts', 'utf8'), /anchor: 'tool-budget-credibility'/);
  const panel = readFileSync('src/components/BudgetCredibilityPanel.tsx', 'utf8');
  const keys = new Set([...panel.matchAll(/'(bc_[a-zA-Z0-9]+)'/g)].map((m) => m[1]));
  assert.ok(keys.size >= 18, String(keys.size));
  for (const k of keys) assert.ok(k in PANELS.en, k);
});

test('Data health row', async () => {
  const fetchFn = async (url: string) => new Response(JSON.stringify(url.includes('GF.XPD.BUDG.ZS') ? [{ page: 1 }, [{ date: '2023', value: null }, { date: '2021', value: 91.234 }]] : []), { status: 200 });
  const rep = await checkConnections({ env: {}, only: ['wb_budget_credibility'], fetchFn } as never);
  const row = rep.results.find((r) => r.id === 'wb_budget_credibility')!;
  assert.equal(row.state, 'connected');
  assert.match(row.sample || '', /spent 91\.2% of its approved budget \(2021\)/);
});
