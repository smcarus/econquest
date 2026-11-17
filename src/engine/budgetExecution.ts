/**
 * Budget execution tracker (group R, step R4, Sam 17 November 2026): your approved budget and your
 * monthly spending by ministry or programme, from a file you load, set against the share of the
 * fiscal year gone. One file per country, kept in data/local/budget-execution/<ISO3>.json with the
 * SHA-256 of the text you loaded. Nothing here is downloaded and nothing leaves this computer.
 *
 * The file has a header row and four columns, in any order, named (ignoring case):
 *   line      the ministry, programme or budget line, as you name it
 *   approved  the budget approved for that line for the whole fiscal year
 *   month     YYYY-MM, the month the spending belongs to (blank on a line with no spending yet)
 *   spent     the amount spent in that month (not the running total)
 * Commas, semicolons or tabs separate the columns; with semicolons or tabs a decimal comma is read.
 * A blank, "NA" or ".." spending figure means no figure for that month: counted, never filled.
 * The approved amount must be the same on every row of a line.
 *
 * What is worked out, for the fiscal year that holds the latest month in the file (its first month
 * is set by you, January by default):
 *   - months gone = months from the first month of the year to the latest month, both counted
 *   - share of the year gone = months gone ÷ 12
 *   - per line: spent so far, % of the approved budget, the gap to the share of the year gone in
 *     points, and Behind (more than 10 points under), Ahead (more than 10 over) or On pace
 *   - if spending carries on at the same pace: spent so far ÷ months gone × 12, as % of the budget.
 *     Only for a line with a figure for every month gone; otherwise the months without one are named.
 * Spending is often uneven over the year (contracts paid late, wages every month), so the pace
 * figure is arithmetic, not a forecast.
 *
 * Shared engine: browser-safe apart from the Platform file calls.
 */
import type { Platform } from '../platform/types';
import { BLANK, findSeparator, readNumber, sha256Hex, splitLine } from './ownSeries';

export const BUDGET_EXEC_FOLDER = 'local/budget-execution';
export const BUDGET_CSV_MAX_CHARS = 1_000_000;
export const BUDGET_MAX_ROWS = 20_000;
export const BUDGET_MAX_LINES = 300;
const PROBLEMS_SHOWN = 12;
/** Points either side of the share of the year gone that count as on pace. */
export const PACE_BAND = 10;

export const BUDGET_TEMPLATE = 'line,approved,month,spent\nHealth,1200,2026-01,80\nHealth,1200,2026-02,95\nEducation,2400,2026-01,210\nEducation,2400,2026-02,190\nRoads,900,,\n';

export interface BudgetRow {
  line: string;
  approved: number;
  month?: string;
  spent?: number;
}

export interface BudgetParse {
  rows: BudgetRow[];
  rowsRead: number;
  blank: number;
  problems: string[];
}

export interface BudgetMeta {
  /** First month of the fiscal year, 1 to 12. */
  fyStart: number;
  /** Currency or unit as you write it, e.g. "KES million". */
  unit: string;
  /** Where the figures come from, e.g. "Ministry of Finance monthly report, October 2026". */
  source: string;
}

export interface BudgetFile {
  format: 1;
  iso3: string;
  meta: BudgetMeta;
  rows: BudgetRow[];
  csvSha256: string;
  savedAt: string;
}

export type Pace = 'behind' | 'on_pace' | 'ahead';

export interface BudgetLineView {
  line: string;
  approved: number;
  spent: number;
  spentPct?: number;
  gap?: number;
  pace?: Pace;
  /** Same-pace year-end amount and its % of the budget, only with a figure for every month gone. */
  yearEnd?: number;
  yearEndPct?: number;
  /** Months gone with no figure for this line (YYYY-MM). */
  missingMonths: string[];
}

export interface BudgetView {
  iso3: string;
  meta: BudgetMeta;
  /** First month of the fiscal year shown, and the latest month in the file. */
  fyFirst?: string;
  latest?: string;
  monthsGone?: number;
  timePct?: number;
  lines: BudgetLineView[];
  total?: BudgetLineView;
  /** Rows from months outside the fiscal year shown, left out. */
  outside: number;
  missing?: string;
  csvSha256: string;
  savedAt: string;
}

const r1 = (v: number) => Math.round(v * 10) / 10;
const clean = (v: unknown, max: number): string => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

/** Reads the CSV text, with every problem found (at most a dozen shown). */
export function parseBudgetCsv(text: string): BudgetParse {
  const problems: string[] = [];
  let hidden = 0;
  const problem = (line: number, msg: string) => {
    if (problems.length < PROBLEMS_SHOWN) problems.push(`Line ${line}: ${msg}.`);
    else hidden++;
  };
  const out: BudgetParse = { rows: [], rowsRead: 0, blank: 0, problems };
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  const header = lines[0] ?? '';
  const sep = findSeparator(header);
  const cols = splitLine(header, sep).map((c) => c.toLowerCase());
  const at = { line: cols.indexOf('line'), approved: cols.indexOf('approved'), month: cols.indexOf('month'), spent: cols.indexOf('spent') };
  const lack = Object.entries(at).filter(([, i]) => i < 0).map(([k]) => k);
  if (lack.length) {
    problems.push(`The header row needs the columns line, approved, month and spent; missing: ${lack.join(', ')}.`);
    return out;
  }
  const approvedBy = new Map<string, number>();
  for (let n = 1; n < lines.length; n++) {
    const raw = lines[n] ?? '';
    if (!raw.trim()) continue;
    out.rowsRead++;
    if (out.rowsRead > BUDGET_MAX_ROWS) {
      problems.push(`More than ${BUDGET_MAX_ROWS} rows; split the file.`);
      break;
    }
    const c = splitLine(raw, sep);
    const name = clean(c[at.line] ?? '', 120);
    if (!name) {
      problem(n + 1, 'no line name');
      continue;
    }
    const approved = readNumber(c[at.approved] ?? '', sep);
    if (approved === null || approved <= 0) {
      problem(n + 1, `the approved budget "${c[at.approved] ?? ''}" is not a number above 0`);
      continue;
    }
    const before = approvedBy.get(name);
    if (before !== undefined && before !== approved) {
      problem(n + 1, `"${name}" has an approved budget of ${approved} here and ${before} on an earlier row; it must be the same on every row`);
      continue;
    }
    approvedBy.set(name, approved);
    const monthText = (c[at.month] ?? '').trim();
    const spentText = (c[at.spent] ?? '').trim();
    if (!monthText) {
      if (spentText && !BLANK.has(spentText.toLowerCase())) problem(n + 1, 'a spending figure needs a month (YYYY-MM)');
      else out.rows.push({ line: name, approved });
      continue;
    }
    const m = /^(\d{4})-(\d{2})(-\d{2})?$/.exec(monthText);
    if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) {
      problem(n + 1, `"${monthText}" is not a month (YYYY-MM)`);
      continue;
    }
    const month = `${m[1]}-${m[2]}`;
    if (BLANK.has(spentText.toLowerCase())) {
      out.blank++;
      out.rows.push({ line: name, approved, month });
      continue;
    }
    const spent = readNumber(spentText, sep);
    if (spent === null) {
      problem(n + 1, `the amount spent "${spentText}" is not a number`);
      continue;
    }
    out.rows.push({ line: name, approved, month, spent });
  }
  if (approvedBy.size > BUDGET_MAX_LINES) problems.push(`More than ${BUDGET_MAX_LINES} budget lines; group them.`);
  if (hidden) problems.push(`And ${hidden} more problems.`);
  if (!out.rows.length && !problems.length) problems.push('No rows below the header.');
  return out;
}

export function checkBudgetMeta(input: unknown): { meta: BudgetMeta } | { problems: string[] } {
  const o = (input ?? {}) as Record<string, unknown>;
  const fy = Number(o.fyStart ?? 1);
  const problems: string[] = [];
  if (!Number.isInteger(fy) || fy < 1 || fy > 12) problems.push('The first month of the fiscal year must be 1 to 12.');
  const unit = clean(o.unit, 40);
  const source = clean(o.source, 300);
  if (!unit) problems.push('Say what unit the amounts are in (for example "KES million").');
  if (!source) problems.push('Say where the figures come from (for example "Ministry of Finance monthly report").');
  return problems.length ? { problems } : { meta: { fyStart: fy, unit, source } };
}

const monthIndex = (ym: string) => Number(ym.slice(0, 4)) * 12 + Number(ym.slice(5, 7)) - 1;
const ymOf = (idx: number) => `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`;

/** The tracker for the fiscal year that holds the latest month in the file. */
export function budgetView(f: BudgetFile): BudgetView {
  const v: BudgetView = { iso3: f.iso3, meta: f.meta, lines: [], outside: 0, csvSha256: f.csvSha256, savedAt: f.savedAt };
  const months = f.rows.map((r) => r.month).filter((m): m is string => !!m);
  const approvedBy = new Map<string, number>();
  for (const r of f.rows) approvedBy.set(r.line, r.approved);
  if (!months.length) {
    v.missing = 'The file has no month with spending yet, so nothing can be set against the year';
    v.lines = [...approvedBy].map(([line, approved]) => ({ line, approved, spent: 0, missingMonths: [] }));
    return v;
  }
  const latestIdx = Math.max(...months.map(monthIndex));
  const latestMonth = latestIdx % 12; // 0 = January
  const startMonth = f.meta.fyStart - 1;
  const firstIdx = latestIdx - ((latestMonth - startMonth + 12) % 12);
  const gone = latestIdx - firstIdx + 1;
  v.fyFirst = ymOf(firstIdx);
  v.latest = ymOf(latestIdx);
  v.monthsGone = gone;
  v.timePct = r1((gone / 12) * 100);
  const inYear = (m: string) => monthIndex(m) >= firstIdx && monthIndex(m) <= latestIdx;
  const spentBy = new Map<string, Map<string, number>>();
  for (const r of f.rows) {
    if (!r.month) continue;
    if (!inYear(r.month)) {
      v.outside++;
      continue;
    }
    if (r.spent === undefined) continue;
    const m = spentBy.get(r.line) ?? new Map<string, number>();
    m.set(r.month, (m.get(r.month) ?? 0) + r.spent);
    spentBy.set(r.line, m);
  }
  const allMonths = Array.from({ length: gone }, (_, i) => ymOf(firstIdx + i));
  const lineView = (line: string, approved: number, byMonth: Map<string, number>): BudgetLineView => {
    const spent = [...byMonth.values()].reduce((s, x) => s + x, 0);
    const missingMonths = allMonths.filter((m) => !byMonth.has(m));
    const spentPct = r1((spent / approved) * 100);
    const gap = r1(spentPct - v.timePct!);
    const out: BudgetLineView = { line, approved, spent: r1(spent), spentPct, gap, pace: gap < -PACE_BAND ? 'behind' : gap > PACE_BAND ? 'ahead' : 'on_pace', missingMonths };
    if (!missingMonths.length) {
      out.yearEnd = r1((spent / gone) * 12);
      out.yearEndPct = r1((spent / gone / approved) * 1200);
    }
    return out;
  };
  v.lines = [...approvedBy].map(([line, approved]) => lineView(line, approved, spentBy.get(line) ?? new Map())).sort((a, b) => b.approved - a.approved);
  const totalApproved = [...approvedBy.values()].reduce((s, x) => s + x, 0);
  const totalByMonth = new Map<string, number>();
  for (const m of spentBy.values()) for (const [k, x] of m) totalByMonth.set(k, (totalByMonth.get(k) ?? 0) + x);
  v.total = lineView('Total', totalApproved, totalByMonth);
  // The total's pace figure only when every line has every month.
  if (v.lines.some((l) => l.missingMonths.length)) {
    delete v.total.yearEnd;
    delete v.total.yearEndPct;
    v.total.missingMonths = [...new Set(v.lines.flatMap((l) => l.missingMonths))].sort();
  }
  return v;
}

const fileName = (iso3: string) => `${BUDGET_EXEC_FOLDER}/${iso3}.json`;

export async function loadBudget(platform: Platform, iso3: string): Promise<BudgetFile | null> {
  const text = await platform.files.read(fileName(iso3));
  if (!text) return null;
  try {
    const f = JSON.parse(text) as BudgetFile;
    return f && f.format === 1 && Array.isArray(f.rows) && f.meta ? f : null;
  } catch {
    return null;
  }
}

export async function saveBudget(platform: Platform, iso3: string, metaInput: unknown, csv: unknown): Promise<{ saved: BudgetFile } | { problems: string[] }> {
  if (!/^[A-Z]{3}$/.test(iso3)) return { problems: ['Open a country first.'] };
  const m = checkBudgetMeta(metaInput);
  if (typeof csv !== 'string' || !csv.trim()) return { problems: ['No file text was sent.', ...('problems' in m ? m.problems : [])] };
  if (csv.length > BUDGET_CSV_MAX_CHARS) return { problems: [`The file is larger than ${BUDGET_CSV_MAX_CHARS.toLocaleString('en')} characters.`] };
  const p = parseBudgetCsv(csv);
  const problems = [...('problems' in m ? m.problems : []), ...p.problems];
  if (problems.length || 'problems' in m) return { problems };
  const f: BudgetFile = { format: 1, iso3, meta: m.meta, rows: p.rows, csvSha256: await sha256Hex(csv), savedAt: new Date(platform.clock.now()).toISOString() };
  await platform.files.write(fileName(iso3), JSON.stringify(f));
  return { saved: f };
}

export async function deleteBudget(platform: Platform, iso3: string): Promise<boolean> {
  if (!(await platform.files.read(fileName(iso3)))) return false;
  await platform.files.remove(fileName(iso3));
  return true;
}

/** One English sentence for Explain in chat. */
export function budgetSentence(v: BudgetView, country: string): string {
  if (!v.total || v.timePct === undefined) return `${country}: budget execution Missing (${v.missing ?? 'no file loaded'}).`;
  const t = v.total;
  const behind = v.lines.filter((l) => l.pace === 'behind').map((l) => l.line);
  const ahead = v.lines.filter((l) => l.pace === 'ahead').map((l) => l.line);
  let s = `${country}, your budget file (${v.meta.source}): ${t.spentPct}% of the approved ${t.approved} ${v.meta.unit} spent by ${v.latest}, with ${v.timePct}% of the fiscal year gone.`;
  if (behind.length) s += ` Behind: ${behind.slice(0, 5).join(', ')}.`;
  if (ahead.length) s += ` Ahead: ${ahead.slice(0, 5).join(', ')}.`;
  if (t.yearEndPct !== undefined) s += ` At the same pace the year would end at ${t.yearEndPct}% of the budget.`;
  return s;
}
