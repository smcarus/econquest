/**
 * Scenarios on a portfolio sent in the request (console integration item 9). Two kinds:
 *
 *   shock   moves you choose: emerging-market currencies against the US dollar (%), US rates (bp),
 *           and per-country moves (currency %, USD bond spread bp, local 10Y yield bp) for a fiscal shock.
 *   replay  the moves one past episode actually saw (1997 Asia, 1998 Russia, 2001, 2008, 2013 taper,
 *           COVID 2020, 2022), read from monthly series the daily download saves.
 *
 * Every result is HYPOTHETICAL: a first-order estimate (duration times the yield or spread move,
 * notional times the currency move), not a forecast and not a valuation. Carry, convexity, roll-down
 * and the path inside the window are left out. Replays use monthly averages, so a move is smaller
 * than the worst day inside the window.
 *
 * A move with no source is Missing with the reason, and the position's total is then left blank
 * (the known part is given separately). Nothing is filled in: no proxy country, no estimate.
 *
 * Browser-safe and pure: the server passes the saved series in.
 */
import { holdingGreeks, type Holding } from './holdings';
import { FRED_10Y_SERIES, US_10Y_SERIES } from './officialYields';
import { BCRP_EMBIG_SERIES } from './hardCurrencySpread';

export const SCENARIO_NOTE =
  'Hypothetical. A first-order estimate: duration times the yield or spread move, notional times the currency move. Not a forecast and not a valuation; carry, convexity, roll-down and the path inside the window are left out.';
export const REPLAY_NOTE = 'Replays use monthly averages, so each move is smaller than the worst day inside the window.';

export interface Episode {
  id: string;
  label: string;
  /** Last calm month and the stress month, YYYY-MM; the move is the change between their monthly averages. */
  from: string;
  to: string;
  about: string;
}

/** The windows the spec names. A window is two whole months, so anyone can check the move against the series. */
export const EPISODES: Episode[] = [
  { id: 'asia_1997', label: 'Asian crisis, 1997', from: '1997-06', to: '1998-01', about: 'Thailand floated the baht on 2 July 1997; the fall spread to Indonesia, Malaysia, the Philippines and Korea by January 1998.' },
  { id: 'russia_1998', label: 'Russian default, 1998', from: '1998-07', to: '1998-09', about: 'Russia devalued and stopped paying on its local debt on 17 August 1998; spreads widened across emerging markets.' },
  { id: 'year_2001', label: '2001 (recession, Turkey, Argentina)', from: '2000-12', to: '2001-12', about: 'US recession and rate cuts; Turkey floated the lira in February 2001; Argentina defaulted in December 2001.' },
  { id: 'gfc_2008', label: 'Global financial crisis, Sep-Nov 2008', from: '2008-08', to: '2008-11', about: 'From the month before Lehman Brothers failed (15 September 2008) to November 2008.' },
  { id: 'taper_2013', label: 'Taper tantrum, 2013', from: '2013-04', to: '2013-08', about: 'From before the Federal Reserve chair said bond buying could slow (22 May 2013) to the August sell-off.' },
  { id: 'covid_2020', label: 'COVID, Feb-Mar 2020', from: '2020-01', to: '2020-03', about: 'From January 2020 to the March 2020 sell-off.' },
  { id: 'year_2022', label: '2022 (inflation and rate rises)', from: '2021-12', to: '2022-10', about: 'From December 2021 to October 2022, when US yields and the dollar peaked for the year.' },
];

export const episodeById = (id: string): Episode | undefined => EPISODES.find((e) => e.id === id);

/**
 * IMF World Economic Outlook advanced economies (41). Everything else counts as emerging for the
 * emerging-market currency shock; a per-country move overrides it either way.
 */
export const IMF_ADVANCED = new Set([
  'AND', 'AUS', 'AUT', 'BEL', 'CAN', 'CHE', 'CYP', 'CZE', 'DEU', 'DNK', 'ESP', 'EST', 'FIN', 'FRA', 'GBR', 'GRC', 'HKG', 'HRV', 'IRL', 'ISL', 'ISR',
  'ITA', 'JPN', 'KOR', 'LTU', 'LUX', 'LVA', 'MAC', 'MLT', 'NLD', 'NOR', 'NZL', 'PRI', 'PRT', 'SGP', 'SMR', 'SVK', 'SVN', 'SWE', 'TWN', 'USA',
]);

const EURO = ['AUT', 'BEL', 'CYP', 'DEU', 'ESP', 'EST', 'FIN', 'FRA', 'GRC', 'HRV', 'IRL', 'ITA', 'LTU', 'LUX', 'LVA', 'MLT', 'NLD', 'PRT', 'SVK', 'SVN'];

/**
 * Currency per country, with the Federal Reserve Board H.10 monthly series on FRED where there is
 * one (`inverted`: the series is US dollars per unit, so it is turned round). A currency without
 * an H.10 series uses the ECB reference rates (from 1999) when the ECB publishes it.
 */
export const REPLAY_CURRENCY: Record<string, { ccy: string; h10?: { id: string; inverted?: boolean } }> = {
  AUS: { ccy: 'AUD', h10: { id: 'EXUSAL', inverted: true } },
  BRA: { ccy: 'BRL', h10: { id: 'EXBZUS' } },
  CAN: { ccy: 'CAD', h10: { id: 'EXCAUS' } },
  CHE: { ccy: 'CHF', h10: { id: 'EXSZUS' } },
  CHN: { ccy: 'CNY', h10: { id: 'EXCHUS' } },
  DNK: { ccy: 'DKK', h10: { id: 'EXDNUS' } },
  GBR: { ccy: 'GBP', h10: { id: 'EXUSUK', inverted: true } },
  HKG: { ccy: 'HKD', h10: { id: 'EXHKUS' } },
  IND: { ccy: 'INR', h10: { id: 'EXINUS' } },
  JPN: { ccy: 'JPY', h10: { id: 'EXJPUS' } },
  KOR: { ccy: 'KRW', h10: { id: 'EXKOUS' } },
  LKA: { ccy: 'LKR', h10: { id: 'EXSLUS' } },
  MEX: { ccy: 'MXN', h10: { id: 'EXMXUS' } },
  MYS: { ccy: 'MYR', h10: { id: 'EXMAUS' } },
  NOR: { ccy: 'NOK', h10: { id: 'EXNOUS' } },
  NZL: { ccy: 'NZD', h10: { id: 'EXUSNZ', inverted: true } },
  SGP: { ccy: 'SGD', h10: { id: 'EXSIUS' } },
  SWE: { ccy: 'SEK', h10: { id: 'EXSDUS' } },
  THA: { ccy: 'THB', h10: { id: 'EXTHUS' } },
  TWN: { ccy: 'TWD', h10: { id: 'EXTAUS' } },
  ZAF: { ccy: 'ZAR', h10: { id: 'EXSFUS' } },
  // ECB reference rates only (from 1999).
  BGR: { ccy: 'BGN' },
  CZE: { ccy: 'CZK' },
  HUN: { ccy: 'HUF' },
  IDN: { ccy: 'IDR' },
  ISL: { ccy: 'ISK' },
  ISR: { ccy: 'ILS' },
  PHL: { ccy: 'PHP' },
  POL: { ccy: 'PLN' },
  ROU: { ccy: 'RON' },
  RUS: { ccy: 'RUB' },
  TUR: { ccy: 'TRY' },
  ...Object.fromEntries(EURO.map((c) => [c, { ccy: 'EUR', h10: { id: 'EXUSEU', inverted: true } }])),
};

export const H10_SOURCE = 'Federal Reserve Board H.10 exchange rates (monthly average, via FRED)';
export const OECD_10Y_SOURCE = 'OECD long-term interest rates (monthly average, via FRED)';
export const ECB_MONTHLY_SOURCE = 'ECB euro reference rates (via Frankfurter), monthly average of daily rates worked out by EconQuest';

/** The FRED series the daily download saves for the replays. */
export function replayFredSeries(): string[] {
  const ids = new Set<string>([US_10Y_SERIES, ...Object.values(FRED_10Y_SERIES)]);
  for (const c of Object.values(REPLAY_CURRENCY)) if (c.h10) ids.add(c.h10.id);
  return [...ids].sort();
}

/** One saved monthly series. */
export interface ReplaySeries {
  source: string;
  url: string;
  unit: string;
  /** YYYY-MM to the monthly value. */
  months: Record<string, number>;
  pulledAt: string;
}

/** data/local/replays/replay-series.json */
export interface ReplayFile {
  version: 1;
  savedAt: string;
  /** FRED series id, or "embig:<ISO3>" for the BCRP spreads. */
  series: Record<string, ReplaySeries>;
}

export function readReplayFile(raw: unknown): ReplayFile | null {
  const r = raw as ReplayFile;
  if (!r || r.version !== 1 || !r.series || typeof r.series !== 'object') return null;
  return r;
}

/** Monthly averages of daily points (YYYY-MM-DD). Only months with points are kept. */
export function monthlyAverages(points: Array<{ date: string; value: number }>): Record<string, number> {
  const sum = new Map<string, { s: number; n: number }>();
  for (const p of points) {
    if (!Number.isFinite(p.value)) continue;
    const k = p.date.slice(0, 7);
    const a = sum.get(k) ?? { s: 0, n: 0 };
    a.s += p.value;
    a.n += 1;
    sum.set(k, a);
  }
  const out: Record<string, number> = {};
  for (const [k, a] of sum) out[k] = a.s / a.n;
  return out;
}

/** FRED monthly observations (dated the 1st) to YYYY-MM keys. */
export function fredMonths(obs: Array<{ date: string; value: number }>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const o of obs) if (Number.isFinite(o.value)) out[o.date.slice(0, 7)] = o.value;
  return out;
}

// ---- requests ------------------------------------------------------------------------------

export interface CountryMove {
  fx_pct?: number;
  spread_bp?: number;
  local_yield_bp?: number;
}

export type ScenarioRequest =
  | { kind: 'shock'; em_fx_pct: number; us_rates_bp: number; countries: Record<string, CountryMove>; label?: string }
  | { kind: 'replay'; episode: Episode };

const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() && Number.isFinite(Number(v)) ? Number(v) : undefined);

/** The scenario part of a request body, or what is wrong with it. */
export function parseScenarioRequest(body: unknown, iso3Of: (code: string) => string | null): { request?: ScenarioRequest; errors: string[] } {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const s = (b.scenario && typeof b.scenario === 'object' ? b.scenario : {}) as Record<string, unknown>;
  const errors: string[] = [];
  if (s.kind === 'replay') {
    const ep = episodeById(String(s.episode ?? ''));
    if (!ep) return { errors: [`scenario.episode must be one of ${EPISODES.map((e) => e.id).join(', ')}.`] };
    return { request: { kind: 'replay', episode: ep }, errors };
  }
  if (s.kind !== 'shock') return { errors: ['scenario.kind must be "shock" or "replay".'] };
  const bound = (name: string, v: unknown, lim: number): number => {
    if (v === undefined || v === null || v === '') return 0;
    const n = num(v);
    if (n === undefined || Math.abs(n) > lim) {
      errors.push(`${name} must be a number between -${lim} and ${lim}.`);
      return 0;
    }
    return n;
  };
  const em = bound('scenario.em_fx_pct', s.em_fx_pct, 95);
  const us = bound('scenario.us_rates_bp', s.us_rates_bp, 2000);
  const countries: Record<string, CountryMove> = {};
  const raw = s.countries;
  if (raw !== undefined && (typeof raw !== 'object' || raw === null || Array.isArray(raw))) errors.push('scenario.countries must be an object keyed by country code.');
  else if (raw) {
    for (const [code, m] of Object.entries(raw as Record<string, unknown>)) {
      const iso3 = iso3Of(code);
      if (!iso3) {
        errors.push(`scenario.countries: "${code.slice(0, 12)}" is not an ISO alpha-2 or alpha-3 code.`);
        continue;
      }
      const mm = (m && typeof m === 'object' ? m : {}) as Record<string, unknown>;
      const move: CountryMove = {};
      if (mm.fx_pct !== undefined) move.fx_pct = bound(`scenario.countries.${iso3}.fx_pct`, mm.fx_pct, 95);
      if (mm.spread_bp !== undefined) move.spread_bp = bound(`scenario.countries.${iso3}.spread_bp`, mm.spread_bp, 5000);
      if (mm.local_yield_bp !== undefined) move.local_yield_bp = bound(`scenario.countries.${iso3}.local_yield_bp`, mm.local_yield_bp, 5000);
      countries[iso3] = move;
    }
  }
  if (!errors.length && !em && !us && !Object.values(countries).some((m) => m.fx_pct || m.spread_bp || m.local_yield_bp)) errors.push('The shock moves nothing: give em_fx_pct, us_rates_bp or a per-country move.');
  const label = typeof s.label === 'string' ? s.label.trim().slice(0, 80) : undefined;
  return errors.length ? { errors } : { request: { kind: 'shock', em_fx_pct: em, us_rates_bp: us, countries, ...(label ? { label } : {}) }, errors };
}

// ---- results -------------------------------------------------------------------------------

export type Factor = 'fx' | 'us_rates' | 'spread' | 'local_yield';

export interface Component {
  factor: Factor;
  status: 'Live' | 'Missing';
  /** The move: % for fx (local currency against the dollar; negative = weaker), bp otherwise. */
  move: number | null;
  unit: '%' | 'bp';
  pnl_usd: number | null;
  /** Replay only: the monthly averages the move comes from. */
  from?: { period: string; value: number };
  to?: { period: string; value: number };
  source: string | null;
  shareable: boolean;
  reason?: string;
}

export interface PositionResult {
  id?: string;
  entity_id?: string;
  country: string;
  instrument: string;
  type: string;
  side: string;
  notional_usd_mm: number;
  duration_years: number | null;
  components: Component[];
  /** Sum of the components; null when any is Missing (then see pnl_known_usd). */
  pnl_usd: number | null;
  pnl_known_usd: number;
  complete: boolean;
}

export interface ScenarioResult {
  hypothetical: true;
  note: string;
  scenario: Record<string, unknown>;
  positions: PositionResult[];
  totals: { pnl_known_usd: number; pnl_usd: number | null; positions: number; complete: number; partial: number };
}

/** What a replay reads: monthly series by id, the ECB monthly currency averages, and the share flag. */
export interface ReplayInputs {
  file: ReplayFile | null;
  /** Monthly average of `ccy` per US dollar from the ECB daily rates, YYYY-MM keys. */
  ecbMonthly: (ccy: string) => Record<string, number> | null;
  shareable: (source: string) => boolean;
}

const round = (v: number) => Math.round(v) || 0;
const roundMove = (v: number) => Math.round(v * 100) / 100 || 0;

function missing(factor: Factor, reason: string): Component {
  return { factor, status: 'Missing', move: null, unit: factor === 'fx' ? '%' : 'bp', pnl_usd: null, source: null, shareable: false, reason };
}

/** Which moves a position needs, by type. CDS has no replay source (a bond spread is not CDS). */
function factorsFor(h: Pick<Holding, 'assetClass'>): Factor[] {
  switch (h.assetClass) {
    case 'HC_BOND':
      return ['us_rates', 'spread'];
    case 'LC_BOND':
      return ['local_yield', 'fx'];
    case 'CDS':
      return ['spread'];
    case 'FX':
      return ['fx'];
    default:
      return [];
  }
}

/** P&L of a move: fx as % change of the local currency (negative = weaker), the rest per bp. */
function pnlOf(h: Holding, factor: Factor, move: number): number {
  const g = holdingGreeks(h);
  if (factor === 'fx') return g.fxDeltaPer1Pct * -move; // the delta is per 1% weaker
  if (factor === 'spread') return g.cs01 * move;
  return g.dv01 * move;
}

const needsDuration = (f: Factor) => f !== 'fx';

function shockMove(h: Holding, f: Factor, req: Extract<ScenarioRequest, { kind: 'shock' }>): number {
  const c = req.countries[h.iso3] ?? {};
  if (f === 'fx') return c.fx_pct ?? (IMF_ADVANCED.has(h.iso3) || h.iso3 === 'USA' ? 0 : req.em_fx_pct);
  if (f === 'us_rates') return req.us_rates_bp;
  if (f === 'spread') return c.spread_bp ?? 0;
  return c.local_yield_bp ?? 0;
}

function replayComponent(h: Holding, f: Factor, ep: Episode, inp: ReplayInputs): Component {
  const series = inp.file?.series ?? {};
  const pick = (id: string | undefined): ReplaySeries | undefined => (id ? series[id] : undefined);
  const between = (months: Record<string, number> | undefined) => {
    const a = months?.[ep.from];
    const b = months?.[ep.to];
    return a !== undefined && b !== undefined ? { a, b } : null;
  };
  const noFile = 'The replay series have not been downloaded yet (the daily download saves them; npm run replays:pull)';
  if (f === 'fx') {
    if (h.iso3 === 'USA') return { factor: 'fx', status: 'Live', move: 0, unit: '%', pnl_usd: 0, source: 'The US dollar is the base currency', shareable: true };
    const cur = REPLAY_CURRENCY[h.iso3];
    if (!cur) return missing('fx', `No free monthly exchange rate history for ${h.iso3} is set up (not in the Fed H.10 list or the ECB reference rates)`);
    if (cur.ccy === 'EUR' && ep.from < '1999-01') return missing('fx', 'The euro did not exist before January 1999');
    let rates: { a: number; b: number } | null = null;
    let source = '';
    const h10 = pick(cur.h10?.id);
    if (h10) {
      const got = between(h10.months);
      if (got) {
        rates = cur.h10?.inverted ? { a: 1 / got.a, b: 1 / got.b } : got;
        source = `${H10_SOURCE}, ${cur.h10!.id}`;
      }
    }
    if (!rates) {
      const ecb = inp.ecbMonthly(cur.ccy);
      const got = between(ecb ?? undefined);
      if (got) {
        rates = got;
        source = ECB_MONTHLY_SOURCE;
      }
    }
    if (!rates) {
      if (!inp.file && !inp.ecbMonthly(cur.ccy)) return missing('fx', noFile);
      const early = !cur.h10 && ep.from < '1999-01' ? ' (the ECB reference rates start in January 1999 and the Fed H.10 list has no series for it)' : '';
      return missing('fx', `No saved ${cur.ccy} per US dollar rate for both ${ep.from} and ${ep.to}${early}`);
    }
    // Local currency against the dollar: per-USD going up means the local currency is weaker.
    const move = (rates.a / rates.b - 1) * 100;
    return { factor: 'fx', status: 'Live', move: roundMove(move), unit: '%', pnl_usd: round(pnlOf(h, 'fx', move)), from: { period: ep.from, value: rates.a }, to: { period: ep.to, value: rates.b }, source, shareable: inp.shareable(source) };
  }
  if (f === 'spread' && h.assetClass === 'CDS') return missing('spread', 'No free CDS history; the USD bond spread is a different contract, so it is not used for CDS');
  let id: string | undefined;
  let what = '';
  if (f === 'us_rates') {
    id = US_10Y_SERIES;
    what = 'US 10Y yield';
  } else if (f === 'local_yield') {
    id = FRED_10Y_SERIES[h.iso3];
    what = `${h.iso3} 10Y local yield`;
    if (!id) return missing(f, `No free monthly 10Y yield history for ${h.iso3} (the OECD series on FRED cover OECD members and a few others)`);
  } else {
    if (!BCRP_EMBIG_SERIES[h.iso3]) return missing(f, `No free USD bond spread history for ${h.iso3} (the BCRP publishes the EMBI spread for eight Latin American countries only)`);
    id = `embig:${h.iso3}`;
    what = `${h.iso3} USD bond spread`;
  }
  if (!inp.file) return missing(f, noFile);
  const s = pick(id);
  if (!s) return missing(f, `The ${what} series was not saved by the last download`);
  const got = between(s.months);
  if (!got) {
    const first = Object.keys(s.months).sort()[0];
    return missing(f, `The ${what} series has no value for ${!(ep.from in s.months) ? ep.from : ep.to}${first && first > ep.from ? ` (it starts in ${first})` : ''}`);
  }
  // Yields are in %, spreads in bp.
  const move = f === 'spread' ? got.b - got.a : (got.b - got.a) * 100;
  return { factor: f, status: 'Live', move: roundMove(move), unit: 'bp', pnl_usd: round(pnlOf(h, f, move)), from: { period: ep.from, value: got.a }, to: { period: ep.to, value: got.b }, source: s.source, shareable: inp.shareable(s.source) };
}

/** Runs a scenario on positions. Positions of type OTHER get no components and count as partial. */
export function runScenario(holdings: Holding[], req: ScenarioRequest, inp: ReplayInputs): ScenarioResult {
  const positions = holdings.map((h): PositionResult => {
    const comps: Component[] = [];
    const factors = factorsFor(h);
    if (!factors.length) comps.push(missing('fx', 'No sensitivities for positions of type OTHER'));
    for (const f of factors) {
      if (needsDuration(f) && !(h.durationYears && h.durationYears > 0)) {
        comps.push(missing(f, 'No duration given for this position'));
        continue;
      }
      if (req.kind === 'shock') {
        const move = shockMove(h, f, req);
        const source = 'Your scenario (moves given in the request)';
        comps.push({ factor: f, status: 'Live', move, unit: f === 'fx' ? '%' : 'bp', pnl_usd: round(pnlOf(h, f, move)), source, shareable: true });
      } else comps.push(replayComponent(h, f, req.episode, inp));
    }
    const known = comps.filter((c) => c.status === 'Live').reduce((a, c) => a + (c.pnl_usd ?? 0), 0);
    const complete = comps.every((c) => c.status === 'Live');
    return {
      ...(h.id ? { id: h.id } : {}),
      ...(h.entityId ? { entity_id: h.entityId } : {}),
      country: h.iso3,
      instrument: h.instrument,
      type: h.assetClass.toLowerCase(),
      side: h.side.toLowerCase(),
      notional_usd_mm: h.notionalUsdMm,
      duration_years: h.durationYears ?? null,
      components: comps,
      pnl_usd: complete ? known : null,
      pnl_known_usd: known,
      complete,
    };
  });
  const known = positions.reduce((a, p) => a + p.pnl_known_usd, 0);
  const complete = positions.filter((p) => p.complete).length;
  const scenario: Record<string, unknown> =
    req.kind === 'shock'
      ? { kind: 'shock', ...(req.label ? { label: req.label } : {}), em_fx_pct: req.em_fx_pct, us_rates_bp: req.us_rates_bp, countries: req.countries, em_means: 'Every country outside the IMF World Economic Outlook advanced-economy list; a per-country fx_pct overrides it.' }
      : { kind: 'replay', episode: req.episode.id, label: req.episode.label, from: req.episode.from, to: req.episode.to, about: req.episode.about, note: REPLAY_NOTE };
  return {
    hypothetical: true,
    note: SCENARIO_NOTE,
    scenario,
    positions,
    totals: { pnl_known_usd: known, pnl_usd: complete === positions.length ? known : null, positions: positions.length, complete, partial: positions.length - complete },
  };
}

/** What GET /api/v1/scenarios lists: the episodes and, per episode, which saved series cover it. */
export function replayCoverage(file: ReplayFile | null, ecbFirstMonth: string | null): Array<Episode & { covered: { us_rates: boolean; local_yields: string[]; spreads: string[]; fx: string[] } }> {
  return EPISODES.map((ep) => {
    const has = (id: string) => {
      const m = file?.series[id]?.months;
      return !!m && ep.from in m && ep.to in m;
    };
    const fx = Object.entries(REPLAY_CURRENCY)
      .filter(([, c]) => (c.h10 && has(c.h10.id)) || (!!ecbFirstMonth && ecbFirstMonth <= ep.from && c.ccy !== 'EUR'))
      .map(([iso3]) => iso3);
    return {
      ...ep,
      covered: {
        us_rates: has(US_10Y_SERIES),
        local_yields: Object.entries(FRED_10Y_SERIES).filter(([, id]) => has(id)).map(([iso3]) => iso3),
        spreads: Object.keys(BCRP_EMBIG_SERIES).filter((iso3) => has(`embig:${iso3}`)),
        fx,
      },
    };
  });
}

