/**
 * Runs the pre-registered backtests (server only): Menu > Models & validation > Run backtests, or
 * `npm run backtest`. Reads each test file in docs/validation/preregistered/, refuses any whose
 * SHA-256 is not the one in manifest.json, pulls the long history it needs from the free feeds,
 * and saves the verdicts in data/local/validation/results.json. Each verdict also goes in the audit
 * log. See src/utils/backtest.ts.
 */
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { BIS_API } from './bisDebtSecurities';
import { CBPOL_AREA, CBPOL_DATASET, parseCbpolCsv } from './bisPolicyRates';
import { CLI_LABEL, cliUrl, parseCli } from './oecdCli';
import { areaSeries } from './oecdSdmx';
import { CFTC_CURRENCY_CODES, CFTC_LABEL, cftcUrl, parseCftcRows } from './cftcPositioning';
import { cftcCrowdingCases, cliTurnPolicyCases, judge, sampleCases, spanOf, type BacktestCase, type BacktestResult, type BacktestSpec } from './backtest';
import { writeFileAtomic } from './atomicWrite';

export interface ValidationFile {
  results: Record<string, BacktestResult>;
  lastRun?: { at: string; problems: string[] };
}

export interface LoadedSpec {
  file: string;
  hash: string;
  spec: BacktestSpec | null;
  /** Why the test cannot run (hash not registered, unreadable). */
  problem?: string;
}

export const sha256 = (buf: Buffer | string) => createHash('sha256').update(buf).digest('hex');

export function loadSpecs(dir: string): LoadedSpec[] {
  let manifest: Record<string, string> = {};
  try {
    manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8')).files || {};
  } catch {
    // no manifest: every file is refused below
  }
  let files: string[] = [];
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'manifest.json').sort();
  } catch {
    return [];
  }
  return files.map((file) => {
    const buf = fs.readFileSync(path.join(dir, file));
    const hash = sha256(buf);
    if (manifest[file] !== hash) return { file, hash, spec: null, problem: manifest[file] ? 'the file changed after it was registered (hash differs from manifest.json)' : 'not in manifest.json, so not registered' };
    try {
      return { file, hash, spec: JSON.parse(buf.toString('utf8')) as BacktestSpec };
    } catch {
      return { file, hash, spec: null, problem: 'not readable JSON' };
    }
  });
}

export function validationFilePath(dataDir: string): string {
  return path.join(dataDir, 'local', 'validation', 'results.json');
}

export function loadValidation(file: string): ValidationFile {
  try {
    const v = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { results: v?.results && typeof v.results === 'object' ? v.results : {}, ...(v?.lastRun ? { lastRun: v.lastRun } : {}) };
  } catch {
    return { results: {} };
  }
}

type Fetcher = (url: string) => Promise<string>;

export const defaultFetcher: Fetcher = async (url) => {
  const r = await fetch(url, { signal: AbortSignal.timeout(180_000), headers: { Accept: '*/*' } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
};

/** The long histories the tests read, pulled once per run. */
async function pullHistory(fetcher: Fetcher, problems: string[]) {
  const areas = [...new Set(Object.values(CBPOL_AREA))].sort().join('+');
  const [bis, cli, cftc] = await Promise.all([
    fetcher(`${BIS_API}/${CBPOL_DATASET}/M.${areas}/all?startPeriod=1990-01&format=csv`).then((t) => parseCbpolCsv(t, 'M')).catch((e) => (problems.push(`BIS policy rates did not answer (${e.message})`), null)),
    fetcher(cliUrl()).then((t) => parseCli(t, 100_000)).catch((e) => (problems.push(`OECD leading indicator did not answer (${e.message})`), null)),
    fetcher(cftcUrl(new Date(), undefined, { since: '2006-06-01', limit: 50_000 })).then((t) => parseCftcRows(JSON.parse(t))).catch((e) => (problems.push(`CFTC did not answer (${e.message})`), null)),
  ]);
  return { bis, cli, cftc };
}

export async function runBacktests(opts: { specDir: string; resultFile: string; fetcher?: Fetcher; now?: Date; onResult?: (r: BacktestResult) => void }): Promise<ValidationFile & { problems: string[] }> {
  const problems: string[] = [];
  const specs = loadSpecs(opts.specDir);
  for (const s of specs) if (s.problem) problems.push(`${s.file}: ${s.problem}; not run`);
  const runnable = specs.filter((s) => s.spec);
  const file = loadValidation(opts.resultFile);
  if (runnable.length) {
    const h = await pullHistory(opts.fetcher || defaultFetcher, problems);
    const at = (opts.now || new Date()).toISOString();
    for (const { spec, hash } of runnable) {
      const s = spec!;
      let cases: BacktestCase[] = [];
      let series: string[] = [];
      let data = '';
      if (s.method === 'cli_turn_policy') {
        if (!h.bis || !h.cli) continue;
        data = `${CLI_LABEL}; BIS central bank policy rates (monthly, from 1990)`;
        const seen = new Set<string>();
        for (const [iso3, area] of Object.entries(CBPOL_AREA)) {
          if (seen.has(area)) continue;
          const cli = areaSeries(iso3, h.cli);
          const pol = h.bis[area]?.points;
          if (!cli?.length || !pol?.length) continue;
          seen.add(area);
          series.push(iso3);
          cases.push(...cliTurnPolicyCases(s, iso3, cli, pol));
        }
      } else if (s.method === 'cftc_crowding') {
        if (!h.cftc) continue;
        data = `${CFTC_LABEL} (weekly, from 2006)`;
        for (const [iso3, def] of Object.entries(CFTC_CURRENCY_CODES)) {
          const weeks = h.cftc.get(def.code);
          if (!weeks?.length) continue;
          series.push(`${def.ccy} (${def.market})`);
          cases.push(...cftcCrowdingCases(s, def.ccy, weeks));
        }
      } else {
        problems.push(`${s.id}: unknown method ${String(s.method)}`);
        continue;
      }
      const result: BacktestResult = { id: s.id, specVersion: s.version, specHash: hash, ranAt: at, ...judge(s, cases), span: spanOf(cases), series, data, sample: sampleCases(cases) };
      file.results[s.id] = result;
      opts.onResult?.(result);
    }
  }
  const out: ValidationFile = { results: file.results, lastRun: { at: (opts.now || new Date()).toISOString(), problems } };
  writeFileAtomic(opts.resultFile, JSON.stringify(out, null, 1), 0o600);
  return { ...out, problems };
}
