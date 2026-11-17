/**
 * Budget credibility (group R, step R3, Sam 17 November 2026): how much of the budget parliament
 * approved the government actually spent, year by year.
 *
 * - World Bank WDI GF.XPD.BUDG.ZS, "Primary government expenditures as a proportion of original
 *   approved budget (%)", the indicator for UN goal 16.6.1. It follows PEFA indicator PI-1
 *   (aggregate expenditure outturn): spending in the year, interest and spending paid for by
 *   outside project loans and grants left out, divided by the budget first approved for that year.
 *   The figures come from PEFA assessments, so most countries have only a few years, usually three
 *   in a row for each assessment. CC BY 4.0, no key, read in the saved World Bank history.
 * - For each year: how far spending was from the approved budget, and which PEFA PI-1 band that
 *   year falls in (A within 5%, B within 10%, C within 15%, D further).
 * - A grade on the PEFA PI-1 rule, worked out by the app: A when two of the last three years are
 *   within 5% of the budget, B within 10%, C within 15%, else D. Only when the latest three years
 *   are all published; otherwise Missing with the reason. It is not the official PEFA score, which
 *   the assessment team sets from the government's own accounts.
 *
 * Browser-safe, pure.
 */
import type { YearValue } from './fiscalRules';

export const BC_IDS = ['budget_outturn'] as const;
export type BcId = (typeof BC_IDS)[number];

export const BC_SOURCES = 'World Bank World Development Indicators GF.XPD.BUDG.ZS (UN goal 16.6.1, from PEFA assessments), CC BY 4.0';

export const BC_METHOD =
  'Spending each year as % of the budget first approved for it (interest and spending paid for by outside project loans and grants left out), as the World Bank publishes it from PEFA assessments. Each year is put in a PEFA PI-1 band: A within 5% of the budget, B within 10%, C within 15%, D further. The grade uses the PEFA rule, two of the last three years inside the band, and is worked out by the app, not the official PEFA score. A description, not a forecast.';

export type Band = 'A' | 'B' | 'C' | 'D';

export interface BcYear {
  year: number;
  /** Spending as % of the approved budget. */
  pct: number;
  /** Spending minus the budget, % of the budget (negative = spent less than approved). */
  gap: number;
  band: Band;
}

export interface BcProfile {
  /** Up to the last 15 published years, oldest first. */
  years: BcYear[];
  latest?: BcYear;
  latestMissing?: string;
  /** Grade on the PEFA PI-1 rule over the latest three years, when all three are published. */
  grade?: { band: Band; from: number; to: number };
  gradeMissing?: string;
  /** Average distance from the budget over the years shown, % of the budget. */
  avgAbsGap?: number;
  /** Years shown in which spending was below the approved budget. */
  underYears: number;
  sources: string;
  method: string;
}

const r1 = (v: number) => Math.round(v * 10) / 10;

/** PEFA PI-1 band for one year's outturn, % of the approved budget. */
export function bandFor(pct: number): Band {
  const d = Math.abs(pct - 100);
  if (d <= 5) return 'A';
  if (d <= 10) return 'B';
  if (d <= 15) return 'C';
  return 'D';
}

const RANK: Record<Band, number> = { A: 0, B: 1, C: 2, D: 3 };

/** PEFA rule: the best band that at least two of the three years reach. */
export function gradeOf(three: Band[]): Band {
  const sorted = [...three].sort((a, b) => RANK[a] - RANK[b]);
  return sorted[1];
}

export function budgetCredibility(series: Partial<Record<BcId, YearValue[]>>, beforeYear: number, historySaved = true): BcProfile {
  const out: BcProfile = { years: [], underYears: 0, sources: BC_SOURCES, method: BC_METHOD };
  const m = new Map((series.budget_outturn ?? []).filter((p) => p.year < beforeYear && Number.isFinite(p.value) && p.value > 0).map((p) => [p.year, p.value]));
  const all = [...m.keys()].sort((a, b) => a - b);
  if (!all.length) {
    out.latestMissing = historySaved
      ? 'The World Bank publishes no budget outturn figure for this country (it comes from PEFA assessments, which not every country has had)'
      : 'No saved World Bank history for this country yet (Data health > World Bank)';
    out.gradeMissing = out.latestMissing;
    return out;
  }
  out.years = all.slice(-15).map((year) => {
    const pct = m.get(year)!;
    return { year, pct: r1(pct), gap: r1(pct - 100), band: bandFor(pct) };
  });
  out.latest = out.years[out.years.length - 1];
  out.underYears = out.years.filter((y) => y.pct < 100).length;
  out.avgAbsGap = r1(out.years.reduce((s, y) => s + Math.abs(y.pct - 100), 0) / out.years.length);
  const ly = out.latest.year;
  const three = [ly - 2, ly - 1, ly];
  if (three.every((y) => m.has(y))) {
    out.grade = { band: gradeOf(three.map((y) => bandFor(m.get(y)!))), from: ly - 2, to: ly };
  } else {
    out.gradeMissing = 'The grade needs the latest three years in a row, and the World Bank does not publish all three';
  }
  return out;
}

/** One English sentence for Explain in chat. */
export function bcSentence(p: BcProfile, country: string): string {
  if (!p.latest) return `${country}: budget credibility Missing (${p.latestMissing}).`;
  const l = p.latest;
  const dir = l.gap < 0 ? `${Math.abs(l.gap)}% less than` : l.gap > 0 ? `${l.gap}% more than` : 'exactly';
  let s = `${country}'s government spent ${l.pct}% of its approved budget in ${l.year}, ${dir} parliament approved (PEFA band ${l.band}).`;
  if (p.grade) s += ` On the PEFA PI-1 rule, ${p.grade.from}-${p.grade.to} grades ${p.grade.band} (worked out by the app, not the official PEFA score).`;
  if (p.years.length > 1 && p.avgAbsGap !== undefined) s += ` Over the ${p.years.length} published years, spending was ${p.avgAbsGap}% from the budget on average, and below it in ${p.underYears}.`;
  return s;
}
