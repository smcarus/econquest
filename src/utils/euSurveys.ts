/**
 * EU business and consumer surveys (plan G2, data plan F2): a free stand-in for the paid
 * purchasing managers' indexes (PMIs), for EU members.
 *
 * Source: the European Commission's monthly Business and Consumer Surveys (DG ECFIN), read from
 * Eurostat's free JSON API, which republishes them: dataset ei_bssi_m_r2 ("Economic sentiment and
 * confidence indicators by sector - monthly data") and ei_bsee_m_r2 ("Employment expectations
 * indicators - monthly data"). Both checked on 8 November 2026: dimensions freq, indic, s_adj,
 * (unit,) geo, time; months as YYYY-MM. Eurostat's terms: reuse is free if "the source is
 * indicated as Eurostat" and any change is stated; the Commission's own pages are CC BY 4.0.
 *
 * Read, seasonally adjusted, for each EU member on the country list:
 * - Economic Sentiment Indicator (ESI): an index, long-term average = 100.
 * - Industrial, services and consumer confidence: balances, the share of replies saying "better"
 *   minus the share saying "worse", in percentage points.
 * - Employment Expectations Indicator (EEI): an index, long-term average = 100.
 *
 * These are not PMIs: different questions, different firms, different scale (a PMI's line is 50,
 * these indexes' line is their long-term average of 100). Every label says so.
 */

import { EUROSTAT_GEO, parseEurostatHicp } from './nationalCpi';

export const EU_SURVEY_SOURCE = 'European Commission Business and Consumer Surveys, via Eurostat';
export const EU_SURVEY_HOST = 'ec.europa.eu';
export const NOT_A_PMI = 'EU business survey, not a PMI';

export interface EuSurveyIndicator {
  id: string;
  dataset: 'ei_bssi_m_r2' | 'ei_bsee_m_r2' | 'ei_bsco_m';
  code: string;
  label: string;
  kind: 'index' | 'balance';
}

/**
 * The indicators the app reads; `id` makes the series ids, eu_survey_<id>. `prices` (G32) is the
 * consumer survey question on price trends over the next 12 months (ei_bsco_m, BS-PT-NY, balance):
 * households' inflation expectations as a balance of answers, not a rate.
 */
export const EU_SURVEY_INDICATORS: EuSurveyIndicator[] = [
  { id: 'esi', dataset: 'ei_bssi_m_r2', code: 'BS-ESI-I', label: 'Economic sentiment indicator', kind: 'index' },
  { id: 'industry', dataset: 'ei_bssi_m_r2', code: 'BS-ICI-BAL', label: 'Industrial confidence', kind: 'balance' },
  { id: 'services', dataset: 'ei_bssi_m_r2', code: 'BS-SCI-BAL', label: 'Services confidence', kind: 'balance' },
  { id: 'consumer', dataset: 'ei_bssi_m_r2', code: 'BS-CSMCI-BAL', label: 'Consumer confidence', kind: 'balance' },
  { id: 'employment', dataset: 'ei_bsee_m_r2', code: 'BS-EEI-I', label: 'Employment expectations indicator', kind: 'index' },
  { id: 'prices', dataset: 'ei_bsco_m', code: 'BS-PT-NY', label: "Households' expected price trends over the next 12 months", kind: 'balance' },
];

/** The households' price expectations indicator (G32). */
export const EU_PRICE_EXPECTATIONS = EU_SURVEY_INDICATORS.find((i) => i.id === 'prices')!;

/** First month asked for: twenty years is plenty for a chart and keeps the saved copy small. */
export const EU_SURVEY_SINCE = '2005-01';

/** The countries the surveys cover: EU members, by ISO3, as Eurostat geo codes. */
export function euSurveyGeo(iso3: string): string | undefined {
  return EUROSTAT_GEO[String(iso3 || '').toUpperCase()];
}

/** One request per indicator: that indicator, seasonally adjusted, for the countries asked. */
export function euSurveyUrl(ind: EuSurveyIndicator, geos: string[], since = EU_SURVEY_SINCE): string {
  const g = geos.map((x) => `&geo=${encodeURIComponent(x)}`).join('');
  const unit = ind.dataset === 'ei_bsee_m_r2' ? '&unit=INX' : ind.dataset === 'ei_bsco_m' ? '&unit=BAL' : '';
  return `https://${EU_SURVEY_HOST}/eurostat/api/dissemination/statistics/1.0/data/${ind.dataset}?format=JSON&lang=EN&indic=${encodeURIComponent(ind.code)}&s_adj=SA${unit}${g}&sinceTimePeriod=${since}`;
}

export type EuSurveyPoints = Array<{ period: string; value: number }>;

/** What the daily run saves: by ISO3, by indicator id, monthly points oldest first. */
export interface EuSurveyPull {
  pulledAt: string;
  series: Record<string, Record<string, EuSurveyPoints>>;
}

/**
 * A Eurostat reply for one indicator, as points by ISO3 for the countries asked. Empty when the
 * reply has another shape (more than one indicator, unit or adjustment would be ambiguous).
 */
export function parseEuSurvey(json: unknown, iso3s: string[]): Record<string, EuSurveyPoints> {
  const byGeo = parseEurostatHicp(json);
  const out: Record<string, EuSurveyPoints> = {};
  for (const iso3 of iso3s) {
    const geo = euSurveyGeo(iso3);
    const pts = geo ? byGeo[geo] : undefined;
    if (pts?.length) out[iso3.toUpperCase()] = pts.map((p) => ({ period: p.period, value: Math.round(p.value * 10) / 10 }));
  }
  return out;
}

export interface EuSurveyLatest {
  id: string;
  label: string;
  kind: 'index' | 'balance';
  period: string;
  value: number;
  /** The value three months before, for balances, when published. */
  threeMonthsAgo?: { period: string; value: number };
  /** The value twelve months before, when published. */
  yearAgo?: { period: string; value: number };
  /** Where the latest month sits in the saved history: the share of months at or below it, 0 to 100. */
  percentile?: { pct: number; from: string; months: number };
}

/** Months of history a percentile needs before it is shown. */
export const SURVEY_PERCENTILE_MIN_MONTHS = 60;

/** Share of the months (latest included) whose value is at or below the latest, rounded to a whole percent. */
export function surveyPercentile(pts: EuSurveyPoints): EuSurveyLatest['percentile'] | undefined {
  if (pts.length < SURVEY_PERCENTILE_MIN_MONTHS) return undefined;
  const last = pts[pts.length - 1].value;
  const atOrBelow = pts.filter((p) => p.value <= last).length;
  return { pct: Math.round((atOrBelow / pts.length) * 100), from: pts[0].period, months: pts.length };
}

/** What a watchlist row carries for an EU member: the latest month of each indicator. */
export interface EuSurveySummary {
  pulledAt: string;
  latest: EuSurveyLatest[];
}

function monthsBefore(period: string, n: number): string {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 - n, 1));
  return d.toISOString().slice(0, 7);
}

export function euSurveySummary(iso3: string, pull: EuSurveyPull | null | undefined): EuSurveySummary | undefined {
  const mine = pull?.series?.[String(iso3 || '').toUpperCase()];
  if (!pull || !mine) return undefined;
  const latest: EuSurveyLatest[] = [];
  for (const ind of EU_SURVEY_INDICATORS) {
    const pts = mine[ind.id];
    const last = pts?.[pts.length - 1];
    if (!last) continue;
    const back = ind.kind === 'balance' ? pts.find((p) => p.period === monthsBefore(last.period, 3)) : undefined;
    const year = pts.find((p) => p.period === monthsBefore(last.period, 12));
    const pct = surveyPercentile(pts);
    latest.push({ id: ind.id, label: ind.label, kind: ind.kind, period: last.period, value: last.value, ...(back ? { threeMonthsAgo: back } : {}), ...(year ? { yearAgo: year } : {}), ...(pct ? { percentile: pct } : {}) });
  }
  return latest.length ? { pulledAt: pull.pulledAt, latest } : undefined;
}

const one = (v: number) => (Math.round(v * 10) / 10).toFixed(1);

/** The figure as shown: an index against its long-term average, or a balance in points. */
export function euSurveyValue(a: EuSurveyLatest): string {
  return a.kind === 'index' ? `${one(a.value)} (long-term average = 100)` : `balance ${a.value > 0 ? '+' : ''}${one(a.value)}`;
}

/** A plain reading: indexes against 100, balances against three months earlier. */
export function euSurveyReading(a: EuSurveyLatest): string | undefined {
  if (a.kind === 'index') {
    if (Math.abs(a.value - 100) < 0.5) return 'at its long-term average';
    return a.value > 100 ? 'above its long-term average' : 'below its long-term average';
  }
  if (!a.threeMonthsAgo) return undefined;
  const d = Math.round((a.value - a.threeMonthsAgo.value) * 10) / 10;
  if (Math.abs(d) < 0.5) return 'about unchanged on three months earlier';
  return d > 0 ? `up ${one(d)} points on three months earlier` : `down ${one(Math.abs(d))} points on three months earlier`;
}

type SeriesOut = { id: string; label: string; unit: string; freq: 'monthly'; source: string; pulledAt: string; points: Array<{ date: string; value: number }>; about: string };
type MissingOut = { id: string; label: string; reason: string };

const ABOUT_INDEX = 'Seasonally adjusted, from the European Commission\'s monthly survey of firms and households. 100 is the long-term average: above it, firms and households are more upbeat than usual. Not a PMI: a PMI\'s dividing line is 50.';
const ABOUT_PRICES = "Seasonally adjusted balance from the European Commission's monthly consumer survey: the share of households expecting prices to rise faster or at the same pace over the next 12 months minus the share expecting slower rises, no change or falls, weighted as the Commission publishes it, in percentage points. It shows the direction of households' inflation expectations, not an inflation rate.";
const ABOUT_BALANCE = 'Seasonally adjusted balance from the European Commission\'s monthly survey: the share of replies saying things are getting better minus the share saying worse, in percentage points. Watch the direction more than the level. Not a PMI.';

/** Chartable series for an EU member's page; one Missing line elsewhere, so the gap is explained once. */
export function euSurveySeries(iso3: string, pull: EuSurveyPull | null | undefined): Array<SeriesOut | MissingOut> {
  const code = String(iso3 || '').toUpperCase();
  if (!euSurveyGeo(code))
    return [
      {
        id: 'eu_survey_esi',
        label: `Economic sentiment indicator (${NOT_A_PMI})`,
        reason: 'The EU business and consumer surveys cover EU members only, and no free survey with open terms was found for this country (paid PMIs are not used)',
      },
    ];
  return EU_SURVEY_INDICATORS.map((ind) => {
    const id = `eu_survey_${ind.id}`;
    const label = ind.id === 'prices' ? `${ind.label} (EU consumer survey)` : `${ind.label} (${NOT_A_PMI})`;
    if (!pull) return { id, label, reason: 'Eurostat has not answered for the EU business surveys yet' };
    const pts = pull.series?.[code]?.[ind.id];
    if (!pts?.length) return { id, label, reason: 'Eurostat answered without this survey indicator for this country' };
    return {
      id,
      label,
      unit: ind.kind === 'index' ? 'index, long-term average = 100' : 'balance, % points',
      freq: 'monthly' as const,
      source: `${EU_SURVEY_SOURCE} (${ind.dataset})`,
      pulledAt: pull.pulledAt,
      points: pts.map((p) => ({ date: p.period, value: p.value })),
      about: ind.id === 'prices' ? ABOUT_PRICES : ind.kind === 'index' ? ABOUT_INDEX : ABOUT_BALANCE,
    };
  });
}
