/**
 * Register your own test (plan item L4a): a researcher writes down a hypothesis, picks one of the
 * app's backtest methods, types every threshold and the pass mark, and saves it. Saving freezes it:
 * the file gets a SHA-256 fingerprint and the server's date, and can never be edited or replaced
 * (a changed idea is a new test). Running it (L4b) uses the same methods as the app's own
 * pre-registered tests (src/utils/backtest.ts) and keeps its verdicts in a family of their own, so
 * your tests never change the app's multiple-testing adjustment and the app's never change yours.
 *
 * Nothing is filled in for you: every threshold starts blank. The app's own registered value is shown
 * beside each one as a reference only.
 *
 * Browser-safe, pure.
 */
import type { BacktestMethod, BacktestSpec } from './backtest';

export const USER_TEST_PREFIX = 'mine_';

/** The registered test as saved: the app's spec shape plus who and where it belongs. */
export interface UserTestSpec extends BacktestSpec {
  owner: 'user';
}

export interface MethodParams {
  method: BacktestMethod;
  /** The threshold names the method reads, from the app's latest registered test of that method. */
  keys: string[];
  /** The app's own registered values, shown as a reference beside the blank boxes. */
  appValues: Record<string, number>;
  /** The app's own sample start, as a reference. */
  appFrom: string;
  /** The app's test it was taken from, e.g. "taylor_gap v2". */
  appTest: string;
}

/** One entry per method the app has a registered test for, the latest version of each. */
export function methodParams(appSpecs: BacktestSpec[]): MethodParams[] {
  const latest = new Map<BacktestMethod, BacktestSpec>();
  for (const s of appSpecs) {
    if (!s?.method || !s.params) continue;
    const had = latest.get(s.method);
    if (!had || s.version > had.version) latest.set(s.method, s);
  }
  return [...latest.values()]
    .sort((a, b) => a.method.localeCompare(b.method))
    .map((s) => ({ method: s.method, keys: Object.keys(s.params), appValues: { ...s.params }, appFrom: s.sample.from, appTest: `${s.id} v${s.version}` }));
}

/** What the form sends; every number arrives as typed text. */
export interface UserTestInput {
  name?: string;
  method?: string;
  hypothesis?: string;
  params?: Record<string, string | number | null | undefined>;
  from?: string;
  to?: string;
  passMark?: { minCases?: string | number; minLiftPts?: string | number; maxPValue?: string | number; minYears?: string | number; minSeriesShare?: string | number };
  knownLimits?: string;
}

export type UserTestProblem =
  | { code: 'name' }
  | { code: 'method' }
  | { code: 'hypothesis' }
  | { code: 'param_missing'; key: string }
  | { code: 'param_nan'; key: string }
  | { code: 'from' }
  | { code: 'to' }
  | { code: 'pass_missing'; key: 'minCases' | 'minLiftPts' | 'maxPValue' }
  | { code: 'pass_range'; key: 'minCases' | 'minLiftPts' | 'maxPValue' | 'minYears' | 'minSeriesShare' };

const num = (v: unknown): number | null => {
  if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) return null;
  const n = typeof v === 'number' ? v : Number(String(v).trim().replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};

/** "Policy cuts after CLI peaks, 3 months" -> "mine_policy_cuts_after_cli_peaks_3_months". */
export function userTestId(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
  return slug ? `${USER_TEST_PREFIX}${slug}` : '';
}

const PERIOD = /^\d{4}(-\d{2}(-\d{2})?)?$/;

/**
 * Checks the form and builds the spec to freeze. `today` is the server's date (YYYY-MM-DD), never the
 * browser's, so the registration date cannot be set back.
 */
export function buildUserTest(input: UserTestInput, methods: MethodParams[], today: string, registeredBy: string): { ok: true; spec: UserTestSpec } | { ok: false; problems: UserTestProblem[] } {
  const problems: UserTestProblem[] = [];
  const name = String(input.name ?? '').trim();
  const id = userTestId(name);
  if (!id) problems.push({ code: 'name' });
  const m = methods.find((x) => x.method === input.method);
  if (!m) problems.push({ code: 'method' });
  const hypothesis = String(input.hypothesis ?? '').trim();
  if (hypothesis.length < 20) problems.push({ code: 'hypothesis' });
  const params: Record<string, number> = {};
  for (const key of m?.keys ?? []) {
    const n = num(input.params?.[key]);
    if (n === null) problems.push({ code: 'param_missing', key });
    else if (Number.isNaN(n)) problems.push({ code: 'param_nan', key });
    else params[key] = n;
  }
  const from = String(input.from ?? '').trim();
  if (!PERIOD.test(from)) problems.push({ code: 'from' });
  const to = String(input.to ?? '').trim();
  if (to && (!PERIOD.test(to) || to <= from)) problems.push({ code: 'to' });
  const pm = input.passMark ?? {};
  const passMark = {} as UserTestSpec['passMark'];
  const need = (key: 'minCases' | 'minLiftPts' | 'maxPValue', ok: (n: number) => boolean) => {
    const n = num(pm[key]);
    if (n === null) problems.push({ code: 'pass_missing', key });
    else if (Number.isNaN(n) || !ok(n)) problems.push({ code: 'pass_range', key });
    else passMark[key] = n;
  };
  need('minCases', (n) => Number.isInteger(n) && n >= 1);
  need('minLiftPts', (n) => n >= 0 && n <= 100);
  need('maxPValue', (n) => n > 0 && n < 1);
  const years = num(pm.minYears);
  if (years !== null) {
    if (Number.isNaN(years) || !Number.isInteger(years) || years < 1) problems.push({ code: 'pass_range', key: 'minYears' });
    else passMark.minYears = years;
  }
  const share = num(pm.minSeriesShare);
  if (share !== null) {
    if (Number.isNaN(share) || share <= 0 || share > 1) problems.push({ code: 'pass_range', key: 'minSeriesShare' });
    else passMark.minSeriesShare = share;
  }
  if (problems.length || !m) return { ok: false, problems };
  const limits = String(input.knownLimits ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 12);
  return {
    ok: true,
    spec: {
      id,
      version: 1,
      owner: 'user',
      registeredOn: today,
      registeredBy,
      hypothesis,
      method: m.method,
      params,
      sample: to ? { from, to } : { from },
      passMark,
      knownLimits: limits,
      // The stricter reading (whole years resampled) when a minimum number of years is set, as in the app's own tests.
      framework: passMark.minYears !== undefined ? 2 : 1,
    },
  };
}

/** The exact bytes that are fingerprinted and saved: keys in a fixed order, two-space indent. */
export function userTestJson(spec: UserTestSpec): string {
  const order = ['id', 'version', 'owner', 'registeredOn', 'registeredBy', 'hypothesis', 'method', 'params', 'sample', 'passMark', 'knownLimits', 'framework'] as const;
  const o: Record<string, unknown> = {};
  for (const k of order) if ((spec as unknown as Record<string, unknown>)[k] !== undefined) o[k] = (spec as unknown as Record<string, unknown>)[k];
  return `${JSON.stringify(o, null, 2)}\n`;
}
