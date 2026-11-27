import { test } from 'node:test';
import assert from 'node:assert/strict';
import { excludedFor, eventsFor, fileEvents, ownEvents, parseOwnEvent, ruleEvents, type PolicyEvent } from '../src/utils/policyEvents';
import type { SynthHistory } from '../src/utils/syntheticControl';
import type { FxRegimeTable } from '../src/utils/fxRegime';
import type { FiscalRulesTable } from '../src/utils/fiscalRules';
import type { ChinnItoTable } from '../src/utils/chinnIto';

function hist(iso3: string, series: Record<string, Record<number, number>>): SynthHistory {
  return { iso3, name: iso3, series: Object.fromEntries(Object.entries(series).map(([id, ys]) => [id, { points: Object.entries(ys).map(([y, v]) => ({ date: y, value: v })) }])) };
}

test('rules: primary balance moves of 1.5 points or more; Frankel-Rose devaluations; nothing at or after the As of year', () => {
  const h = hist('AAA', {
    primary_balance: { 2000: -3, 2001: -1.5, 2002: -1.4, 2003: -3, 2004: -2, 2020: -2, 2021: 2 },
    fx_lcu_usd: { 2000: 1, 2001: 1.05, 2002: 1.4, 2003: 1.5, 2004: 2.0 },
  });
  const ev = ruleEvents([h], 2020);
  const ids = ev.map((e) => e.id).sort();
  assert.deepEqual(ids, ['devaluation:AAA:2002', 'devaluation:AAA:2004', 'fiscal_loosening:AAA:2003', 'fiscal_tightening:AAA:2001'].sort());
  // 2003 is +7.1% (not 25%), 2004 is +33.3% and 26 points more than 2003.
  assert.ok(!ruleEvents([h], 2004).some((e) => e.year >= 2004));
  const all = ruleEvents([h], 2030);
  assert.ok(all.some((e) => e.id === 'fiscal_tightening:AAA:2021'));
  assert.equal(all.find((e) => e.id === 'fiscal_tightening:AAA:2001')?.label, 'Primary balance +1.5 points of GDP');
});

test('files: IRR class changes among 1 to 4, fiscal rules with a known start, Chinn-Ito moves of 1 or more', () => {
  const fx: FxRegimeTable = { countries: { BBB: { '2000-12': 2, '2001-12': 13, '2002-12': 14, '2003-12': 13 } }, fine: true, firstMonth: '2000-12', lastMonth: '2003-12', unmatched: [] };
  const fr: FiscalRulesTable = {
    countries: new Map([['BBB', { name: 'B', year: 2024, has: { er: true, rr: false, bbr: true, dr: true }, since: { er: 2010, bbr: 1985, dr: 2030 }, details: [] }]]),
    file: 'x.xlsx', firstYear: 1985, lastYear: 2024, unmatched: [],
  };
  const ci: ChinnItoTable = { countries: { BBB: [{ year: 1999, kaopen: -1, kaOpen: 0.2 }, { year: 2000, kaopen: 0.2, kaOpen: 0.5 }, { year: 2002, kaopen: -1, kaOpen: 0.2 }] }, firstYear: 1999, lastYear: 2002 };
  const ev = fileEvents({ fxRegime: fx, fiscalRules: fr, chinnIto: ci }, 2026);
  const ids = ev.map((e) => e.id).sort();
  // fine 2 -> coarse 1, fine 13 -> coarse 4, fine 14 -> coarse 5 (freely falling, left out)
  assert.deepEqual(ids, ['capital_opening:BBB:2000', 'fiscal_rule:BBB:2010:er', 'regime_change:BBB:2001'].sort());
  assert.equal(ev.find((e) => e.kind === 'regime_change')?.label, 'Exchange rate class 1 to 4 (1 peg, 4 floating)');
});

test('own events, one country newest first, and who is left out of the twin', () => {
  const own = ownEvents([{ id: 'e1', iso3: 'AAA', year: 2015, label: 'New central bank law', sourceUrl: 'https://example.org/law', savedAt: '2026-01-01' }, { id: 'e2', iso3: 'AAA', year: 2030, label: 'later', sourceUrl: 'https://x.org', savedAt: '' }], 2026);
  assert.equal(own.length, 1);
  const all: PolicyEvent[] = [
    ...own,
    { id: 'devaluation:AAA:2010', iso3: 'AAA', year: 2010, kind: 'devaluation', origin: 'rule', label: '' },
    { id: 'devaluation:BBB:2001', iso3: 'BBB', year: 2001, kind: 'devaluation', origin: 'rule', label: '' },
    { id: 'devaluation:CCC:1999', iso3: 'CCC', year: 1999, kind: 'devaluation', origin: 'rule', label: '' },
    { id: 'devaluation:DDD:2015', iso3: 'DDD', year: 2015, kind: 'devaluation', origin: 'rule', label: '' },
    { id: 'devaluation:EEE:2016', iso3: 'EEE', year: 2016, kind: 'devaluation', origin: 'rule', label: '' },
    { id: 'fiscal_tightening:FFF:2010', iso3: 'FFF', year: 2010, kind: 'fiscal_tightening', origin: 'rule', label: '' },
  ];
  assert.deepEqual(eventsFor('AAA', all).map((e) => e.year), [2015, 2010]);
  assert.deepEqual(excludedFor(all[1], all), ['BBB', 'DDD']);
  assert.deepEqual(excludedFor(own[0], all), []);
});

test('own event checks: year before the As of year, words, a link', () => {
  assert.deepEqual(parseOwnEvent({ year: 2015, label: ' Law ', sourceUrl: 'https://a.org/x' }, 'AAA', 2026), { year: 2015, label: 'Law', sourceUrl: 'https://a.org/x' });
  assert.ok('error' in parseOwnEvent({ year: 2026, label: 'x', sourceUrl: 'https://a.org' }, 'AAA', 2026));
  assert.ok('error' in parseOwnEvent({ year: 2015, label: '', sourceUrl: 'https://a.org' }, 'AAA', 2026));
  assert.ok('error' in parseOwnEvent({ year: 2015, label: 'x', sourceUrl: 'javascript:alert(1)' }, 'AAA', 2026));
});
