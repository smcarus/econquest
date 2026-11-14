/**
 * Policy council (PK1 to PK5), the parts of a policy review that weigh one measure.
 *
 * The measure itself is in the frame (ReviewFrame.council, PK1). Each part here is entered by the
 * user, saved beside the steps (not in the step chain), hashed, written to the audit log and tied to
 * the hash of the frame it was entered against, so it reads "Out of date" when the frame changes.
 *
 * PK2 cost-benefit: costs and benefits by year, each line with its own source; present values at
 * the official discount rates the user ticks (src/data/discountRates.ts, each cited) and an own
 * rate; net present value, benefit-cost ratio, the year the running total turns positive, how far
 * costs or benefits would have to move to flip the answer, and the discount rate at which it flips.
 *
 * PK3 winners and losers: one row per group (who gains, who loses, why), with a size only when the
 * user gives one with its source, otherwise "Missing"; optionally the share of the change each fifth
 * of people carries (G30, src/utils/policyIncidence.ts), set against each fifth's share of income.
 *
 * PK4 second-order effects: a chain of links (this leads to that), each resting on a figure from the
 * review's saved Diagnose step (copied in with its source and period), a source the user names, or
 * marked "assumption" when it rests on neither.
 *
 * PK5 scenarios: a base, a good and a bad case (up to five), each a story with costs and benefits
 * scaled from the PK2 table and benefits arriving later if the user says so, with odds the user
 * sets. The net present value of each at one of the PK2 rates, and the odds-weighted net and the
 * chance of a negative net when odds are given.
 *
 * No figure is filled in for the user. Browser-safe.
 */
import { DISCOUNT_RATES, discountRateById, type DiscountRate } from '../data/discountRates';
import { COUNCIL_SIZE_UNITS, type CouncilSizeUnit } from './policyReview';
import { incidence, QUINTILES, type Direction } from './policyIncidence';
import type { DiagnosisFigure } from './reviewDiagnosis';

export const COUNCIL_TEMPLATE_VERSION = 'policy-council-v1';
export const COUNCIL_LABEL = 'Description, not a tested signal';

/** The parts saved beside the steps, in the order they are shown. */
export const COUNCIL_PARTS = ['costBenefit', 'groups', 'chain', 'scenarios'] as const;
export type CouncilPart = (typeof COUNCIL_PARTS)[number];

export interface CouncilPartRecord<T = unknown> {
  templateVersion: string;
  /** Hash of the frame this part was entered against. */
  frameHash: string;
  content: T;
  savedAt: string;
  /** SHA-256 of templateVersion, frameHash and content. */
  hash: string;
}
export type CouncilParts = Partial<Record<CouncilPart, CouncilPartRecord>>;
export type CouncilPartState = 'not_started' | 'done' | 'out_of_date';

export function councilPartState(rec: CouncilPartRecord | undefined, frameHash: string | undefined): CouncilPartState {
  if (!rec) return 'not_started';
  return frameHash && rec.frameHash === frameHash ? 'done' : 'out_of_date';
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : '');
const num = (v: unknown): number | null => {
  if (v === '' || v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : null;
};

// ---------------------------------------------------------------- PK2 cost-benefit

export const MAX_CB_LINES = 20;
export const MAX_CB_YEARS = 50;
export const MAX_OWN_RATE = 30;

export interface CbLine {
  kind: 'cost' | 'benefit';
  label: string;
  /** One value a year, the first for the first year; in the unit of the whole table. */
  values: number[];
  source: string;
  link?: string;
}

export interface CostBenefit {
  unit: CouncilSizeUnit;
  /** The calendar year of the first value. */
  firstYear: number;
  lines: CbLine[];
  /** Official rates ticked (ids in src/data/discountRates.ts). */
  rateIds: string[];
  /** The user's own rate, % a year, if any. */
  ownRate?: number;
  ownRateSource?: string;
}

/** Reads "1.2, 1.2; 0.8" or [1.2, 1.2, 0.8] into numbers; null when any entry is not a number. */
export function parseValues(v: unknown): number[] | null {
  // Separators: semicolons, spaces, or a comma followed by a space ("1.2, 1.2"); "1,200" reads as 1200.
  const parts = Array.isArray(v) ? v : typeof v === 'string' ? v.split(/[;\s]+/).map((x) => x.replace(/,$/, '')) : [];
  const out: number[] = [];
  for (const p of parts) {
    if (typeof p === 'string' && !p.trim()) continue;
    const n = num(p);
    if (n === null || Math.abs(n) > 1e7) return null;
    out.push(n);
  }
  return out;
}

/** Checks a cost-benefit table from the browser. Every line needs a name, its values and its source. */
export function parseCostBenefit(v: unknown, defaults: { unit?: CouncilSizeUnit; firstYear: number }): { content: CostBenefit } | { errors: string[] } {
  const errors: string[] = [];
  const b = (v ?? {}) as Record<string, unknown>;
  const unit = COUNCIL_SIZE_UNITS.includes(b.unit as CouncilSizeUnit) ? (b.unit as CouncilSizeUnit) : defaults.unit ?? 'lcu_bn';
  const fy = num(b.firstYear);
  const firstYear = fy !== null && Number.isInteger(fy) && fy >= 1950 && fy <= 2150 ? fy : defaults.firstYear;
  const rawLines = Array.isArray(b.lines) ? b.lines : [];
  if (!rawLines.length) errors.push('Enter at least one cost or benefit.');
  if (rawLines.length > MAX_CB_LINES) errors.push(`At most ${MAX_CB_LINES} lines.`);
  const lines: CbLine[] = [];
  rawLines.slice(0, MAX_CB_LINES).forEach((raw, i) => {
    const l = (raw ?? {}) as Record<string, unknown>;
    const n = i + 1;
    const kind = l.kind === 'benefit' ? 'benefit' : l.kind === 'cost' ? 'cost' : null;
    const label = str(l.label, 120);
    const values = parseValues(l.values);
    const source = str(l.source, 300);
    const link = str(l.link, 400);
    if (!kind) errors.push(`Line ${n}: pick cost or benefit.`);
    if (label.length < 2) errors.push(`Line ${n}: give it a name.`);
    if (!values) errors.push(`Line ${n}: every yearly value must be a number.`);
    else if (!values.length) errors.push(`Line ${n}: enter at least one yearly value.`);
    else if (values.length > MAX_CB_YEARS) errors.push(`Line ${n}: at most ${MAX_CB_YEARS} years.`);
    if (source.length < 3) errors.push(`Line ${n}: say where the figures come from (a study, a budget line, your own working).`);
    if (link && !/^https?:\/\//i.test(link)) errors.push(`Line ${n}: the link must start with http:// or https://.`);
    if (kind && label.length >= 2 && values && values.length && values.length <= MAX_CB_YEARS && source.length >= 3) lines.push({ kind, label, values, source, ...(link && /^https?:\/\//i.test(link) ? { link } : {}) });
  });
  const ids = Array.isArray(b.rateIds) ? b.rateIds.filter((x): x is string => typeof x === 'string') : [];
  const rateIds = DISCOUNT_RATES.map((r) => r.id).filter((id) => ids.includes(id));
  const unknown = ids.filter((id) => !discountRateById(id));
  if (unknown.length) errors.push(`Unknown discount rate: ${unknown.join(', ')}.`);
  const own = num(b.ownRate);
  const ownRateSource = str(b.ownRateSource, 300);
  if (b.ownRate !== undefined && b.ownRate !== '' && b.ownRate !== null && (own === null || own < 0 || own > MAX_OWN_RATE)) errors.push(`Your own rate must be a number from 0 to ${MAX_OWN_RATE}.`);
  const ownOk = own !== null && own >= 0 && own <= MAX_OWN_RATE;
  if (!rateIds.length && !ownOk) errors.push('Tick at least one discount rate or enter your own.');
  if (errors.length) return { errors };
  return { content: { unit, firstYear, lines, rateIds, ...(ownOk ? { ownRate: own!, ...(ownRateSource ? { ownRateSource } : {}) } : {}) } };
}

/** A rate schedule: from year `from` (0 = first year) the rate is `rate` % a year. */
export type RateStep = { from: number; rate: number };

/** Discount factors for years 0..n-1: 1 for the first year, then divided by (1 + that year's rate). */
export function discountFactors(steps: RateStep[], n: number): number[] {
  const sorted = [...steps].sort((a, b) => a.from - b.from);
  const rateAt = (t: number) => {
    let r = sorted[0]?.rate ?? 0;
    for (const s of sorted) if (t >= s.from) r = s.rate;
    return r;
  };
  const out: number[] = [];
  for (let t = 0; t < n; t++) out.push(t === 0 ? 1 : out[t - 1] / (1 + rateAt(t) / 100));
  return out;
}

export interface CbResult {
  label: string;
  /** The schedule as text, e.g. "3.5% (years 0 to 30), 3.0% after". */
  rateText: string;
  pvCosts: number;
  pvBenefits: number;
  npv: number;
  /** Benefits over costs; null when there are no costs. */
  bcr: number | null;
  /** The calendar year from which the running discounted total stays at or above zero; null if it never does. */
  breakEvenYear: number | null;
  /** When the answer is positive: the % rise in costs that turns it to zero. When negative: the % rise in benefits needed. */
  switchPct: number | null;
  switchWhat: 'costs_rise' | 'benefits_rise' | null;
}

export function yearlyNet(cb: CostBenefit): { costs: number[]; benefits: number[]; net: number[] } {
  const n = Math.max(0, ...cb.lines.map((l) => l.values.length));
  const costs = Array<number>(n).fill(0);
  const benefits = Array<number>(n).fill(0);
  for (const l of cb.lines) l.values.forEach((v, t) => (l.kind === 'cost' ? (costs[t] += v) : (benefits[t] += v)));
  return { costs, benefits, net: benefits.map((b, t) => b - costs[t]) };
}

const rateText = (steps: RateStep[]) => (steps.length === 1 ? `${steps[0].rate}%` : steps.map((s) => (s.from ? `${s.rate}% from year ${s.from}` : `${s.rate}%`)).join(', '));

export function cbAt(cb: CostBenefit, label: string, steps: RateStep[]): CbResult {
  const { costs, benefits, net } = yearlyNet(cb);
  const df = discountFactors(steps, net.length);
  const pvCosts = costs.reduce((s, v, t) => s + v * df[t], 0);
  const pvBenefits = benefits.reduce((s, v, t) => s + v * df[t], 0);
  const npv = pvBenefits - pvCosts;
  let running = 0;
  let breakEven: number | null = null;
  net.forEach((v, t) => {
    running += v * df[t];
    if (running >= 0 && breakEven === null) breakEven = t;
    if (running < 0) breakEven = null;
  });
  let switchPct: number | null = null;
  let switchWhat: CbResult['switchWhat'] = null;
  if (npv > 0 && pvCosts > 0) {
    switchPct = (npv / pvCosts) * 100;
    switchWhat = 'costs_rise';
  } else if (npv < 0 && pvBenefits > 0) {
    switchPct = (-npv / pvBenefits) * 100;
    switchWhat = 'benefits_rise';
  }
  return {
    label,
    rateText: rateText(steps),
    pvCosts,
    pvBenefits,
    npv,
    bcr: pvCosts > 0 ? pvBenefits / pvCosts : null,
    breakEvenYear: breakEven === null ? null : cb.firstYear + (breakEven as number),
    switchPct,
    switchWhat,
  };
}

/** The flat discount rate (% a year) at which the net present value is zero, if it changes sign between -50% and 100%. */
export function flipRate(cb: CostBenefit): number | null {
  const { net } = yearlyNet(cb);
  const npv = (r: number) => net.reduce((s, v, t) => s + v / Math.pow(1 + r / 100, t), 0);
  // Scan for the first sign change from 0% upwards, then from 0% downwards.
  const scan = (from: number, to: number, step: number): number | null => {
    let a = from;
    let fa = npv(a);
    if (fa === 0) return a;
    for (let b = from + step; step > 0 ? b <= to : b >= to; b += step) {
      const fb = npv(b);
      if (fb === 0) return b;
      if (Math.sign(fa) !== Math.sign(fb)) {
        let lo = a;
        let hi = b;
        for (let i = 0; i < 60; i++) {
          const mid = (lo + hi) / 2;
          if (Math.sign(npv(mid)) === Math.sign(npv(lo))) lo = mid;
          else hi = mid;
        }
        return Math.round(((lo + hi) / 2) * 100) / 100;
      }
      a = b;
      fa = fb;
    }
    return null;
  };
  return scan(0, 100, 0.25) ?? scan(0, -50, -0.25);
}

/** The schedules to report: the ticked official rates, then the user's own. */
export function cbSchedules(cb: CostBenefit): { id: string; label: string; steps: RateStep[]; rate?: DiscountRate }[] {
  const out: { id: string; label: string; steps: RateStep[]; rate?: DiscountRate }[] = [];
  for (const id of cb.rateIds) {
    const r = discountRateById(id);
    if (r) out.push({ id, label: r.label, steps: r.steps, rate: r });
  }
  if (cb.ownRate !== undefined) out.push({ id: 'own', label: 'Your own rate', steps: [{ from: 0, rate: cb.ownRate }] });
  return out;
}

export function costBenefitResults(cb: CostBenefit): { results: (CbResult & { id: string })[]; flip: number | null } {
  return { results: cbSchedules(cb).map((s) => ({ id: s.id, ...cbAt(cb, s.label, s.steps) })), flip: flipRate(cb) };
}

// ---------------------------------------------------------------- PK3 winners and losers

export const MAX_GROUPS = 20;
export const GROUP_EFFECTS = ['gains', 'loses', 'mixed'] as const;
export type GroupEffect = (typeof GROUP_EFFECTS)[number];

/** Suggested group names (the user can type any other). */
export const GROUP_SUGGESTIONS = [
  'Poorer households',
  'Middle-income households',
  'Richer households',
  'Rural households',
  'Urban households',
  'Workers in the sector',
  'Firms in the sector',
  'Consumers',
  'Exporters',
  'Importers',
  'Savers',
  'Borrowers',
  'Government budget',
  'Foreign investors',
  'Future generations',
];

export interface GroupRow {
  group: string;
  effect: GroupEffect;
  /** Why this group gains or loses, in a line. */
  why: string;
  size?: number;
  /** What the size is in, as the source states it (e.g. "% of income", "US$ per household a year"). */
  sizeUnit?: string;
  source?: string;
  link?: string;
}

export interface FifthShares {
  direction: Direction;
  sizePctGdp: number;
  /** Share of the change each fifth carries, %, poorest first. */
  shares: number[];
  source: string;
}

export interface WinnersLosers {
  rows: GroupRow[];
  fifths?: FifthShares;
}

export function parseWinnersLosers(v: unknown): { content: WinnersLosers } | { errors: string[] } {
  const errors: string[] = [];
  const b = (v ?? {}) as Record<string, unknown>;
  const raw = Array.isArray(b.rows) ? b.rows : [];
  if (!raw.length) errors.push('Name at least one group that gains or loses.');
  if (raw.length > MAX_GROUPS) errors.push(`At most ${MAX_GROUPS} groups.`);
  const rows: GroupRow[] = [];
  raw.slice(0, MAX_GROUPS).forEach((x, i) => {
    const r = (x ?? {}) as Record<string, unknown>;
    const n = i + 1;
    const group = str(r.group, 80);
    const effect = GROUP_EFFECTS.includes(r.effect as GroupEffect) ? (r.effect as GroupEffect) : null;
    const why = str(r.why, 300);
    const size = num(r.size);
    const sizeUnit = str(r.sizeUnit, 60);
    const source = str(r.source, 300);
    const link = str(r.link, 400);
    let ok = true;
    const bad = (m: string) => {
      errors.push(m);
      ok = false;
    };
    if (group.length < 2) bad(`Group ${n}: give it a name.`);
    if (!effect) bad(`Group ${n}: pick gains, loses or mixed.`);
    if (why.length < 5) bad(`Group ${n}: say why in a line.`);
    if (r.size !== undefined && r.size !== '' && r.size !== null) {
      if (size === null || Math.abs(size) > 1e9) bad(`Group ${n}: the size must be a number.`);
      else if (source.length < 3) bad(`Group ${n}: a size needs its source.`);
      else if (!sizeUnit) bad(`Group ${n}: say what the size is in.`);
    }
    if (link && !/^https?:\/\//i.test(link)) bad(`Group ${n}: the link must start with http:// or https://.`);
    if (ok) rows.push({ group, effect: effect!, why, ...(size !== null ? { size, sizeUnit, source } : source ? { source } : {}), ...(link ? { link } : {}) });
  });
  let fifths: FifthShares | undefined;
  const f = b.fifths as Record<string, unknown> | undefined | null;
  if (f && typeof f === 'object') {
    const shares = Array.isArray(f.shares) ? f.shares.map(num) : [];
    const direction = f.direction === 'pay' || f.direction === 'gain' ? f.direction : null;
    const out = incidence({ direction, sizePctGdp: num(f.sizePctGdp), shares, source: str(f.source, 300) }, null);
    if (!out.ok) {
      const say: Record<string, string> = {
        direction: 'By fifth: pick whether households pay or gain.',
        size: 'By fifth: the size must be above 0 and at most 50% of GDP.',
        shares: `By fifth: enter all ${QUINTILES} shares, each from 0 to 100.`,
        sum: `By fifth: the shares add up to ${out.sharesSum}%, not 100%.`,
        source: 'By fifth: say where the shares come from.',
      };
      for (const p of out.problems) errors.push(say[p]);
    } else fifths = { direction: out.direction, sizePctGdp: out.sizePctGdp, shares: out.groups.map((g) => g.sharePct), source: out.source };
  }
  if (errors.length) return { errors };
  return { content: { rows, ...(fifths ? { fifths } : {}) } };
}

/** Counts for the summary line. */
export function groupTally(w: WinnersLosers): { gains: number; loses: number; mixed: number; noFigure: string[] } {
  return {
    gains: w.rows.filter((r) => r.effect === 'gains').length,
    loses: w.rows.filter((r) => r.effect === 'loses').length,
    mixed: w.rows.filter((r) => r.effect === 'mixed').length,
    noFigure: w.rows.filter((r) => r.size === undefined).map((r) => r.group),
  };
}

// ---------------------------------------------------------------- PK4 second-order effects

export const MAX_LINKS = 24;
export const LINK_DIRECTIONS = ['raises', 'lowers', 'unclear'] as const;
export type LinkDirection = (typeof LINK_DIRECTIONS)[number];
export const LINK_BASES = ['figure', 'source', 'assumption'] as const;
export type LinkBasis = (typeof LINK_BASES)[number];

export interface LinkFigure {
  ref: number;
  label: string;
  value: number;
  unit: string;
  period: string;
  source: string;
}

export interface ChainLink {
  from: string;
  to: string;
  direction: LinkDirection;
  /** How long it takes, in the user's words (e.g. "6 to 12 months"). */
  lag?: string;
  basis: LinkBasis;
  figure?: LinkFigure;
  source?: string;
  link?: string;
}

export interface EffectChain {
  links: ChainLink[];
}

export function parseChain(v: unknown, figures: DiagnosisFigure[] | undefined): { content: EffectChain } | { errors: string[] } {
  const errors: string[] = [];
  const b = (v ?? {}) as Record<string, unknown>;
  const raw = Array.isArray(b.links) ? b.links : [];
  if (!raw.length) errors.push('Enter at least one link.');
  if (raw.length > MAX_LINKS) errors.push(`At most ${MAX_LINKS} links.`);
  const links: ChainLink[] = [];
  raw.slice(0, MAX_LINKS).forEach((x, i) => {
    const l = (x ?? {}) as Record<string, unknown>;
    const n = i + 1;
    const from = str(l.from, 160);
    const to = str(l.to, 160);
    const direction = LINK_DIRECTIONS.includes(l.direction as LinkDirection) ? (l.direction as LinkDirection) : null;
    const lag = str(l.lag, 60);
    const basis = LINK_BASES.includes(l.basis as LinkBasis) ? (l.basis as LinkBasis) : 'assumption';
    const source = str(l.source, 300);
    const link = str(l.link, 400);
    let ok = true;
    const bad = (m: string) => {
      errors.push(m);
      ok = false;
    };
    if (from.length < 2) bad(`Link ${n}: say what leads to the next thing.`);
    if (to.length < 2) bad(`Link ${n}: say what it leads to.`);
    if (!direction) bad(`Link ${n}: pick raises, lowers or unclear.`);
    let figure: LinkFigure | undefined;
    if (basis === 'figure') {
      const ref = num(l.ref);
      const f = ref === null ? undefined : figures?.find((x) => x.ref === ref);
      if (!figures?.length) bad(`Link ${n}: run Diagnose first to cite one of its figures.`);
      else if (!f) bad(`Link ${n}: pick a figure from the Diagnose step.`);
      else if (f.status !== 'Live' || f.value === null) bad(`Link ${n}: figure [${f.ref}] is Missing (${f.reason || 'no value'}); cite a source or mark it as an assumption.`);
      else figure = { ref: f.ref, label: f.label, value: f.value, unit: f.unit, period: f.period, source: f.source };
    }
    if (basis === 'source' && source.length < 3) bad(`Link ${n}: name the source, or mark it as an assumption.`);
    if (link && !/^https?:\/\//i.test(link)) bad(`Link ${n}: the link must start with http:// or https://.`);
    if (ok)
      links.push({
        from,
        to,
        direction: direction!,
        ...(lag ? { lag } : {}),
        basis,
        ...(figure ? { figure } : {}),
        ...(basis === 'source' ? { source, ...(link ? { link } : {}) } : {}),
      });
  });
  if (errors.length) return { errors };
  return { content: { links } };
}

/** How many links rest on a figure, a source or an assumption. */
export function chainTally(c: EffectChain): Record<LinkBasis, number> {
  return { figure: c.links.filter((l) => l.basis === 'figure').length, source: c.links.filter((l) => l.basis === 'source').length, assumption: c.links.filter((l) => l.basis === 'assumption').length };
}

// ---------------------------------------------------------------- PK5 scenarios

export const MAX_SCENARIOS = 5;
export const MAX_DELAY = 10;

export interface Scenario {
  name: string;
  /** What happens in this case, in a line or two. */
  story: string;
  /** Costs as % of the PK2 table (100 = as entered). */
  costScale: number;
  /** Benefits as % of the PK2 table. */
  benefitScale: number;
  /** Years the benefits arrive later than in the table. */
  delayYears: number;
  /** Chance of this case, %, if the user gives odds. */
  odds?: number;
  source?: string;
}

export interface Scenarios {
  scenarios: Scenario[];
  /** The PK2 rate to report at (a discount rate id or "own"). */
  rateId: string;
}

export function parseScenarios(v: unknown): { content: Scenarios } | { errors: string[] } {
  const errors: string[] = [];
  const b = (v ?? {}) as Record<string, unknown>;
  const raw = Array.isArray(b.scenarios) ? b.scenarios : [];
  if (raw.length < 2) errors.push('Enter at least two cases (for example a base and a bad case).');
  if (raw.length > MAX_SCENARIOS) errors.push(`At most ${MAX_SCENARIOS} cases.`);
  const scenarios: Scenario[] = [];
  raw.slice(0, MAX_SCENARIOS).forEach((x, i) => {
    const c = (x ?? {}) as Record<string, unknown>;
    const n = i + 1;
    const name = str(c.name, 60);
    const story = str(c.story, 400);
    const costScale = num(c.costScale);
    const benefitScale = num(c.benefitScale);
    const delay = c.delayYears === '' || c.delayYears === undefined || c.delayYears === null ? 0 : num(c.delayYears);
    const odds = c.odds === '' || c.odds === undefined || c.odds === null ? undefined : num(c.odds);
    const source = str(c.source, 300);
    let ok = true;
    const bad = (m: string) => {
      errors.push(m);
      ok = false;
    };
    if (name.length < 2) bad(`Case ${n}: give it a name.`);
    if (story.length < 5) bad(`Case ${n}: say what happens in it.`);
    if (costScale === null || costScale < 0 || costScale > 1000) bad(`Case ${n}: costs must be a % of the table from 0 to 1000.`);
    if (benefitScale === null || benefitScale < 0 || benefitScale > 1000) bad(`Case ${n}: benefits must be a % of the table from 0 to 1000.`);
    if (delay === null || !Number.isInteger(delay) || delay < 0 || delay > MAX_DELAY) bad(`Case ${n}: the delay must be a whole number of years from 0 to ${MAX_DELAY}.`);
    if (odds === null || (odds !== undefined && (odds < 0 || odds > 100))) bad(`Case ${n}: the odds must be a % from 0 to 100.`);
    if (ok) scenarios.push({ name, story, costScale: costScale!, benefitScale: benefitScale!, delayYears: delay!, ...(typeof odds === 'number' ? { odds } : {}), ...(source ? { source } : {}) });
  });
  const given = scenarios.filter((x) => x.odds !== undefined);
  if (given.length && given.length !== scenarios.length) errors.push('Give odds for every case or for none.');
  else if (given.length) {
    const sum = given.reduce((a, x) => a + x.odds!, 0);
    if (Math.abs(sum - 100) > 0.5) errors.push(`The odds add up to ${Math.round(sum * 100) / 100}%, not 100%.`);
  }
  const rateId = str(b.rateId, 40) || 'first';
  if (errors.length) return { errors };
  return { content: { scenarios, rateId } };
}

/** The PK2 table as it would be in one case. */
export function scaledTable(cb: CostBenefit, s: Scenario): CostBenefit {
  return {
    ...cb,
    lines: cb.lines.map((l) => ({
      ...l,
      values: l.kind === 'cost' ? l.values.map((v) => (v * s.costScale) / 100) : [...Array<number>(s.delayYears).fill(0), ...l.values.map((v) => (v * s.benefitScale) / 100)],
    })),
  };
}

export interface ScenarioResult {
  name: string;
  npv: number;
  odds?: number;
  breakEvenYear: number | null;
}

export function scenarioResults(cb: CostBenefit, sc: Scenarios): { rate: { id: string; label: string; rateText: string } | null; results: ScenarioResult[]; expected: number | null; chanceNegative: number | null } {
  const schedules = cbSchedules(cb);
  const pick = schedules.find((x) => x.id === sc.rateId) ?? schedules[0];
  if (!pick) return { rate: null, results: [], expected: null, chanceNegative: null };
  const results = sc.scenarios.map((s) => {
    const r = cbAt(scaledTable(cb, s), pick.label, pick.steps);
    return { name: s.name, npv: r.npv, breakEvenYear: r.breakEvenYear, ...(s.odds !== undefined ? { odds: s.odds } : {}) };
  });
  const withOdds = results.length > 0 && results.every((r) => r.odds !== undefined);
  return {
    rate: { id: pick.id, label: pick.label, rateText: cbAt(cb, pick.label, pick.steps).rateText },
    results,
    expected: withOdds ? results.reduce((a, r) => a + (r.npv * r.odds!) / 100, 0) : null,
    chanceNegative: withOdds ? results.filter((r) => r.npv < 0).reduce((a, r) => a + r.odds!, 0) : null,
  };
}

/** Checks the content of one part. */
export function parseCouncilPart(part: CouncilPart, v: unknown, defaults: { unit?: CouncilSizeUnit; firstYear: number; figures?: DiagnosisFigure[] }): { content: unknown } | { errors: string[] } {
  switch (part) {
    case 'costBenefit':
      return parseCostBenefit(v, defaults);
    case 'groups':
      return parseWinnersLosers(v);
    case 'chain':
      return parseChain(v, defaults.figures);
    case 'scenarios':
      return parseScenarios(v);
  }
}
