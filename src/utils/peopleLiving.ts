/**
 * People and living standards (data batch G17): poverty at the World Bank's three international
 * lines, remittances received, labour force participation, youth unemployment and the age
 * dependency ratio, all from the World Bank's free World Development Indicators (CC BY 4.0).
 *
 * - Poverty rate (SI.POV.DDAY, SI.POV.LMIC, SI.POV.UMIC): share of people living below the lowest
 *   international poverty line and the two higher lines used for lower-middle and upper-middle
 *   income countries. From household surveys, so only in survey years; the app looks back up to
 *   GINI_LOOKBACK_YEARS, as for the Gini, and shows the survey year. The dollar amount of each line
 *   is read from the World Bank's own indicator name, so it follows the World Bank when it moves
 *   the lines; when the name gives no amount, none is shown.
 * - Remittances received (BX.TRF.PWKR.DT.GD.ZS): money sent home by people working abroad, % of GDP.
 * - Labour force participation (SL.TLF.CACT.ZS) and youth unemployment (SL.UEM.1524.ZS): ILO
 *   modelled estimates, labelled so: the ILO fills years and countries without a survey with a model.
 * - Age dependency ratio (SP.POP.DPND): people under 15 or over 64 per 100 people aged 15 to 64.
 *
 * Only figures a live feed marked are used; nothing built in. Browser-safe: no fs, no network.
 */
import type { OpenDataSnapshot } from '../types/council';
import { GINI_LOOKBACK_YEARS, WELFARE_LABEL, GINI_OLD_YEARS, welfareFromNote, type GiniWelfare, type YearFigure } from './distributionTaxes';

export type PeopleField =
  | 'povertyLowestPct'
  | 'povertyLowerMiddlePct'
  | 'povertyUpperMiddlePct'
  | 'remittancesPctGdp'
  | 'labourParticipationPct'
  | 'youthUnemploymentPct'
  | 'ageDependencyRatio';

export const POVERTY_FIELDS = ['povertyLowestPct', 'povertyLowerMiddlePct', 'povertyUpperMiddlePct'] as const;
export type PovertyField = (typeof POVERTY_FIELDS)[number];

/** The World Bank codes, the snapshot field each fills, and how many yearly rows to ask for. */
export const PEOPLE_CODES: Array<{ code: string; field: PeopleField; perPage: number; survey?: true }> = [
  { code: 'SI.POV.DDAY', field: 'povertyLowestPct', perPage: GINI_LOOKBACK_YEARS + 2, survey: true },
  { code: 'SI.POV.LMIC', field: 'povertyLowerMiddlePct', perPage: GINI_LOOKBACK_YEARS + 2, survey: true },
  { code: 'SI.POV.UMIC', field: 'povertyUpperMiddlePct', perPage: GINI_LOOKBACK_YEARS + 2, survey: true },
  { code: 'BX.TRF.PWKR.DT.GD.ZS', field: 'remittancesPctGdp', perPage: 8 },
  { code: 'SL.TLF.CACT.ZS', field: 'labourParticipationPct', perPage: 8 },
  { code: 'SL.UEM.1524.ZS', field: 'youthUnemploymentPct', perPage: 8 },
  { code: 'SP.POP.DPND', field: 'ageDependencyRatio', perPage: 8 },
];

interface WbRow {
  date?: unknown;
  value?: unknown;
  footnote?: unknown;
  indicator?: { value?: unknown };
}

/** "$3.00 a day, 2021 PPP" from a World Bank indicator name; undefined when the name gives no amount. */
export function povertyLineFromName(name: unknown): string | undefined {
  if (typeof name !== 'string') return undefined;
  const m = /\$\s?(\d+(?:\.\d+)?)\s*a day(?:\s*\((\d{4}) PPP\))?/i.exec(name);
  if (!m) return undefined;
  return `$${Number(m[1]).toFixed(2)} a day${m[2] ? `, ${m[2]} PPP` : ''}`;
}

export interface PeopleRow {
  value: number;
  year: string;
  welfare?: GiniWelfare;
  line?: string;
}

/**
 * The latest usable row of a World Bank reply (rows come newest first). Shares must lie between 0
 * and 100; the dependency ratio between 0 and 200. For a poverty rate, a survey older than
 * GINI_LOOKBACK_YEARS before this year is not used.
 */
export function pickPeopleRow(field: PeopleField, rows: unknown, now: Date = new Date()): PeopleRow | undefined {
  if (!Array.isArray(rows)) return undefined;
  const survey = (POVERTY_FIELDS as readonly string[]).includes(field);
  const max = field === 'ageDependencyRatio' ? 200 : 100;
  const oldest = now.getUTCFullYear() - GINI_LOOKBACK_YEARS;
  for (const r of rows as WbRow[]) {
    const v = r?.value;
    const year = String(r?.date ?? '');
    if (typeof v !== 'number' || !Number.isFinite(v) || !/^\d{4}$/.test(year)) continue;
    if (v < 0 || v > max) continue;
    if (!survey) return { value: v, year };
    if (Number(year) < oldest) return undefined;
    const welfare = welfareFromNote(r.footnote);
    const line = povertyLineFromName(r.indicator?.value);
    return { value: v, year, ...(welfare ? { welfare } : {}), ...(line ? { line } : {}) };
  }
  return undefined;
}

/** The source tag for a field; the year comes first so the year readers find it. */
export function peopleTag(field: PeopleField, row: PeopleRow): string {
  if ((POVERTY_FIELDS as readonly string[]).includes(field)) return `World Bank (household survey), ${row.year}${row.line ? `; line ${row.line}` : ''}`;
  if (field === 'labourParticipationPct' || field === 'youthUnemploymentPct') return `World Bank (ILO modelled estimate), ${row.year}`;
  return `World Bank, ${row.year}`;
}

export interface PovertyFigure extends YearFigure {
  line?: string;
  welfare?: GiniWelfare;
}

export interface PeopleFigures {
  povertyLowestPct?: PovertyFigure;
  povertyLowerMiddlePct?: PovertyFigure;
  povertyUpperMiddlePct?: PovertyFigure;
  remittancesPctGdp?: YearFigure;
  labourParticipationPct?: YearFigure;
  youthUnemploymentPct?: YearFigure;
  ageDependencyRatio?: YearFigure;
}

const yearOf = (tag: string | undefined) => /((?:19|20)\d{2})/.exec(tag || '')?.[1];
const lineOf = (tag: string | undefined) => /; line (.+)$/.exec(tag || '')?.[1];

/** The live figures of a snapshot, each with the year in its source tag; undefined when none is live. */
export function peopleFromSnapshot(snap: OpenDataSnapshot): PeopleFigures | undefined {
  const lf = snap.liveFields || {};
  const wb = (snap.worldBankIndicators || {}) as unknown as Record<string, unknown>;
  const out: PeopleFigures = {};
  for (const { field } of PEOPLE_CODES) {
    const tag = lf[`wb.${field}`];
    const v = wb[field];
    const year = yearOf(tag);
    if (!tag || tag === 'AI estimate' || !year || typeof v !== 'number' || !Number.isFinite(v)) continue;
    if ((POVERTY_FIELDS as readonly string[]).includes(field)) {
      const line = lineOf(tag);
      const welfare = snap.worldBankIndicators?.povertyWelfare;
      out[field as PovertyField] = { value: v, year, ...(line ? { line } : {}), ...(welfare ? { welfare } : {}) };
    } else {
      out[field as Exclude<PeopleField, PovertyField>] = { value: v, year };
    }
  }
  return Object.keys(out).length ? out : undefined;
}

/** "8.5% of people below $3.00 a day (2022 consumption survey)"; adds that the survey is old when it is. */
export function povertyValue(p: PovertyFigure, now: Date = new Date()): string {
  const age = now.getUTCFullYear() - Number(p.year);
  const kind = p.welfare ? WELFARE_LABEL[p.welfare] : 'survey';
  return `${p.value.toFixed(1)}% of people${p.line ? ` below ${p.line}` : ''} (${p.year} ${kind}${age > GINI_OLD_YEARS ? `, ${age} years old` : ''})`;
}

export const POVERTY_LABEL: Record<PovertyField, string> = {
  povertyLowestPct: 'Poverty rate, lowest international line',
  povertyLowerMiddlePct: 'Poverty rate, lower-middle-income line',
  povertyUpperMiddlePct: 'Poverty rate, upper-middle-income line',
};

export const POVERTY_SOURCE = 'World Bank WDI (household surveys, Poverty and Inequality Platform)';
export const PEOPLE_SOURCE = 'World Bank WDI';
export const ILO_MODEL_NOTE = 'ILO modelled estimate: years and countries without a survey are filled by a model';
