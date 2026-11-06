/**
 * Runs the pre-registered nowcast and forecast evaluations (server and scripts only):
 * `npm run forecast:evaluate`. Reads each spec in docs/validation/forecasts/, refuses any whose
 * SHA-256 is not the one in manifest.json, pulls the long free histories it needs, and saves the
 * verdicts in data/local/validation/forecasts.json. See src/utils/forecastEval.ts for the method.
 */
import fs from 'fs';
import { loadSpecs } from './backtestRun';
import { judgeForecast, type ForecastResult, type ForecastSpec } from './forecastEval';
import { casesFor, type CountryData } from './forecastCases';
import { parseQna, qnaUrl, QNA_LABEL } from './oecdQna';
import { BCB_IBCBR_SA, EUROSTAT_IP_GEO, bcbSgsSinceUrl, eurostatIpUrl, parseEurostatIp, parseIbcBr, IBCBR_LONG, EUROSTAT_IP_LONG } from './monthlyActivity';
import { pullModelHistory, type TextFetcher } from './modelHistory';
import { CBPOL_AREA } from './bisPolicyRates';
import { areaSeries } from './oecdSdmx';
import { parseImfYears } from './officialHistory';
import { writeFileAtomic } from './atomicWrite';

export interface ForecastValidationFile {
  results: Record<string, ForecastResult>;
  versions: Record<string, ForecastResult>;
  lastRun?: { at: string; problems: string[] };
}

export function loadForecastValidation(file: string): ForecastValidationFile {
  try {
    const v = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { results: v?.results || {}, versions: v?.versions || {}, ...(v?.lastRun ? { lastRun: v.lastRun } : {}) };
  } catch {
    return { results: {}, versions: {} };
  }
}

const IMF_DEBT = 'GGXWDG_NGDP';

/** Every country's data the evaluations read, from the free feeds. */
export async function pullEvaluationData(fetcher: TextFetcher, problems: string[], now = new Date()): Promise<{ data: CountryData[]; sources: Record<string, string> }> {
  const thisYear = now.getUTCFullYear();
  const hist = await pullModelHistory(fetcher);
  problems.push(...hist.problems);
  const qna = await fetcher(qnaUrl()).then(parseQna).catch((e) => (problems.push(`OECD quarterly GDP did not answer (${e.message})`), null));
  const ibc = await fetcher(bcbSgsSinceUrl(BCB_IBCBR_SA)).then((t) => parseIbcBr(JSON.parse(t))).catch((e) => (problems.push(`BCB IBC-Br did not answer (${e.message})`), null));
  const euIso = Object.keys(EUROSTAT_IP_GEO);
  const eu = await fetcher(eurostatIpUrl(euIso.map((i) => EUROSTAT_IP_GEO[i]))).then((t) => parseEurostatIp(JSON.parse(t), euIso)).catch((e) => (problems.push(`Eurostat industrial production did not answer (${e.message})`), {} as ReturnType<typeof parseEurostatIp>));
  const debtBody = await fetcher(`https://www.imf.org/external/datamapper/api/v1/${IMF_DEBT}`).then((t) => JSON.parse(t)).catch((e) => (problems.push(`IMF debt did not answer (${e.message})`), null));
  const isos = new Set<string>([...Object.keys(qna || {}), ...Object.keys(CBPOL_AREA), ...Object.keys((debtBody?.values?.[IMF_DEBT] as object) || {})]);
  const data: CountryData[] = [];
  const seenArea = new Set<string>();
  for (const iso3 of [...isos].filter((x) => /^[A-Z]{3}$/.test(x)).sort()) {
    const g = qna?.[iso3]?.qoq;
    const act = iso3 === 'BRA' ? ibc?.points : eu[iso3]?.points;
    const cli = areaSeries(iso3, hist.cli ?? undefined);
    const cpi = areaSeries(iso3, hist.cpi ?? undefined)?.points;
    const area = CBPOL_AREA[iso3];
    // A shared policy area (the euro area) is evaluated once.
    const pol = area && !seenArea.has(area) ? hist.policyMonthly?.[area]?.points : undefined;
    if (pol?.length) seenArea.add(area);
    const debtYears = debtBody ? parseImfYears(debtBody, IMF_DEBT, iso3) : null;
    data.push({
      iso3,
      gdpQoq: g?.map((p) => ({ date: p.period, value: p.value })),
      activity: act?.map((p) => ({ date: p.period, value: p.value })),
      cli: cli?.map((p) => ({ date: p.period, value: p.value })),
      cpi: cpi?.map((p) => ({ date: p.period, value: p.value })),
      policy: pol?.map((p) => ({ date: p.period, value: p.pct })),
      // Outturns only: years from the current one on are IMF projections.
      debt: debtYears?.filter((y) => Number(y.year) < thisYear).map((y) => ({ date: y.year, value: y.value })),
    });
  }
  return {
    data,
    sources: {
      gdp_growth_q: QNA_LABEL,
      gdp_nowcast_q: `${QNA_LABEL}; ${IBCBR_LONG}; ${EUROSTAT_IP_LONG}; OECD composite leading indicator via DBnomics (full history)`,
      cpi_yoy_m: 'OECD consumer price inflation via DBnomics (full history, y/y)',
      cpi_nowcast_m: 'OECD consumer price inflation via DBnomics (full history, y/y)',
      policy_rate_m: 'BIS central bank policy rates (monthly, from 1990)',
      debt_gdp_a: 'IMF World Economic Outlook government debt (GGXWDG_NGDP), outturns only',
    },
  };
}

export async function runForecastEvaluations(opts: { specDir: string; resultFile: string; fetcher: TextFetcher; now?: Date; onResult?: (r: ForecastResult) => void }): Promise<ForecastValidationFile & { problems: string[] }> {
  const problems: string[] = [];
  const specs = loadSpecs(opts.specDir);
  for (const s of specs) if (s.problem) problems.push(`${s.file}: ${s.problem}; not run`);
  const runnable = specs.filter((s) => s.spec).sort((a, b) => a.spec!.id.localeCompare(b.spec!.id) || a.spec!.version - b.spec!.version);
  const file = loadForecastValidation(opts.resultFile);
  if (runnable.length) {
    const { data, sources } = await pullEvaluationData(opts.fetcher, problems, opts.now);
    const at = (opts.now || new Date()).toISOString();
    for (const { spec, hash } of runnable) {
      const s = spec as unknown as ForecastSpec;
      const { cases } = casesFor(s, data);
      const result = judgeForecast(s, hash, cases, `${sources[s.target] || s.target}; today's vintage, release lags as registered`, at);
      file.versions[`${s.id} v${s.version}`] = result;
      file.results[s.id] = result;
      opts.onResult?.(result);
    }
  }
  const out: ForecastValidationFile = { results: file.results, versions: file.versions, lastRun: { at: (opts.now || new Date()).toISOString(), problems } };
  fs.mkdirSync(opts.resultFile.replace(/[/\\][^/\\]+$/, ''), { recursive: true });
  writeFileAtomic(opts.resultFile, JSON.stringify(out, null, 1), 0o600);
  return { ...out, problems };
}
