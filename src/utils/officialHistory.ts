/**
 * Full official history for each country: every year the World Bank and the IMF World Economic
 * Outlook publish for the figures the app shows. The snapshot keeps only the newest value (that is
 * what every screen displays); this file keeps the whole run so the History tab, charts and
 * downloads work from disk, also offline.
 *
 * Saved per country in data/history/<ISO3>.json by the server (see fetchOfficialHistory in
 * server.ts). Only real observations are kept: a year the source left blank stays out, nothing is
 * filled in or smoothed. IMF years after the newest complete year are IMF projections and say so.
 *
 * Browser-safe (no fs): parsing and the series shape only.
 */
import type { Series, SeriesMissing, SeriesPoint } from './seriesHistory';

export type OfficialSource = 'wb' | 'imf';

export interface OfficialFigure {
  /** Series id. The first eight match the archive figures (src/utils/seriesHistory.ts ARCHIVE_FIGURES). */
  id: string;
  source: OfficialSource;
  /** World Bank indicator code or IMF DataMapper indicator. */
  code: string;
  label: string;
  unit: string;
  /** Turns the published number into the one the app shows. */
  transform?: (v: number) => number;
  about?: string;
}

/** WGI political stability estimate (-2.5 to +2.5) to the 0-100 rank the snapshot shows. */
export const stabilityPercentile = (v: number) => Number(Math.max(2, Math.min(98, ((v + 2.5) / 5) * 100)).toFixed(1));

export const OFFICIAL_FIGURES: OfficialFigure[] = [
  { id: 'debt_gdp', source: 'imf', code: 'GGXWDG_NGDP', label: 'Government debt', unit: '% of GDP' },
  { id: 'primary_balance', source: 'imf', code: 'GGXONLB_NGDP', label: 'Primary balance', unit: '% of GDP' },
  { id: 'gdp_growth', source: 'imf', code: 'NGDP_RPCH', label: 'Real GDP growth', unit: '%' },
  { id: 'cpi_imf', source: 'imf', code: 'PCPIPCH', label: 'Inflation (IMF WEO)', unit: '%' },
  { id: 'output_gap', source: 'imf', code: 'NGAP_NPGDP', label: 'Output gap', unit: '% of potential GDP' },
  { id: 'reserves_months', source: 'wb', code: 'FI.RES.TOTL.MO', label: 'Reserves', unit: 'months of imports' },
  { id: 'current_account', source: 'wb', code: 'BN.CAB.XOKA.GD.ZS', label: 'Current account', unit: '% of GDP' },
  { id: 'external_debt', source: 'wb', code: 'DT.DOD.DECT.GN.ZS', label: 'External debt', unit: '% of GNI' },
  {
    id: 'stability',
    source: 'wb',
    code: 'PV.EST',
    label: 'Political stability rank',
    unit: 'percentile',
    transform: stabilityPercentile,
    about: 'World Bank WGI estimate (-2.5 to +2.5) shown on a 0-100 scale, as on the country page.',
  },
  { id: 'reserves_usd', source: 'wb', code: 'FI.RES.TOTL.CD', label: 'Total reserves incl. gold', unit: 'USD bn', transform: (v) => Number((v / 1e9).toFixed(2)) },
  { id: 'short_term_debt_reserves', source: 'wb', code: 'DT.DOD.DSTC.IR.ZS', label: 'Short-term external debt', unit: '% of reserves' },
];

export interface OfficialRun {
  /** Oldest first. Dates are years (YYYY). */
  points: SeriesPoint[];
}

export interface OfficialHistoryFile {
  iso3: string;
  /** When the last download finished (ISO). */
  pulledAt: string;
  /** Series id -> observations. */
  series: Record<string, OfficialRun>;
  /** Series id -> why it did not come back this time (a later download tries again). */
  failed?: Record<string, string>;
}

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Years from the World Bank v2 JSON answer ([meta, rows]). Null when the answer is not that shape. */
export function parseWorldBankYears(body: unknown): Array<{ year: string; value: number }> | null {
  if (!Array.isArray(body)) return null;
  const rows = Array.isArray(body[1]) ? body[1] : body.length === 1 ? [] : null;
  if (!rows) return null;
  const out: Array<{ year: string; value: number }> = [];
  for (const r of rows as Array<{ date?: unknown; value?: unknown }>) {
    const year = String(r?.date ?? '');
    if (/^\d{4}$/.test(year) && finite(r?.value)) out.push({ year, value: r.value as number });
  }
  return out.sort((a, b) => (a.year < b.year ? -1 : 1));
}

/** Years from the IMF DataMapper answer ({values: {CODE: {ISO3: {year: value}}}}). */
export function parseImfYears(body: unknown, code: string, iso3: string): Array<{ year: string; value: number }> | null {
  const values = (body as { values?: Record<string, Record<string, Record<string, unknown>>> })?.values;
  if (!values || typeof values !== 'object') return null;
  const run = values[code]?.[iso3];
  if (!run) return [];
  return Object.entries(run)
    .filter(([y, v]) => /^\d{4}$/.test(y) && finite(v))
    .map(([year, value]) => ({ year, value: value as number }))
    .sort((a, b) => (a.year < b.year ? -1 : 1));
}

/** The points saved for one figure: published values after the figure's transform. */
export function officialPoints(fig: OfficialFigure, years: Array<{ year: string; value: number }>): SeriesPoint[] {
  return years.map(({ year, value }) => ({ date: year, value: fig.transform ? fig.transform(value) : Number(value.toFixed(3)) }));
}

/**
 * The IMF projects ahead: years from the current one on are projections in the WEO. Each such point
 * carries the note "IMF projection" so a chart or download never passes it off as an outturn.
 */
export function markImfProjections(points: SeriesPoint[], now = new Date()): SeriesPoint[] {
  const thisYear = now.getUTCFullYear();
  return points.map((p) => (Number(p.date) >= thisYear ? { ...p, note: 'IMF projection' } : p));
}

const SOURCE_NAME: Record<OfficialSource, string> = { wb: 'World Bank Open Data', imf: 'IMF World Economic Outlook' };

/** A saved run as a Series (annual), or Missing with the reason. */
export function officialSeries(file: OfficialHistoryFile | null | undefined, fig: OfficialFigure, now = new Date()): Series | SeriesMissing {
  if (!file) return { id: fig.id, label: fig.label, reason: 'Full history not downloaded yet' };
  const run = file.series?.[fig.id];
  if (!run?.points?.length) {
    const why = file.failed?.[fig.id];
    return { id: fig.id, label: fig.label, reason: why || `${SOURCE_NAME[fig.source]} publishes no figures for this country` };
  }
  const points = fig.source === 'imf' ? markImfProjections(run.points, now) : run.points;
  const projected = points.some((p) => p.note === 'IMF projection');
  return {
    id: fig.id,
    label: fig.label,
    unit: fig.unit,
    freq: 'annual',
    source: `${SOURCE_NAME[fig.source]} (${fig.code})`,
    pulledAt: file.pulledAt,
    points,
    about: [fig.about, projected ? 'Years from this one on are IMF projections, marked as such.' : ''].filter(Boolean).join(' ') || undefined,
  };
}

/** Rough size on disk of a history file, for the offline-data estimate. */
export function historyPointCount(file: OfficialHistoryFile | null | undefined): number {
  return Object.values(file?.series || {}).reduce((n, r) => n + (r.points?.length || 0), 0);
}
