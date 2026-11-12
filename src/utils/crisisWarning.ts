/**
 * Crisis early-warning (G23, Sam chose to build it without the runner on 12 November 2026). It reads
 * the BIS credit cycle the app already downloads (src/utils/bisCreditCycle.ts) and describes where a
 * country stands on the measures that have often come before banking crises:
 *
 * - The credit-to-GDP gap against the Basel III lines: a countercyclical capital buffer starts above
 *   2 points and reaches its maximum at 10 points. 10 points is also the line of the pre-registered
 *   test crisis_warning (docs/validation/pending/crisis_warning.json).
 * - Past spells with the gap above 10 points (start, end, peak), from the BIS series itself.
 * - The change in private credit to GDP over the last three years.
 * - The private debt service ratio and real house price growth, each against the country's own
 *   average over the quarters the BIS publishes (no threshold is set for these).
 *
 * Whether a gap above 10 points comes before a systemic banking crisis more often than usual is the
 * claim of crisis_warning. Its runner needs the Laeven-Valencia crisis dates, whose licence is not
 * confirmed, so the test has not run and this reading is "Not validated". No probability is given.
 *
 * Browser-safe, pure.
 */
import type { BisCreditCycle } from './bisCreditCycle';

export const GAP_BUFFER_START = 2;
export const GAP_WARNING = 10;
export const CRISIS_TEST_ID = 'crisis_warning';
export const CRISIS_NOT_RUN =
  'Not validated: whether a gap above 10 points comes before a systemic banking crisis more often than usual is the pre-registered test crisis_warning, which runs once the licence for the crisis dates (Laeven and Valencia, IMF) is confirmed.';
export const CRISIS_METHOD =
  'BIS credit-to-GDP gap (one-sided HP filter, lambda 400,000, as the BIS publishes it) against the Basel III lines of 2 and 10 points; private credit to GDP over 12 quarters; private debt service ratio and real house price growth against their own average over every quarter the BIS publishes. No threshold is set for the last two.';
export const CRISIS_SOURCES = ['BIS credit-to-GDP gaps (WS_CREDIT_GAP)', 'BIS debt service ratios (WS_DSR)', 'BIS selected residential property prices (WS_SPP)'];

export type GapZone = 'above_warning' | 'buffer' | 'below_buffer';

export interface GapSpell {
  from: string;
  /** Last quarter above the line; absent while the spell is still running. */
  to?: string;
  peak: number;
  peakQuarter: string;
}

export interface OwnAverage {
  quarter: string;
  value: number;
  average: number;
  since: string;
  quarters: number;
  /** value minus average, points. */
  deviation: number;
}

export interface CrisisWarning {
  ok: true;
  gap: { quarter: string; value: number; zone: GapZone; yearAgo?: { quarter: string; value: number } };
  spells: GapSpell[];
  creditChange?: { from: string; to: string; fromValue: number; toValue: number; pts: number };
  dsr?: OwnAverage;
  realHousePrices?: OwnAverage;
  missing: string[];
  method: string;
  sources: string[];
}

export type CrisisWarningOutcome = CrisisWarning | { ok: false; reason: string };

const r1 = (v: number) => Math.round(v * 10) / 10;
const sorted = (m: Record<string, number> | undefined) => Object.entries(m || {}).filter(([, v]) => Number.isFinite(v)).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

/** "2025Q4" -> "2025-Q4" for display; other keys pass through. */
export function quarterText(q: string): string {
  const m = /^(\d{4})-?Q([1-4])$/.exec(q);
  return m ? `${m[1]}-Q${m[2]}` : q;
}

function shiftQuarter(q: string, by: number): string | undefined {
  const m = /^(\d{4})-?Q([1-4])$/.exec(q);
  if (!m) return undefined;
  const n = Number(m[1]) * 4 + Number(m[2]) - 1 + by;
  const sep = q.includes('-') ? '-' : '';
  return `${Math.floor(n / 4)}${sep}Q${(n % 4) + 1}`;
}

export function gapZone(v: number): GapZone {
  if (v > GAP_WARNING) return 'above_warning';
  if (v > GAP_BUFFER_START) return 'buffer';
  return 'below_buffer';
}

/** Runs of consecutive published quarters with the gap above 10 points. */
export function gapSpells(gap: Record<string, number> | undefined): GapSpell[] {
  const out: GapSpell[] = [];
  let cur: GapSpell | null = null;
  let prev: string | undefined;
  for (const [q, v] of sorted(gap)) {
    const continues = cur && prev && shiftQuarter(prev, 1) === q;
    if (v > GAP_WARNING) {
      if (cur && continues) {
        if (v > cur.peak) Object.assign(cur, { peak: r1(v), peakQuarter: q });
      } else {
        if (cur) out.push({ ...cur, to: prev });
        cur = { from: q, peak: r1(v), peakQuarter: q };
      }
    } else if (cur) {
      out.push({ ...cur, to: prev });
      cur = null;
    }
    prev = q;
  }
  if (cur) out.push(cur);
  return out;
}

function ownAverage(m: Record<string, number> | undefined): OwnAverage | undefined {
  const pts = sorted(m);
  if (pts.length < 8) return undefined;
  const [quarter, value] = pts[pts.length - 1]!;
  const average = pts.reduce((s, [, v]) => s + v, 0) / pts.length;
  return { quarter, value: r1(value), average: r1(average), since: pts[0]![0], quarters: pts.length, deviation: r1(value - average) };
}

export function crisisWarning(cycle: BisCreditCycle | null | undefined, covered: boolean): CrisisWarningOutcome {
  if (!covered) return { ok: false, reason: 'The BIS does not publish a credit-to-GDP gap for this country' };
  if (!cycle) return { ok: false, reason: 'The BIS has not answered yet' };
  const gapPts = sorted(cycle.creditGap);
  if (!gapPts.length) return { ok: false, reason: 'The BIS answered without a credit-to-GDP gap for this country' };
  const [quarter, value] = gapPts[gapPts.length - 1]!;
  const ago = shiftQuarter(quarter, -4);
  const agoV = ago !== undefined ? cycle.creditGap?.[ago] : undefined;
  const missing: string[] = [];

  let creditChange: CrisisWarning['creditChange'];
  const ratio = sorted(cycle.creditToGdp);
  if (ratio.length) {
    const [to, toValue] = ratio[ratio.length - 1]!;
    const from = shiftQuarter(to, -12);
    const fromValue = from !== undefined ? cycle.creditToGdp?.[from] : undefined;
    if (from && fromValue !== undefined) creditChange = { from, to, fromValue: r1(fromValue), toValue: r1(toValue), pts: r1(toValue - fromValue) };
    else missing.push('Private credit to GDP: fewer than three years published, so no three-year change');
  } else missing.push('Private credit to GDP: the BIS publishes none for this country');

  const dsr = ownAverage(cycle.dsr);
  if (!dsr) missing.push('Debt service ratio: the BIS publishes none (or fewer than 8 quarters) for this country');
  const realHousePrices = ownAverage(cycle.realHousePricesYoy);
  if (!realHousePrices) missing.push('Real house prices: the BIS publishes none (or fewer than 8 quarters) for this country');

  return {
    ok: true,
    gap: { quarter, value: r1(value), zone: gapZone(value), ...(ago && agoV !== undefined ? { yearAgo: { quarter: ago, value: r1(agoV) } } : {}) },
    spells: gapSpells(cycle.creditGap),
    ...(creditChange ? { creditChange } : {}),
    ...(dsr ? { dsr } : {}),
    ...(realHousePrices ? { realHousePrices } : {}),
    missing,
    method: CRISIS_METHOD,
    sources: CRISIS_SOURCES,
  };
}

const sg = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}`;

export function crisisSentence(r: CrisisWarning, name: string): string {
  const g = r.gap;
  const where =
    g.zone === 'above_warning'
      ? `above ${GAP_WARNING}, the level at which Basel III calls for the full countercyclical capital buffer and the line the crisis_warning test uses`
      : g.zone === 'buffer'
        ? `between ${GAP_BUFFER_START} and ${GAP_WARNING}, where Basel III starts a countercyclical capital buffer`
        : `at or below ${GAP_BUFFER_START}, where Basel III calls for no countercyclical buffer`;
  const trend = g.yearAgo ? ` A year earlier it was ${sg(g.yearAgo.value)}.` : '';
  return `${name}: the credit-to-GDP gap was ${sg(g.value)} points in ${quarterText(g.quarter)}, ${where}.${trend}`;
}

/** The rows the panel and Council chat show: label, latest figure, comparison. */
export function crisisRows(r: CrisisWarning): Array<{ id: string; label: string; value: string; when: string; compare: string }> {
  const rows = [
    {
      id: 'gap',
      label: 'Credit-to-GDP gap',
      value: `${sg(r.gap.value)} pts`,
      when: quarterText(r.gap.quarter),
      compare: r.gap.zone === 'above_warning' ? `Above ${GAP_WARNING} (full Basel III buffer)` : r.gap.zone === 'buffer' ? `Between ${GAP_BUFFER_START} and ${GAP_WARNING} (Basel III buffer starts)` : `At or below ${GAP_BUFFER_START} (no Basel III buffer)`,
    },
  ];
  if (r.creditChange)
    rows.push({
      id: 'credit',
      label: 'Private credit, change over 3 years',
      value: `${sg(r.creditChange.pts)} pts of GDP`,
      when: `${quarterText(r.creditChange.from)} to ${quarterText(r.creditChange.to)}`,
      compare: `${r.creditChange.fromValue}% to ${r.creditChange.toValue}% of GDP`,
    });
  if (r.dsr)
    rows.push({
      id: 'dsr',
      label: 'Debt service ratio, private sector',
      value: `${r.dsr.value}% of income`,
      when: quarterText(r.dsr.quarter),
      compare: `${sg(r.dsr.deviation)} pts against its average of ${r.dsr.average}% since ${quarterText(r.dsr.since)}`,
    });
  if (r.realHousePrices)
    rows.push({
      id: 'houses',
      label: 'Real house prices (y/y)',
      value: `${sg(r.realHousePrices.value)}%`,
      when: quarterText(r.realHousePrices.quarter),
      compare: `${sg(r.realHousePrices.deviation)} pts against its average of ${sg(r.realHousePrices.average)}% since ${quarterText(r.realHousePrices.since)}`,
    });
  return rows;
}

export function spellsText(spells: GapSpell[]): string {
  if (!spells.length) return `The gap has not been above ${GAP_WARNING} points in the quarters the BIS publishes.`;
  const parts = spells.map((s) => (s.to ? `${quarterText(s.from)} to ${quarterText(s.to)} (peak ${sg(s.peak)} in ${quarterText(s.peakQuarter)})` : `since ${quarterText(s.from)} (peak so far ${sg(s.peak)} in ${quarterText(s.peakQuarter)})`));
  return `Spells above ${GAP_WARNING} points: ${parts.join('; ')}.`;
}
