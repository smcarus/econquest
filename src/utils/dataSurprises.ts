/**
 * Data surprises (R9). Each release set against an expectation that was published before it came
 * out, so the surprise is what the market or forecasters did not know:
 *
 * - Brazil, IPCA inflation on the month: the BCB Focus survey median for that month (Olinda OData,
 *   ExpectativaMercadoMensais), the last survey dated on or before the 7th of the following month
 *   (IBGE publishes the IPCA around the 10th). Outturn: BCB SGS series 433.
 * - Euro area, HICP inflation on the year: the ECB Survey of Professional Forecasters mean for one
 *   year ahead (rolling horizon). The Q1 round targets December of the same year, Q2 March of the
 *   next year, Q3 June, Q4 September (the latest month known at the survey, plus 12). Outturn:
 *   Eurostat euro area HICP, annual rate.
 * - United States, CPI on the month: the mean the Kalshi CPI market implied, from snapshots the
 *   daily run saves; only a snapshot from a day before the outturn first appeared counts. Outturn:
 *   BLS CPI-U, seasonally adjusted (CUSR0000SA0), month-on-month % to one decimal.
 * - Any country with GDP nowcasts on the forward record: the app's own nowcast of quarterly GDP
 *   growth, recorded before the quarter was published, against the published figure.
 *
 * Surprise = outturn minus expectation. Each is scaled by the spread (standard deviation) of the
 * same series' earlier surprises, once there are at least MIN_SPREAD_CASES of them; before that the
 * scaled figure reads Missing. A description of what happened, not a trading signal. Pure.
 */
export type SurpriseSource = 'focus' | 'spf' | 'kalshi' | 'nowcast';
export const MIN_SPREAD_CASES = 8;

export interface Expectation {
  /** Period the expectation is for: YYYY-MM (monthly) or YYYY-Qn (quarterly). */
  period: string;
  value: number;
  /** Day it was published or saved (YYYY-MM-DD). */
  at: string;
}

export interface Outturn {
  period: string;
  value: number;
  /** Day the app first saw it (Kalshi rule); optional. */
  firstSeen?: string;
}

export interface Surprise {
  source: SurpriseSource;
  place: string;
  indicator: string;
  unit: string;
  period: string;
  expected: number;
  expectedAt: string;
  actual: number;
  surprise: number;
  /** Surprise / spread of the earlier surprises in the same series. */
  scaled?: number;
  /** Earlier surprises behind the spread. */
  priorCases: number;
}

export const SOURCE_LABEL: Record<SurpriseSource, string> = {
  focus: 'BCB Focus survey median',
  spf: 'ECB Survey of Professional Forecasters mean',
  kalshi: 'Kalshi market-implied mean (saved before the release)',
  nowcast: "The app's own nowcast (forward record)",
};

const r3 = (x: number) => Math.round(x * 1000) / 1000;

/* ---------------------------------------------------------------- sources and parsers */

export const FOCUS_MONTHLY_URL =
  "https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/ExpectativaMercadoMensais?$filter=Indicador%20eq%20'IPCA'&$orderby=Data%20desc&$top=20000&$format=json";
export const sgsUrl = (code: number, from = '01/01/2012') => `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${code}/dados?formato=json&dataInicial=${from}`;
export const BLS_CPI_URL = 'https://api.bls.gov/publicAPI/v1/timeseries/data/CUSR0000SA0';
export const KALSHI_CPI_URL = 'https://api.elections.kalshi.com/trade-api/v2/markets?series_ticker=KXCPI&status=open&limit=200';

const field = (row: Record<string, unknown>, name: string): unknown => {
  const k = Object.keys(row).find((x) => x.toLowerCase() === name.toLowerCase());
  return k === undefined ? undefined : row[k];
};

/** Focus monthly IPCA medians: one per (survey day, month forecast); all-respondents base where the field exists. */
export function parseFocusMonthly(json: unknown): Expectation[] {
  const rows = (json as { value?: unknown })?.value;
  if (!Array.isArray(rows)) return [];
  const recs = rows.filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === 'object');
  const hasBase = recs.some((r) => field(r, 'baseCalculo') !== undefined);
  const out = new Map<string, Expectation>();
  for (const r of recs) {
    const ind = field(r, 'Indicador');
    if (ind !== undefined && String(ind).toUpperCase() !== 'IPCA') continue;
    if (hasBase && Number(field(r, 'baseCalculo')) !== 0) continue;
    const at = String(field(r, 'Data') ?? '').slice(0, 10);
    const ref = /^(\d{2})\/(\d{4})$/.exec(String(field(r, 'DataReferencia') ?? '').trim());
    const v = Number(field(r, 'Mediana'));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(at) || !ref || field(r, 'Mediana') === null || !Number.isFinite(v) || Math.abs(v) > 50) continue;
    const period = `${ref[2]}-${ref[1]}`;
    out.set(`${at}|${period}`, { period, value: v, at });
  }
  return [...out.values()].sort((a, b) => a.at.localeCompare(b.at) || a.period.localeCompare(b.period));
}

/** BCB SGS JSON ([{data: "01/03/2026", valor: "0.42"}]) to monthly points. */
export function parseSgsMonthly(json: unknown): Outturn[] {
  if (!Array.isArray(json)) return [];
  const out: Outturn[] = [];
  for (const r of json as Array<Record<string, unknown>>) {
    const d = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(r?.data ?? ''));
    const v = Number(String(r?.valor ?? '').replace(',', '.'));
    if (d && String(r?.valor ?? '').trim() !== '' && Number.isFinite(v)) out.push({ period: `${d[3]}-${d[2]}`, value: v });
  }
  return out.sort((a, b) => a.period.localeCompare(b.period));
}

/** BLS v1 reply: CPI index by month, then month-on-month % rounded to one decimal (as Kalshi settles). */
export function parseBlsCpi(json: unknown): Outturn[] {
  const data = (json as { Results?: { series?: Array<{ data?: unknown[] }> } })?.Results?.series?.[0]?.data;
  if (!Array.isArray(data)) return [];
  const idx = new Map<string, number>();
  for (const r of data as Array<Record<string, unknown>>) {
    const y = String(r?.year ?? '');
    const p = /^M(0[1-9]|1[0-2])$/.exec(String(r?.period ?? ''));
    const v = Number(r?.value);
    if (/^\d{4}$/.test(y) && p && Number.isFinite(v)) idx.set(`${y}-${p[1]}`, v);
  }
  const months = [...idx.keys()].sort();
  const out: Outturn[] = [];
  for (let i = 1; i < months.length; i++) {
    const [y, m] = months[i].split('-').map(Number);
    const prevKey = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
    const prev = idx.get(prevKey);
    if (prev === undefined) continue;
    out.push({ period: months[i], value: Math.round(((idx.get(months[i])! / prev - 1) * 100) * 10) / 10 });
  }
  return out;
}

/** Keeps the day each outturn was first seen, adding new periods with `today`. */
export function stampFirstSeen(saved: Outturn[] | undefined, fresh: Outturn[], today: string): Outturn[] {
  const seen = new Map((saved ?? []).map((o) => [o.period, o.firstSeen]));
  return fresh.map((o) => ({ ...o, firstSeen: seen.get(o.period) ?? today }));
}

/** "KXCPI-26OCT" -> 2026-10; null when the ticker does not end in a two-digit year and a month. */
export function kalshiCpiPeriod(eventTicker: string): string | null {
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const m = /-(\d{2})([A-Z]{3})$/.exec(String(eventTicker || '').toUpperCase());
  if (!m) return null;
  const mi = months.indexOf(m[2]);
  return mi < 0 ? null : `20${m[1]}-${String(mi + 1).padStart(2, '0')}`;
}

/**
 * Mean CPI change the Kalshi ladder implies for each release: each market pays if CPI comes in above
 * its strike, so its mid price (cents / 100) is the chance of "above"; chances are made non-rising
 * with the strike, the mass between two strikes sits at their midpoint and each tail half a step out.
 */
export function kalshiImpliedMeans(json: unknown): Array<{ period: string; mean: number; strikes: number }> {
  const markets = (json as { markets?: unknown })?.markets;
  if (!Array.isArray(markets)) return [];
  const by = new Map<string, Array<{ k: number; p: number }>>();
  for (const mk of markets as Array<Record<string, unknown>>) {
    const period = kalshiCpiPeriod(String(mk?.event_ticker ?? ''));
    const k = Number(mk?.floor_strike);
    const type = String(mk?.strike_type ?? '');
    const bid = Number(mk?.yes_bid);
    const ask = Number(mk?.yes_ask);
    const last = Number(mk?.last_price);
    const cents = Number.isFinite(bid) && Number.isFinite(ask) && ask > 0 ? (bid + ask) / 2 : last;
    if (!period || !Number.isFinite(k) || (type && type !== 'greater') || !Number.isFinite(cents)) continue;
    (by.get(period) ?? by.set(period, []).get(period)!).push({ k, p: Math.min(1, Math.max(0, cents / 100)) });
  }
  const out: Array<{ period: string; mean: number; strikes: number }> = [];
  for (const [period, ladder] of by) {
    const l = ladder.sort((a, b) => a.k - b.k);
    if (l.length < 3) continue;
    for (let i = 1; i < l.length; i++) l[i].p = Math.min(l[i].p, l[i - 1].p);
    const step = (l[l.length - 1].k - l[0].k) / (l.length - 1);
    let mean = (1 - l[0].p) * (l[0].k - step / 2);
    for (let i = 0; i < l.length - 1; i++) mean += (l[i].p - l[i + 1].p) * ((l[i].k + l[i + 1].k) / 2);
    mean += l[l.length - 1].p * (l[l.length - 1].k + step / 2);
    out.push({ period, mean: r3(mean), strikes: l.length });
  }
  return out.sort((a, b) => a.period.localeCompare(b.period));
}

/* ---------------------------------------------------------------- matching */

const nextMonth = (p: string) => {
  const [y, m] = p.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
};

/** Focus: the last survey for month m dated on or before the 7th of month m+1. */
export function focusMatches(exp: Expectation[], out: Outturn[]): Array<{ period: string; expected: number; expectedAt: string; actual: number }> {
  const res: Array<{ period: string; expected: number; expectedAt: string; actual: number }> = [];
  for (const o of out) {
    const cutoff = `${nextMonth(o.period)}-07`;
    const e = exp.filter((x) => x.period === o.period && x.at <= cutoff).sort((a, b) => a.at.localeCompare(b.at)).pop();
    if (e) res.push({ period: o.period, expected: e.value, expectedAt: e.at, actual: o.value });
  }
  return res;
}

/** SPF round (YYYYQn or YYYY-Qn) to the month its one-year-ahead forecast is for. */
export function spfTargetMonth(round: string): string | null {
  const m = /^(\d{4})-?Q([1-4])$/.exec(round);
  if (!m) return null;
  const y = Number(m[1]);
  const q = Number(m[2]);
  return q === 1 ? `${y}-12` : `${y + 1}-${String((q - 1) * 3).padStart(2, '0')}`;
}

export function spfMatches(spf: Array<{ date: string; value: number }>, out: Outturn[]): Array<{ period: string; expected: number; expectedAt: string; actual: number }> {
  const byMonth = new Map(out.map((o) => [o.period, o.value]));
  const res: Array<{ period: string; expected: number; expectedAt: string; actual: number }> = [];
  for (const s of spf) {
    const t = spfTargetMonth(s.date);
    const a = t ? byMonth.get(t) : undefined;
    if (!t || a === undefined) continue;
    const m = /^(\d{4})-?Q([1-4])$/.exec(s.date)!;
    res.push({ period: t, expected: s.value, expectedAt: `${m[1]}-${String((Number(m[2]) - 1) * 3 + 1).padStart(2, '0')}-01`, actual: a });
  }
  return res.sort((a, b) => a.period.localeCompare(b.period));
}

/** Kalshi: the last snapshot for the month saved before the day the outturn was first seen. */
export function snapshotMatches(snaps: Expectation[], out: Outturn[]): Array<{ period: string; expected: number; expectedAt: string; actual: number }> {
  const res: Array<{ period: string; expected: number; expectedAt: string; actual: number }> = [];
  for (const o of out) {
    if (!o.firstSeen) continue;
    const e = snaps.filter((x) => x.period === o.period && x.at < o.firstSeen!).sort((a, b) => a.at.localeCompare(b.at)).pop();
    if (e) res.push({ period: o.period, expected: e.value, expectedAt: e.at, actual: o.value });
  }
  return res;
}

/** Surprises for one series, oldest first, each scaled by the spread of the earlier ones. */
export function scoreSurprises(
  meta: { source: SurpriseSource; place: string; indicator: string; unit: string },
  matches: Array<{ period: string; expected: number; expectedAt: string; actual: number }>,
): Surprise[] {
  const sorted = [...matches].sort((a, b) => a.period.localeCompare(b.period));
  const prior: number[] = [];
  return sorted.map((m) => {
    const s = r3(m.actual - m.expected);
    let scaled: number | undefined;
    if (prior.length >= MIN_SPREAD_CASES) {
      const mean = prior.reduce((a, b) => a + b, 0) / prior.length;
      const sd = Math.sqrt(prior.reduce((a, b) => a + (b - mean) ** 2, 0) / (prior.length - 1));
      if (sd > 0) scaled = Math.round((s / sd) * 100) / 100;
    }
    const out: Surprise = { ...meta, period: m.period, expected: m.expected, expectedAt: m.expectedAt, actual: m.actual, surprise: s, priorCases: prior.length, ...(scaled !== undefined ? { scaled } : {}) };
    prior.push(s);
    return out;
  });
}

/* ---------------------------------------------------------------- the saved inputs */

export interface SurpriseInputs {
  pulledAt: string;
  focus?: Expectation[];
  ipca?: Outturn[];
  eaHicp?: Outturn[];
  usCpi?: Outturn[];
  kalshi?: Expectation[];
  problems: string[];
}

export interface SurpriseSeries {
  source: SurpriseSource;
  sourceLabel: string;
  place: string;
  indicator: string;
  unit: string;
  surprises: Surprise[];
  reason?: string;
}

export const EURO_AREA_PLACES = ['AUT', 'BEL', 'BGR', 'HRV', 'CYP', 'EST', 'FIN', 'FRA', 'DEU', 'GRC', 'IRL', 'ITA', 'LVA', 'LTU', 'LUX', 'MLT', 'NLD', 'PRT', 'SVK', 'SVN', 'ESP'];

/** The series that apply to one country page. `nowcast` comes from the forward record, matched by the caller. */
export function surpriseSeriesFor(
  iso3: string,
  inp: SurpriseInputs | null,
  spf: Array<{ date: string; value: number }> | null,
  nowcast: Array<{ period: string; expected: number; expectedAt: string; actual: number }> | null,
): SurpriseSeries[] {
  const iso = String(iso3 || '').toUpperCase();
  const out: SurpriseSeries[] = [];
  const add = (source: SurpriseSource, place: string, indicator: string, unit: string, matches: ReturnType<typeof focusMatches> | null, reason: string) => {
    const surprises = matches?.length ? scoreSurprises({ source, place, indicator, unit }, matches) : [];
    out.push({ source, sourceLabel: SOURCE_LABEL[source], place, indicator, unit, surprises, ...(surprises.length ? {} : { reason }) });
  };
  if (iso === 'BRA') add('focus', 'Brazil', 'IPCA inflation, % on the month', 'pp', inp?.focus?.length && inp.ipca?.length ? focusMatches(inp.focus, inp.ipca) : null, !inp ? 'the surprise inputs have not been downloaded yet (daily step world:surprises)' : !inp.focus?.length ? 'the BCB Focus monthly survey has not been read' : !inp.ipca?.length ? 'the IPCA series (BCB SGS 433) has not been read' : 'no month has both a Focus median and an outturn');
  if (EURO_AREA_PLACES.includes(iso)) add('spf', 'Euro area', 'HICP inflation, % on the year', 'pp', spf?.length && inp?.eaHicp?.length ? spfMatches(spf, inp.eaHicp) : null, !spf?.length ? 'the ECB Survey of Professional Forecasters has not been read' : !inp?.eaHicp?.length ? 'the euro area HICP (Eurostat) has not been read' : 'no survey round has reached its target month yet');
  if (iso === 'USA') add('kalshi', 'United States', 'CPI inflation, % on the month', 'pp', inp?.kalshi?.length && inp.usCpi?.length ? snapshotMatches(inp.kalshi, inp.usCpi) : null, !inp?.kalshi?.length ? 'no Kalshi CPI market snapshot saved yet; snapshots start with the first daily run and count only for releases after them' : !inp.usCpi?.length ? 'the BLS CPI series has not been read' : 'no release has come out since the first saved snapshot');
  if (nowcast) add('nowcast', iso, 'GDP growth, % on the quarter', 'pp', nowcast, 'no recorded nowcast for this country has been published yet');
  return out;
}

/** Forward-record nowcast calls matched with published GDP growth (quarters as YYYY-Qn). */
export function nowcastMatches(
  calls: Array<{ test: string; where: string; when: string; forecast?: { model: number }; at: string }>,
  iso3: string,
  qoq: Array<{ period: string; value: number }>,
): Array<{ period: string; expected: number; expectedAt: string; actual: number }> | null {
  const mine = calls.filter((c) => c.test.startsWith('gdp_nowcast') && c.where === iso3 && c.forecast && Number.isFinite(c.forecast.model));
  if (!mine.length) return null;
  const norm = (p: string) => p.replace(/^(\d{4})-?Q([1-4])$/, '$1-Q$2');
  const act = new Map(qoq.map((p) => [norm(p.period), p.value]));
  const res: Array<{ period: string; expected: number; expectedAt: string; actual: number }> = [];
  for (const c of mine) {
    const a = act.get(norm(c.when));
    if (a !== undefined) res.push({ period: norm(c.when), expected: c.forecast!.model, expectedAt: c.at.slice(0, 10), actual: a });
  }
  return res;
}

