/**
 * Runs the pre-registered currency factor tests (server and scripts only): `npm run
 * signals:evaluate`. Reads each spec in docs/validation/signals/, refuses any whose SHA-256 is not
 * the one in manifest.json, pulls the free histories it needs (ECB reference rates via Frankfurter,
 * BIS policy rates, OECD consumer prices), and saves the verdicts in
 * data/local/validation/signals.json. Method: src/utils/fxFactors.ts.
 */
import fs from 'fs';
import { loadSpecs } from './backtestRun';
import { BIS_API } from './bisDebtSecurities';
import { CBPOL_DATASET, parseCbpolCsv } from './bisPolicyRates';
import { cpiUrl, parseCpi } from './oecdInflation';
import { areaSeries } from './oecdSdmx';
import { allQuarters, fxQuarterUrl, parseFxQuarter, type FxHistoryFile } from './fxHistory';
import { addMonth, fxFactorReturns, judgeFxFactor, monthEndMap, type FxFactorResult, type FxFactorSpec, type FxPanel, type MonthMap } from './fxFactors';
import { writeFileAtomic } from './atomicWrite';

export type TextFetcher = (url: string) => Promise<string>;

export interface SignalResult extends FxFactorResult {
  id: string;
  specVersion: number;
  specHash: string;
  ranAt: string;
  data: string;
}

export interface SignalValidationFile {
  results: Record<string, SignalResult>;
  versions: Record<string, SignalResult>;
  lastRun?: { at: string; problems: string[] };
}

export function loadSignalValidation(file: string): SignalValidationFile {
  try {
    const v = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { results: v?.results || {}, versions: v?.versions || {}, ...(v?.lastRun ? { lastRun: v.lastRun } : {}) };
  } catch {
    return { results: {}, versions: {} };
  }
}

export const US_CPI_AREA = 'USA';

/** The panel every factor test reads. `saved` is the app's saved ECB history; missing quarters are pulled. */
export async function pullFxPanel(fetcher: TextFetcher, specs: FxFactorSpec[], problems: string[], saved?: FxHistoryFile | null, now = new Date()): Promise<FxPanel> {
  const ccys = [...new Set(specs.flatMap((s) => s.universe.map((u) => u.ccy)))];
  const areas = [...new Set(['US', ...specs.flatMap((s) => s.universe.map((u) => u.bis))])].sort();
  // ECB reference rates per USD: the saved quarters, plus any not saved.
  const daily = new Map<string, Array<{ date: string; value: number }>>();
  const add = (rates: Record<string, Record<string, number>>) => {
    for (const [day, row] of Object.entries(rates)) for (const c of ccys) if (row[c]) (daily.get(c) || daily.set(c, []).get(c)!).push({ date: day, value: row[c] });
  };
  let pulled = 0;
  for (const q of allQuarters(now)) {
    const chunk = saved?.chunks?.[q];
    if (chunk) {
      add(chunk.rates);
      continue;
    }
    const url = fxQuarterUrl(q, now);
    if (!url) continue;
    try {
      const r = parseFxQuarter(JSON.parse(await fetcher(url)));
      if (r) add(r);
      pulled++;
    } catch (e: any) {
      problems.push(`ECB reference rates for ${q} did not answer (${e?.message || e})`);
    }
  }
  const fx: Record<string, MonthMap> = {};
  for (const [c, pts] of daily) fx[c] = monthEndMap(pts);
  const policy: Record<string, MonthMap> = {};
  try {
    const bis = parseCbpolCsv(await fetcher(`${BIS_API}/${CBPOL_DATASET}/M.${areas.join('+')}/all?startPeriod=1990-01&format=csv`), 'M');
    for (const [area, s] of Object.entries(bis)) policy[area] = new Map(s.points.map((p) => [p.period, p.pct]));
  } catch (e: any) {
    problems.push(`BIS policy rates did not answer (${e?.message || e})`);
  }
  const cpiYoy: Record<string, MonthMap> = {};
  try {
    const cpi = parseCpi(await fetcher(cpiUrl()), 100_000);
    for (const a of new Set([US_CPI_AREA, ...specs.flatMap((s) => s.universe.map((u) => u.cpi))])) {
      const s = areaSeries(a, cpi);
      if (s?.points.length) cpiYoy[a] = new Map(s.points.map((p) => [p.period, p.value]));
    }
  } catch (e: any) {
    problems.push(`OECD consumer prices did not answer (${e?.message || e})`);
  }
  if (pulled) problems.push(`${pulled} quarter(s) of ECB rates were pulled because they were not saved`);
  return { fx, policy, cpiYoy, usCpi: US_CPI_AREA };
}

/** Every month-end with an FX rate in the panel, oldest first, the last one dropped (no next month yet). */
export function panelMonths(p: FxPanel): string[] {
  const all = new Set<string>();
  for (const m of Object.values(p.fx)) for (const k of m.keys()) all.add(k);
  const months = [...all].sort();
  return months.filter((m) => all.has(addMonth(m, 1)));
}

export async function runSignalEvaluations(opts: { specDir: string; resultFile: string; fetcher: TextFetcher; savedFx?: FxHistoryFile | null; now?: Date; onResult?: (r: SignalResult) => void }): Promise<SignalValidationFile & { problems: string[] }> {
  const problems: string[] = [];
  const specs = loadSpecs(opts.specDir);
  for (const s of specs) if (s.problem) problems.push(`${s.file}: ${s.problem}; not run`);
  const runnable = specs.filter((s) => s.spec).sort((a, b) => a.spec!.id.localeCompare(b.spec!.id) || a.spec!.version - b.spec!.version);
  const file = loadSignalValidation(opts.resultFile);
  const at = (opts.now || new Date()).toISOString();
  if (runnable.length) {
    const fspecs = runnable.map((s) => s.spec as unknown as FxFactorSpec);
    const panel = await pullFxPanel(opts.fetcher, fspecs, problems, opts.savedFx, opts.now);
    const months = panelMonths(panel);
    for (const { spec, hash } of runnable) {
      const s = spec as unknown as FxFactorSpec;
      const j = judgeFxFactor(s, fxFactorReturns(s, panel, months));
      const result: SignalResult = {
        ...j,
        id: s.id,
        specVersion: s.version,
        specHash: hash,
        ranAt: at,
        data: 'ECB euro reference rates via Frankfurter (month-end, per USD); BIS central bank policy rates (monthly) standing in for short rates; OECD consumer prices via DBnomics (y/y)',
      };
      file.versions[`${s.id} v${s.version}`] = result;
      file.results[s.id] = result;
      opts.onResult?.(result);
    }
  }
  const out: SignalValidationFile = { results: file.results, versions: file.versions, lastRun: { at, problems } };
  fs.mkdirSync(opts.resultFile.replace(/[/\\][^/\\]+$/, ''), { recursive: true });
  writeFileAtomic(opts.resultFile, JSON.stringify(out, null, 1), 0o600);
  return { ...out, problems };
}
