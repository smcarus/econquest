/**
 * SC2 events for "What happened after": the years in which a country made a change, for the
 * synthetic control (src/utils/syntheticControl.ts). Three kinds of source, each labelled:
 *
 * - Found by a rule on the figures (the rule is shown on screen; no historian checked them):
 *   fiscal tightening or loosening, the primary balance moving 1.5% of GDP or more in one year (a data
 *   rule, not a measure of intent); a large devaluation, the currency falling 25% or more against the
 *   US dollar in a year and 10 points more than the year before (Frankel and Rose 1996, Journal of
 *   International Economics 41(3-4)).
 * - From a file you saved: exchange rate regime changes (IRR coarse class, December to December, among
 *   classes 1 to 4; data/local/irr/), the first year of each national fiscal rule now in force (IMF
 *   Fiscal Rules workbook, data/local/imf-fiscal-rules/), and capital account openings or closings
 *   (Chinn-Ito index moving 1 point or more in a year).
 * - Your own: country, year, what changed and a source link, saved in data/local/policy-events.json.
 *
 * Policy rate moves are not used: the saved policy rate history covers about two years, too short for
 * years after a change. Nothing here is a built-in list. Browser-safe, pure.
 */
import type { SynthHistory } from './syntheticControl';
import { outcomeYears, PRE_YEARS, POST_YEARS } from './syntheticControl';
import { coarseOf, type FxRegimeTable } from './fxRegime';
import { RULE_KINDS, RULE_KIND_NAME, type FiscalRulesTable } from './fiscalRules';
import type { ChinnItoTable } from './chinnIto';

export const EVENT_KINDS = ['fiscal_tightening', 'fiscal_loosening', 'devaluation', 'regime_change', 'fiscal_rule', 'capital_opening', 'capital_closing', 'own'] as const;
export type EventKind = (typeof EVENT_KINDS)[number];
export type EventOrigin = 'rule' | 'file' | 'own';

export const FISCAL_MOVE = 1.5;
export const DEVALUATION_MIN = 25;
export const DEVALUATION_STEP = 10;
export const KAOPEN_MOVE = 1;

/** The outcome each kind is read against first (the user can pick another). */
export const DEFAULT_OUTCOME: Record<EventKind, 'cpi_imf' | 'gdp_growth' | 'debt_gdp' | 'currency_change'> = {
  fiscal_tightening: 'debt_gdp',
  fiscal_loosening: 'debt_gdp',
  devaluation: 'cpi_imf',
  regime_change: 'cpi_imf',
  fiscal_rule: 'debt_gdp',
  capital_opening: 'gdp_growth',
  capital_closing: 'gdp_growth',
  own: 'cpi_imf',
};

/** The rule or file behind each kind, in plain words, shown beside every event. */
export const EVENT_RULE: Record<EventKind, string> = {
  fiscal_tightening: `Found by a rule on the figures: the primary balance rose ${FISCAL_MOVE} points of GDP or more in one year (IMF Fiscal Monitor). A data rule, not a measure of what the government intended.`,
  fiscal_loosening: `Found by a rule on the figures: the primary balance fell ${FISCAL_MOVE} points of GDP or more in one year (IMF Fiscal Monitor). A data rule, not a measure of what the government intended.`,
  devaluation: `Found by a rule on the figures: the currency fell ${DEVALUATION_MIN}% or more against the US dollar in the year, and ${DEVALUATION_STEP} points more than the year before (World Bank; Frankel and Rose 1996).`,
  regime_change: 'From your IRR file (data/local/irr/): the coarse exchange rate class in December differs from the December before, both between 1 (peg) and 4 (floating).',
  fiscal_rule: 'From your IMF Fiscal Rules file (data/local/imf-fiscal-rules/): the first year of the run of years, up to the latest in the file, with this kind of national rule.',
  capital_opening: `From the Chinn-Ito file: the capital account openness index rose ${KAOPEN_MOVE} point or more in one year.`,
  capital_closing: `From the Chinn-Ito file: the capital account openness index fell ${KAOPEN_MOVE} point or more in one year.`,
  own: 'Your own event, with the source you gave.',
};

export interface PolicyEvent {
  id: string;
  iso3: string;
  year: number;
  kind: EventKind;
  origin: EventOrigin;
  /** Short words for the list: "Primary balance +2.1 points of GDP", "Fiscal rule: Debt rule". */
  label: string;
  /** The value that met the rule, when there is one. */
  value?: number;
  /** For your own events: the link you gave. */
  sourceUrl?: string;
  /** The pieces of the label, so the screen can word it in the chosen language. */
  parts?: Record<string, string | number>;
}

export interface OwnEvent {
  id: string;
  iso3: string;
  year: number;
  label: string;
  sourceUrl: string;
  savedAt: string;
}

const round = (v: number, d = 1) => Number(v.toFixed(d));
const sign = (v: number) => (v > 0 ? `+${round(v)}` : String(round(v)));

/** Events found by the rules, for every country, years before lastYear. */
export function ruleEvents(histories: SynthHistory[], lastYear: number): PolicyEvent[] {
  const out: PolicyEvent[] = [];
  for (const h of histories) {
    const pb = outcomeYears(h, 'primary_balance', lastYear);
    for (const [y, v] of pb) {
      const prev = pb.get(y - 1);
      if (prev === undefined) continue;
      const d = v - prev;
      if (d >= FISCAL_MOVE) out.push({ id: `fiscal_tightening:${h.iso3}:${y}`, iso3: h.iso3, year: y, kind: 'fiscal_tightening', origin: 'rule', label: `Primary balance ${sign(d)} points of GDP`, value: round(d, 2), parts: { v: sign(d) } });
      else if (d <= -FISCAL_MOVE) out.push({ id: `fiscal_loosening:${h.iso3}:${y}`, iso3: h.iso3, year: y, kind: 'fiscal_loosening', origin: 'rule', label: `Primary balance ${sign(d)} points of GDP`, value: round(d, 2), parts: { v: sign(d) } });
    }
    const fx = outcomeYears(h, 'currency_change', lastYear);
    for (const [y, v] of fx) {
      const prev = fx.get(y - 1);
      if (prev === undefined || v < DEVALUATION_MIN || v - prev < DEVALUATION_STEP) continue;
      out.push({ id: `devaluation:${h.iso3}:${y}`, iso3: h.iso3, year: y, kind: 'devaluation', origin: 'rule', label: `Currency down: ${round(v)}% more local currency per US dollar`, value: round(v, 2), parts: { v: round(v) } });
    }
  }
  return out;
}

/** Events from the files you saved, years before lastYear. */
export function fileEvents(files: { fxRegime?: FxRegimeTable | null; fiscalRules?: FiscalRulesTable | null; chinnIto?: ChinnItoTable | null }, lastYear: number): PolicyEvent[] {
  const out: PolicyEvent[] = [];
  const t = files.fxRegime;
  if (t) {
    for (const [iso3, months] of Object.entries(t.countries)) {
      const dec = (y: number) => {
        const c = months[`${y}-12`];
        return c === undefined ? undefined : t.fine ? coarseOf(c) : c;
      };
      const years = [...new Set(Object.keys(months).map((m) => Number(m.slice(0, 4))))].sort((a, b) => a - b);
      for (const y of years) {
        if (y >= lastYear) continue;
        const a = dec(y - 1);
        const b = dec(y);
        if (a === undefined || b === undefined || a === b || a > 4 || b > 4) continue;
        out.push({ id: `regime_change:${iso3}:${y}`, iso3, year: y, kind: 'regime_change', origin: 'file', label: `Exchange rate class ${a} to ${b} (1 peg, 4 floating)`, value: b - a, parts: { from: a, to: b } });
      }
    }
  }
  const fr = files.fiscalRules;
  if (fr) {
    for (const [iso3, rules] of fr.countries) {
      for (const k of RULE_KINDS) {
        const since = rules.since[k];
        // A run that starts in the file's first year may have started earlier: its start is unknown.
        if (!rules.has[k] || since === undefined || since <= fr.firstYear || since >= lastYear) continue;
        out.push({ id: `fiscal_rule:${iso3}:${since}:${k}`, iso3, year: since, kind: 'fiscal_rule', origin: 'file', label: `Fiscal rule: ${RULE_KIND_NAME[k]}`, parts: { rule: k } });
      }
    }
  }
  const ci = files.chinnIto;
  if (ci) {
    for (const [iso3, rows] of Object.entries(ci.countries)) {
      for (let i = 1; i < rows.length; i++) {
        const a = rows[i - 1];
        const b = rows[i];
        if (b.year >= lastYear || b.year !== a.year + 1 || a.kaopen === null || b.kaopen === null) continue;
        const d = b.kaopen - a.kaopen;
        if (d >= KAOPEN_MOVE) out.push({ id: `capital_opening:${iso3}:${b.year}`, iso3, year: b.year, kind: 'capital_opening', origin: 'file', label: `Capital account openness ${sign(d)}`, value: round(d, 2), parts: { v: sign(d) } });
        else if (d <= -KAOPEN_MOVE) out.push({ id: `capital_closing:${iso3}:${b.year}`, iso3, year: b.year, kind: 'capital_closing', origin: 'file', label: `Capital account openness ${sign(d)}`, value: round(d, 2), parts: { v: sign(d) } });
      }
    }
  }
  return out;
}

export function ownEvents(saved: OwnEvent[], lastYear: number): PolicyEvent[] {
  return saved.filter((e) => e.year < lastYear).map((e) => ({ id: `own:${e.id}`, iso3: e.iso3, year: e.year, kind: 'own' as const, origin: 'own' as const, label: e.label, sourceUrl: e.sourceUrl }));
}

/** One country's events, newest first, ties by id. */
export function eventsFor(iso3: string, all: PolicyEvent[]): PolicyEvent[] {
  return all.filter((e) => e.iso3 === iso3).sort((a, b) => b.year - a.year || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/**
 * Countries with the same kind of change between ten years before and five years after: left out of
 * the twin, since they were not untreated. Your own events name no kind, so nothing is left out for them.
 */
export function excludedFor(event: PolicyEvent, all: PolicyEvent[]): string[] {
  if (event.kind === 'own') return [];
  const lo = event.year - PRE_YEARS;
  const hi = event.year + POST_YEARS;
  return [...new Set(all.filter((e) => e.kind === event.kind && e.iso3 !== event.iso3 && e.year >= lo && e.year <= hi).map((e) => e.iso3))].sort();
}

/** A checked own event from a request body, or the reason it was refused. */
export function parseOwnEvent(body: unknown, iso3: string, lastYear: number): { label: string; year: number; sourceUrl: string } | { error: string } {
  const b = (body || {}) as Record<string, unknown>;
  const year = Number(b.year);
  const label = String(b.label ?? '').trim().slice(0, 160);
  const sourceUrl = String(b.sourceUrl ?? '').trim();
  if (!/^[A-Z]{3}$/.test(iso3)) return { error: 'No country.' };
  if (!Number.isInteger(year) || year < 1960 || year >= lastYear) return { error: `Give a year from 1960 to ${lastYear - 1}.` };
  if (!label) return { error: 'Say what changed.' };
  if (!/^https?:\/\/\S+$/i.test(sourceUrl)) return { error: 'Give a source link (http or https).' };
  return { label, year, sourceUrl };
}
