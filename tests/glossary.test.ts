import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GLOSSARY, figureHelp, glossaryMarkdown, panelIntro } from '../src/data/glossary.ts';
import { economistBrief, countryDataSources } from '../src/utils/countryNotes.ts';
import { officialBrief } from '../src/utils/officialNote.ts';
import { bankerBrief } from '../src/utils/bankerNote.ts';
import { buildBaselineOpenData } from '../src/data/presetsAndBaselines.ts';
import type { CouncilAssessmentRun } from '../src/types/council.ts';
import { FEED_PATHS, TEST_FEED_VALUES, markLive } from './helpers/live.ts';

function runFor(iso3: string, live: boolean): CouncilAssessmentRun {
  const openData = buildBaselineOpenData(iso3);
  openData.dataStatus = { verifiedLiveSources: [], checkedAt: '2026-11-04T12:00:00Z' };
  if (live) markLive(openData, [...new Set([...FEED_PATHS, ...Object.keys(TEST_FEED_VALUES)])]);
  return { iso3, countryName: openData.countryName, openData } as unknown as CouncilAssessmentRun;
}

test('docs/GLOSSARY.md is up to date (run npm run docs:glossary after editing src/data/glossary.ts)', () => {
  assert.equal(readFileSync(new URL('../docs/GLOSSARY.md', import.meta.url), 'utf8'), glossaryMarkdown());
});

test('every entry has a unique id, a definition and a reason it matters, and holds no figures for a country', () => {
  const ids = new Set<string>();
  for (const e of GLOSSARY) {
    assert.ok(!ids.has(e.id), `duplicate id ${e.id}`);
    ids.add(e.id);
    assert.ok(e.what.length > 30, `${e.id}: what is too short`);
    assert.ok(e.why.length > 30, `${e.id}: why is too short`);
    for (const t of [e.what, e.why, e.read || '', e.limits || '']) {
      assert.doesNotMatch(t, /\b(Claude|Anthropic|AI Studio)\b/, `${e.id}: no build-tool names`);
    }
  }
});

test('figure labels in the Research tables find their entry, the more specific one first', () => {
  const cases: Array<[string, string]> = [
    ['Real GDP growth', 'real_gdp_growth'],
    ['CPI inflation', 'cpi_inflation'],
    ['Policy rate', 'policy_rate'],
    ['Real policy rate', 'real_rate'],
    ['Real interest rate (approx.)', 'real_rate'],
    ['Debt / GDP, 2027 forecast', 'debt_gdp'],
    ['Primary balance', 'primary_balance'],
    ['Overall balance (Fiscal Monitor)', 'overall_balance'],
    ['Net interest paid', 'net_interest'],
    ['Interest rate minus growth', 'r_minus_g'],
    ['Balance that keeps debt stable', 'stabilising_balance'],
    ['External debt', 'external_debt'],
    ['External debt due, next 12 months (QEDS)', 'debt_due'],
    ['Government external debt due, next 12 months', 'debt_due'],
    ['FX reserves', 'fx_reserves'],
    ['Current account, US dollars', 'current_account'],
    ['Spot FX (BRL per USD)', 'exchange_rate'],
    ['USD bond spread over Treasuries (not CDS)', 'spread'],
    ['5Y CDS', 'cds'],
    ['10Y government yield', 'yield'],
    ['2s10s curve slope', 'yield_curve'],
    ['Political stability (WGI)', 'political_stability'],
    ['News tone (GDELT)', 'news_tone'],
    ['Credit rating', 'credit_rating'],
    ['Lower growth', 'dsa'],
    ['Next rate decision', 'rate_decision'],
  ];
  for (const [label, id] of cases) assert.equal(figureHelp(label)?.id, id, label);
  assert.equal(figureHelp('Brazil'), undefined, 'a peer name has no entry');
});

test('every figure and panel in the three briefs and the sources list has a plain-words explanation', () => {
  for (const run of [runFor('BRA', false), runFor('BRA', true)]) {
  const groups = [...economistBrief(run).groups, ...officialBrief(run).groups, ...bankerBrief(run, []).groups, ...countryDataSources(run)];
  const noHelp = groups.flatMap((g) => g.rows.map((r) => r.label)).filter((l) => !figureHelp(l));
  assert.deepEqual([...new Set(noHelp)], []);
  const noIntro = groups.map((g) => g.title).filter((t) => !panelIntro(t));
  assert.deepEqual([...new Set(noIntro)], []);
  }
});
