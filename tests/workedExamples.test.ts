import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { WORKED_EXAMPLES, WORKED_MISSING, lineText, memoDraft, workedFigures, workedLines, workedTexts } from '../src/utils/workedExamples';
import { WORKED_TEXT_ES } from '../src/i18n/es/workedText';
import { WORKED_TEXT_FR } from '../src/i18n/fr/workedText';
import { ES_TEXT } from '../src/i18n/es';
import { FR_TEXT } from '../src/i18n/fr';
import { WORKED_TEXT_PT } from '../src/i18n/pt/workedText';
import { PT_TEXT } from '../src/i18n/pt';
import type { OpenDataSnapshot } from '../src/types/council';

/** A snapshot whose built-in numbers are all 99, with only the fields in `live` marked live. */
function snap(live: Record<string, [number, string?]>): OpenDataSnapshot {
  const imf: Record<string, unknown> = { sourceUrl: '', years: {} };
  const wb: Record<string, unknown> = { sourceUrl: '' };
  const market: Record<string, unknown> = {};
  for (const k of ['debtToGdpPct', 'debtToGdpForecast2027Pct', 'primaryFiscalBalancePct', 'realGdpGrowthPct', 'cpiInflationPct', 'outputGapPct', 'unemploymentPct', 'revenuePct', 'expenditurePct', 'overallBalancePct', 'currentAccountImfPct']) imf[k] = 99;
  for (const k of ['fxReservesMonthsImport', 'externalDebtPctGni', 'interestPctRevenue', 'taxRevenuePctGdp', 'giniIndex']) wb[k] = 99;
  for (const k of ['policyRatePct', 'exchangeRatePerUsd', 'fxYtdChangePct', 'sovereign10YBondYieldPct']) market[k] = 99;
  const liveFields: Record<string, string> = {};
  for (const [path, [value, year]] of Object.entries(live)) {
    const [g, k] = path.split('.');
    (g === 'imf' ? imf : g === 'wb' ? wb : market)[k] = value;
    liveFields[path] = g === 'imf' ? 'IMF WEO' : g === 'wb' ? 'World Bank' : 'Feed';
    if (year) (imf.years as Record<string, string>)[path] = year;
  }
  return {
    iso3: 'TST',
    countryName: 'Testland',
    liveFields,
    dataStatus: { verifiedLiveSources: ['IMF WEO', 'World Bank'], checkedAt: '2026-11-12T00:00:00Z' },
    imfIndicators: imf,
    worldBankIndicators: wb,
    monetaryAndMarket: market,
  } as unknown as OpenDataSnapshot;
}

const byId = (id: string) => WORKED_EXAMPLES.find((e) => e.id === id)!;

test('four worked examples, each ending with the memo step', () => {
  assert.deepEqual(WORKED_EXAMPLES.map((e) => e.id), ['debt', 'inflation', 'currency', 'policy']);
  for (const e of WORKED_EXAMPLES) {
    assert.equal(e.steps.at(-1)!.title, 'Write the memo');
    assert.ok(e.steps.some((s) => s.target), `${e.id}: at least one step opens a screen`);
  }
});

test('built-in numbers are never shown: unmarked figures read Missing', () => {
  const figs = workedFigures(byId('debt'), snap({ 'imf.debtToGdpPct': [60, '2025'] }));
  const debt = figs.find((f) => f.path === 'imf.debtToGdpPct')!;
  assert.equal(debt.value, 60);
  assert.equal(debt.when, '2025');
  assert.equal(debt.source, 'IMF WEO');
  for (const f of figs.filter((f) => f.path !== 'imf.debtToGdpPct')) assert.equal(f.value, undefined, f.path);
  assert.ok(workedFigures(byId('debt'), null).every((f) => f.value === undefined));
  // The 10-year yield counts only from an official series, even if a field is marked.
  const y = workedFigures(byId('debt'), snap({ 'market.sovereign10YBondYieldPct': [5] })).find((f) => f.path === 'market.sovereign10YBondYieldPct')!;
  assert.equal(y.value, undefined);
});

test('working is done only when every input is live, else it names what is missing', () => {
  const partial = workedLines(byId('debt'), workedFigures(byId('debt'), snap({ 'imf.debtToGdpPct': [60] })));
  assert.equal(partial.length, 1);
  assert.equal(partial[0].value, undefined);
  assert.ok(partial[0].needs!.includes('10-year government bond yield'));
  assert.match(lineText(partial[0]), /^Not worked out: it needs .*10-year government bond yield/);

  const infl = workedLines(byId('inflation'), workedFigures(byId('inflation'), snap({ 'market.policyRatePct': [10.5], 'imf.cpiInflationPct': [4.2, '2026'] })));
  assert.equal(infl[0].value, 6.3);
  assert.match(lineText(infl[0]), /6\.3 % \(10\.5 − 4\.2 = 6\.3\)/);

  const fx = workedLines(byId('currency'), workedFigures(byId('currency'), snap({ 'wb.fxReservesMonthsImport': [2.5] })));
  assert.equal(fx[0].value, -0.5);
  assert.equal(fx[0].note, 'Below the rule-of-thumb minimum.');

  const pol = workedLines(byId('policy'), workedFigures(byId('policy'), snap({ 'imf.overallBalancePct': [-3.2], 'imf.debtToGdpPct': [70] })));
  assert.deepEqual(pol.map((l) => l.value), [-4.2, 71]);
});

test('debt-stabilising primary balance: d × (i − n) ÷ (100 + n)', () => {
  // d 80, i 6, g 2, π 3 → n = 5.06; pb* = 80 × 0.94 / 105.06 = 0.716; gap to pb −1 = 1.7
  const s = snap({ 'imf.debtToGdpPct': [80], 'imf.realGdpGrowthPct': [2], 'imf.cpiInflationPct': [3], 'imf.primaryFiscalBalancePct': [-1] });
  (s as unknown as Record<string, unknown>).official10YYield = { valuePct: 6, period: '2026-10', source: 'OECD via FRED', seriesId: 'X', url: '' };
  s.dataStatus!.verifiedLiveSources.push('FRED');
  const figs = workedFigures(byId('debt'), s);
  assert.equal(figs.find((f) => f.path === 'market.sovereign10YBondYieldPct')!.when, '2026-10');
  const lines = workedLines(byId('debt'), figs);
  assert.deepEqual(lines.map((l) => l.value), [5.1, 0.7, 1.7]);
});

test('the memo draft holds the question, every figure or Missing, the working and the reader’s questions', () => {
  const e = byId('inflation');
  const figs = workedFigures(e, snap({ 'market.policyRatePct': [10.5], 'imf.cpiInflationPct': [4.2, '2026'] }));
  const md = memoDraft(e, 'Testland', figs, workedLines(e, figs), '2026-11-12');
  assert.match(md, /^# Inflation and interest rates: Testland/);
  assert.match(md, /- Inflation: 4\.2 % \(IMF WEO, 2026\)/);
  assert.ok(md.includes(`- Output gap: ${WORKED_MISSING}`));
  assert.match(md, /Real policy rate: 6\.3 %/);
  assert.equal((md.match(/Your answer:/g) || []).length, e.steps.filter((s) => s.ask).length);
  assert.match(md, /saved on this computer on 2026-11-12/);
  assert.doesNotMatch(md, /99/);
});

test('every worked-example sentence has Spanish, French and Portuguese, and the app uses them', () => {
  for (const s of workedTexts()) {
    assert.ok(WORKED_TEXT_ES[s] || ES_TEXT[s], `es: ${s}`);
    assert.ok(WORKED_TEXT_FR[s] || FR_TEXT[s], `fr: ${s}`);
    assert.equal(ES_TEXT[s] !== undefined, true, `es merged: ${s}`);
    assert.equal(FR_TEXT[s] !== undefined, true, `fr merged: ${s}`);
    assert.ok(WORKED_TEXT_PT[s], `pt: ${s}`);
    assert.equal(PT_TEXT[s] !== undefined, true, `pt merged: ${s}`);
  }
  for (const v of Object.values(WORKED_TEXT_ES)) assert.doesNotMatch(v, /\b(tú|tienes|puedes|abre|mira)\b/i, `usted form: ${v}`);
  for (const v of Object.values(WORKED_TEXT_FR)) assert.doesNotMatch(v, /\b(tu|tes|ton|ouvre|regarde)\b/i, `vous form: ${v}`);
  for (const v of Object.values(WORKED_TEXT_PT)) assert.doesNotMatch(v, /\b(tu|teu|tua|teus|tuas|contigo)\b/i, `você form: ${v}`);
});

test('Menu > Worked examples is wired in the app', () => {
  const app = fs.readFileSync('src/App.tsx', 'utf8');
  assert.match(app, /key: 'worked'/);
  assert.match(app, /WorkedExamplesDialog/);
});
