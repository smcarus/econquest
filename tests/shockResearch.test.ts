import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SHOCK_RESEARCH, studiesFor } from '../src/data/shockResearch.ts';
import { researchFigures, scenarioFinding } from '../src/utils/scenarioAgent.ts';
import { parseScenario } from '../src/utils/scenarioQuestion.ts';
import type { AgentFigure } from '../src/utils/askCouncil.ts';
import type { LiveWatchlistItem } from '../src/types/council.ts';

test('every study has a full citation, a link, a page check and short quotes', () => {
  for (const s of SHOCK_RESEARCH) {
    assert.match(s.citation, /\(\d{4}\), ".+", .+\d/, s.id);
    assert.match(s.url, /^https:\/\//, s.id);
    assert.ok(s.checked.length > 10, s.id);
    assert.ok(s.findings.length > 0, s.id);
    for (const f of s.findings) assert.ok(f.quote.length > 0 && f.quote.length <= 160, `${s.id}: ${f.quote}`);
  }
  // A number written in a finding must be in its quote (the paper's own words).
  for (const s of SHOCK_RESEARCH)
    for (const f of s.findings) {
      const nums = (f.text.match(/[+-]?\d+(?:\.\d+)?/g) || []).filter((n) => !/^(19|20)\d\d$/.test(n.replace(/^[+-]/, '')));
      for (const n of nums) assert.ok(f.quote.includes(n.replace(/^\+/, '')) || s.about.includes(n), `${s.id}: ${n} not in the quote`);
    }
});

test('studies by shock and direction', () => {
  assert.deepEqual(studiesFor('us_rate', 1).map((s) => s.id), ['iacoviello_navarro_2019']);
  assert.deepEqual(studiesFor('us_rate', -1), []);
  assert.deepEqual(studiesFor('fin_stress', 1).map((s) => s.id), ['reinhart_rogoff_2009']);
  assert.deepEqual(studiesFor('growth', -1).map((s) => s.id), ['cerra_saxena_2008']);
  assert.deepEqual(studiesFor('currency', 1).map((s) => s.id), ['ha_stocker_yilmazkuday_2020']);
});

test('the finding for the country\'s group, labelled as a published average', () => {
  const sq = parseScenario('What if the Fed raised rates by 1 point?')!;
  const em: AgentFigure[] = [];
  researchFigures(sq, 'TUR', em);
  assert.equal(em.length, 1);
  assert.match(em[0].value, /emerging economies by 0\.8%/);
  assert.match(em[0].label, /^Research: Iacoviello, M\. and Navarro, G\. \(2019\)$/);
  assert.match(em[0].source, /doi 10\.1016\/j\.jimonfin\.2018\.06\.012/);
  assert.match(em[0].source, /not an estimate for this country/);
  const ae: AgentFigure[] = [];
  researchFigures(sq, 'DEU', ae);
  assert.match(ae[0].value, /advanced economies by 0\.5%/);
  // Research alone still makes a finding, so the answer can quote it.
  const f = scenarioFinding(sq, { iso3: 'TUR', countryName: 'Turkey' } as LiveWatchlistItem, undefined).finding;
  assert.ok(f?.figures.some((x) => x.label.startsWith('Research:')));
});
