import { test } from 'node:test';
import assert from 'node:assert/strict';
import { episodeReads, episodesFor, levelContext, shockPrecedents } from '../src/utils/scenarioHistory.ts';
import { historyFigures, scenarioFinding } from '../src/utils/scenarioAgent.ts';
import { parseScenario } from '../src/utils/scenarioQuestion.ts';
import type { HistoryInput } from '../src/utils/precedentFinder.ts';
import type { ReplayFile } from '../src/utils/scenarioReplay.ts';
import type { LiveWatchlistItem } from '../src/types/council.ts';
import type { AgentFigure } from '../src/utils/askCouncil.ts';

test('episodes: the stated list for each kind of shock and direction, newest three', () => {
  assert.deepEqual(episodesFor([{ kind: 'us_rate', direction: 1 }]), ['taper_2013', 'year_2022']);
  assert.deepEqual(episodesFor([{ kind: 'us_rate', direction: -1 }]), ['year_2001', 'gfc_2008', 'covid_2020']);
  assert.deepEqual(episodesFor([{ kind: 'currency', direction: 1 }]), ['year_2001', 'taper_2013', 'year_2022']);
  assert.deepEqual(episodesFor([{ kind: 'commodity', direction: 1 }]), []);
});

test('episodes: moves read from the saved monthly series, Missing with the reason otherwise', () => {
  const file: ReplayFile = {
    version: 1,
    savedAt: '2026-11-01',
    series: {
      EXMXUS: { source: 'Fed H.10', url: '', unit: 'MXN per USD', months: { '2013-04': 12.2, '2013-08': 12.9 }, pulledAt: '' },
      DGS10: { source: 'US 10Y', url: '', unit: '%', months: { '2013-04': 1.76, '2013-08': 2.74 }, pulledAt: '' },
    },
  };
  const [ep] = episodeReads('MEX', ['taper_2013'], { file, ecbMonthly: () => null, shareable: () => true });
  const fx = ep.moves.find((m) => m.factor === 'fx')!;
  // The replays' convention: % change of the currency's value, - = weaker (12.2 to 12.9 pesos per dollar).
  assert.equal(fx.move, -5.43);
  const figures: AgentFigure[] = [];
  const parts: string[] = [];
  historyFigures({ episodes: [ep] }, 'Mexico', figures, parts, []);
  assert.match(figures.find((f) => /currency/.test(f.label))!.value, /^\+5\.4% \(April 2013 to August 2013/);
  assert.match(parts.join(' '), /the currency lost 5\.4% against the dollar/);
  const spread = ep.moves.find((m) => m.factor === 'spread')!;
  assert.equal(spread.move, null);
  assert.ok(spread.reason);
});

const hist = (iso3: string, name: string, s: Record<string, Record<string, number>>): HistoryInput => ({
  iso3,
  name,
  series: Object.fromEntries(Object.entries(s).map(([id, ys]) => [id, { points: Object.entries(ys).map(([date, value]) => ({ date, value })) }])),
});
const span = (from: number, to: number, f: (y: number) => number) => Object.fromEntries(Array.from({ length: to - from + 1 }, (_, k) => [String(from + k), f(from + k)]));

test('cases elsewhere: every country-year with a move at least as large, medians of what followed, closest starts', () => {
  // Six countries, each with one growth drop of 3 points in a different year, steady otherwise.
  const hs = ['AAA', 'BBB', 'CCC', 'DDD', 'EEE', 'FFF'].map((c, k) =>
    hist(c, `Country ${c}`, {
      gdp_growth: span(1990, 2020, (y) => (y === 2000 + k ? 0 : 3)),
      cpi_imf: span(1990, 2020, () => 5 + k),
      debt_gdp: span(1990, 2020, () => 40 + 10 * k),
      reserves_months: span(1990, 2020, () => 4),
      current_account: span(1990, 2020, () => -2),
    }),
  );
  const own = hist('TUR', 'Turkey', { gdp_growth: span(1990, 2025, () => 3), cpi_imf: span(1990, 2025, () => 5), debt_gdp: span(1990, 2025, () => 40), reserves_months: span(1990, 2025, () => 4), current_account: span(1990, 2025, () => -2) });
  const r = shockPrecedents('TUR', 2026, 'growth', -2, [...hs, own]);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.cases, 6);
  assert.equal(r.countries, 6);
  assert.equal(r.rankedBy, 'start');
  assert.equal(r.closest[0].iso3, 'AAA'); // debt 40, inflation 5: the same start as Turkey
  assert.equal(r.closest[0].year, 2000);
  assert.equal(r.closest[0].move, -3);
  // Growth over the next three years: back to 3 in each.
  assert.equal(r.summary.growth_avg.median, 3);
  assert.equal(r.summary.debt_change.median, 0);
  // A larger stated change than any case: too few cases, said so.
  const none = shockPrecedents('TUR', 2026, 'growth', -5, [...hs, own]);
  assert.equal(none.ok, false);
  assert.equal(shockPrecedents('TUR', 2026, 'oil', 10, hs).ok, false);
});

test('record context: highest since, or on record', () => {
  const pts = Array.from({ length: 24 }, (_, k) => ({ date: `2024-${String((k % 12) + 1).padStart(2, '0')}`.replace('2024', String(2024 + Math.floor(k / 12))), value: k < 6 ? 50 : 40 }));
  const c = levelContext('policy_rate', 'policy rate', pts, 5, 'BIS')!;
  assert.equal(c.after, 45);
  assert.equal(c.since, '2024-06');
  assert.equal(c.direction, 'highest');
  const top = levelContext('policy_rate', 'policy rate', pts, 20, 'BIS')!;
  assert.equal(top.since, null);
  assert.equal(levelContext('policy_rate', 'policy rate', pts.slice(0, 5), 1, 'BIS'), null);
});

test('history as figures in the Scenario Agent answer', () => {
  const figures: AgentFigure[] = [];
  const parts: string[] = [];
  const missing: string[] = [];
  historyFigures(
    {
      levels: [{ series: 'policy_rate', label: 'policy rate', now: { date: '2026-10', value: 40 }, after: 45, since: '2024-06', first: '2001-01', direction: 'highest', source: 'BIS' }],
      precedents: [{ ok: false, kind: 'growth', reason: 'too few' }],
      missing: ['past episodes (the replay series are not set up on this server)'],
    },
    'Turkey',
    figures,
    parts,
    missing,
  );
  assert.equal(figures[0].value, '45.00%, the highest since June 2024');
  assert.match(missing.join(' '), /cases elsewhere \(too few\)/);
  assert.match(missing.join(' '), /past episodes/);
  // A finding with only history still counts.
  const it = { iso3: 'TUR', countryName: 'Turkey' } as LiveWatchlistItem;
  const r = scenarioFinding(parseScenario('What if Turkey raised rates by 5 points?')!, it, { iso3: 'TUR', countryName: 'Turkey', history: { levels: [{ series: 'policy_rate', label: 'policy rate', now: { date: '2026-10', value: 40 }, after: 45, since: null, first: '2001-01', direction: 'highest', source: 'BIS' }] } });
  assert.ok(r.finding);
  assert.match(r.finding!.reading, /highest on record \(since January 2001\)/);
});
