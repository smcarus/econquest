/**
 * Monthly activity (data batch G41): industrial production, retail sales and the monthly
 * unemployment rate from official sources, read by the daily run.
 *
 *   - EU members (and Turkey where Eurostat carries it): Eurostat, no key.
 *       industrial production sts_inpr_m (industry excl. construction B-D, volume PRD, seasonally
 *       and calendar adjusted SCA, 2021 = 100); retail trade sts_trtu_m (retail excl. motor
 *       vehicles G47, volume of sales VOL_SLS, SCA, 2021 = 100); unemployment une_rt_m (seasonally
 *       adjusted SA, all ages TOTAL, both sexes T, % of the labour force PC_ACT).
 *   - United States: the Federal Reserve (INDPRO), the Census Bureau (RSAFS, retail and food
 *     services sales, US dollars, not adjusted for prices) and the BLS (UNRATE), read through FRED
 *     (the user's FRED key when set, else FRED's no-key CSV download).
 *   - United Kingdom: the ONS time series K222 (index of production), J5EK (retail sales volume,
 *     Great Britain) and MGSX (unemployment rate, 16 and over, three months to the month).
 *   - Brazil: IBGE figures through the Banco Central do Brasil's SGS: 21859 (industrial
 *     production), 1455 (retail sales volume) and 24369 (PNAD Continua
 *     unemployment rate, three months to the month).
 *
 * The codes follow each source's published layout; none of these hosts answers from this project's
 * cloud session, so `npm run check:data` rows eurostat_activity, us_activity, ons_activity and
 * bcb_activity confirm the live answers. The IMF publishes no free monthly activity series the app
 * could confirm, so other countries read Missing with that reason. Only real observations: a month
 * the source left blank stays out. Browser-safe, pure.
 */
import { EUROSTAT_IP_GEO } from './monthlyActivity';
import { parseBcbSgs, parseEurostatHicp } from './nationalCpi';
import type { Series, SeriesMissing } from './seriesHistory';

export type IndicatorId = 'ip' | 'retail' | 'unemp';
export const INDICATOR_IDS: IndicatorId[] = ['ip', 'retail', 'unemp'];
export type ActivitySource = 'eurostat' | 'us' | 'ons' | 'bcb';

export interface IndicatorSeries {
  /** YYYY-MM, oldest first. */
  points: { period: string; value: number }[];
  source: ActivitySource;
  /** Full source name with the code. */
  long: string;
  unit: string;
  /** False when the source does not state seasonal adjustment: no change on the month is shown. */
  adjusted?: false;
}

export interface MonthlyIndicatorsPull {
  pulledAt: string;
  countries: Record<string, Partial<Record<IndicatorId, IndicatorSeries>>>;
}

/** The latest month of one indicator, carried on the country's snapshot. */
export interface IndicatorReading {
  period: string;
  value: number;
  /** Change on the same month a year earlier, % (indexes) or points (rates). */
  yoy?: number;
  /** Change on the month before, % (indexes only). */
  mom?: number;
  /** The rate a year earlier (rates only). */
  yearAgo?: number;
  source: ActivitySource;
  long: string;
  unit: string;
}

export interface MonthlyActivitySnapshot {
  pulledAt: string;
  ip?: IndicatorReading;
  retail?: IndicatorReading;
  unemp?: IndicatorReading;
}

export const SINCE = '2015-01';

// --- Where each country's figures come from ---

export function activitySourceOf(iso3: string): ActivitySource | null {
  if (iso3 === 'USA') return 'us';
  if (iso3 === 'GBR') return 'ons';
  if (iso3 === 'BRA') return 'bcb';
  if (EUROSTAT_IP_GEO[iso3]) return 'eurostat';
  return null;
}

export const SOURCE_NAME: Record<ActivitySource, string> = {
  eurostat: 'Eurostat',
  us: 'Federal Reserve, Census Bureau and BLS (through FRED)',
  ons: 'Office for National Statistics',
  bcb: 'IBGE (through the Banco Central do Brasil)',
};

// --- Eurostat ---

const EUROSTAT = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data';
const geoQuery = (geos: string[]) => geos.map((g) => `&geo=${encodeURIComponent(g)}`).join('');

export const EUROSTAT_ACTIVITY: Record<IndicatorId, { dataset: string; filter: string; long: string; unit: string }> = {
  ip: { dataset: 'sts_inpr_m', filter: 'indic_bt=PRD&nace_r2=B-D&s_adj=SCA&unit=I21', long: 'Eurostat industrial production index, industry excl. construction, seasonally and calendar adjusted (sts_inpr_m)', unit: 'index, 2021 = 100' },
  retail: { dataset: 'sts_trtu_m', filter: 'indic_bt=VOL_SLS&nace_r2=G47&s_adj=SCA&unit=I21', long: 'Eurostat retail trade volume, excl. motor vehicles, seasonally and calendar adjusted (sts_trtu_m)', unit: 'index, 2021 = 100' },
  unemp: { dataset: 'une_rt_m', filter: 's_adj=SA&age=TOTAL&sex=T&unit=PC_ACT', long: 'Eurostat unemployment rate, seasonally adjusted, % of the labour force (une_rt_m)', unit: '% of the labour force' },
};

export function eurostatActivityUrl(id: IndicatorId, geos: string[], since = SINCE): string {
  const d = EUROSTAT_ACTIVITY[id];
  return `${EUROSTAT}/${d.dataset}?format=JSON&lang=EN&${d.filter}${geoQuery(geos)}&sinceTimePeriod=${since}`;
}

/** One Eurostat answer -> one series per ISO3 asked for. */
export function parseEurostatActivity(id: IndicatorId, json: unknown, iso3s: string[]): Record<string, IndicatorSeries> {
  const byGeo = parseEurostatHicp(json);
  const out: Record<string, IndicatorSeries> = {};
  for (const iso3 of iso3s) {
    const pts = byGeo[EUROSTAT_IP_GEO[iso3]];
    if (pts?.length) out[iso3] = { points: pts, source: 'eurostat', long: EUROSTAT_ACTIVITY[id].long, unit: EUROSTAT_ACTIVITY[id].unit };
  }
  return out;
}

// --- United States (FRED) ---

export const US_ACTIVITY: Record<IndicatorId, { id: string; long: string; unit: string }> = {
  ip: { id: 'INDPRO', long: 'Federal Reserve industrial production index, seasonally adjusted (G.17, FRED INDPRO)', unit: 'index, 2017 = 100' },
  retail: { id: 'RSAFS', long: 'Census Bureau advance retail and food services sales, seasonally adjusted, US dollars, not adjusted for prices (FRED RSAFS)', unit: 'US$ m' },
  unemp: { id: 'UNRATE', long: 'BLS unemployment rate, seasonally adjusted (FRED UNRATE)', unit: '% of the labour force' },
};

/** FRED observations (YYYY-MM-DD) -> monthly points. */
export function fredToSeries(id: IndicatorId, obs: Array<{ date: string; value: number }> | null | undefined): IndicatorSeries | null {
  const points = (obs || []).filter((o) => /^\d{4}-\d{2}-01$/.test(o.date) && Number.isFinite(o.value)).map((o) => ({ period: o.date.slice(0, 7), value: o.value }));
  return points.length ? { points, source: 'us', long: US_ACTIVITY[id].long, unit: US_ACTIVITY[id].unit } : null;
}

// --- United Kingdom (ONS) ---

export const ONS_ACTIVITY: Record<IndicatorId, { path: string; long: string; unit: string }> = {
  ip: { path: '/economy/economicoutputandproductivity/output/timeseries/k222/diop', long: 'ONS index of production, seasonally adjusted (K222)', unit: 'index, 2022 = 100' },
  retail: { path: '/businessindustryandtrade/retailindustry/timeseries/j5ek/drsi', long: 'ONS retail sales volume, Great Britain, seasonally adjusted (J5EK)', unit: 'index, 2022 = 100' },
  unemp: { path: '/employmentandlabourmarket/peoplenotinwork/unemployment/timeseries/mgsx/lms', long: 'ONS unemployment rate, aged 16 and over, seasonally adjusted, three months to the month (MGSX)', unit: '% of the labour force' },
};

export function onsActivityUrl(id: IndicatorId): string {
  return `https://www.ons.gov.uk${ONS_ACTIVITY[id].path}/data`;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** ONS time series JSON ({ months: [{ date: "2026 SEP", value: "101.2" }] }) -> monthly points from SINCE. */
export function parseOnsSeries(id: IndicatorId, json: unknown): IndicatorSeries | null {
  const months = (json as { months?: Array<{ date?: unknown; value?: unknown }> })?.months;
  if (!Array.isArray(months)) return null;
  const points: { period: string; value: number }[] = [];
  for (const m of months) {
    const x = String(m?.date ?? '').trim().toUpperCase().match(/^(\d{4}) ([A-Z]{3})$/);
    const raw = String(m?.value ?? '').trim();
    const v = Number(raw);
    const mi = x ? MONTHS.indexOf(x[2]) : -1;
    if (!x || mi < 0 || raw === '' || !Number.isFinite(v)) continue;
    const period = `${x[1]}-${String(mi + 1).padStart(2, '0')}`;
    if (period >= SINCE) points.push({ period, value: v });
  }
  points.sort((a, b) => a.period.localeCompare(b.period));
  return points.length ? { points, source: 'ons', long: ONS_ACTIVITY[id].long, unit: ONS_ACTIVITY[id].unit } : null;
}

// --- Brazil (IBGE through BCB SGS) ---

export const BCB_ACTIVITY: Record<IndicatorId, { code: number; long: string; unit: string }> = {
  ip: { code: 21859, long: 'IBGE industrial production (PIM-PF), general industry (BCB SGS 21859)', unit: 'index' },
  retail: { code: 1455, long: 'IBGE retail sales volume (PMC), Brazil (BCB SGS 1455)', unit: 'index' },
  unemp: { code: 24369, long: 'IBGE unemployment rate (PNAD Continua), three months to the month (BCB SGS 24369)', unit: '% of the labour force' },
};

export function bcbActivityUrl(id: IndicatorId): string {
  return `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${BCB_ACTIVITY[id].code}/dados?formato=json&dataInicial=${encodeURIComponent('01/01/2015')}`;
}

export function parseBcbActivity(id: IndicatorId, json: unknown): IndicatorSeries | null {
  const points = parseBcbSgs(json);
  // Seasonal adjustment is not stated in the SGS answer, so no change on the month is worked out.
  return points.length ? { points, source: 'bcb', long: BCB_ACTIVITY[id].long, unit: BCB_ACTIVITY[id].unit, adjusted: false } : null;
}

// --- Readings ---

const r1 = (v: number) => Number(v.toFixed(1));

function monthsBack(period: string, n: number): string {
  const [y, m] = period.split('-').map(Number);
  const t = y * 12 + (m - 1) - n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
}

/** The latest month, with the change on a year earlier (and on the month for indexes). */
export function indicatorReading(id: IndicatorId, s: IndicatorSeries | undefined): IndicatorReading | undefined {
  const last = s?.points[s.points.length - 1];
  if (!s || !last) return undefined;
  const at = new Map(s.points.map((p) => [p.period, p.value]));
  const yearAgo = at.get(monthsBack(last.period, 12));
  const monthAgo = at.get(monthsBack(last.period, 1));
  const base = { period: last.period, value: last.value, source: s.source, long: s.long, unit: s.unit };
  if (id === 'unemp') return { ...base, ...(yearAgo !== undefined ? { yearAgo, yoy: r1(last.value - yearAgo) } : {}) };
  return {
    ...base,
    ...(yearAgo ? { yoy: r1((last.value / yearAgo - 1) * 100) } : {}),
    ...(monthAgo && s.adjusted !== false ? { mom: r1((last.value / monthAgo - 1) * 100) } : {}),
  };
}

export function activitySnapshot(pull: MonthlyIndicatorsPull, iso3: string): MonthlyActivitySnapshot {
  const c = pull.countries[iso3] || {};
  const out: MonthlyActivitySnapshot = { pulledAt: pull.pulledAt };
  for (const id of INDICATOR_IDS) {
    const r = indicatorReading(id, c[id]);
    if (r) out[id] = r;
  }
  return out;
}

// --- Words ---

const signed = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}`;
export const monthText = (p: string) => `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(p.slice(5, 7)) - 1]} ${p.slice(0, 4)}`;

/** "+1.2% on a year earlier, -0.3% on the month (Sep 2026)"; for the rate "4.4% (Sep 2026); 4.1% a year earlier". */
export function readingValue(id: IndicatorId, r: IndicatorReading): string {
  if (id === 'unemp') return `${r.value.toFixed(1)}% (${monthText(r.period)})${r.yearAgo !== undefined ? `; ${r.yearAgo.toFixed(1)}% a year earlier` : ''}`;
  const parts = [r.yoy !== undefined ? `${signed(r.yoy)}% on a year earlier` : '', r.mom !== undefined ? `${signed(r.mom)}% on the month` : ''].filter(Boolean);
  return parts.length ? `${parts.join(', ')} (${monthText(r.period)})` : `${r.value.toFixed(1)}, ${r.unit} (${monthText(r.period)})`;
}

export const INDICATOR_LABEL: Record<IndicatorId, string> = {
  ip: 'Industrial production',
  retail: 'Retail sales',
  unemp: 'Unemployment rate, monthly',
};

export const ACTIVITY_SETUP_HELP =
  'Industrial production, retail sales and the monthly unemployment rate come from Eurostat, the US Federal Reserve, Census Bureau and BLS, the UK Office for National Statistics and Brazil\'s IBGE, which the daily run downloads (npm run go -- daily, or Menu > Offline data > Download all country data). They have not been downloaded yet, or the download did not answer.';
export const ACTIVITY_NOT_COVERED_HELP =
  'The app reads monthly industrial production, retail sales and unemployment from Eurostat (EU members and Turkey), the United States, the United Kingdom and Brazil. No free monthly source the app could confirm is connected for this country yet; the IMF publishes no such free monthly series. The yearly IMF unemployment rate above still applies. The app shows Missing rather than an estimate.';
export const ACTIVITY_NOT_IN_ANSWER_HELP =
  'The source was read but gave no figure for this indicator for this country (Eurostat, for example, does not carry every series for every country). The app shows Missing rather than an estimate.';

// --- History & data ---

const SERIES_ID: Record<IndicatorId, string> = { ip: 'industrial_production', retail: 'retail_sales', unemp: 'unemployment_monthly' };
const ABOUT: Record<IndicatorId, string> = {
  ip: 'Output of mines, factories and utilities, as an index; it comes out four to seven weeks after the month and moves with the business cycle.',
  retail: 'What shops sell each month, as an index of volume (the US series is in dollars, not adjusted for prices); a quick read on household spending.',
  unemp: 'Share of the labour force out of work and looking for a job, each month; the yearly IMF figure is the annual average.',
};

/** One monthly series per indicator, or Missing with the reason. */
export function monthlyIndicatorSeries(iso3: string, pull: MonthlyIndicatorsPull | null | undefined): Array<Series | SeriesMissing> {
  const src = activitySourceOf(iso3);
  return INDICATOR_IDS.map((id) => {
    const label = INDICATOR_LABEL[id];
    if (!src) return { id: SERIES_ID[id], label, reason: 'No free monthly source connected for this country yet' };
    if (!pull) return { id: SERIES_ID[id], label, reason: `${SOURCE_NAME[src]} not downloaded yet` };
    const s = pull.countries[iso3]?.[id];
    if (!s?.points.length) return { id: SERIES_ID[id], label, reason: `${SOURCE_NAME[src]} gave no ${label.toLowerCase()} for this country` };
    return { id: SERIES_ID[id], label, unit: s.unit, freq: 'monthly' as const, source: s.long, pulledAt: pull.pulledAt, points: s.points.map((p) => ({ date: p.period, value: p.value })), about: ABOUT[id] };
  });
}
