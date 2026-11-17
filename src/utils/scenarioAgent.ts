/**
 * Scenario Agent (WI2, Sam 2026-11-17): for a what-if question (src/utils/scenarioQuestion.ts),
 * today's figures as the starting point, the stated shock applied with the app's own tools, and
 * "now" set beside "after the shock" for each country.
 *
 * Channels, each run only when its inputs are on file (otherwise Missing with the reason):
 * - US rate, dollar, financial stress, supply chain pressure: the scenario engine
 *   (src/utils/scenarioEngine.ts), the country's currency and policy rate on 15 years of monthly
 *   co-movement, with a 90% band. Co-movement, not cause.
 * - Policy rate: local projections of inflation on the policy rate (src/utils/localProjections.ts),
 *   scaled to the stated change, at 6, 12 and 24 months. Reduced form: central banks raise rates
 *   when inflation is expected to rise, so the early response can even be positive.
 * - Borrowing costs, growth, inflation: the debt identity (src/utils/debtSustainability.ts) on the
 *   IMF's projected inputs, the baseline and the shocked path to the same year. Borrowing costs pass
 *   to the effective interest rate as a fifth of the debt rolls over each year (the app's DSA rule);
 *   slower growth lasts two years and, where a published budget semi-elasticity exists, also lowers
 *   the primary balance; higher inflation is one year, with interest held (fixed-rate debt).
 * - Currency: the rise in debt to GDP from government bonds in international markets (BIS, mostly
 *   in dollars) when the currency falls; a lower bound, as foreign-currency loans are not counted.
 *   For the engine's shocks the implied currency move goes through the same channel.
 * - Oil, food and export commodity prices: the first-round change in the trade balance, net trade
 *   in that group times the price change (World Bank shares; merchandise shares applied to goods
 *   and services totals, as in the Global Spillover Agent). Volumes held, so a first round only.
 *
 * Every number comes from a feed, a saved history or a stated calculation on them; none is built
 * in. Sizes are the question's. Browser-safe, pure: the server hands in the fitted pieces.
 */
import type { AgentAnswer, AgentFigure, AgentFinding } from './askCouncil';
import { DSA_HORIZON, nextDebt, nominalGrowthPct, ROLLOVER_SHARE, type DsaResult, type YearAssump } from './debtSustainability';
import { applyScenario, RESPONSES, type FactorId, type ScenarioModel, type ScenarioModelOutcome } from './scenarioEngine';
import type { LpOutcome } from './localProjections';
import { engineShock, SHOCK_KINDS, shockLabel, type ScenarioQuestion, type Shock, type ShockKind, type ShockKindInfo } from './scenarioQuestion';
import { semiElasticityFor } from '../data/spendingMultipliers';
import type { EpisodeRead, LevelContext, ShockPrecedentOutcome } from './scenarioHistory';
import type { PrecedentOutcome } from './precedentFinder';
import type { LiveWatchlistItem } from '../types/council';

export { SCENARIO_AGENT_NAME, SCENARIO_AGENT_COVERS } from './scenarioAgentInfo';
import { SCENARIO_AGENT_NAME } from './scenarioAgentInfo';

export const LP_SCENARIO_HORIZONS = [6, 12, 24];
export const GROWTH_SHOCK_YEARS = 2;
export const SCENARIO_NOTE = 'App calculation on a stated shock, not a forecast';

/** The scenario engine's two responses for one country, applied to the question's shock. */
export interface EngineRun {
  response: 'fx' | 'policy';
  ok: boolean;
  value?: number;
  lo?: number;
  hi?: number;
  beyondSample?: FactorId[];
  n?: number;
  from?: string;
  to?: string;
  reason?: string;
}

/** The largest monthly move on record, offered when the question gives no size. */
export interface LargestMove {
  kind: ShockKind;
  move: number;
  month: string;
  from: string;
  source: string;
}

export interface DsaRun {
  kind: 'interest_cost' | 'growth' | 'inflation';
  startYear: string;
  debtNow: number;
  endYear: string;
  baselineEnd: number;
  shockedEnd: number;
  about: string;
}

export interface LpRun {
  ok: boolean;
  steps?: Array<{ h: number; value: number; lo: number; hi: number }>;
  from?: string;
  to?: string;
  reason?: string;
}

/** What the server works out for one country (POST /api/council/scenario). */
export interface ScenarioCountryData {
  iso3: string;
  countryName: string;
  engine?: EngineRun[];
  largest?: LargestMove[];
  dsa?: { ok: true; runs: DsaRun[]; source: string } | { ok: false; reason: string };
  lp?: LpRun;
  /** Factors the engine had no history for. */
  missingFactors?: string[];
  /** What history says (WI3, src/utils/scenarioHistory.ts). */
  history?: ScenarioHistory;
}

export interface ScenarioHistory {
  episodes?: EpisodeRead[];
  precedents?: ShockPrecedentOutcome[];
  levels?: LevelContext[];
  /** Why a reading could not run at all (no replay series, no yearly histories). */
  missing?: string[];
}

const r2 = (v: number) => Math.round(v * 100) / 100;

/* ------------------------------------------------------------------------------------------
 * Server-side pieces (pure): the server fits and loads, these apply the question's shock.
 * ------------------------------------------------------------------------------------------ */

export function engineRuns(models: ScenarioModelOutcome[], sq: ScenarioQuestion): EngineRun[] {
  const shock = engineShock(sq);
  if (!Object.keys(shock).length) return [];
  return models.map((m) => {
    if (!m.ok) return { response: m.response, ok: false, reason: m.reason };
    const r = applyScenario(m as ScenarioModel, shock);
    return { response: m.response, ok: true, value: r.value, lo: r.lo, hi: r.hi, beyondSample: r.beyondSample, n: m.n, from: m.from, to: m.to };
  });
}

/** The largest monthly move in a series of monthly changes, with its month. */
export function largestMove(kind: ShockKind, changes: Map<string, number> | undefined, source: string, window = 180): LargestMove | null {
  if (!changes?.size) return null;
  const months = [...changes.keys()].sort().slice(-window);
  let best = months[0];
  for (const m of months) if (Math.abs(changes.get(m)!) > Math.abs(changes.get(best)!)) best = m;
  return { kind, move: r2(changes.get(best)!), month: best, from: months[0], source };
}

/** The local projection at 6, 12 and 24 months for a change of `change` points (the server sends 1; the answer scales to the question's size). */
export function lpRun(lp: LpOutcome, change = 1): LpRun {
  if (!lp.ok) return { ok: false, reason: lp.reason };
  const steps = LP_SCENARIO_HORIZONS.map((h) => lp.steps.find((s) => s.h === h))
    .filter((s): s is NonNullable<typeof s> => Boolean(s))
    .map((s) => {
      const a = s.lo * change;
      const b = s.hi * change;
      return { h: s.h, value: r2(s.beta * change), lo: r2(Math.min(a, b)), hi: r2(Math.max(a, b)) };
    });
  if (!steps.length) return { ok: false, reason: 'The local projection has none of the 6, 12 and 24 month horizons' };
  return { ok: true, steps, from: lp.from, to: lp.to };
}

function pathEnd(start: number, years: YearAssump[]): number {
  let d = start;
  for (const y of years) d = nextDebt(d, y.i, nominalGrowthPct(y.g, y.pi), y.pb);
  return r2(d);
}

/** The debt identity with the question's borrowing cost, growth and inflation shocks, against the baseline. */
export function dsaRuns(base: DsaResult, sq: ScenarioQuestion, iso3: string): { ok: true; runs: DsaRun[]; source: string } | { ok: false; reason: string } {
  const wanted = sq.shocks.filter((s): s is Shock & { kind: DsaRun['kind'] } => ['interest_cost', 'growth', 'inflation'].includes(s.kind) && s.change !== null);
  if (!wanted.length) return { ok: true, runs: [], source: '' };
  const inputs = base.baselineInputs;
  if (!inputs || inputs.length !== DSA_HORIZON) return { ok: false, reason: base.missing.find((m) => m.includes('projected inputs')) || "The IMF's projected inputs are not on file, so the debt path cannot run" };
  const baselineEnd = pathEnd(base.debtNow, inputs);
  const endYear = inputs[inputs.length - 1].year;
  const semi = semiElasticityFor(iso3);
  const runs: DsaRun[] = wanted.map((s) => {
    const c = s.change as number;
    let years: YearAssump[];
    let about: string;
    if (s.kind === 'interest_cost') {
      years = inputs.map((y, k) => ({ ...y, i: y.i + c * Math.min(1, ROLLOVER_SHARE * (k + 1)) }));
      about = `effective interest rate up to ${c} pts higher, phased in as a fifth of the debt rolls over each year`;
    } else if (s.kind === 'growth') {
      // Output level below baseline: c in year 1, 2c from year 2 on (two years of slower growth).
      years = inputs.map((y, k) => {
        const gap = c * Math.min(k + 1, GROWTH_SHOCK_YEARS);
        return { ...y, g: k < GROWTH_SHOCK_YEARS ? y.g + c : y.g, pb: semi ? y.pb + semi.value * gap : y.pb };
      });
      about = `real growth ${c > 0 ? 'up' : 'down'} ${Math.abs(c)} pts in each of the first ${GROWTH_SHOCK_YEARS} years${semi ? `; primary balance moves by ${semi.value} x the output change (${semi.source})` : '; no published budget semi-elasticity on file, so the primary balance is held'}`;
    } else {
      years = inputs.map((y, k) => (k === 0 ? { ...y, pi: y.pi + c } : y));
      about = `inflation ${c > 0 ? 'up' : 'down'} ${Math.abs(c)} pts in year 1, interest held (fixed-rate debt)`;
    }
    return { kind: s.kind, startYear: base.lastOutturnYear, debtNow: base.debtNow, endYear, baselineEnd, shockedEnd: pathEnd(base.debtNow, years), about };
  });
  return { ok: true, runs, source: `IMF WEO and Fiscal Monitor via the app's debt sustainability tool, last outturn ${base.lastOutturnYear}` };
}

/* ------------------------------------------------------------------------------------------
 * The agent's answer (browser and server).
 * ------------------------------------------------------------------------------------------ */

const sgn = (v: number, d = 1) => `${v > 0 ? '+' : ''}${v.toFixed(d)}`;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthName = (ym: string) => (/^\d{4}-\d{2}/.test(ym) ? `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}` : ym);

/** The change in the kind's unit, from a stated change or a level against today's figure. */
export function resolvedChange(s: Shock, it: LiveWatchlistItem): { change: number; basis?: string } | null {
  if (s.change !== null) return { change: s.change };
  if (!s.target) return null;
  if (s.target.unit === 'usd' && s.kind === 'oil') {
    const b = it.trade?.brentUsd;
    if (b === undefined || !it.trade?.pricesAsOf) return null;
    return { change: r2((s.target.value / b - 1) * 100), basis: `$${s.target.value} against Brent $${b.toFixed(1)} in ${monthName(it.trade.pricesAsOf)} (World Bank Pink Sheet)` };
  }
  if (s.target.unit === 'pts' && s.kind === 'policy_rate' && it.policyRatePct !== undefined && it.policyRateSource === 'bis') {
    return { change: r2(s.target.value - it.policyRatePct), basis: `${s.target.value}% against today's ${it.policyRatePct.toFixed(2)}% (BIS${it.policyRateDate ? `, ${it.policyRateDate}` : ''})` };
  }
  return null;
}

/** Net trade in a goods group as % of GDP: exports share x exports/GDP less imports share x imports/GDP. */
function netTradePctGdp(xSharePct: number | undefined, mSharePct: number | undefined, it: LiveWatchlistItem): number | null {
  const x = it.trade?.exportsPctGdp;
  const m = it.trade?.importsPctGdp;
  if (xSharePct === undefined || mSharePct === undefined || x === undefined || m === undefined) return null;
  return (xSharePct / 100) * x - (mSharePct / 100) * m;
}

/** Debt to GDP rise from dollar bonds when the currency weakens by `weakerPct` (units per dollar up). */
function fxDebtEffect(it: LiveWatchlistItem, weakerPct: number): { pts: number; source: string } | null {
  const bonds = it.fiscal?.intlBonds;
  const gdp = it.imf?.currentAccount4q?.gdpUsdBn;
  if (!bonds || !gdp) return null;
  return { pts: r2((bonds.usdBn / gdp) * weakerPct), source: `BIS government bonds in international markets $${bonds.usdBn.toFixed(1)}bn (${bonds.asOf}) over IMF WEO GDP $${gdp.toFixed(0)}bn (${it.imf!.currentAccount4q!.gdpYear}); international bonds only, so a lower bound` };
}

/** Today's figures the shocks start from: only real, sourced figures. */
function startingFigures(sq: ScenarioQuestion, it: LiveWatchlistItem, data?: ScenarioCountryData): AgentFigure[] {
  const out: AgentFigure[] = [];
  const kinds = new Set(sq.shocks.map((s) => s.kind));
  const needRate = ['policy_rate', 'us_rate', 'inflation', 'currency', 'dollar', 'fin_stress'].some((k) => kinds.has(k as ShockKind));
  if (needRate && it.policyRatePct !== undefined && it.policyRateSource === 'bis') out.push({ label: 'Now: policy rate', value: `${it.policyRatePct.toFixed(2)}%`, source: `BIS central bank policy rates${it.policyRateDate ? `, ${it.policyRateDate}` : ''}`, tag: 'official' });
  if ((needRate || kinds.has('oil') || kinds.has('food')) && it.cpiInflationPct !== undefined && it.cpiSource && it.cpiSource !== 'sample') out.push({ label: 'Now: inflation', value: `${it.cpiInflationPct.toFixed(1)}%`, source: it.cpiSource === 'oecd' ? 'OECD consumer prices, monthly' : 'IMF consumer prices', tag: 'official' });
  if ((kinds.has('interest_cost') || kinds.has('policy_rate') || kinds.has('us_rate')) && it.yield10YSource === 'official' && it.yield10YPct !== undefined) out.push({ label: 'Now: 10-year government bond yield', value: `${it.yield10YPct.toFixed(2)}%`, source: `official series${it.yield10YPeriod ? `, ${it.yield10YPeriod}` : ''}`, tag: 'official' });
  const ca = it.imf?.currentAccount4q;
  if ((kinds.has('oil') || kinds.has('food') || kinds.has('commodity') || kinds.has('dollar')) && ca?.pctGdp !== undefined) out.push({ label: 'Now: current account, last four quarters', value: `${sgn(ca.pctGdp)}% of GDP`, source: `IMF balance of payments to ${ca.through}`, tag: 'official' });
  if (kinds.has('oil') && it.trade?.brentUsd !== undefined && it.trade.pricesAsOf) out.push({ label: 'Now: Brent crude', value: `$${it.trade.brentUsd.toFixed(1)} a barrel`, source: `World Bank Pink Sheet, ${monthName(it.trade.pricesAsOf)}`, tag: 'official' });
  const run = data?.dsa?.ok ? data.dsa.runs[0] : undefined;
  if (run) out.push({ label: 'Now: government debt', value: `${run.debtNow.toFixed(1)}% of GDP`, source: `IMF WEO, ${run.startYear}`, tag: 'official' });
  else if (it.fiscal?.debtPctGdp && (kinds.has('currency') || kinds.has('interest_cost') || kinds.has('growth'))) out.push({ label: 'Now: government debt', value: `${it.fiscal.debtPctGdp.value.toFixed(1)}% of GDP`, source: `IMF WEO, ${it.fiscal.debtPctGdp.year}`, tag: 'official' });
  return out;
}

const DSA_LABEL: Record<DsaRun['kind'], string> = { interest_cost: 'higher borrowing costs', growth: 'the growth change', inflation: 'the inflation change' };

/** One finding per country: the starting point, then each channel's result, or why it could not run. */
export function scenarioFinding(sq: ScenarioQuestion, it: LiveWatchlistItem, data: ScenarioCountryData | undefined): { finding: AgentFinding | null; missing: string[] } {
  const name = it.countryName;
  const figures: AgentFigure[] = startingFigures(sq, it, data);
  const parts: string[] = [];
  const missing: string[] = [];
  let weight = 0;

  for (const s of sq.shocks) {
    const res = resolvedChange(s, it);
    if (!res) {
      const big = data?.largest?.find((l) => l.kind === s.kind);
      missing.push(
        `${name}: ${shockLabel(s)}. ${s.target ? "Today's figure to measure the level against is not on file." : 'Give a size to run it.'}${big ? ` The largest monthly move since ${monthName(big.from)} was ${sgn(big.move, 2)} ${SHOCK_KINDS[s.kind].unit} in ${monthName(big.month)} (${big.source}).` : ''}`,
      );
      continue;
    }
    const c = res.change;
    figures.push({ label: `Shock: ${SHOCK_KINDS[s.kind].label.toLowerCase()}`, value: `${sgn(c, 2)} ${SHOCK_KINDS[s.kind].unit}`, source: res.basis ? `the question's level: ${res.basis}` : 'size as stated in the question', tag: 'model' });

    if (s.kind === 'policy_rate') {
      const lp = data?.lp;
      if (lp?.ok && lp.steps) {
        const scaled = lp.steps.map((x) => ({ h: x.h, value: r2(x.value * c), lo: r2(Math.min(x.lo * c, x.hi * c)), hi: r2(Math.max(x.lo * c, x.hi * c)) }));
        for (const st of scaled) figures.push({ label: `After the shock: inflation, ${st.h} months on`, value: `${sgn(st.value, 2)} pts (90% band ${sgn(st.lo, 2)} to ${sgn(st.hi, 2)})`, source: `local projections on monthly inflation and the policy rate, ${lp.from} to ${lp.to}; reduced form, co-movement not cause; ${SCENARIO_NOTE}`, tag: 'model' });
        const last = scaled[scaled.length - 1];
        parts.push(`In the past, ${c > 0 ? 'a rise' : 'a cut'} of this size came with inflation ${last.value >= 0 ? 'higher' : 'lower'} by ${Math.abs(last.value).toFixed(2)} points ${last.h} months later (90% band ${sgn(last.lo, 2)} to ${sgn(last.hi, 2)}); this is co-movement, not the effect of the rate alone.`);
        weight = Math.max(weight, 0.5);
      } else missing.push(`${name}: inflation after a rate change (${lp?.reason || 'local projection not run'})`);
      if (it.policyRatePct !== undefined && it.policyRateSource === 'bis' && it.cpiInflationPct !== undefined && it.cpiSource && it.cpiSource !== 'sample') {
        const realNow = it.policyRatePct - it.cpiInflationPct;
        figures.push({ label: 'After the shock: real policy rate on impact', value: `${sgn(realNow, 2)}% to ${sgn(realNow + c, 2)}%`, source: `policy rate less latest inflation, before inflation responds; ${SCENARIO_NOTE}`, tag: 'model' });
      }
    }

    if (s.kind === 'currency') {
      const fx = fxDebtEffect(it, c);
      if (fx) {
        figures.push({ label: 'After the shock: debt to GDP from dollar bonds', value: `${sgn(fx.pts, 2)} pts of GDP`, source: `${fx.source}; ${SCENARIO_NOTE}`, tag: 'model' });
        parts.push(`A currency ${c > 0 ? 'fall' : 'rise'} of ${Math.abs(c)}% ${c > 0 ? 'adds' : 'removes'} at least ${Math.abs(fx.pts).toFixed(2)} points of GDP ${c > 0 ? 'to' : 'from'} government debt through bonds owed in foreign currency.`);
        weight = Math.max(weight, Math.min(1, Math.abs(fx.pts) / 5));
      } else missing.push(`${name}: debt effect of the currency move (BIS international bonds or IMF GDP in dollars not on file)`);
    }

    if (s.kind === 'oil' || s.kind === 'food' || s.kind === 'commodity') {
      const mix = it.tradeMix;
      const net =
        s.kind === 'oil'
          ? netTradePctGdp(it.trade?.fuelExportsPctMerch, it.trade?.fuelImportsPctMerch, it)
          : s.kind === 'food'
            ? netTradePctGdp(mix?.exportFoodPct?.value, mix?.importFoodPct?.value, it)
            : netTradePctGdp(
                [mix?.exportFuelPct, mix?.exportOresMetalsPct, mix?.exportFoodPct].every(Boolean) ? mix!.exportFuelPct!.value + mix!.exportOresMetalsPct!.value + mix!.exportFoodPct!.value : undefined,
                [mix?.importFuelPct, mix?.importOresMetalsPct, mix?.importFoodPct].every(Boolean) ? mix!.importFuelPct!.value + mix!.importOresMetalsPct!.value + mix!.importFoodPct!.value : undefined,
                it,
              );
      const group = s.kind === 'oil' ? 'fuel' : s.kind === 'food' ? 'food' : 'fuel, ores and metals, and food';
      if (net !== null) {
        const effect = r2((net * c) / 100);
        const year = s.kind === 'oil' ? it.trade?.wbYear : mix?.exportFoodPct?.year;
        figures.push({ label: `Net ${group} trade`, value: `${sgn(net, 2)}% of GDP (${net >= 0 ? 'net exporter' : 'net importer'})`, source: `World Bank shares of merchandise trade and trade in % of GDP${year ? `, ${year}` : ''}`, tag: 'model' });
        figures.push({ label: 'After the shock: trade balance, first round', value: `${sgn(effect, 2)}% of GDP`, source: `net ${group} trade x price change, volumes held; merchandise shares applied to goods and services totals; ${SCENARIO_NOTE}`, tag: 'model' });
        parts.push(`As a net ${net >= 0 ? 'exporter' : 'importer'} of ${group}, a ${Math.abs(c).toFixed(0)}% ${c > 0 ? 'rise' : 'fall'} in prices moves the trade balance by about ${sgn(effect, 2)}% of GDP in the first round, before volumes and policy respond.`);
        weight = Math.max(weight, Math.min(1, Math.abs(effect) / 3));
      } else missing.push(`${name}: ${group} trade shares or trade in % of GDP not on file (World Bank)`);
    }
  }

  // The scenario engine, for the global shocks it covers.
  const eng = data?.engine || [];
  if (eng.length) {
    for (const e of eng) {
      if (!e.ok || e.value === undefined) {
        missing.push(`${name}: ${RESPONSES[e.response].label.toLowerCase()} in the scenario engine (${e.reason || 'not fitted'})`);
        continue;
      }
      const unit = RESPONSES[e.response].unit;
      const d = e.response === 'fx' ? 1 : 2;
      const beyond = e.beyondSample?.length ? '; the shock is larger than any month in the sample, so this extrapolates' : '';
      figures.push({ label: `After the shock: ${e.response === 'fx' ? 'currency against the US dollar (+ = weaker)' : 'policy rate'}`, value: `${sgn(e.value, d)} ${unit} (90% band ${sgn(e.lo!, d)} to ${sgn(e.hi!, d)})`, source: `scenario engine, monthly co-movement ${e.from} to ${e.to} (${e.n} months), not cause${beyond}; ${SCENARIO_NOTE}`, tag: 'model' });
      if (e.response === 'fx') {
        parts.push(`On the last 15 years' monthly co-movement, the currency would be about ${Math.abs(e.value).toFixed(1)}% ${e.value >= 0 ? 'weaker' : 'stronger'} against the dollar (90% band ${sgn(e.lo!, 1)} to ${sgn(e.hi!, 1)}%).`);
        weight = Math.max(weight, Math.min(1, Math.abs(e.value) / 10));
        const fx = fxDebtEffect(it, e.value);
        if (fx) figures.push({ label: 'After the shock: debt to GDP from dollar bonds, at that currency move', value: `${sgn(fx.pts, 2)} pts of GDP`, source: `${fx.source}; ${SCENARIO_NOTE}`, tag: 'model' });
      } else {
        parts.push(`The central bank's rate has moved by about ${sgn(e.value, 2)} points with shocks like this (90% band ${sgn(e.lo!, 2)} to ${sgn(e.hi!, 2)}).`);
      }
    }
    for (const m of data?.missingFactors || []) missing.push(`${name}: scenario engine factor not on file: ${m}`);
  }

  // The debt identity for borrowing costs, growth and inflation.
  if (data?.dsa) {
    if (data.dsa.ok) {
      for (const r of data.dsa.runs) {
        const diff = r2(r.shockedEnd - r.baselineEnd);
        figures.push({ label: `After the shock: government debt in ${r.endYear}`, value: `${r.shockedEnd.toFixed(1)}% of GDP against ${r.baselineEnd.toFixed(1)}% on the baseline (${sgn(diff, 1)} pts)`, source: `debt identity on the IMF's projected inputs with ${r.about}; ${data.dsa.source}; ${SCENARIO_NOTE}`, tag: 'model' });
        parts.push(`With ${DSA_LABEL[r.kind]}, government debt would reach ${r.shockedEnd.toFixed(1)}% of GDP by ${r.endYear}, against ${r.baselineEnd.toFixed(1)}% on the IMF's inputs.`);
        weight = Math.max(weight, Math.min(1, Math.abs(diff) / 10));
      }
    } else if (sq.shocks.some((s) => ['interest_cost', 'growth', 'inflation'].includes(s.kind) && s.change !== null)) missing.push(`${name}: debt path (${data.dsa.reason})`);
  } else if (sq.shocks.some((s) => ['interest_cost', 'growth', 'inflation'].includes(s.kind) && s.change !== null)) missing.push(`${name}: debt path (the app's debt tool did not answer)`);

  // What history says (WI3).
  const hist = data?.history;
  if (hist) historyFigures(hist, name, figures, parts, missing);

  const shockFigures = figures.filter((f) => /^(After the shock|Past episode|When it happened before|Record)/.test(f.label));
  if (!shockFigures.length) return { finding: null, missing };
  return { finding: { iso3: it.iso3, countryName: name, reading: parts.join(' '), figures, weight }, missing };
}

const FACTOR_WORDS: Record<string, string> = { fx: 'currency against the US dollar (+ = weaker)', local_yield: '10-year local yield', spread: 'USD bond spread', us_rates: 'US 10-year yield' };
const OUTCOME_WORDS: Partial<Record<PrecedentOutcome, { label: string; unit: string }>> = {
  growth_avg: { label: 'average real growth over the next 3 years', unit: '%' },
  inflation_after: { label: 'inflation 3 years later', unit: '%' },
  debt_change: { label: 'change in government debt over 3 years', unit: ' pts of GDP' },
  currency_change: { label: 'currency against the dollar over 3 years (+ = weaker)', unit: '%' },
};

/** Past episodes, cases elsewhere and record context as figures, with what could not be read. */
export function historyFigures(hist: ScenarioHistory, name: string, figures: AgentFigure[], parts: string[], missing: string[]): void {
  for (const m of hist.missing || []) missing.push(`${name}: ${m}`);
  for (const ep of hist.episodes || []) {
    const read = ep.moves.filter((m) => m.move !== null);
    const notRead = ep.moves.filter((m) => m.move === null);
    // The replays give the currency as % change of its value (- = weaker); shown here as + = weaker, like the rest of this agent.
    const shown = (m: (typeof read)[number]) => (m.factor === 'fx' ? -(m.move as number) || 0 : (m.move as number));
    for (const m of read) {
      const d = m.unit === '%' ? 1 : 0;
      figures.push({ label: `Past episode, ${ep.label}: ${FACTOR_WORDS[m.factor]}`, value: `${sgn(shown(m), d)}${m.unit === '%' ? '%' : ' bp'} (${monthName(ep.from)} to ${monthName(ep.to)}, monthly averages)`, source: `${m.source}; ${ep.about}`, tag: 'official' });
    }
    if (notRead.length) missing.push(`${name}, ${ep.label}: ${notRead.map((m) => `${FACTOR_WORDS[m.factor]} (${m.reason})`).join('; ')}`);
    const fx = read.find((m) => m.factor === 'fx');
    if (fx) parts.push(`In the ${ep.label.replace(/,.*$/, '')} episode the currency ${shown(fx) > 0 ? 'lost' : 'gained'} ${Math.abs(fx.move!).toFixed(1)}% against the dollar.`);
  }
  for (const p of hist.precedents || []) {
    if (!p.ok) {
      missing.push(`${name}: cases elsewhere (${p.reason})`);
      continue;
    }
    const size = p.measure === 'pct' ? `${Math.abs(p.threshold)}%` : `${Math.abs(p.threshold)} pts`;
    const dir = p.threshold > 0 ? (p.measure === 'pct' ? 'up' : 'up') : 'down';
    figures.push({ label: `When it happened before: ${p.figure} ${dir} ${size} or more in one year`, value: `${p.cases} country-years in ${p.countries} countries, ${p.firstYear} to ${p.lastYear}`, source: `app calculation on ${p.source} yearly history from 1980, each case with three later years saved; description of the past, not a forecast`, tag: 'model' });
    for (const [k, w] of Object.entries(OUTCOME_WORDS) as Array<[PrecedentOutcome, { label: string; unit: string }]>) {
      const sm = p.summary[k];
      if (sm.median === null) continue;
      figures.push({ label: `When it happened before: median ${w.label}`, value: `${sm.median > 0 && k !== 'growth_avg' && k !== 'inflation_after' ? '+' : ''}${sm.median}${w.unit} (${sm.n} cases)`, source: 'medians over every case above; IMF WEO and World Bank yearly figures', tag: 'model' });
    }
    if (p.closest.length) {
      figures.push({
        label: `When it happened before: closest ${p.rankedBy === 'start' ? 'starting points' : 'moves'}`,
        value: p.closest.map((c) => `${c.name} ${c.year} (${sgn(c.move, p.measure === 'pct' ? 1 : 1)}${p.measure === 'pct' ? '%' : ' pts'})`).join(', '),
        source: p.rankedBy === 'start' ? `ranked by how close debt, inflation, reserves and current account the year before were to ${name} in ${p.startYear}; each country once` : 'ranked by how close the move was to the stated change; each country once',
        tag: 'model',
      });
    }
    const g = p.summary.growth_avg.median;
    parts.push(`Since ${p.firstYear}, ${p.figure} has moved this far in one year ${p.cases} times in ${p.countries} countries${g !== null ? `; growth over the following three years had a median of ${g}%` : ''}.`);
  }
  for (const l of hist.levels || []) {
    const when = l.since ? `the ${l.direction} since ${monthName(l.since.slice(0, 7))}` : `the ${l.direction} on record (since ${monthName(l.first.slice(0, 7))})`;
    figures.push({ label: `Record context: ${l.label} after the shock`, value: `${l.after.toFixed(2)}%, ${when}`, source: `${l.source}; latest ${l.now.value.toFixed(2)}% (${l.now.date}) plus the stated change`, tag: 'model' });
    parts.push(`A ${l.label} of ${l.after.toFixed(2)}% would be ${when}.`);
  }
}

export function scenarioAnswer(sq: ScenarioQuestion, countries: LiveWatchlistItem[], data: ScenarioCountryData[]): AgentAnswer {
  const findings: AgentFinding[] = [];
  const missing: string[] = [];
  for (const it of countries) {
    const r = scenarioFinding(sq, it, data.find((d) => d.iso3 === it.iso3));
    if (r.finding) findings.push(r.finding);
    missing.push(...r.missing);
  }
  const what = sq.shocks.map(shockLabel).join('; ');
  return { id: 'scenario', name: SCENARIO_AGENT_NAME, why: `the question asks what would happen if: ${what}`, findings, missing: [...new Set(missing)] };
}

/** Wire form of the question's shocks for POST /api/council/scenario. */
export function scenarioRequestBody(sq: ScenarioQuestion, iso3s: string[]): { iso3s: string[]; shocks: Shock[] } {
  return { iso3s, shocks: sq.shocks };
}

/** Limits on a stated change, by unit, so a typo cannot run the tools on nonsense. */
const MAX_CHANGE: Record<ShockKindInfo['unit'], number> = { pts: 50, '%': 500, 'index pts': 20, 'std dev': 10 };

/** Reads and checks the shocks sent to the server; null when the value is not a list of valid shocks. */
export function scenarioFromQuery(raw: unknown): ScenarioQuestion | null {
  if (typeof raw !== 'string' || raw.length > 4000) return null;
  let list: unknown;
  try {
    list = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(list) || !list.length || list.length > 12) return null;
  const shocks: Shock[] = [];
  for (const x of list as Array<Record<string, unknown>>) {
    const kind = x?.kind as ShockKind;
    if (!kind || !(kind in SHOCK_KINDS)) return null;
    const change = x.change === null || x.change === undefined ? null : Number(x.change);
    if (change !== null && (!Number.isFinite(change) || Math.abs(change) > MAX_CHANGE[SHOCK_KINDS[kind].unit])) return null;
    const t = x.target as { value?: unknown; unit?: unknown } | null | undefined;
    const target = t && Number.isFinite(Number(t.value)) && (t.unit === 'pts' || t.unit === 'usd') ? { value: Number(t.value), unit: t.unit as 'pts' | 'usd' } : null;
    const direction = x.direction === 1 || x.direction === -1 ? x.direction : null;
    shocks.push({ kind, direction, change, target, said: '' });
  }
  return { shocks, spending: null, routes: [], needsSize: shocks.filter((s) => s.change === null && s.target === null) };
}
