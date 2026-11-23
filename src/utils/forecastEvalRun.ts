/**
 * Runs the pre-registered nowcast and forecast evaluations (server and scripts only):
 * `npm run forecast:evaluate`. Reads each spec in docs/validation/forecasts/, refuses any whose
 * SHA-256 is not the one in manifest.json, pulls the long free histories it needs, and saves the
 * verdicts in data/local/validation/forecasts.json. See src/utils/forecastEval.ts for the method.
 */
import fs from 'fs';
import { loadSpecs } from './backtestRun';
import { judgeForecast, REALTIME_TARGETS, type ForecastResult, type ForecastSpec, type RealTimeTarget } from './forecastEval';
import { realTimeCases, weoRealTimeCases, type VintageSeriesInput } from './realTimeEval';
import { judgeVol, volCases, type VolSpec } from './volEval';
import { allQuarters, fxQuarterUrl, parseFxQuarter, FX_HISTORY_SOURCE, type FxHistoryFile } from './fxHistory';
import { estimateGapModel, type GapEstimate } from './gapModelEstimate';
import { casesFor, forestRowModel, gdpNowcastOpen, gdpSeries, type CountryData } from './forecastCases';
import { predictorNowcastOpen, rowModelFor } from './penalizedNowcast';
import { judgeLoss, type LossPassMark } from './lossEval';
import { quantileForecastCases } from './quantileForecast';
import path from 'path';
import { forwardStep, type ForwardBody, type ForwardCallLine } from './forwardRecord';
import { appendForward, loadForward } from './forwardRecordStore';
import { parseQna, qnaUrl, QNA_LABEL } from './oecdQna';
import { BCB_IBCBR_SA, EUROSTAT_IP_GEO, bcbSgsSinceUrl, eurostatIpUrl, parseEurostatIp, parseIbcBr, IBCBR_LONG, EUROSTAT_IP_LONG } from './monthlyActivity';
import { pullModelHistory, type TextFetcher } from './modelHistory';
import { CBPOL_AREA } from './bisPolicyRates';
import { areaSeries } from './oecdSdmx';
import { parseImfYears } from './officialHistory';
import { writeFileAtomic } from './atomicWrite';
import { isCountryIso3 } from '../data/iso3166';
import { fanCoverageCases, judgeFanCoverage, type FanCoverageSpec } from './fanCoverage';
import { WEO_VINTAGE_SOURCE, type WeoVintageStore } from './weoVintages';

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
  // Countries only: feeds also carry regional groups with three-letter codes (IMF WHQ, NMQ, MAE...)
  // and the app's EUU (euro area), which would be scored as if they were countries.
  for (const iso3 of [...isos].filter(isCountryIso3).sort()) {
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
      gdp_penalized_nowcast_q: `${QNA_LABEL}; ${IBCBR_LONG}; ${EUROSTAT_IP_LONG}; OECD composite leading indicator, OECD consumer price inflation via DBnomics; BIS policy rates`,
      gdp_dfm_nowcast_q: `${QNA_LABEL}; ${IBCBR_LONG}; ${EUROSTAT_IP_LONG}; OECD composite leading indicator, OECD consumer price inflation via DBnomics; BIS policy rates`,
      gdp_forest_nowcast_q: `${QNA_LABEL}; ${IBCBR_LONG}; ${EUROSTAT_IP_LONG}; OECD composite leading indicator, OECD consumer price inflation via DBnomics; BIS policy rates`,
      gdp_quantile_q: QNA_LABEL,
      cpi_gap_model_q: `${QNA_LABEL}; OECD consumer price inflation via DBnomics (y/y, quarter means); BIS central bank policy rates (quarter means)`,
      cpi_yoy_m: 'OECD consumer price inflation via DBnomics (full history, y/y)',
      cpi_nowcast_m: 'OECD consumer price inflation via DBnomics (full history, y/y)',
      policy_rate_m: 'BIS central bank policy rates (monthly, from 1990)',
      debt_gdp_a: 'IMF World Economic Outlook government debt (GGXWDG_NGDP), outturns only',
    },
  };
}

export async function runForecastEvaluations(opts: { specDir: string; resultFile: string; fetcher: TextFetcher; now?: Date; onResult?: (r: ForecastResult) => void; /** Past WEO editions, for the debt fan coverage test and the WEO real-time tests. */ weoStore?: WeoVintageStore; forwardFile?: string; /** Vintages for the real-time tests: US (ALFRED) and euro area (ECB RTD) GDP and inflation. */ vintages?: RealTimeVintages; /** Saved daily FX history (data/live/fx-history.json), for the volatility test. */ savedFx?: FxHistoryFile | null }): Promise<ForecastValidationFile & { problems: string[] }> {
  const problems: string[] = [];
  const specs = loadSpecs(opts.specDir);
  for (const s of specs) if (s.problem) problems.push(`${s.file}: ${s.problem}; not run`);
  const runnable = specs.filter((s) => s.spec).sort((a, b) => a.spec!.id.localeCompare(b.spec!.id) || a.spec!.version - b.spec!.version);
  const file = loadForecastValidation(opts.resultFile);
  const isFan = (x: { spec?: unknown }) => (x.spec as { target?: string } | undefined)?.target === 'debt_fan_coverage';
  const at = (opts.now || new Date()).toISOString();
  // The debt fan coverage test reads saved WEO editions only, nothing from the network.
  for (const { spec, hash } of runnable.filter(isFan)) {
    const s = spec as unknown as FanCoverageSpec;
    const store = opts.weoStore || { editions: [], skipped: [] };
    if (!store.editions.length) {
      problems.push(`${s.id}: no past WEO editions saved in data/local/weo-vintages/ (npm run weo:vintages); not run`);
      continue;
    }
    const { cases, origins } = fanCoverageCases(store, s);
    const j = judgeFanCoverage(s, cases, origins);
    const result: ForecastResult = {
      id: s.id,
      specVersion: s.version,
      specHash: hash,
      ranAt: at,
      status: j.status,
      verdict: j.verdict,
      horizons: [],
      span: j.span,
      series: j.series,
      data: `${WEO_VINTAGE_SOURCE}: ${origins.length} editions (${origins[0] || 'none'} to ${origins[origins.length - 1] || 'none'}); outturns from the latest edition saved`,
      sample: [],
      pValue: j.pValue,
      coverage: j.coverage,
      origins,
      fanSample: j.sample,
    };
    file.versions[`${s.id} v${s.version}`] = result;
    file.results[s.id] = result;
    opts.onResult?.(result);
  }
  // Real-time tests read vintages handed in (ALFRED, ECB RTD) or the saved WEO editions; no other download.
  const isRt = (x: { spec?: unknown }) => REALTIME_TARGETS.includes((x.spec as { target?: string } | undefined)?.target as RealTimeTarget);
  for (const { spec, hash } of runnable.filter(isRt)) {
    const s = spec as unknown as ForecastSpec;
    const got = realTimeRun(s, opts.weoStore, opts.vintages);
    if ('problem' in got) {
      problems.push(`${s.id}: ${got.problem}; not run`);
      continue;
    }
    for (const e of ('empty' in got && got.empty) || []) problems.push(`${s.id} v${s.version}: ${e}`);
    if (!got.cases.length) problems.push(`${s.id} v${s.version}: no case could be computed from the data read (${got.data})`);
    const result = judgeForecast(s, hash, got.cases, got.data, at);
    file.versions[`${s.id} v${s.version}`] = result;
    file.results[s.id] = result;
    opts.onResult?.(result);
  }
  if (runnable.some(isRt)) for (const m of opts.vintages?.missing || []) problems.push(`real-time data not read: ${m}`);
  // The GARCH volatility test reads daily ECB reference rates: the saved history plus any quarter not saved.
  const isVol = (x: { spec?: unknown }) => (x.spec as { target?: string } | undefined)?.target === 'fx_vol_d';
  for (const { spec, hash } of runnable.filter(isVol)) {
    const s = spec as unknown as VolSpec;
    const daily = await pullDailyFx(opts.fetcher, s.universe, problems, opts.savedFx, opts.now);
    const cases = volCases(daily, s);
    const result = judgeVol(s, hash, cases, `${FX_HISTORY_SOURCE}, daily from 1999; GARCH(1,1) on the last ${s.params.window} returns at each month-end`, at);
    file.versions[`${s.id} v${s.version}`] = result;
    file.results[s.id] = result;
    opts.onResult?.(result);
  }
  const rest = runnable.filter((x) => !isFan(x) && !isRt(x) && !isVol(x));
  if (rest.length) {
    const { data, sources } = await pullEvaluationData(opts.fetcher, problems, opts.now);
    const forwardFile = opts.forwardFile ?? path.join(path.dirname(opts.resultFile), 'forward.jsonl');
    const forward: ForwardBody[] = loadForward(forwardFile).lines;
    const forwardNew: ForwardBody[] = [];
    for (const { spec, hash } of rest) {
      const s = spec as unknown as ForecastSpec;
      if (s.target === 'gdp_quantile_q') {
        // Quantile bands: scored by pinball loss against the AR's normal band (src/utils/quantileForecast.ts).
        const qs = spec as unknown as ForecastSpec & { passMark: LossPassMark & ForecastSpec['passMark'] };
        const lc = quantileForecastCases(gdpSeries(data), qs);
        const result = judgeLoss(qs, hash, lc, `${sources.gdp_growth_q}; countries only; today's vintage`, { loss: 'pinball', lossLabel: 'mean pinball loss', benchLabel: "the AR forecast's normal band (the live forecast rule)", unit: 'quarter(s)', resamples: qs.params.resamples ?? 4000, seed: qs.params.seed ?? 20261122 }, at);
        file.versions[`${s.id} v${s.version}`] = result;
        file.results[s.id] = result;
        opts.onResult?.(result);
        continue;
      }
      const { cases } = casesFor(s, data);
      const result = judgeForecast(s, hash, cases, `${sources[s.target] || s.target}; countries only (ISO 3166, regional groups and the euro-area aggregate left out); today's vintage, release lags as registered`, at);
      const rowModel = rowModelFor(s, forestRowModel(s));
      if (s.target === 'gdp_nowcast_q' || rowModel) {
        // Rule 7: a passing nowcast's calls for quarters not yet published go on the forward record;
        // recorded calls are scored on the first published figure (closer than the benchmark = hit).
        const key = `${s.id} v${s.version}`;
        const beat = cases.length ? cases.filter((c) => Math.abs(c.model.mean - c.actual) < Math.abs(c.bench.mean - c.actual)).length / cases.length : 0;
        const actual = new Map(data.flatMap((c) => (c.gdpQoq || []).map((g) => [`${c.iso3}|${g.date}`, g.value] as [string, number])));
        const scored = forward
          .filter((l): l is ForwardCallLine => l.kind === 'call' && l.test === key && Boolean(l.forecast) && actual.has(`${l.where}|${l.when}`))
          .map((l) => {
            const a = actual.get(`${l.where}|${l.when}`)!;
            const gain = Math.abs(l.forecast!.bench - a) - Math.abs(l.forecast!.model - a);
            return { where: l.where, when: l.when, what: l.what, hit: gain > 0, base: beat, value: gain };
          });
        const asOf = at.slice(0, 10);
        const open = result.status !== 'passed' ? [] : rowModel ? predictorNowcastOpen(s, data, asOf, rowModel) : gdpNowcastOpen(s, data, asOf);
        const step = forwardStep(forward, { key, specHash: hash, passing: result.status === 'passed' }, scored, open, at);
        forward.push(...step);
        forwardNew.push(...step);
      }
      if (s.target === 'cpi_gap_model_q' && result.status === 'passed') {
        // A passing gap model: each country's estimate and projection, shown on its gap model screen.
        const est = Object.fromEntries(data.map((c) => [c.iso3, estimateGapModel(c, { window: s.params.window, minTrain: s.params.minTrain, horizon: Math.max(...s.horizons) })]).filter((e): e is [string, GapEstimate] => Boolean(e[1])));
        if (Object.keys(est).length) result.gapEstimates = est;
      }
      file.versions[`${s.id} v${s.version}`] = result;
      file.results[s.id] = result;
      opts.onResult?.(result);
    }
    try {
      appendForward(forwardFile, forwardNew);
    } catch (e: any) {
      problems.push(`The forward record could not be saved (${e?.code || e?.message || e})`);
    }
  }
  const out: ForecastValidationFile = { results: file.results, versions: file.versions, lastRun: { at: (opts.now || new Date()).toISOString(), problems } };
  fs.mkdirSync(opts.resultFile.replace(/[/\\][^/\\]+$/, ''), { recursive: true });
  writeFileAtomic(opts.resultFile, JSON.stringify(out, null, 1), 0o600);
  return { ...out, problems };
}

export interface RealTimeVintages {
  gdp: VintageSeriesInput[];
  cpi: VintageSeriesInput[];
  /** Sources that did not answer, with the reason (shown as problems). */
  missing: string[];
}

const WEO_RT_CODE: Partial<Record<RealTimeTarget, string>> = { gdp_weo_realtime_a: 'NGDP_RPCH', cpi_weo_realtime_a: 'PCPIPCH' };

/** Cases for one real-time spec, or the reason it cannot run. */
export function realTimeRun(s: ForecastSpec, weoStore: WeoVintageStore | undefined, vintages: RealTimeVintages | undefined): { cases: import('./forecastEval').ForecastCase[]; data: string; empty?: string[] } | { problem: string } {
  const code = WEO_RT_CODE[s.target as RealTimeTarget];
  if (code) {
    if (!weoStore?.editions.length) return { problem: 'no past WEO editions saved in data/local/weo-vintages/ (npm run weo:vintages)' };
    const cases = weoRealTimeCases(weoStore, code, s, isCountryIso3);
    const eds = weoStore.editions.map((e) => e.vintage).sort();
    return { cases, data: `${WEO_VINTAGE_SOURCE}, ${code}: ${eds.length} editions (${eds[0]} to ${eds[eds.length - 1]}); each forecast made from the years an edition marks as actual, scored against the first edition that marks the target year as actual; countries only` };
  }
  const inputs = s.target === 'gdp_realtime_q' ? vintages?.gdp : vintages?.cpi;
  if (!inputs?.length) return { problem: `no vintages to read (${vintages?.missing.join('; ') || 'ALFRED and the ECB real-time database were not read'})` };
  const cases = realTimeCases(inputs, s);
  const names = inputs.map((i) => `${i.where} ${i.def.id}`).join(', ');
  const empty = inputs.filter((i) => !cases.some((c) => c.where === i.where)).map((i) => `${i.where} ${i.def.id} (${i.rows.length} published values read, no case)`);
  return { cases, empty, data: `Data as first published: ${names} (ALFRED, Federal Reserve Bank of St. Louis; ECB Euro Area Real-Time Database); each forecast made from the vintage of its origin day, scored against the first published figure${vintages?.missing.length ? `; not read: ${vintages.missing.join('; ')}` : ''}` };
}

/** Daily units per US dollar for the currencies asked, from the saved history and any quarter not saved. */
export async function pullDailyFx(fetcher: TextFetcher, ccys: string[], problems: string[], saved?: FxHistoryFile | null, now = new Date()): Promise<Record<string, Array<{ date: string; value: number }>>> {
  const out: Record<string, Array<{ date: string; value: number }>> = {};
  const add = (rates: Record<string, Record<string, number>>) => {
    for (const [day, row] of Object.entries(rates)) for (const c of ccys) if (row[c] > 0) (out[c] ||= []).push({ date: day, value: row[c] });
  };
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
    } catch (e: any) {
      problems.push(`ECB reference rates for ${q} did not answer (${e?.message || e})`);
    }
  }
  for (const c of Object.keys(out)) out[c].sort((a, b) => (a.date < b.date ? -1 : 1));
  return out;
}
