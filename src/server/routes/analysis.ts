import type { Express } from 'express';
import { DATA_DIR, VALIDATION_FILE } from '../config';
import { loadWeoVintages } from '../../utils/weoVintagesStore';
import { ALFRED_SERIES, ALFRED_SOURCE, alfredReply } from '../../utils/alfredVintages';
import { ECB_RTD_SERIES, ECB_RTD_SOURCE } from '../../utils/ecbRealTime';
import { fetchEuroFirstPublished, fetchUkFirstPublished } from '../feeds/firstPublished';
import { ONS_TRIANGLE_SERIES, ONS_TRIANGLE_SETUP_HELP, ONS_TRIANGLE_SOURCE } from '../../utils/onsTriangles';
import { BOHN_REFERENCES, bohnSentence, bohnTest } from '../../utils/bohnTest';
import { grossFinancingNeed, gfnSentence } from '../../utils/grossFinancingNeed';
import { debtFan, debtFanSentence } from '../../utils/debtFan';
import { costedOptions } from '../../utils/costedOptions';
import { multiplierView } from '../../utils/fiscalMultipliers';
import { localProjections, lpSentence } from '../../utils/localProjections';
import { ruleFamily, ruleFamilySentence, RULE_FAMILY_METHOD, type RuleFamilyInputs } from '../../utils/ruleFamily';
import { reserveAdequacy, reserveAdequacySentence } from '../../utils/reserveAdequacy';
import { crisisSentence, crisisWarning, CRISIS_NOT_RUN } from '../../utils/crisisWarning';
import { esSentence, externalSustainability } from '../../utils/externalSustainability';
import { driversSentence, inflationDrivers, NO_DRIVER_SOURCE } from '../../utils/inflationDrivers';
import { fetchInflationDrivers } from '../feeds/inflationDrivers';
import { fetchPwt } from '../feeds/pwt';
import { bankSovereign, bsSentence, type YearValue } from '../../utils/bankSovereign';
import { incidenceContext } from '../../utils/policyIncidence';
import { fiscalRulesCheck, frSentence } from '../../utils/fiscalRules';
import { fiscalRulesInput } from '../../utils/fiscalRulesStore';
import { cbwSentence, CBW_METHOD, CBW_REFERENCE } from '../../utils/cbWords';
import { readCbStatements } from '../feeds/cbStatements';
import { investorBaseData } from '../../utils/investorBaseStore';
import { investorBaseReading } from '../../utils/investorBase';
import { gaSentence, growthAccounting } from '../../utils/growthAccounting';
import { EUROSTAT_GEO } from '../../utils/nationalCpi';
import { curveSentence, yieldCurve, CURVE_NOT_RUN, CURVE_TEST_ID } from '../../utils/yieldCurve';
import { FRED_10Y_SERIES, US_10Y_SERIES } from '../../utils/officialYields';
import { loadValidation } from '../../utils/backtestRun';
import { BIS_ISO2 } from '../../utils/bisDebtSecurities';
import { vintageLabel, weoVintageReply, WEO_VINTAGE_CODES } from '../../utils/weoVintages';
import { fetchWithTimeout } from '../http';
import { OFFICIAL_FIGURES, officialSeries, type OfficialHistoryFile } from '../../utils/officialHistory';
import { type OutputGapResult } from '../../utils/outputGap';
import { dsaSentence, type DsaOutcome } from '../../utils/debtSustainability';
import { parseAsOfDate } from '../../utils/asOf';
import { decisionsFrom, replayDecision, replaySentence } from '../../utils/decisionReplay';
import { INFLATION_TARGETS } from '../../utils/marketsMacro';
import { qnaFor, QNA_LABEL } from '../../utils/oecdQna';
import { loadModelHistory, MODEL_HISTORY_MAX_AGE_MS, pullModelHistory, saveModelHistory, spliceInflation, type ModelHistory } from '../../utils/modelHistory';
import { cpiNowcast, gdpNowcast, nowcastSentence } from '../../utils/nowcast';
import { forecastSentence, forecastSeries, withImf, type ForecastOutcome } from '../../utils/forecasts';
import { loadForecastValidation } from '../../utils/forecastEvalRun';
import { areaSeries } from '../../utils/oecdSdmx';
import { CBPOL_AREA, CBPOL_NOT_COVERED } from '../../utils/bisPolicyRates';
import { countrySeries } from '../../utils/seriesHistory';
import path from 'path';
import { SOVEREIGN_CATALOG } from '../../data/presetsAndBaselines.ts';
import { oecdFetch, fetchQnaPull, fetchNationalCpi, fetchMonthlyActivity } from '../feeds/oecd';
import { GSCPI_SOURCE, STRESS_INDICES, stressIndex } from '../../utils/stressIndices';
import { fetchBisCreditCycle, fetchDebtSchedule, fetchFxHistory, fetchPolicyDaily, fetchReerLong, fetchStressPulls, fetchAlfred, loadFxHistory, fetchFredHistory } from '../feeds/rates';
import { beer, beerSentence } from '../../utils/beer';
import { EVENT_METHOD, eventSentence, eventStudy } from '../../utils/eventStudy';
import { fxDailySeries } from '../../utils/fxHistory';
import { fitScenarioModel, monthEnd, monthlyChanges, PRESETS, SCENARIO_METHOD, FACTORS, RESPONSES, type ScenarioModel } from '../../utils/scenarioEngine';
import { grVar, grVarSentence, GRVAR_METHOD, type GrVarOutcome } from '../../utils/grVar';
import { gprData } from '../../utils/gprStore';
import { storyLeads, STORY_LEADS_METHOD, type LeadSeries } from '../../utils/storyLeads';
import { buildExercises, checkAnswer, EXERCISES_METHOD, type ExerciseArgs } from '../../utils/exercises';


/**
 * Per-country analysis routes (output gap, debt sustainability, fiscal reaction, financing need,
 * reserve adequacy, local projections, policy rules, rate-decision replay, nowcast, forecasts,
 * WEO editions). Moved out of server.ts unchanged; each computes from saved or live official data.
 */
type Quick = <T>(p: Promise<T | null>) => Promise<T | null>;

export interface AnalysisDeps {
  quick: Quick;
  seriesFor: (iso3: string) => Promise<ReturnType<typeof countrySeries>>;
  fetchOfficialHistory: (iso3: string, opts?: { force?: boolean }) => Promise<OfficialHistoryFile | null>;
  loadOfficialHistory: (iso3: string) => OfficialHistoryFile | null;
  outputGapFrom: (file: OfficialHistoryFile | null | undefined) => OutputGapResult;
  dsaFrom: (file: OfficialHistoryFile | null | undefined) => DsaOutcome;
  /** Exam mode (src/utils/examMode.ts): answer keys are held back while it is on. */
  examOn?: () => boolean;
}

// Nowcasts (src/utils/nowcast.ts) and forecasts: long histories for the fits come from
// data/live/model-history.json (src/utils/modelHistory.ts), pulled at most once a week; DBnomics
// calls go through the OECD queue.
let modelHistoryInFlight: Promise<ModelHistory | null> | null = null;
const modelFetcher = async (url: string): Promise<string> => {
  if (url.includes('db.nomics.world')) {
    const r = await oecdFetch(url, 60000);
    if (!r || r.status < 200 || r.status >= 300) throw new Error(r ? `HTTP ${r.status}` : 'paused after a refusal');
    return r.text;
  }
  const r = await fetchWithTimeout(url, 60000);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
};
async function modelHistory(): Promise<ModelHistory | null> {
  const saved = loadModelHistory(DATA_DIR);
  if (saved && Date.now() - Date.parse(saved.pulledAt) < MODEL_HISTORY_MAX_AGE_MS) return saved;
  modelHistoryInFlight ??= pullModelHistory(modelFetcher, saved)
    .then((h) => {
      if (h.policyMonthly || h.cli || h.cpi) saveModelHistory(DATA_DIR, h);
      return h;
    })
    .catch(() => saved)
    .finally(() => {
      modelHistoryInFlight = null;
    });
  // A first pull can take a while: answer with what is saved and let it finish in the background.
  return saved ?? (await Promise.race([modelHistoryInFlight, new Promise<null>((r) => setTimeout(() => r(null), 20000))]));
}

/**
 * The daily start-up run (npm run daily): waits for the long histories behind the nowcasts and
 * forecasts when they are missing or more than a week old, instead of answering at once.
 */
export async function refreshModelHistory(): Promise<{ history: ModelHistory | null; pulled: boolean; problems: string[] }> {
  const saved = loadModelHistory(DATA_DIR);
  if (saved && Date.now() - Date.parse(saved.pulledAt) < MODEL_HISTORY_MAX_AGE_MS) return { history: saved, pulled: false, problems: saved.problems || [] };
  void modelHistory();
  const got = modelHistoryInFlight ? await modelHistoryInFlight : saved;
  // A pull where nothing answered is not saved; what was saved before (if anything) stays in use.
  const usable = got && (got.policyMonthly || got.cli || got.cpi) ? got : saved;
  return { history: usable, pulled: !!usable && usable !== saved, problems: got?.problems || [] };
}

export function registerAnalysisRoutes(app: Express, deps: AnalysisDeps): void {
  const { quick, seriesFor, fetchOfficialHistory, loadOfficialHistory, outputGapFrom, dsaFrom } = deps;
  const examOn = deps.examOn ?? (() => false);
  // Unit converters (src/utils/unitConverters.ts): the four World Bank series in one reply, so the panel holds one connection.
  app.get('/api/unit-converters/:iso3', async (req, res) => {
    const iso3 = String(req.params.iso3 || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const file = await quick(fetchOfficialHistory(iso3)).then((h) => h ?? loadOfficialHistory(iso3));
    const series: Record<string, unknown> = {};
    const missing: string[] = [];
    for (const [key, id] of [['cpi', 'cpi_index'], ['population', 'population'], ['fx', 'fx_lcu_usd'], ['ppp', 'ppp_factor']] as const) {
      const fig = OFFICIAL_FIGURES.find((f) => f.id === id)!;
      const s = officialSeries(file, fig);
      if ('points' in s) series[key] = s.points;
      else missing.push(`${fig.label}: Missing. ${s.reason}.`);
    }
    res.json({ iso3, series, missing });
  });
  // Exercises with answer keys (src/utils/exercises.ts): worked out from the app's series at a month.
  const exerciseSet = async (iso3: string, month: string) => {
    const set = await seriesFor(iso3);
    const pick = (id: string) => set.series.find((x) => x.id === id);
    const series: ExerciseArgs['series'] = {};
    for (const id of ['policy_rate', 'cpi_monthly', 'cpi_imf', 'output_gap', 'yield_10y', 'gdp_growth', 'debt_gdp'] as const) {
      const x = pick(id);
      if (x) series[id] = x;
    }
    const t = INFLATION_TARGETS[iso3];
    const countryName = SOVEREIGN_CATALOG.find((c) => c.iso3 === iso3)?.countryName || iso3;
    return buildExercises({ countryName, month, series, ...(t ? { target: { pct: t.pct, bank: t.bank } } : {}) });
  };
  const monthOf = (v: unknown) => (typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v) ? v : '');
  app.get('/api/exercises/:iso3', async (req, res) => {
    const iso3 = String(req.params.iso3 || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
    const month = monthOf(req.query.month);
    if (!month) return res.status(400).json({ error: 'A month as YYYY-MM is needed.' });
    const r = await exerciseSet(iso3, month);
    const exam = examOn();
    // In exam mode the key stays on the server; answers are checked one at a time.
    const exercises = exam ? r.exercises.map(({ id, question, hint, unit, tolerance }) => ({ id, question, hint, unit, tolerance })) : r.exercises;
    res.json({ iso3, month, exercises, notSet: r.notSet, examMode: exam, method: EXERCISES_METHOD });
  });
  app.post('/api/exercises/:iso3/check', async (req, res) => {
    const iso3 = String(req.params.iso3 || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
    const month = monthOf(req.body?.month);
    const given = Number(req.body?.answer);
    if (!month || !Number.isFinite(given)) return res.status(400).json({ error: 'A month (YYYY-MM) and a number are needed.' });
    const ex = (await exerciseSet(iso3, month)).exercises.find((e) => e.id === req.body?.id);
    if (!ex) return res.status(404).json({ error: 'That exercise is not set for this month.' });
    const correct = checkAnswer(ex, given);
    res.json({ correct, tolerance: ex.tolerance, unit: ex.unit, ...(examOn() ? {} : { answer: ex.answer, workings: ex.workings, inputs: ex.inputs }) });
  });
  // Model sandboxes (src/utils/modelSandboxes.ts): starting values from the saved yearly history, one request.
  app.get('/api/sandboxes/:iso3', async (req, res) => {
    const iso3 = String(req.params.iso3 || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const file = await quick(fetchOfficialHistory(iso3)).then((h) => h ?? loadOfficialHistory(iso3));
    const missing: string[] = [];
    const dsa = dsaFrom(file);
    const last = dsa.ok ? dsa.history[dsa.history.length - 1] : undefined;
    const debt = last
      ? { year: last.year, debt: last.debt, ...(last.interestPct !== undefined ? { i: last.interestPct } : {}), g: last.realGrowthPct, pi: last.inflationPct, pb: last.primaryBalance }
      : null;
    if (!debt) missing.push(`Debt dynamics: ${dsa.ok ? 'no outturn year' : dsa.reason}`);
    else if (debt.i === undefined) missing.push('Debt dynamics: no effective interest rate on file (IMF overall less primary balance), so set i yourself');
    const fig = (id: string) => OFFICIAL_FIGURES.find((f) => f.id === id)!;
    const cpi = officialSeries(file, fig('cpi_imf'));
    const cpiLast = 'points' in cpi ? cpi.points.filter((p) => p.note !== 'IMF projection').slice(-1)[0] : undefined;
    const gap = outputGapFrom(file);
    const t = INFLATION_TARGETS[iso3];
    if (!cpiLast) missing.push('Taylor rule: no IMF inflation outturn on file');
    if (!gap.ok) missing.push(`Taylor rule: no output gap (${gap.reason})`);
    if (!t) missing.push('Taylor rule: the app has no inflation target for this country, so set it yourself');
    const growth = officialSeries(file, fig('gdp_growth'));
    res.json({
      iso3,
      debt,
      taylor: {
        ...(cpiLast ? { pi: { value: cpiLast.value, year: String(cpiLast.date) } } : {}),
        ...(gap.ok ? { gap: { value: gap.latest.central, year: gap.latest.year } } : {}),
        ...(t ? { target: { value: t.pct, bank: t.bank } } : {}),
      },
      growth: 'points' in growth ? growth.points : [],
      missing,
    });
  });
  // Story leads (src/utils/storyLeads.ts): records and recent revisions in the saved yearly history, no download.
  app.get('/api/story-leads', (req, res) => {
    const codes = String(req.query.iso3 || '')
      .toUpperCase()
      .split(',')
      .map((c) => c.replace(/[^A-Z]/g, ''))
      .filter((c) => c.length === 3)
      .slice(0, 80);
    const missing: string[] = [];
    const countries = codes.flatMap((iso3) => {
      const file = loadOfficialHistory(iso3);
      if (!file) {
        missing.push(iso3);
        return [];
      }
      const series: LeadSeries[] = [];
      for (const fig of OFFICIAL_FIGURES) {
        const s = officialSeries(file, fig);
        if (!('points' in s)) continue;
        series.push({ id: fig.id, label: fig.label, unit: fig.unit, source: s.source || fig.sourceName || '', points: s.points, revisions: file.revisions?.[fig.id] });
      }
      return [{ iso3, countryName: SOVEREIGN_CATALOG.find((c) => c.iso3 === iso3)?.countryName || iso3, series }];
    });
    res.json({ leads: storyLeads(countries), countries: countries.length, noHistory: missing, method: STORY_LEADS_METHOD });
  });
  // Output gap (src/utils/outputGap.ts): HP and Hamilton filters on saved IMF real GDP growth.
  app.get('/api/output-gap/:iso3', async (req, res) => {
    const iso3 = String(req.params.iso3 || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const file = await quick(fetchOfficialHistory(iso3)).then((h) => h ?? loadOfficialHistory(iso3));
    res.json({ iso3, ...outputGapFrom(file) });
  });
  // Debt sustainability (src/utils/debtSustainability.ts): debt dynamics and stress scenarios on IMF figures.
  app.get('/api/debt-sustainability/:iso3', async (req, res) => {
    const iso3 = String(req.params.iso3 || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const file = await quick(fetchOfficialHistory(iso3)).then((h) => h ?? loadOfficialHistory(iso3));
    const r = dsaFrom(file);
    const fan = r.ok ? debtFan(r) : undefined;
    // Costed options use the IMF bucket-approach first-year multiplier range for the country's group (normal times).
    const mv = r.ok ? multiplierView({ iso3, debtPctGdp: { value: r.debtNow, year: r.lastOutturnYear } }) : undefined;
    const options = r.ok && mv ? costedOptions(r, { low: mv.guide.low, high: mv.guide.high, source: `IMF bucket approach, ${mv.guide.bucket} bucket, normal times (TNM 14/04)` }) : undefined;
    res.json({ iso3, ...r, ...(r.ok ? { sentence: dsaSentence(r) } : {}), ...(fan ? { fan: fan.ok ? { ...fan, sentence: debtFanSentence(fan) } : fan } : {}), ...(options ? { options } : {}) });
  });
  // Fiscal reaction (Bohn test, src/utils/bohnTest.ts): primary balance on last year's debt and the output gap.
  app.get('/api/bohn/:iso3', async (req, res) => {
    const iso3 = String(req.params.iso3 || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const file = await quick(fetchOfficialHistory(iso3)).then((h) => h ?? loadOfficialHistory(iso3));
    if (!file) return res.json({ iso3, ok: false, reason: 'Full IMF history not downloaded yet (Menu > Offline data, or open History & data while online)' });
    const pick = (id: string) => {
      const fig = OFFICIAL_FIGURES.find((f) => f.id === id);
      const s = fig ? officialSeries(file, fig) : null;
      return s && 'points' in s ? s : undefined;
    };
    const gap = outputGapFrom(file);
    const r = bohnTest({ primaryBalance: pick('primary_balance'), debt: pick('debt_gdp'), gap: gap.ok ? gap.years : undefined });
    const name = SOVEREIGN_CATALOG.find((c) => c.iso3 === iso3)?.countryName || iso3;
    res.json({ iso3, ...r, ...(r.ok ? { sentence: bohnSentence(r, name), references: BOHN_REFERENCES } : {}) });
  });
  // Gross financing need (src/utils/grossFinancingNeed.ts): deficit + external amortisation, a lower bound.
  app.get('/api/gfn/:iso3', async (req, res) => {
    const iso3 = String(req.params.iso3 || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const [file, schedule] = await Promise.all([
      quick(fetchOfficialHistory(iso3)).then((h) => h ?? loadOfficialHistory(iso3)),
      quick(fetchDebtSchedule(iso3)),
    ]);
    const pick = (id: string) => {
      const fig = OFFICIAL_FIGURES.find((f) => f.id === id);
      const s = fig && file ? officialSeries(file, fig) : null;
      return s && 'points' in s ? s : undefined;
    };
    const r = grossFinancingNeed({ primaryBalance: pick('primary_balance'), overallBalance: pick('overall_balance'), gdpUsd: pick('gdp_usd'), schedule: schedule ?? null });
    const name = SOVEREIGN_CATALOG.find((c) => c.iso3 === iso3)?.countryName || iso3;
    res.json({ iso3, ...r, ...(r.ok ? { sentence: gfnSentence(r, name) } : {}) });
  });
  // Reserve adequacy (src/utils/reserveAdequacy.ts): traditional ratios and the IMF ARA metric without other liabilities.
  app.get('/api/reserve-adequacy/:iso3', async (req, res) => {
    const iso3 = String(req.params.iso3 || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const file = await quick(fetchOfficialHistory(iso3)).then((h) => h ?? loadOfficialHistory(iso3));
    if (!file) return res.json({ iso3, ok: false, reason: 'Full official history not downloaded yet (Menu > Offline data, or open History & data while online)' });
    const pick = (id: string) => {
      const fig = OFFICIAL_FIGURES.find((f) => f.id === id);
      const s = fig ? officialSeries(file, fig) : null;
      return s && 'points' in s ? s : undefined;
    };
    const r = reserveAdequacy({ reservesUsd: pick('reserves_usd'), shortTermDebtUsd: pick('short_term_debt_usd'), broadMoneyGdp: pick('broad_money_gdp'), exportsUsd: pick('exports_usd'), gdpUsd: pick('gdp_usd'), reservesMonths: pick('reserves_months') });
    const name = SOVEREIGN_CATALOG.find((c) => c.iso3 === iso3)?.countryName || iso3;
    res.json({ iso3, ...r, ...(r.ok ? { sentence: reserveAdequacySentence(r, name) } : {}) });
  });
  // External sustainability (G24, src/utils/externalSustainability.ts): external debt, debt service and the debt-stabilising current account.
  app.get('/api/external-sustainability/:iso3', async (req, res) => {
    const iso3 = String(req.params.iso3 || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const file = await quick(fetchOfficialHistory(iso3)).then((h) => h ?? loadOfficialHistory(iso3));
    if (!file) return res.json({ iso3, ok: false, reason: 'Full official history not downloaded yet (Menu > Offline data, or open History & data while online)' });
    const pick = (id: string) => {
      const fig = OFFICIAL_FIGURES.find((f) => f.id === id);
      const s = fig ? officialSeries(file, fig) : null;
      return s && 'points' in s ? s : undefined;
    };
    const r = externalSustainability({
      currentAccountPct: pick('current_account_imf'),
      gdpUsd: pick('gdp_usd'),
      externalDebtUsd: pick('external_debt_usd'),
      debtServiceUsd: pick('ext_debt_service_usd'),
      interestUsd: pick('ext_interest_usd'),
      reservesUsd: pick('reserves_usd'),
      exportsUsd: pick('exports_usd'),
    });
    const name = SOVEREIGN_CATALOG.find((c) => c.iso3 === iso3)?.countryName || iso3;
    res.json({ iso3, ...r, ...(r.ok ? { sentence: esSentence(r, name) } : {}) });
  });
  // Crisis early-warning (G23, src/utils/crisisWarning.ts): the BIS credit cycle against the Basel III lines.
  app.get('/api/crisis-warning/:iso3', async (req, res) => {
    const iso3 = String(req.params.iso3 || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const covered = Boolean(BIS_ISO2[iso3]);
    const cycle = covered ? await quick(fetchBisCreditCycle(iso3)) : null;
    const r = crisisWarning(cycle, covered);
    const name = SOVEREIGN_CATALOG.find((c) => c.iso3 === iso3)?.countryName || iso3;
    res.json({ iso3, ...r, ...(r.ok ? { sentence: crisisSentence(r, name), notValidated: CRISIS_NOT_RUN } : {}) });
  });
  // Yield curve and financial conditions (G25, src/utils/yieldCurve.ts): 10-year yield minus policy rate, and an equal-weight conditions index.
  app.get('/api/yield-curve/:iso3', async (req, res) => {
    const iso3 = String(req.params.iso3 || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const fred = FRED_10Y_SERIES[iso3];
    const area = CBPOL_AREA[iso3];
    const month = (o: { date: string; value: number }) => ({ period: o.date.slice(0, 7), value: o.value });
    const [yields, usYields, reer, hist] = await Promise.all([
      fred ? quick(fetchFredHistory(fred, '1990-01-01')) : Promise.resolve(null),
      fred && iso3 !== 'USA' ? quick(fetchFredHistory(US_10Y_SERIES, '1990-01-01')) : Promise.resolve(null),
      fred && area ? quick(fetchReerLong(iso3)) : Promise.resolve(null),
      fred && area ? quick(modelHistory()) : Promise.resolve(null),
    ]);
    const saved = loadValidation(VALIDATION_FILE).results[CURVE_TEST_ID];
    const r = yieldCurve({
      hasFred: Boolean(fred),
      hasPolicy: Boolean(area),
      isUs: iso3 === 'USA',
      yields: yields?.map(month),
      usYields: usYields?.map(month),
      reer,
      policy: area ? hist?.policyMonthly?.[area]?.points.map((p) => ({ period: p.period, value: p.pct })) : null,
      test: saved || null,
    });
    const name = SOVEREIGN_CATALOG.find((c) => c.iso3 === iso3)?.countryName || iso3;
    res.json({ iso3, ...r, ...(r.ok ? { sentence: curveSentence(r, name), ...(r.hitRate ? {} : { notValidated: CURVE_NOT_RUN }) } : {}) });
  });
  // Inflation drivers (G26, src/utils/inflationDrivers.ts): headline against core, food and energy, from official sub-indices.
  app.get('/api/inflation-drivers/:iso3', async (req, res) => {
    const iso3 = String(req.params.iso3 || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    // Other OECD members: the countries the OECD headline CPI pull covers.
    const hist = await quick(modelHistory());
    const oecdCovered = Boolean(hist?.cpi && areaSeries(iso3, hist.cpi)?.points?.length);
    if (!EUROSTAT_GEO[iso3] && iso3 !== 'USA' && !oecdCovered) return res.json({ iso3, ok: false, reason: NO_DRIVER_SOURCE });
    const inputs = await quick(fetchInflationDrivers(iso3, oecdCovered));
    const name = SOVEREIGN_CATALOG.find((c) => c.iso3 === iso3)?.countryName || iso3;
    if (!inputs) return res.json({ iso3, ok: false, reason: 'The consumer price sources have not answered yet' });
    const r = inflationDrivers(inputs);
    res.json({ iso3, ...r, ...(r.ok ? { sentence: driversSentence(r, name) } : {}) });
  });
  // Growth accounting (G27, src/utils/growthAccounting.ts): capital, hours, human capital and TFP from the Penn World Table.
  app.get('/api/growth-accounting/:iso3', async (req, res) => {
    const iso3 = String(req.params.iso3 || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const file = await quick(fetchPwt());
    const r = growthAccounting(file, iso3);
    const name = SOVEREIGN_CATALOG.find((c) => c.iso3 === iso3)?.countryName || iso3;
    res.json({ iso3, ...r, ...(r.ok ? { sentence: gaSentence(r, name) } : {}) });
  });
  // Bank and government links (G28, src/utils/bankSovereign.ts): bank size, claims on government, banks' share of government debt, soundness.
  app.get('/api/bank-sovereign/:iso3', async (req, res) => {
    const iso3 = String(req.params.iso3 || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const file = await quick(fetchOfficialHistory(iso3)).then((h) => h ?? loadOfficialHistory(iso3));
    if (!file) return res.json({ iso3, ok: false, reason: 'No bank figures are saved for this country yet (Menu > Offline data, or open History & data while online)' });
    const pick = (id: string): YearValue[] | undefined => {
      const fig = OFFICIAL_FIGURES.find((f) => f.id === id);
      const s = fig ? officialSeries(file, fig) : null;
      return s && 'points' in s ? s.points.map((p) => ({ year: Number(String(p.date).slice(0, 4)), value: p.value })).filter((p) => Number.isFinite(p.year) && Number.isFinite(p.value)) : undefined;
    };
    let ib = null;
    try {
      ib = investorBaseReading(iso3, investorBaseData(DATA_DIR));
    } catch {
      ib = null;
    }
    const r = bankSovereign({
      bankAssetsGdp: pick('bank_assets_gdp'),
      claimsGovGdp: pick('bank_claims_gov_gdp'),
      capitalAssets: pick('bank_capital_assets'),
      npl: pick('bank_npl'),
      govDebtGdp: pick('debt_gdp'),
      investorBase: ib,
      firstProjectionYear: new Date().getUTCFullYear(),
    });
    const name = SOVEREIGN_CATALOG.find((c) => c.iso3 === iso3)?.countryName || iso3;
    res.json({ iso3, ...r, ...(r.ok ? { sentence: bsSentence(r, name) } : {}) });
  });
  // Fiscal rules check (G35, src/utils/fiscalRules.ts): treaty limits against the saved IMF history, national rules from the IMF workbook the user saved.
  app.get('/api/fiscal-rules/:iso3', async (req, res) => {
    const iso3 = String(req.params.iso3 || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const file = await quick(fetchOfficialHistory(iso3)).then((h) => h ?? loadOfficialHistory(iso3));
    const pick = (id: string): YearValue[] | undefined => {
      if (!file) return undefined;
      const fig = OFFICIAL_FIGURES.find((f) => f.id === id);
      const s = fig ? officialSeries(file, fig) : null;
      return s && 'points' in s ? s.points.map((p) => ({ year: Number(String(p.date).slice(0, 4)), value: p.value })).filter((p) => Number.isFinite(p.year) && Number.isFinite(p.value)) : undefined;
    };
    let imf: ReturnType<typeof fiscalRulesInput> = { table: null };
    try {
      imf = fiscalRulesInput(DATA_DIR);
    } catch (err: any) {
      imf = { table: null, reason: `The folder data/local/imf-fiscal-rules/ could not be read (${err?.message || err})` };
    }
    const r = fiscalRulesCheck(iso3, new Date().getUTCFullYear(), { debt_gdp: pick('debt_gdp'), overall_balance: pick('overall_balance') }, imf);
    const name = SOVEREIGN_CATALOG.find((c) => c.iso3 === iso3)?.countryName || iso3;
    res.json({ ...r, sentence: frSentence(r, name), historySaved: Boolean(file) });
  });
  // Who pays for a policy (src/utils/policyIncidence.ts): the saved context; the incidence itself is worked out in the browser on shares the user types.
  app.get('/api/policy-incidence/:iso3', async (req, res) => {
    const iso3 = String(req.params.iso3 || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const file = await quick(fetchOfficialHistory(iso3)).then((h) => h ?? loadOfficialHistory(iso3));
    const pick = (id: string): YearValue[] | undefined => {
      if (!file) return undefined;
      const fig = OFFICIAL_FIGURES.find((f) => f.id === id);
      const s = fig ? officialSeries(file, fig) : null;
      return s && 'points' in s ? s.points.map((p) => ({ year: Number(String(p.date).slice(0, 4)), value: p.value })).filter((p) => Number.isFinite(p.year) && Number.isFinite(p.value)) : undefined;
    };
    const ids = ['gini', 'tax_revenue', 'tax_income', 'tax_goods', 'tax_trade', 'poverty_lowest', 'poverty_lower_middle', 'poverty_upper_middle', 'income_share_q1', 'income_share_q2', 'income_share_q3', 'income_share_q4', 'income_share_q5'] as const;
    const ctx = incidenceContext(Object.fromEntries(ids.map((id) => [id, pick(id)])));
    res.json({ iso3, ...ctx });
  });
  // Central bank word count (src/utils/cbWords.ts): statements the user saved in data/local/cb-statements/<ISO3>/.
  app.get('/api/cb-words/:iso3', (req, res) => {
    const iso3 = String(req.params.iso3 || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const got = readCbStatements(iso3);
    const name = SOVEREIGN_CATALOG.find((c) => c.iso3 === iso3)?.countryName || iso3;
    res.json({ iso3, ...got, method: CBW_METHOD, reference: CBW_REFERENCE, ...(got.statements.length ? { sentence: cbwSentence(got.statements, name) } : {}) });
  });
  // Local projections (src/utils/localProjections.ts): inflation after a policy rate change, reduced form.
  app.get('/api/local-projections/:iso3', async (req, res) => {
    const iso3 = String(req.params.iso3 || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const set = await seriesFor(iso3);
    const pick = (id: string) => set.series.find((x) => x.id === id);
    const why = (id: string) => set.missing.find((m) => m.id === id)?.reason;
    const cpi = pick('cpi_monthly');
    const rate = pick('policy_rate');
    if (!cpi) return res.json({ iso3, ok: false, reason: `Monthly inflation: ${why('cpi_monthly') || 'not saved'}` });
    if (!rate) return res.json({ iso3, ok: false, reason: `Policy rate: ${why('policy_rate') || 'not saved'}` });
    const r = localProjections(cpi.points, rate.points);
    const name = SOVEREIGN_CATALOG.find((c) => c.iso3 === iso3)?.countryName || iso3;
    res.json({ iso3, ...r, ...(r.ok ? { sentence: lpSentence(r, name), sources: [cpi.source, rate.source].filter(Boolean) } : {}) });
  });
  // Policy rule family (src/utils/ruleFamily.ts): the policy rate against five stated rules.
  app.get('/api/rule-family/:iso3', async (req, res) => {
    const iso3 = String(req.params.iso3 || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const set = await seriesFor(iso3);
    const pick = (id: string) => set.series.find((x) => x.id === id);
    const last = (id: string) => {
      const pts = pick(id)?.points || [];
      return pts[pts.length - 1];
    };
    const rate = last('policy_rate');
    const cpi = last('cpi_monthly');
    // Output gap: the IMF's where it publishes one, else the app's estimate; this year, else the latest before it.
    const file = loadOfficialHistory(iso3);
    const year = String(new Date().getUTCFullYear());
    let gap: RuleFamilyInputs['gap'];
    const imfFig = OFFICIAL_FIGURES.find((f) => f.id === 'output_gap');
    const imf = imfFig && file ? officialSeries(file, imfFig) : null;
    const imfPts = imf && 'points' in imf ? imf.points.filter((p) => p.date <= year) : [];
    if (imfPts.length) {
      const cur = imfPts[imfPts.length - 1];
      const prev = imfPts.find((p) => p.date === String(Number(cur.date) - 1));
      gap = { pct: cur.value, year: cur.date, source: 'imf', ...(prev ? { prevPct: prev.value } : {}) };
    } else {
      const est = outputGapFrom(file);
      const yrs = est.ok ? est.years.filter((y) => y.year <= year && typeof y.central === 'number') : [];
      if (yrs.length) {
        const cur = yrs[yrs.length - 1];
        const prev = yrs.find((y) => y.year === String(Number(cur.year) - 1));
        gap = { pct: cur.central!, year: cur.year, source: 'estimate', ...(prev?.central !== undefined ? { prevPct: prev.central } : {}) };
      }
    }
    const r = ruleFamily({
      ...(rate ? { policyPct: rate.value } : {}),
      ...(cpi ? { inflation: { pct: cpi.value, month: cpi.date.slice(0, 7) } } : {}),
      ...(INFLATION_TARGETS[iso3] ? { targetPct: INFLATION_TARGETS[iso3].pct } : {}),
      ...(gap ? { gap } : {}),
    });
    const name = SOVEREIGN_CATALOG.find((c) => c.iso3 === iso3)?.countryName || iso3;
    res.json({ iso3, ...r, method: RULE_FAMILY_METHOD, ...(r.ok ? { sentence: ruleFamilySentence(r, name), sources: [pick('policy_rate')?.source, pick('cpi_monthly')?.source, gap ? (gap.source === 'imf' ? 'IMF WEO output gap (NGAP_NPGDP)' : "The app's output gap estimate") : undefined, INFLATION_TARGETS[iso3]?.bank].filter(Boolean) } : {}) });
  });
  // Replicate a rate decision (src/utils/decisionReplay.ts): the week-before data, the rule, the move.
  app.get('/api/decision-replay/:iso3', async (req, res) => {
    const iso3 = String(req.params.iso3 || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const set = await seriesFor(iso3);
    const pick = (id: string) => set.series.find((x) => x.id === id);
    const policy = pick('policy_rate');
    const why = (id: string) => set.missing.find((m) => m.id === id)?.reason;
    const target = INFLATION_TARGETS[iso3];
    const base = {
      iso3,
      decisions: decisionsFrom(policy),
      policySource: policy?.source ?? null,
      first: policy?.points[0]?.date ?? null,
      last: policy?.points[policy.points.length - 1]?.date ?? null,
      ...(policy ? {} : { policyMissing: why('policy_rate') || 'No BIS policy rate history' }),
      target: target ?? null,
    };
    if (req.query.date === undefined) return res.json(base);
    const date = String(req.query.date);
    if (!/^\d{4}-\d{2}(-\d{2})?$/.test(date)) return res.status(400).json({ error: 'BAD_DATE', message: 'date must be YYYY-MM-DD or YYYY-MM.' });
    const cpi = pick('cpi_monthly');
    const cli = pick('cli');
    const replay = replayDecision({ iso3, date, policy, cpi, cli, target });
    if ('error' in replay) return res.status(404).json({ error: 'NO_REPLAY', message: replay.error, ...base });
    if (!cpi && why('cpi_monthly')) replay.missing = replay.missing.map((m) => (m === 'monthly inflation' ? `monthly inflation (${why('cpi_monthly')})` : m));
    res.json({ ...base, replay, sentence: replaySentence(replay) });
  });
  // Nowcasts (src/utils/nowcast.ts): GDP and inflation for periods whose official figure is not out
  // yet, from published figures only. Long histories for the fits come from data/live/model-history.json
  // (src/utils/modelHistory.ts), pulled at most once a week; DBnomics calls go through the OECD queue.
  // Scenario engine (src/utils/scenarioEngine.ts): the country's currency and policy rate on the US
  // policy rate and the dollar, monthly; the page applies stated shocks to the fitted coefficients.
  // BEER fair value (src/utils/beer.ts): REER on terms of trade, productivity vs the US and an NFA proxy.
  app.get('/api/beer/:iso3', async (req, res) => {
    const iso3 = String(req.params.iso3 || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const name = SOVEREIGN_CATALOG.find((c) => c.iso3 === iso3)?.countryName || iso3;
    if (iso3 === 'USA') return res.json({ iso3, name, ok: false, reason: 'The US is the productivity benchmark in this model, so it has no BEER of its own here' });
    const [file, usFile, reer] = await Promise.all([
      quick(fetchOfficialHistory(iso3)).then((h) => h ?? loadOfficialHistory(iso3)),
      quick(fetchOfficialHistory('USA')).then((h) => h ?? loadOfficialHistory('USA')),
      quick(fetchReerLong(iso3)),
    ]);
    const pick = (f: typeof file, id: string) => {
      const fig = OFFICIAL_FIGURES.find((x) => x.id === id);
      const s = fig && f ? officialSeries(f, fig) : null;
      return s && 'points' in s ? s.points.filter((p) => !p.note?.includes('projection')) : [];
    };
    const r = beer({ reerMonthly: reer || [], tot: pick(file, 'terms_of_trade'), gdpPcPpp: pick(file, 'gdp_pc_ppp'), usGdpPcPpp: pick(usFile, 'gdp_pc_ppp'), currentAccount: pick(file, 'current_account') });
    res.json({ iso3, name, ...r, ...(r.ok ? { sentence: beerSentence(name, r) } : {}), sources: ['BIS real effective exchange rates (broad, monthly)', 'World Bank WDI: terms of trade, GDP per head at PPP, current account'] });
  });
  app.get('/api/event-study/:iso3', async (req, res) => {
    const iso3 = String(req.params.iso3 || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const bank = req.query.bank === 'fed' ? 'fed' : 'own';
    const name = SOVEREIGN_CATALOG.find((c) => c.iso3 === iso3)?.countryName || iso3;
    if (iso3 === 'USA') return res.json({ iso3, name, ok: false, reason: 'The US dollar is the base currency, so there is no exchange rate against it to study' });
    const area = bank === 'fed' ? 'US' : CBPOL_AREA[iso3];
    if (!area || CBPOL_NOT_COVERED.has(iso3)) return res.json({ iso3, name, ok: false, reason: 'This central bank is not in the BIS policy rate data' });
    const [set, policy] = await Promise.all([seriesFor(iso3), quick(fetchPolicyDaily(area))]);
    const fx = set.series.find((x) => x.id === 'fx_per_usd');
    if (!fx || fx.freq !== 'daily') return res.json({ iso3, name, ok: false, reason: 'No daily exchange rate history for this currency' });
    if (!policy?.length) return res.json({ iso3, name, ok: false, reason: 'The BIS daily policy rate history did not answer' });
    const study = eventStudy(bank, policy, fx.points);
    res.json({ iso3, name, ok: true, ...study, sentence: eventSentence(name, study), method: EVENT_METHOD, sources: ['BIS central bank policy rates, daily', fx.source || 'ECB euro reference rates (via Frankfurter)'] });
  });
  app.get('/api/scenario/:iso3', async (req, res) => {
    const iso3 = String(req.params.iso3 || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const [set, hist, fxFile, pulls] = await Promise.all([seriesFor(iso3), modelHistory(), quick(fetchFxHistory()).then((h) => h ?? loadFxHistory()), quick(fetchStressPulls())]);
    const pick = stressIndex(req.query.stress);
    const stress = pulls?.fred[pick.fred];
    const gscpi = pulls?.gscpi && 'obs' in pulls.gscpi ? pulls.gscpi.obs : null;
    const eur = fxDailySeries(fxFile, 'EUR');
    const usPts = hist?.policyMonthly?.['US']?.points || [];
    const factors = {
      ...(usPts.length ? { us_rate: monthlyChanges(monthEnd(usPts.map((p) => ({ date: p.period, value: p.pct }))), 'diff') } : {}),
      ...('points' in eur ? { dollar: monthlyChanges(monthEnd(eur.points), 'log') } : {}),
      ...(stress?.length ? { fin_stress: monthlyChanges(monthEnd(stress), 'diff') } : {}),
      ...(gscpi?.length ? { supply_chain: monthlyChanges(monthEnd(gscpi), 'diff') } : {}),
    };
    const missingFactors = [
      ...(usPts.length ? [] : ['US policy rate history (BIS, weekly download not done yet)']),
      ...('points' in eur ? [] : [`euro per dollar history (${eur.reason})`]),
      ...(stress?.length ? [] : [`${pick.label} (FRED did not answer)`]),
      ...(gscpi?.length ? [] : [`NY Fed Global Supply Chain Pressure Index (${pulls?.gscpi && 'reason' in pulls.gscpi ? pulls.gscpi.reason : 'did not answer'})`]),
    ];
    const fx = set.series.find((x) => x.id === 'fx_per_usd');
    const area = CBPOL_AREA[iso3];
    const ownPolicy = area && area !== 'US' ? hist?.policyMonthly?.[area]?.points || [] : [];
    const models = [
      iso3 === 'USA'
        ? { response: 'fx' as const, ok: false as const, reason: 'The US dollar is the base currency' }
        : fx && fx.freq === 'daily'
          ? fitScenarioModel('fx', monthlyChanges(monthEnd(fx.points), 'log'), factors)
          : { response: 'fx' as const, ok: false as const, reason: 'No daily ECB exchange rate history for this currency' },
      iso3 === 'USA'
        ? { response: 'policy' as const, ok: false as const, reason: 'The US policy rate is itself a factor' }
        : ownPolicy.length
          ? fitScenarioModel('policy', monthlyChanges(monthEnd(ownPolicy.map((p) => ({ date: p.period, value: p.pct }))), 'diff'), factors)
          : { response: 'policy' as const, ok: false as const, reason: area ? 'BIS policy rate history not downloaded yet' : 'Not in BIS policy rates' },
    ];
    const name = SOVEREIGN_CATALOG.find((c) => c.iso3 === iso3)?.countryName || iso3;
    // Geopolitical risk VaR (src/utils/grVar.ts): currency moves in high-GPR months, and the fx model's implied move.
    const gpr = gprData(DATA_DIR);
    const fxModel = models[0].ok ? (models[0] as ScenarioModel) : null;
    const gr: GrVarOutcome =
      iso3 === 'USA'
        ? { ok: false, reason: 'The US dollar is the base currency' }
        : !(fx && fx.freq === 'daily')
          ? { ok: false, reason: 'No daily ECB exchange rate history for this currency' }
          : !gpr.ok
            ? { ok: false, reason: gpr.reason }
            : grVar(iso3, monthlyChanges(monthEnd(fx.points), 'log'), gpr.table, factors, fxModel);
    res.json({
      iso3,
      name,
      grVar: gr.ok ? { ...gr, sentence: grVarSentence(name, gr), method: GRVAR_METHOD, file: gpr.ok ? gpr.file : undefined } : { ...gr, method: GRVAR_METHOD },
      models,
      presets: PRESETS,
      factors: FACTORS.map((f) => (f.id === 'fin_stress' ? { ...f, label: `US financial stress (${pick.short})` } : f)),
      stress: { key: pick.key, choices: STRESS_INDICES.map((x) => ({ key: x.key, label: x.label })) },
      responses: RESPONSES,
      missingFactors,
      method: SCENARIO_METHOD,
      sources: ['ECB euro reference rates (via Frankfurter)', 'BIS central bank policy rates, monthly', `${pick.label} (${pick.fred}), retrieved from FRED, Federal Reserve Bank of St. Louis`, GSCPI_SOURCE],
    });
  });
  app.get('/api/nowcast/:iso3', async (req, res) => {
    const iso3 = String(req.params.iso3 || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const today = new Date().toISOString().slice(0, 10);
    const asOf = parseAsOfDate(req.query.asOf) ?? today;
    if (asOf > today) return res.status(400).json({ error: 'BAD_DATE', message: 'The As-of date cannot be in the future.' });
    const [qna, activity, hist, nationalCpi] = await Promise.all([quick(fetchQnaPull()), quick(fetchMonthlyActivity()), modelHistory(), quick(fetchNationalCpi())]);
    const gdpPts = qnaFor(iso3, qna?.series)?.qoq ?? [];
    const act = activity?.series?.[iso3];
    const cliPts = areaSeries(iso3, hist?.cli ?? undefined);
    const cpiRun = spliceInflation(areaSeries(iso3, hist?.cpi ?? undefined)?.points, nationalCpi?.series?.[iso3]);
    const inputs = {
      iso3,
      asOf,
      live: asOf === today,
      gdp: gdpPts.length ? { points: gdpPts.map((p) => ({ date: p.period, value: p.value })), source: QNA_LABEL, pulledAt: qna?.pulledAt } : null,
      activity: act?.points?.length ? { points: act.points.map((p) => ({ date: p.period, value: p.value })), source: act.long, label: act.short, pulledAt: activity?.pulledAt } : null,
      cli: cliPts?.length ? { points: cliPts.map((p) => ({ date: p.period, value: p.value })), source: 'OECD composite leading indicator via DBnomics', pulledAt: hist?.pulledAt } : null,
      cpi: cpiRun ? { ...cpiRun, pulledAt: hist?.pulledAt } : null,
    };
    const gdp = gdpNowcast(inputs);
    const cpi = cpiNowcast(inputs);
    res.json({
      iso3,
      asOf,
      gdp,
      cpi,
      sentences: [gdp, cpi].filter((r): r is Extract<typeof r, { ok: true }> => r.ok).map(nowcastSentence),
      history: hist ? { pulledAt: hist.pulledAt, problems: hist.problems } : { pulledAt: null, problems: ['Long histories not downloaded yet; the first download runs in the background.'] },
    });
  });
  // Forecasts with fan charts (src/utils/forecasts.ts): GDP growth, inflation, policy rate, debt,
  // beside the IMF's own projection where it makes one.
  app.get('/api/forecast/:iso3', async (req, res) => {
    const iso3 = String(req.params.iso3 || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const [qna, hist, nationalCpi, official] = await Promise.all([
      quick(fetchQnaPull()),
      modelHistory(),
      quick(fetchNationalCpi()),
      quick(fetchOfficialHistory(iso3)).then((h) => h ?? loadOfficialHistory(iso3)),
    ]);
    const imfSeries = (id: string) => {
      const fig = OFFICIAL_FIGURES.find((f) => f.id === id);
      const s = fig ? officialSeries(official, fig) : null;
      return s && 'points' in s ? { points: s.points, source: s.source, pulledAt: s.pulledAt } : null;
    };
    const gdpPts = qnaFor(iso3, qna?.series)?.qoq ?? [];
    const cpiRun = spliceInflation(areaSeries(iso3, hist?.cpi ?? undefined)?.points, nationalCpi?.series?.[iso3]);
    const area = CBPOL_AREA[iso3];
    const pol = area ? hist?.policyMonthly?.[area]?.points : undefined;
    const debt = imfSeries('debt_gdp');
    const out: ForecastOutcome[] = [
      withImf(forecastSeries('gdp_qoq', gdpPts.length ? { points: gdpPts.map((p) => ({ date: p.period, value: p.value })), source: QNA_LABEL, label: 'Real GDP growth, q/q', pulledAt: qna?.pulledAt } : null), imfSeries('gdp_growth')),
      withImf(forecastSeries('cpi_yoy', cpiRun ? { ...cpiRun, label: 'Inflation, monthly y/y', pulledAt: hist?.pulledAt } : null), imfSeries('cpi_imf')),
      forecastSeries('policy_rate', pol?.length ? { points: pol.map((p) => ({ date: p.period, value: p.pct })), source: 'BIS central bank policy rates, monthly (end of month)', label: 'Policy rate', pulledAt: hist?.pulledAt } : null),
      // The fit uses IMF outturns only: years marked as IMF projections are left out.
      withImf(forecastSeries('debt_gdp', debt ? { points: debt.points.filter((p) => p.note !== 'IMF projection'), source: debt.source, label: 'Government debt, % of GDP', pulledAt: debt.pulledAt } : null), debt),
    ];
    if (!area) {
      const i = out.findIndex((r) => r.id === 'policy_rate');
      out[i] = { ok: false, id: 'policy_rate', reason: 'The BIS publishes no policy rate for this country.' };
    }
    const v = loadForecastValidation(path.join(DATA_DIR, 'local', 'validation', 'forecasts.json'));
    const validation = Object.fromEntries(Object.values(v.results).map((r) => [r.id, { status: r.status, verdict: r.verdict, ranAt: r.ranAt }]));
    res.json({
      iso3,
      forecasts: out,
      validation,
      sentences: out.filter((r): r is Extract<ForecastOutcome, { ok: true }> => r.ok).map((r) => forecastSentence(r)),
      history: hist ? { pulledAt: hist.pulledAt, problems: hist.problems } : { pulledAt: null, problems: ['Long histories not downloaded yet; the first download runs in the background.'] },
    });
  });
  // US data as first published and as known on a date (ALFRED vintages, src/utils/alfredVintages.ts).
  app.get('/api/us-vintages', async (req, res) => {
    const def = ALFRED_SERIES.find((d) => d.id === req.query.series) || ALFRED_SERIES[0];
    const got = await fetchAlfred(def.id);
    if ('reason' in got) return res.json({ ok: false, series: def.id, reason: got.reason, source: ALFRED_SOURCE, choices: ALFRED_SERIES.map((d) => ({ id: d.id, label: d.label })) });
    const period = typeof req.query.period === 'string' ? req.query.period : undefined;
    const asOf = typeof req.query.asOf === 'string' ? req.query.asOf : undefined;
    res.json({ ...alfredReply(def, got, period, asOf), choices: ALFRED_SERIES.map((d) => ({ id: d.id, label: d.label })) });
  });
  // Euro area and UK figures as first published (G12 ECB real-time database, src/utils/ecbRealTime.ts;
  // G13 ONS revision triangle, src/utils/onsTriangles.ts). ?area=ea (default) or uk.
  app.get('/api/first-published', async (req, res) => {
    const uk = req.query.area === 'uk';
    const defs = uk ? ONS_TRIANGLE_SERIES : ECB_RTD_SERIES;
    const choices = defs.map((d) => ({ id: d.id, label: d.label }));
    const def = defs.find((d) => d.id === req.query.series) || defs[0];
    const file = await (uk ? fetchUkFirstPublished() : fetchEuroFirstPublished());
    const source = uk ? ONS_TRIANGLE_SOURCE : ECB_RTD_SOURCE;
    if (!file) {
      const reason = uk ? ONS_TRIANGLE_SETUP_HELP : 'Euro area figures as first published have not been downloaded yet, or the ECB Data Portal did not answer';
      return res.json({ ok: false, series: def.id, reason, source, choices });
    }
    const period = typeof req.query.period === 'string' ? req.query.period : undefined;
    const asOf = typeof req.query.asOf === 'string' ? req.query.asOf : undefined;
    const s = file.series.find((x) => x.id === def.id) || null;
    res.json({ ...alfredReply(def, s, period, asOf, file.source || source, uk ? 'ONS' : 'ECB'), pulledAt: file.pulledAt, choices });
  });
  // Past IMF WEO editions you saved in data/local/weo-vintages/ (src/utils/weoVintages.ts). Read again
  // when ?fresh=1, so files added while the app runs are picked up.
  app.get('/api/weo-vintages', (req, res) => {
    const store = loadWeoVintages(DATA_DIR, { fresh: req.query.fresh === '1' });
    res.json({
      folder: 'data/local/weo-vintages',
      editions: store.editions.map((e) => ({ vintage: e.vintage, label: vintageLabel(e.vintage), file: e.file, countries: Object.keys(e.rows).length })),
      skipped: store.skipped,
    });
  });
  app.get('/api/weo-vintages/:iso3', (req, res) => {
    const iso3 = String(req.params.iso3 || '').toUpperCase().replace(/[^A-Z]/g, '');
    const code = String(req.query.code || 'NGDP_RPCH');
    if (!(WEO_VINTAGE_CODES as readonly string[]).includes(code)) return res.status(400).json({ error: 'UNKNOWN_CODE', message: `Indicator ${code} is not kept from WEO editions.` });
    const year = typeof req.query.year === 'string' ? req.query.year : undefined;
    res.json(weoVintageReply(loadWeoVintages(DATA_DIR, { fresh: req.query.fresh === '1' }), iso3, code, year));
  });
}
