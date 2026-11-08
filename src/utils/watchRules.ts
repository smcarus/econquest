/**
 * Watch alerts (Sam, 2026-11-05): thresholds you set on the timing figures; Today flags a country
 * when one is crossed. No threshold is built in: every rule is one you added.
 *
 * Saved in data/local/watch-rules.json (DATA_DIR/local when DATA_DIR is set), like Settings and the
 * research library: on this computer only, shared by `npm run dev` and Docker. The functions here
 * are browser-safe. What a rule is, how one is checked and where rules are saved are shared with the
 * phone app and live in src/engine/watchRules.ts (re-exported here).
 */
import type { LiveWatchlistItem } from '../types/council';
import { shockWatch } from './shockWatch';
import { fastestOddsMove } from './oddsMoves';

export { MAX_RULES, WATCH_METRICS, parseRule, parseRules, type WatchMetric, type WatchOp, type WatchRule } from '../engine/watchRules';
import { WATCH_METRICS, type WatchMetric, type WatchRule } from '../engine/watchRules';

export interface WatchHit {
  rule: WatchRule;
  iso3: string;
  countryName: string;
  value: number;
  text: string;
}


/** The current figure for a metric, or undefined when no source filled it (a missing figure never triggers). */
export function metricValue(it: LiveWatchlistItem, m: WatchMetric): number | undefined {
  switch (m) {
    case 'yield_level':
      return it.yield10YPct;
    case 'yield_3m_bps':
      return it.yield10YChange3mPts !== undefined ? Math.round(it.yield10YChange3mPts * 100) : undefined;
    case 'policy_rate':
      return it.policyRateSource === 'bis' ? it.policyRatePct : undefined;
    case 'cli_level':
      return it.oecdCli?.level;
    case 'cftc_percentile':
      return it.cftc?.percentile;
    case 'tone_shift':
      return it.gdelt?.toneShift?.shift;
    case 'reserves_12m_pct':
      return it.imf?.reserves?.change12mPct;
    case 'shock_alerts':
      return shockWatch(it).warnings.filter((w) => w.level === 'alert').length;
    case 'odds_1w_pts': {
      const ms = (it.politics?.markets || []).filter((x) => x.change1wPts !== undefined);
      if (!ms.length) return undefined;
      return Math.max(...ms.map((x) => Math.abs(x.change1wPts!)));
    }
  }
}

const fmt = (v: number, m: WatchMetric) => {
  const u = WATCH_METRICS[m].unit;
  const n = Number.isInteger(v) ? String(v) : v.toFixed(2);
  return u === '%' ? `${n}%` : u.startsWith('th') ? `${n}${u}` : u ? `${n} ${u}` : n;
};

export function ruleText(r: WatchRule, countryName?: string): string {
  return `${r.iso3 === '*' ? 'Any country' : countryName || r.iso3}: ${WATCH_METRICS[r.metric].label} ${r.op === '>=' ? 'at or above' : 'at or below'} ${fmt(r.value, r.metric)}`;
}

/** Every rule against every country it covers; hits first by rule order. */
export function evaluateRules(rules: WatchRule[], items: LiveWatchlistItem[]): { hits: WatchHit[]; noFigure: Array<{ rule: WatchRule; iso3: string }> } {
  const hits: WatchHit[] = [];
  const noFigure: Array<{ rule: WatchRule; iso3: string }> = [];
  for (const r of rules) {
    for (const it of items.filter((i) => r.iso3 === '*' || i.iso3 === r.iso3)) {
      const v = metricValue(it, r.metric);
      if (v === undefined) {
        noFigure.push({ rule: r, iso3: it.iso3 });
        continue;
      }
      if (r.op === '>=' ? v >= r.value : v <= r.value) {
        const extra = r.metric === 'odds_1w_pts' ? fastestOddsMove(it.politics?.markets) : undefined;
        hits.push({
          rule: r,
          iso3: it.iso3,
          countryName: it.countryName,
          value: v,
          text: `${it.countryName}: ${WATCH_METRICS[r.metric].label} is ${fmt(v, r.metric)} (your rule: ${r.op === '>=' ? 'at or above' : 'at or below'} ${fmt(r.value, r.metric)}; ${WATCH_METRICS[r.metric].source})${extra ? `, "${extra.question}"` : ''}.`,
        });
      }
    }
  }
  return { hits, noFigure };
}
