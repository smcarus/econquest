/**
 * Country-average weather since 1901 (W2, Sam 2026-11-14, after W1's NASA POWER point at the capital).
 *
 * Source: World Bank Climate Change Knowledge Portal (CCKP), observed climate from CRU TS (Climatic
 * Research Unit, University of East Anglia), 0.5-degree grid averaged over each country by the World
 * Bank. Licence: Creative Commons Attribution 4.0 (World Bank data catalog, dataset 0040276; licence
 * row wb_cckp). Free API, no key:
 * `https://cckpapi.worldbank.org/cckp/v1/cru-x0.5_timeseries_tas,pr_timeseries_monthly_<period>_mean
 * _historical_cru_ts<version>_mean/<ISO3>?_format=json` answers
 * { metadata: { status }, data: { tas: { KEN: { "1901-01": 19.2, ... } }, pr: { KEN: {...} } } }.
 * Temperature in °C (monthly mean), rainfall in mm (month total). A fill of about 1e20 marks a missing
 * value. An unknown version answers status success with empty data, so the app tries the newest CRU
 * version first and steps back (4.10 to 2025, 4.09 to 2024, 4.08 to 2023, 4.07 to 2022). Layout taken
 * from published code that calls the API (the portal could not be reached from the build machine on
 * 2026-11-14); `npm run check:data` row wb_cckp confirms it live.
 *
 * The normal and anomaly rules are the same as W1 (src/utils/weatherPower.ts): each calendar month
 * against its 1991-2020 average in the same series, with 25 of the 30 years needed.
 *
 * Browser-safe, pure.
 */
import type { Series, SeriesMissing, SeriesPoint } from './seriesHistory';
import { monthlyNormals, NORMAL_FROM, NORMAL_MIN_YEARS, NORMAL_TO } from './weatherPower';

export const CCKP_SOURCE = 'World Bank Climate Change Knowledge Portal, CRU TS country average, monthly';

/** CRU TS versions on the portal, newest first, with the period each covers. */
export const CRU_VERSIONS: Array<{ version: string; period: string }> = [
  { version: '4.10', period: '1901-2025' },
  { version: '4.09', period: '1901-2024' },
  { version: '4.08', period: '1901-2023' },
  { version: '4.07', period: '1901-2022' },
];

export function cckpUrl(iso3: string, v: { version: string; period: string }): string {
  return `https://cckpapi.worldbank.org/cckp/v1/cru-x0.5_timeseries_tas,pr_timeseries_monthly_${v.period}_mean_historical_cru_ts${v.version}_mean/${iso3.toUpperCase()}?_format=json`;
}
export const CCKP_SAMPLE_URL = cckpUrl('KEN', CRU_VERSIONS[CRU_VERSIONS.length - 1]);

export interface CountryWeatherPull {
  iso3: string;
  pulledAt: string;
  /** CRU TS version the figures come from, for example "4.10". */
  version: string;
  /** Country-average temperature, °C, by YYYY-MM. */
  temp: Record<string, number>;
  /** Country-average rainfall, month total in mm, by YYYY-MM. */
  rain: Record<string, number>;
}

function readMonths(obj: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!obj || typeof obj !== 'object') return out;
  for (const [k, raw] of Object.entries(obj as Record<string, unknown>)) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(k)) continue;
    const v = Number(raw);
    if (raw === null || !Number.isFinite(v) || Math.abs(v) >= 1e15) continue;
    out[k] = Math.round(v * 100) / 100;
  }
  return out;
}

/**
 * Temperature and rainfall for one country from one answer. Null when the answer is not in the CCKP
 * layout; empty records when the portal has no series for that version (it answers success, data []).
 */
export function parseCckp(json: unknown, iso3: string): { temp: Record<string, number>; rain: Record<string, number> } | null {
  const j = json as { metadata?: { status?: string }; data?: unknown };
  if (!j || typeof j !== 'object' || !('data' in j)) return null;
  if (j.metadata?.status && j.metadata.status !== 'success') return null;
  const data = j.data as Record<string, Record<string, unknown>> | unknown[];
  if (Array.isArray(data)) return { temp: {}, rain: {} };
  if (!data || typeof data !== 'object') return null;
  const code = iso3.toUpperCase();
  // Two variables asked for: data -> variable -> ISO3; one variable: data -> ISO3.
  const pick = (v: string) => readMonths((data as Record<string, Record<string, unknown>>)[v]?.[code]);
  if ('tas' in data || 'pr' in data) return { temp: pick('tas'), rain: pick('pr') };
  return { temp: readMonths((data as Record<string, unknown>)[code]), rain: {} };
}

const r2 = (v: number) => Math.round(v * 100) / 100;

export const COUNTRY_WEATHER_ABOUT = {
  temp: 'Average air temperature over the whole country for the month, from weather station records on a 0.5-degree grid (CRU TS), averaged over the country by the World Bank. Published once a year, so the latest months come later than the capital series.',
  tempAnom: 'How much warmer (above 0) or colder (below 0) the month was across the country than the same calendar month averaged over 1991-2020. Months need 25 of those 30 years for an average.',
  rain: 'Total rainfall in the month averaged over the whole country, from rain gauge records on a 0.5-degree grid (CRU TS), averaged by the World Bank. Where gauges are few, the grid is filled from nearby stations, so remote areas carry more error.',
  rainPct: 'Country rainfall in the month as a % of the same calendar month averaged over 1991-2020: 100 is a normal month, 50 half the usual rain, 200 twice. Months need 25 of those 30 years for an average.',
};

/** Country-average temperature, its anomaly, rainfall and rainfall as % of normal. */
export function countryWeatherSeries(pull: CountryWeatherPull | null | undefined, missingReason?: string): Array<Series | SeriesMissing> {
  const ids = {
    temp: { id: 'country_temp', label: 'Temperature, country average' },
    tempAnom: { id: 'country_temp_anom', label: 'Temperature, country average against 1991-2020' },
    rain: { id: 'country_rain', label: 'Rainfall, country average' },
    rainPct: { id: 'country_rain_pct', label: 'Rainfall, country average, % of 1991-2020' },
  };
  if (!pull) return Object.values(ids).map((x) => ({ ...x, reason: missingReason || 'The World Bank climate portal has not answered yet' }));
  const source = `${CCKP_SOURCE}, CRU TS ${pull.version}`;
  const base = { freq: 'monthly' as const, source, pulledAt: pull.pulledAt };
  const keys = (o: Record<string, number>) => Object.keys(o).sort();
  const tNorm = monthlyNormals(pull.temp);
  const rNorm = monthlyNormals(pull.rain);
  const tPts: SeriesPoint[] = keys(pull.temp).map((ym) => ({ date: ym, value: pull.temp[ym] }));
  const rPts: SeriesPoint[] = keys(pull.rain).map((ym) => ({ date: ym, value: pull.rain[ym] }));
  const tAnom: SeriesPoint[] = keys(pull.temp).filter((ym) => tNorm[ym.slice(5, 7)] !== undefined).map((ym) => ({ date: ym, value: r2(pull.temp[ym] - tNorm[ym.slice(5, 7)]) }));
  const rPct: SeriesPoint[] = keys(pull.rain)
    .filter((ym) => (rNorm[ym.slice(5, 7)] ?? 0) > 0)
    .map((ym) => ({ date: ym, value: Math.round((pull.rain[ym] / rNorm[ym.slice(5, 7)]) * 1000) / 10 }));
  const noNormal = `Fewer than ${NORMAL_MIN_YEARS} of the ${NORMAL_TO - NORMAL_FROM + 1} years ${NORMAL_FROM}-${NORMAL_TO} in the World Bank series, so there is no average to compare with`;
  const noTemp = 'The World Bank climate portal has no temperature series for this country';
  const noRain = 'The World Bank climate portal has no rainfall series for this country';
  return [
    tPts.length ? { ...ids.temp, ...base, unit: '°C', points: tPts, about: COUNTRY_WEATHER_ABOUT.temp } : { ...ids.temp, reason: noTemp },
    tAnom.length ? { ...ids.tempAnom, ...base, unit: '°C', points: tAnom, about: COUNTRY_WEATHER_ABOUT.tempAnom } : { ...ids.tempAnom, reason: tPts.length ? noNormal : noTemp },
    rPts.length ? { ...ids.rain, ...base, unit: 'mm', points: rPts, about: COUNTRY_WEATHER_ABOUT.rain } : { ...ids.rain, reason: noRain },
    rPct.length ? { ...ids.rainPct, ...base, unit: '% of normal', points: rPct, about: COUNTRY_WEATHER_ABOUT.rainPct } : { ...ids.rainPct, reason: rPts.length ? noNormal : noRain },
  ];
}
