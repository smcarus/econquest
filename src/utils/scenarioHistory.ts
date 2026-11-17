/**
 * What history says about a what-if (WI3, Sam 2026-11-17), for the Scenario Agent
 * (src/utils/scenarioAgent.ts). Three readings, each from saved figures only:
 *
 * 1. Past episodes: what the country's currency, 10-year yield and USD bond spread (and the US
 *    10-year yield) did in the past episodes where the same kind of shock happened, read from the
 *    monthly series the daily download saves (src/utils/scenarioReplay.ts episodeMove). The episode
 *    for each kind of shock is a fixed, stated list (SHOCK_EPISODES).
 * 2. When it happened elsewhere: every country-year since 1980 in the saved IMF and World Bank
 *    yearly histories where the same figure moved at least as far in the same direction in one year
 *    (growth, inflation, the currency against the dollar), and what followed in the next three years
 *    (src/utils/precedentFinder.ts outcomes). The medians over all such cases, and the eight cases
 *    that started closest to where the country is now (debt, inflation, reserves, current account;
 *    the precedent finder's scaling), each country once. The country's own past counts.
 * 3. Record context: where the level after the shock would sit in the country's own history
 *    ("highest since 2003"), for the policy rate, inflation and the 10-year yield.
 *
 * Description of the past, not a forecast and not a tested signal. Browser-safe, pure.
 */
import { EPISODES, episodeMove, type EpisodeMove, type Factor, type ReplayInputs } from './scenarioReplay';
import { DEFAULT_PRECEDENT_FEATURES, FIRST_YEAR, outcomesFor, PRECEDENT_HORIZON, PRECEDENT_OUTCOMES, PRECEDENT_SOURCES, type HistoryInput, type PrecedentFeature, type PrecedentOutcome } from './precedentFinder';
import type { ShockKind } from './scenarioQuestion';

/** Past episodes in which each kind of shock happened, by direction (ids from scenarioReplay EPISODES). */
export const SHOCK_EPISODES: Partial<Record<ShockKind, { up: string[]; down: string[] }>> = {
  us_rate: { up: ['taper_2013', 'year_2022'], down: ['year_2001', 'gfc_2008', 'covid_2020'] },
  dollar: { up: ['gfc_2008', 'year_2022'], down: [] },
  fin_stress: { up: ['russia_1998', 'gfc_2008', 'covid_2020'], down: [] },
  interest_cost: { up: ['russia_1998', 'taper_2013', 'year_2022'], down: [] },
  currency: { up: ['asia_1997', 'year_2001', 'taper_2013', 'year_2022'], down: [] },
  oil: { up: ['year_2022'], down: ['gfc_2008', 'covid_2020'] },
  food: { up: ['year_2022'], down: [] },
  supply_chain: { up: ['covid_2020', 'year_2022'], down: [] },
  growth: { up: [], down: ['year_2001', 'gfc_2008', 'covid_2020'] },
  inflation: { up: ['year_2022'], down: [] },
  policy_rate: { up: ['year_2022'], down: ['gfc_2008', 'covid_2020'] },
};
export const MAX_EPISODES = 3;
export const EPISODE_FACTORS: Factor[] = ['fx', 'local_yield', 'spread', 'us_rates'];

export interface EpisodeRead {
  id: string;
  label: string;
  about: string;
  from: string;
  to: string;
  moves: EpisodeMove[];
}

/** The episodes for the question's shocks, in the order of EPISODES, at most MAX_EPISODES. */
export function episodesFor(shocks: Array<{ kind: ShockKind; direction: 1 | -1 | null }>): string[] {
  const ids = new Set<string>();
  for (const s of shocks) {
    const e = SHOCK_EPISODES[s.kind];
    if (!e) continue;
    for (const id of s.direction === -1 ? e.down : e.up) ids.add(id);
  }
  return EPISODES.filter((e) => ids.has(e.id)).map((e) => e.id).slice(-MAX_EPISODES);
}

export function episodeReads(iso3: string, ids: string[], inp: ReplayInputs): EpisodeRead[] {
  return EPISODES.filter((e) => ids.includes(e.id)).map((ep) => ({ id: ep.id, label: ep.label, about: ep.about, from: ep.from, to: ep.to, moves: EPISODE_FACTORS.map((f) => episodeMove(iso3, f, ep, inp)) }));
}

/* ------------------------------------------------------------------------------------------ */

/** Which yearly figure a shock moves, and how its one-year move is measured. */
export const SHOCK_YEARLY: Partial<Record<ShockKind, { id: 'gdp_growth' | 'cpi_imf' | 'fx_lcu_usd'; measure: 'diff' | 'pct'; label: string; source: string }>> = {
  growth: { id: 'gdp_growth', measure: 'diff', label: 'real growth', source: PRECEDENT_SOURCES.gdp_growth },
  inflation: { id: 'cpi_imf', measure: 'diff', label: 'inflation', source: PRECEDENT_SOURCES.cpi_imf },
  currency: { id: 'fx_lcu_usd', measure: 'pct', label: 'local currency per US dollar', source: PRECEDENT_SOURCES.fx_lcu_usd },
};
export const SHOCK_PRECEDENT_MAX = 8;
export const SHOCK_PRECEDENT_MIN_CASES = 5;

export interface ShockCase {
  iso3: string;
  name: string;
  year: number;
  move: number;
  outcomes: Record<PrecedentOutcome, number | null>;
}

export interface ShockPrecedents {
  ok: true;
  kind: ShockKind;
  figure: string;
  source: string;
  /** The stated change the cases had to match or exceed. */
  threshold: number;
  measure: 'diff' | 'pct';
  /** All matching country-years and how many countries they cover. */
  cases: number;
  countries: number;
  /** Medians over every matching case. */
  summary: Record<PrecedentOutcome, { median: number | null; n: number }>;
  /** The closest starts (or the closest moves, when the country has no starting figures), each country once. */
  closest: ShockCase[];
  rankedBy: 'start' | 'move';
  /** The country's newest year with the starting figures, when ranked by start. */
  startYear?: number;
  firstYear: number;
  lastYear: number;
}

export type ShockPrecedentOutcome = ShockPrecedents | { ok: false; kind: ShockKind; reason: string };

const round = (v: number, d = 2) => Number(v.toFixed(d));

function years(h: HistoryInput, id: string, lastYear: number): Map<number, number> {
  const out = new Map<number, number>();
  for (const p of h.series[id]?.points || []) {
    const y = Number(p.date.slice(0, 4));
    if (Number.isInteger(y) && y < lastYear && Number.isFinite(p.value)) out.set(y, p.value);
  }
  return out;
}

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return round(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2);
}

/** Every country-year where the figure moved at least `change` in its direction, and what followed. */
export function shockPrecedents(iso3: string, asOfYear: number, kind: ShockKind, change: number, histories: HistoryInput[]): ShockPrecedentOutcome {
  const def = SHOCK_YEARLY[kind];
  if (!def) return { ok: false, kind, reason: 'No yearly history for this kind of shock in the saved IMF and World Bank figures' };
  if (!histories.length) return { ok: false, kind, reason: 'The yearly histories have not been downloaded yet (Menu > Offline data)' };
  const lastYear = asOfYear;
  const cache = new Map<string, Map<number, number>>();
  const getter = (h: HistoryInput) => (id: string) => {
    const k = `${h.iso3}:${id}`;
    if (!cache.has(k)) cache.set(k, years(h, id, lastYear));
    return cache.get(k)!;
  };
  const moveAt = (g: (id: string) => Map<number, number>, y: number): number | null => {
    const a = g(def.id).get(y - 1);
    const b = g(def.id).get(y);
    if (a === undefined || b === undefined) return null;
    if (def.measure === 'diff') return b - a;
    return a > 0 ? (b / a - 1) * 100 : null;
  };
  const all: Array<ShockCase & { start: Partial<Record<PrecedentFeature, number>> }> = [];
  for (const h of histories) {
    const g = getter(h);
    for (const y of g(def.id).keys()) {
      if (y < FIRST_YEAR || y + PRECEDENT_HORIZON >= lastYear) continue;
      const m = moveAt(g, y);
      if (m === null || Math.sign(m) !== Math.sign(change) || Math.abs(m) < Math.abs(change)) continue;
      const start = Object.fromEntries(DEFAULT_PRECEDENT_FEATURES.map((f) => [f, g(f).get(y - 1)]).filter(([, v]) => v !== undefined)) as Partial<Record<PrecedentFeature, number>>;
      all.push({ iso3: h.iso3, name: h.name, year: y, move: round(m, def.measure === 'pct' ? 1 : 2), outcomes: outcomesFor(g, y), start });
    }
  }
  if (all.length < SHOCK_PRECEDENT_MIN_CASES) return { ok: false, kind, reason: `Only ${all.length} country-years since ${FIRST_YEAR} saw ${def.label} move this far in one year with three later years saved; at least ${SHOCK_PRECEDENT_MIN_CASES} are needed` };
  const summary = Object.fromEntries(
    PRECEDENT_OUTCOMES.map((o) => {
      const xs = all.map((c) => c.outcomes[o]).filter((v): v is number => v !== null);
      return [o, { median: median(xs), n: xs.length }];
    }),
  ) as ShockPrecedents['summary'];

  // Rank by starting position against the country's newest year with the starting figures.
  const own = histories.find((h) => h.iso3 === iso3);
  const og = own ? getter(own) : null;
  const feats = og ? DEFAULT_PRECEDENT_FEATURES.filter((f) => og(f).size) : [];
  const ownYear = og && feats.length >= 2 ? [...og(feats[0]).keys()].filter((y) => feats.every((f) => og(f).has(y))).sort((a, b) => b - a)[0] : undefined;
  let rankedBy: 'start' | 'move' = 'move';
  let dist = (c: (typeof all)[number]) => Math.abs(c.move - change);
  if (og && ownYear !== undefined) {
    const usable = all.filter((c) => feats.every((f) => c.start[f] !== undefined));
    if (usable.length >= SHOCK_PRECEDENT_MIN_CASES) {
      rankedBy = 'start';
      const sd = Object.fromEntries(
        feats.map((f) => {
          const xs = usable.map((c) => c.start[f]!);
          const m = xs.reduce((s, v) => s + v, 0) / xs.length;
          return [f, Math.sqrt(xs.reduce((s, v) => s + (v - m) ** 2, 0) / xs.length) || 1];
        }),
      ) as Record<PrecedentFeature, number>;
      const target = Object.fromEntries(feats.map((f) => [f, og(f).get(ownYear)!])) as Record<PrecedentFeature, number>;
      dist = (c) => (feats.every((f) => c.start[f] !== undefined) ? Math.sqrt(feats.reduce((s, f) => s + ((c.start[f]! - target[f]) / sd[f]) ** 2, 0) / feats.length) : Infinity);
    }
  }
  const best = new Map<string, { c: (typeof all)[number]; d: number }>();
  for (const c of all) {
    const d = dist(c);
    if (!Number.isFinite(d)) continue;
    const prev = best.get(c.iso3);
    if (!prev || d < prev.d || (d === prev.d && c.year < prev.c.year)) best.set(c.iso3, { c, d });
  }
  const closest = [...best.values()]
    .sort((a, b) => a.d - b.d || (a.c.iso3 < b.c.iso3 ? -1 : a.c.iso3 > b.c.iso3 ? 1 : 0) || a.c.year - b.c.year)
    .slice(0, SHOCK_PRECEDENT_MAX)
    .map(({ c }) => ({ iso3: c.iso3, name: c.name, year: c.year, move: c.move, outcomes: c.outcomes }));
  return {
    ok: true,
    kind,
    figure: def.label,
    source: def.source,
    threshold: change,
    measure: def.measure,
    cases: all.length,
    countries: new Set(all.map((c) => c.iso3)).size,
    summary,
    closest,
    rankedBy,
    ...(rankedBy === 'start' ? { startYear: ownYear } : {}),
    firstYear: Math.min(...all.map((c) => c.year)),
    lastYear: Math.max(...all.map((c) => c.year)),
  };
}

/* ------------------------------------------------------------------------------------------ */

export interface LevelContext {
  series: 'policy_rate' | 'cpi_monthly' | 'yield_10y';
  label: string;
  now: { date: string; value: number };
  after: number;
  /** The last date before now at or beyond the level after the shock; null when never in the record. */
  since: string | null;
  first: string;
  direction: 'highest' | 'lowest';
  source: string;
}

/** Where a level after the shock sits in the series' own history ("highest since 2003-05"). */
export function levelContext(series: LevelContext['series'], label: string, points: Array<{ date: string; value: number; note?: string }>, change: number, source: string): LevelContext | null {
  const real = points.filter((p) => Number.isFinite(p.value) && !/projection/i.test(p.note || '')).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  if (real.length < 12 || change === 0) return null;
  const now = real[real.length - 1];
  const after = round(now.value + change);
  const up = change > 0;
  const earlier = real.slice(0, -1);
  const hit = [...earlier].reverse().find((p) => (up ? p.value >= after : p.value <= after));
  return { series, label, now: { date: now.date, value: now.value }, after, since: hit ? hit.date : null, first: real[0].date, direction: up ? 'highest' : 'lowest', source };
}
