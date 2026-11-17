/**
 * The Quant desk (research tools item 2): a Council chat desk agent that answers from an outside
 * research-tools server you run (src/server/researchTools.ts). The server side runs it
 * (POST /api/council/quant); this file holds the pure parts, so the tests run them on recorded replies.
 *
 * - Which tools to call is decided by stated rules on the question's words, and only from the tools
 *   the server lists for this token. Sizes (horizon, period) come only from the question; the app
 *   picks none. At most the set number of tool calls per question (4 by default).
 * - Each figure is a number from the reply, rounded to 4 decimals at most, with the result's link,
 *   its data-through date and the reply's label ("Hypothetical, past performance; not a
 *   recommendation"). Volatility given as a yearly fraction also shows as a percentage.
 * - Readings are fixed words; nothing is ever worded as a buy or sell call. Instrument ids the
 *   server flags for compliance are never printed.
 * - Any refusal or missed time limit reads "Research tools unavailable" with the reason; a refusal
 *   because only local models may see results leaves the desk out of the answer.
 *
 * Browser-safe (no Node imports).
 */
import type { AgentAnswer, AgentFigure, AgentFinding } from './askCouncil';
import { QUANT_AGENT_NAME } from './quantDeskInfo';

export const UNAVAILABLE = 'Research tools unavailable';
export const MAX_REFS = 2;
const MAX_FIGURES = 8;

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  /** The instrument or run the call is about, shown as the finding's subject. */
  ref: string;
}

export interface QuantCountry {
  iso3: string;
  countryName: string;
  currencyCode?: string;
}

/** The main currencies, beside those of the countries on the watchlist, so a code in a question is known. */
const MAJORS = ['USD', 'EUR', 'JPY', 'GBP', 'CHF', 'CNY', 'CAD', 'AUD', 'NZD', 'SEK', 'NOK', 'DKK', 'HKD', 'SGD'];

export interface QuantIntent {
  vol: boolean;
  forecast: boolean;
  stats: boolean;
  option: boolean;
  correlation: boolean;
  backtest: boolean;
  nowcast: boolean;
}

export function quantIntent(q: string): QuantIntent {
  return {
    vol: /volatil|\bvol\b|\bgarch\b/i.test(q),
    forecast: /\bforecast|\bpredict|\bprojection/i.test(q),
    stats: /drawdown|\bsharpe\b|\bvar\b|value at risk|expected shortfall|\bskew|kurtosis|return statistics/i.test(q),
    option: /\boptions? (?:price|prices|pricing|chain|chains|premium|premiums|greeks)\b|\b(?:call|put) options?\b|implied vol/i.test(q),
    correlation: /correlat/i.test(q),
    backtest: /back-?test/i.test(q),
    nowcast: /\bnowcast/i.test(q),
  };
}

/**
 * The instruments a question names, in order: run ids (BTR-..., PPF-...), macro:CODE, a currency
 * pair (USDBRL or USD/BRL), a currency code (BRL means USDBRL: the contract quotes FX as units per
 * US dollar), a $ticker or "ticker XYZ", then the currency of each country named.
 */
export function refsInQuestion(q: string, named: QuantCountry[], currencies: string[] = []): string[] {
  const ccys = new Set([...MAJORS, ...currencies.map((c) => c.toUpperCase()), ...named.map((c) => (c.currencyCode || '').toUpperCase())].filter((c) => /^[A-Z]{3}$/.test(c)));
  const out: string[] = [];
  const add = (r: string) => {
    if (r && !out.includes(r)) out.push(r);
  };
  for (const m of q.matchAll(/\b((?:BTR|PPF)-[A-Za-z0-9_-]+|macro:[A-Za-z0-9_.-]+)/g)) add(m[1]!);
  for (const m of q.matchAll(/\b([A-Z]{3})\/?([A-Z]{3})\b/g)) if (ccys.has(m[1]!) && ccys.has(m[2]!) && m[1] !== m[2]) add(`${m[1]}${m[2]}`);
  for (const m of q.matchAll(/(?<![A-Za-z/])([A-Z]{3})(?![A-Za-z/])/g)) if (ccys.has(m[1]!) && m[1] !== 'USD' && !out.some((r) => r.includes(m[1]!))) add(`USD${m[1]}`);
  for (const m of q.matchAll(/(?:\$|\b(?:ticker|symbol)\s+)([A-Z][A-Z0-9.]{0,9})\b/g)) add(m[1]!);
  for (const c of named) {
    const ccy = (c.currencyCode || '').toUpperCase();
    if (/^[A-Z]{3}$/.test(ccy) && ccy !== 'USD' && !out.some((r) => r.includes(ccy))) add(`USD${ccy}`);
  }
  return out.slice(0, MAX_REFS);
}

/** A horizon stated in days ("20-day", "over 10 trading days"), 1 to 60; null when the question gives none. */
export function horizonDays(q: string): number | null {
  const m = q.match(/\b(\d{1,2})[- ](?:trading[- ])?days?\b/i);
  const v = m ? Number(m[1]) : NaN;
  return Number.isInteger(v) && v >= 1 && v <= 60 ? v : null;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** A start date stated in the question ("since 2015", "from 2018", "over the last 5 years"); null when none. */
export function startDate(q: string, now: Date): string | null {
  const y = q.match(/\b(?:since|from)\s+((?:19|20)\d\d)\b/i);
  if (y) return `${y[1]}-01-01`;
  const n = q.match(/\b(?:last|past)\s+(\d{1,2})\s+years?\b/i);
  if (n) {
    const d = new Date(now);
    d.setUTCFullYear(d.getUTCFullYear() - Number(n[1]));
    return iso(d);
  }
  return null;
}

const STRATEGIES: Array<[RegExp, string]> = [
  [/buy[- ]and[- ]hold/i, 'buy_and_hold'],
  [/mean[- ]reversion/i, 'mean_reversion'],
  [/low[- ]vol/i, 'low_vol'],
  [/momentum/i, 'momentum'],
  [/\btrend/i, 'trend'],
  [/\bcarry\b/i, 'carry'],
];

/**
 * The tool calls for a question, from the tools the server lists only, at most `max`. A nowcast
 * question starts with list_nowcasts; the model to read is picked once its list is back (nowcastFollowUp).
 */
export function planToolCalls(question: string, named: QuantCountry[], tools: string[], max: number, now: Date = new Date(), currencies: string[] = []): { calls: ToolCall[]; notes: string[] } {
  const has = (n: string) => tools.includes(n);
  const intent = quantIntent(question);
  const refs = refsInQuestion(question, named, currencies);
  const fx = refs.filter((r) => /^[A-Z]{6}$/.test(r));
  const horizon = horizonDays(question);
  const start = startDate(question, now);
  const calls: ToolCall[] = [];
  const notes: string[] = [];
  const add = (c: ToolCall) => {
    if (has(c.name) && !calls.some((x) => x.name === c.name && JSON.stringify(x.args) === JSON.stringify(c.args))) calls.push(c);
  };
  const runId = refs.find((r) => /^BTR-/.test(r));
  const series = refs.filter((r) => !/^BTR-|^PPF-/.test(r) || intent.stats || intent.correlation);
  if (intent.backtest) {
    const kind = STRATEGIES.find(([re]) => re.test(question))?.[1];
    if (runId) add({ name: 'get_run', args: { run_id: runId }, ref: runId });
    else if (kind && series.length && start && (kind !== 'carry' || fx.length)) {
      const universe = kind === 'carry' ? fx : series;
      add({ name: 'run_backtest', args: { spec: { name: `council ${kind} ${universe.join(' ')}`, universe, start, end: iso(now), signal: { kind } } }, ref: universe.join(', ') });
    } else add({ name: 'list_runs', args: { limit: 5 }, ref: 'recent backtests' });
  }
  for (const ref of series) {
    if (/^BTR-|^PPF-/.test(ref) && !(intent.stats || intent.correlation)) continue;
    if (intent.vol && (intent.forecast || !intent.option)) add({ name: 'forecast_series', args: { ref, model: 'garch', ...(horizon ? { horizon } : {}) }, ref });
    else if (intent.forecast && !intent.vol) add({ name: 'forecast_series', args: { ref, model: 'arima', ...(horizon ? { horizon } : {}) }, ref });
    if (intent.stats) add({ name: 'describe_series', args: { ref, ...(start ? { start } : {}) }, ref });
    if (intent.option && !/^macro:/.test(ref)) add({ name: 'option_chain', args: { symbol: ref }, ref });
  }
  if (intent.correlation && series.length >= 2) add({ name: 'correlations', args: { refs: series, ...(start ? { start } : {}) }, ref: series.join(', ') });
  if (intent.nowcast) add({ name: 'list_nowcasts', args: {}, ref: 'nowcast models' });
  if (!calls.length) {
    const wanted = Object.entries(intent).filter(([, v]) => v).length;
    if (wanted && !refs.length && !intent.nowcast && !intent.backtest) notes.push('The question names no instrument the research tools can look up (a currency pair such as USDBRL, a currency code such as BRL, a $ticker, or a run id), and no country with a currency.');
    else if (wanted) notes.push('The research tools this token can see do not cover this question.');
  }
  const dropped = Math.max(0, calls.length - max);
  if (dropped) notes.push(`${dropped} more tool ${dropped === 1 ? 'call was' : 'calls were'} left out (limit of ${max} per question).`);
  return { calls: calls.slice(0, max), notes };
}

/** After list_nowcasts: get_nowcast for each model whose id or target names a country in the question. */
export function nowcastFollowUp(listResult: Record<string, unknown>, named: QuantCountry[], tools: string[]): ToolCall[] {
  if (!tools.includes('get_nowcast') || !named.length) return [];
  const rows = (Object.values(listResult).find((v) => Array.isArray(v) && v.some((x) => x && typeof x === 'object')) || []) as Array<Record<string, unknown>>;
  const out: ToolCall[] = [];
  for (const row of rows) {
    const id = String(row.model_id ?? row.id ?? '');
    if (!id) continue;
    const text = `${id} ${String(row.target ?? '')} ${String(row.name ?? '')} ${String(row.country ?? '')}`;
    const c = named.find((n) => new RegExp(`\\b${n.iso3}\\b`, 'i').test(text) || text.toLowerCase().includes(n.countryName.toLowerCase()));
    if (c && !out.some((o) => o.args.model_id === id)) out.push({ name: 'get_nowcast', args: { model_id: id }, ref: c.countryName });
  }
  return out;
}

export interface CallResult {
  call: ToolCall;
  ok: boolean;
  data?: Record<string, unknown>;
  cite?: { source: string; tool: string; id: string | null; url: string | null; dataThrough: string | null; label: string };
  reason?: string;
  localOnly?: boolean;
}

const TITLE: Record<string, string> = {
  garch: 'GARCH volatility forecast',
  arima: 'ARIMA forecast of the level',
  describe_series: 'Return statistics',
  option_chain: 'Option chain',
  option_price: 'Option price',
  run_backtest: 'Backtest',
  get_run: 'Saved backtest',
  list_runs: 'Recent backtests',
  correlations: 'Correlations',
  get_nowcast: 'Nowcast',
  list_nowcasts: 'Nowcast models',
  get_forecast: 'Saved forecast',
  get_prices: 'Daily closes',
  get_macro_series: 'Macro series',
};

const LABELS: Record<string, string> = {
  vol_annual_now: 'Volatility now, a year',
  vol_annual_path: 'Volatility at the end of the horizon, a year',
  vol_daily_now: 'Volatility now, a day',
  horizon: 'Horizon (days)',
  points: 'Observations used',
};

/** Keys never shown: ids, hashes, links and the flagged list (compliance asks the app not to print it). */
const SKIP = /^(id|link|cite|flagged|data_hash|hash|seed|run_id|forecast_id|model_id|portfolio_id)$|_id$|hash/i;

const humanise = (k: string) => {
  const s = k.replace(/_/g, ' ').trim();
  return s ? `${s[0]!.toUpperCase()}${s.slice(1)}` : k;
};

/** A number as the reply gave it, rounded to 4 decimals at most. */
export function fmtNumber(v: number): string {
  return Number.isInteger(v) ? String(v) : String(Number(v.toFixed(4)));
}

/** Numbers in a result, with plain labels: top level and one level down, the last point of a *_path list, counts of lists. */
export function resultFigures(data: Record<string, unknown>): Array<{ label: string; value: string }> {
  const out: Array<{ label: string; value: string }> = [];
  const push = (key: string, v: number, parent?: string) => {
    if (out.length >= MAX_FIGURES || !Number.isFinite(v)) return;
    const base = LABELS[key] || humanise(key);
    const label = parent ? `${base} (${humanise(parent).toLowerCase()})` : base;
    const pct = /vol/i.test(key) && /annual|year/i.test(key) && v > 0 && v < 5 ? ` (${fmtNumber(Math.round(v * 1000) / 10)}%)` : '';
    out.push({ label, value: `${fmtNumber(v)}${pct}` });
  };
  const walk = (obj: Record<string, unknown>, parent?: string) => {
    for (const [k, v] of Object.entries(obj)) {
      if (SKIP.test(k)) continue;
      if (typeof v === 'number') push(k, v, parent);
      else if (Array.isArray(v)) {
        if (/path$/i.test(k) && v.length && typeof v[v.length - 1] === 'number') push(k, v[v.length - 1] as number, parent);
        else if (v.some((x) => x && typeof x === 'object')) push(`${k} returned`, v.length, parent);
      } else if (v && typeof v === 'object' && !parent) walk(v as Record<string, unknown>, k);
    }
  };
  walk(data);
  return out;
}

const NO_CALL = /\b(buy|sell|go long|go short)\b/i;

function finding(r: CallResult & { ok: true }): AgentFinding | null {
  const cite = r.cite!;
  const title = r.call.name === 'forecast_series' ? TITLE[String(r.call.args.model)] || 'Forecast' : TITLE[r.call.name] || humanise(r.call.name);
  const figures: AgentFigure[] = resultFigures(r.data!).map((f) => ({
    label: f.label,
    value: f.value,
    source: `${cite.source}, ${cite.tool || r.call.name}${cite.id ? ` ${cite.id}` : ''}, data through ${cite.dataThrough || 'not stated'}. ${cite.label}`,
    tag: 'model' as const,
    ...(cite.url ? { url: cite.url } : {}),
  }));
  if (!figures.length) return null;
  const horizon = typeof r.call.args.horizon === 'number' ? ` over ${r.call.args.horizon} days` : '';
  const reading = `${title}${horizon} from the outside research tools, data through ${cite.dataThrough || 'a date not stated'}. ${cite.label.replace(/[.\s]+$/, '')}.`;
  // Fixed words only; a label that reads as a trade call is never shown.
  if (NO_CALL.test(reading)) return null;
  return { iso3: `quant:${r.call.ref}`, countryName: r.call.ref, reading, figures, weight: 1 };
}

/** The Quant desk's answer from its tool results. */
export function quantAnswer(why: string, results: CallResult[], notes: string[] = []): AgentAnswer {
  const missing: string[] = [];
  const localOnly = results.find((r) => !r.ok && r.localOnly);
  if (localOnly) {
    return {
      id: 'quant',
      name: QUANT_AGENT_NAME,
      why,
      findings: [],
      missing: [`${UNAVAILABLE}: ${localOnly.reason || 'the server lets only local models read results'}`, 'The Quant desk is left out of this answer, as the research tools server lets only an AI model on this computer read its results.'],
    };
  }
  const findings: AgentFinding[] = [];
  for (const r of results) {
    if (!r.ok) {
      const line = `${UNAVAILABLE}: ${r.reason || 'no answer'}`;
      if (!missing.includes(line)) missing.push(line);
      continue;
    }
    const f = finding(r as CallResult & { ok: true });
    if (f) findings.push(f);
    else missing.push(`${r.call.ref}: the ${r.call.name} result held no figures to show.`);
    const flagged = Array.isArray(r.data?.flagged) ? (r.data!.flagged as unknown[]).length : 0;
    if (flagged) missing.push(`The research tools server flagged ${flagged} instrument${flagged === 1 ? '' : 's'} for compliance; ${flagged === 1 ? 'its id is' : 'their ids are'} not shown.`);
  }
  return { id: 'quant', name: QUANT_AGENT_NAME, why, findings, missing: [...missing, ...notes] };
}

/** The answer when the desk could not run at all (server off, unreachable, or the app server failed). */
export function unavailableAnswer(why: string, reason: string): AgentAnswer {
  return { id: 'quant', name: QUANT_AGENT_NAME, why, findings: [], missing: [`${UNAVAILABLE}: ${reason}`] };
}
