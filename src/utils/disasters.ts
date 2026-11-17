/**
 * Natural disasters (parked idea PA6, pulled forward by Sam on 13 November 2026): how often floods,
 * storms, droughts, earthquakes and other natural hazards have hit a country since 2000, how many
 * people died or were affected, and how large the recorded damage was against the economy.
 *
 * - Events: the EM-DAT public table (CRED, UCLouvain), read only from the .xlsx the user downloads
 *   with their own EM-DAT account and saves in data/local/emdat/ (utils/disasterStore.ts). EM-DAT's
 *   terms forbid passing the database on, so the app ships none of it and fetches none of it.
 * - Natural hazards only (Disaster Group "Natural"); technological disasters are left out. From 2000:
 *   EM-DAT says data before 2000 are of lesser quality.
 * - EM-DAT lists an event only when it meets one of its entry criteria (10 or more deaths, 100 or
 *   more people affected, a state of emergency or a call for international help), so smaller events
 *   are not counted. Deaths, people affected and damage are summed over the events that report them;
 *   many events report no damage figure, and the count of those that do is shown.
 * - Damage against GDP: EM-DAT total damage in US dollars of the year (not adjusted), over IMF WEO GDP
 *   in US dollars for the same year. People affected per year against World Bank population.
 *
 * Only figures in the user's file and the saved series; gaps say Missing with the reason. Pure.
 */
import type { YearValue } from './fiscalRules';

export const DISASTER_IDS = ['gdp_usd', 'population'] as const;
export type DisasterId = (typeof DISASTER_IDS)[number];

export const EMDAT_URL = 'https://public.emdat.be';
export const EMDAT_FROM = 2000;

export const EMDAT_SETUP_HELP = `Disaster events come from EM-DAT, the international disaster database of CRED at UCLouvain. Its terms do not allow the data to be passed on, so the app ships none of it and downloads none of it. To add it: create an EM-DAT account at ${EMDAT_URL} (free for non-commercial use by universities, non-profit research bodies, public bodies and the media; other users need a paid licence from CRED), download the public table as .xlsx, and put the file in data/local/emdat/. The app reads it on this computer; nothing is sent anywhere.`;
export const EMDAT_NO_FILE = 'No EM-DAT file in data/local/emdat/ (its terms do not allow the app to ship it)';
export const EMDAT_NO_COUNTRY = 'The EM-DAT file lists no natural disaster for this country';
export const EMDAT_NONE_SINCE = 'The EM-DAT file lists no natural disaster for this country since 2000';

export const DISASTER_SOURCES = 'EM-DAT, CRED / UCLouvain, Brussels, Belgium, www.emdat.be (from your file); IMF World Economic Outlook for GDP in US dollars; World Bank World Development Indicators for population, CC BY 4.0';

export const DISASTER_METHOD =
  'Natural disasters in the EM-DAT public table from 2000 to the latest year in the file, counted by type; deaths, people affected (injured, affected and homeless) and damage summed over the events that report them. Damage as % of GDP: damage in US dollars of the year over IMF GDP in US dollars that year. Only events that meet EM-DAT\'s entry criteria are listed. A description, not a forecast.';

export interface DisasterEvent {
  id: string;
  type: string;
  subtype?: string;
  name?: string;
  year: number;
  month?: number;
  deaths?: number;
  affected?: number;
  /** Total damage, US$ bn of the year. */
  damage?: number;
  /** Total damage adjusted by EM-DAT to today's prices, US$ bn. */
  damageAdj?: number;
}

export interface EmdatTable {
  file: string;
  /** Natural disasters by ISO3. */
  countries: Map<string, DisasterEvent[]>;
  latestYear: number;
  /** Rows left out because their Disaster Group is not Natural. */
  leftOut: number;
}

const norm = (s: string) =>
  s
    .replace(/^﻿/, '')
    .replace(/[‘’`]/g, "'")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const num = (raw: string | undefined) => {
  if (raw === undefined || String(raw).trim() === '') return undefined;
  const v = Number(String(raw).replace(/,/g, ''));
  return Number.isFinite(v) ? v : undefined;
};

/** The EM-DAT public table, from the rows of its worksheet (header within the first 10 rows). */
export function emdatTable(rowsIn: Iterable<string[]>, file: string): EmdatTable | { reason: string } {
  const rows = Array.isArray(rowsIn) ? (rowsIn as string[][]) : [...rowsIn];
  const hi = rows.slice(0, 10).findIndex((r) => r.some((c) => norm(c || '') === 'disno.'));
  const head = hi >= 0 ? rows[hi].map((h) => norm(h || '')) : [];
  const col = (...names: string[]) => head.findIndex((h) => names.includes(h));
  const cId = col('disno.');
  const cIso = col('iso');
  const cGroup = col('disaster group');
  const cType = col('disaster type');
  const cSub = col('disaster subtype');
  const cName = col('event name');
  const cYear = col('start year');
  const cMonth = col('start month');
  const cDeaths = col('total deaths');
  const cAff = col('total affected');
  const cDmg = col("total damage ('000 us$)");
  const cDmgAdj = col("total damage, adjusted ('000 us$)");
  if (cId < 0 || cIso < 0 || cType < 0 || cYear < 0) {
    return { reason: 'not the EM-DAT public table (needs DisNo., ISO, Disaster Type and Start Year columns)' };
  }
  const countries = new Map<string, DisasterEvent[]>();
  let latestYear = 0;
  let leftOut = 0;
  for (const r of rows.slice(hi + 1)) {
    const iso = (r[cIso] || '').trim().toUpperCase();
    const year = num(r[cYear]);
    const type = (r[cType] || '').trim();
    if (!/^[A-Z]{3}$/.test(iso) || year === undefined || !type) continue;
    if (cGroup >= 0 && norm(r[cGroup] || '') !== 'natural') {
      leftOut++;
      continue;
    }
    const at = (c: number) => (c >= 0 ? num(r[c]) : undefined);
    const deaths = at(cDeaths);
    const affected = at(cAff);
    const dmg = at(cDmg);
    const dmgAdj = at(cDmgAdj);
    const month = at(cMonth);
    const sub = cSub >= 0 ? (r[cSub] || '').trim() : '';
    const name = cName >= 0 ? (r[cName] || '').trim() : '';
    const e: DisasterEvent = {
      id: (r[cId] || '').trim(),
      type,
      year,
      ...(sub && sub !== type ? { subtype: sub } : {}),
      ...(name ? { name } : {}),
      ...(month !== undefined && month >= 1 && month <= 12 ? { month } : {}),
      ...(deaths !== undefined ? { deaths } : {}),
      ...(affected !== undefined ? { affected } : {}),
      ...(dmg !== undefined ? { damage: dmg / 1e6 } : {}),
      ...(dmgAdj !== undefined ? { damageAdj: dmgAdj / 1e6 } : {}),
    };
    const list = countries.get(iso) ?? [];
    list.push(e);
    countries.set(iso, list);
    if (year > latestYear) latestYear = year;
  }
  if (!countries.size) return { reason: 'no natural disaster rows for any country' };
  return { file, countries, latestYear, leftOut };
}

export interface DisasterTotals {
  events: number;
  deaths: number;
  affected: number;
  /** Adjusted damage, US$ bn, over the events that report it. */
  damageAdj: number;
  withDamage: number;
}

export interface DisasterView {
  file?: string;
  missing?: string;
  /** First and last year counted. */
  from?: number;
  to?: number;
  totals?: DisasterTotals;
  /** Yearly averages over the years counted. */
  perYear?: { events: number; deaths: number; affected: number; affectedPctPop?: number; popYear?: number };
  byType: Array<{ type: string } & DisasterTotals>;
  /** The last 10 years in the file, oldest first. */
  years: Array<{ year: number; events: number; deaths: number; affected: number; damage?: number; damagePctGdp?: number }>;
  /** Up to 5 events with the most people affected (then deaths). */
  largest: Array<DisasterEvent & { damagePctGdp?: number }>;
  /** "EM-DAT data, YEAR, www.emdat.be", as EM-DAT asks every user to cite it. */
  citation?: string;
  sources: string;
  method: string;
}

const r1 = (v: number) => Math.round(v * 10) / 10;
const r2 = (v: number) => Math.round(v * 100) / 100;
const r3 = (v: number) => Math.round(v * 1000) / 1000;

const byYear = (pts: YearValue[] | undefined) => new Map((pts ?? []).filter((p) => Number.isFinite(p.value)).map((p) => [p.year, p.value]));

function totals(evs: DisasterEvent[]): DisasterTotals {
  const withDmg = evs.filter((e) => e.damageAdj !== undefined);
  return {
    events: evs.length,
    deaths: evs.reduce((a, e) => a + (e.deaths ?? 0), 0),
    affected: evs.reduce((a, e) => a + (e.affected ?? 0), 0),
    damageAdj: r3(withDmg.reduce((a, e) => a + e.damageAdj!, 0)),
    withDamage: withDmg.length,
  };
}

export interface DisasterInput {
  iso3: string;
  emdat: { table: EmdatTable | null; reason?: string; downloadYear?: number };
  series: Partial<Record<DisasterId, YearValue[]>>;
}

export function disasterView(inp: DisasterInput): DisasterView {
  const out: DisasterView = { byType: [], years: [], largest: [], sources: DISASTER_SOURCES, method: DISASTER_METHOD };
  const t = inp.emdat.table;
  if (!t) {
    out.missing = inp.emdat.reason || EMDAT_NO_FILE;
    return out;
  }
  out.file = t.file;
  out.citation = `EM-DAT data, ${inp.emdat.downloadYear ?? t.latestYear}, www.emdat.be`;
  const all = t.countries.get(inp.iso3);
  if (!all) {
    out.missing = EMDAT_NO_COUNTRY;
    return out;
  }
  const evs = all.filter((e) => e.year >= EMDAT_FROM);
  if (!evs.length) {
    out.missing = EMDAT_NONE_SINCE;
    return out;
  }
  const to = t.latestYear;
  out.from = EMDAT_FROM;
  out.to = to;
  out.totals = totals(evs);
  const span = to - EMDAT_FROM + 1;
  const gdp = byYear(inp.series.gdp_usd);
  const pop = byYear(inp.series.population);
  const popYears = [...pop.keys()].filter((y) => y <= to).sort((a, b) => b - a);
  const affPerYear = out.totals.affected / span;
  out.perYear = {
    events: r1(evs.length / span),
    deaths: Math.round(out.totals.deaths / span),
    affected: Math.round(affPerYear),
    ...(popYears.length && pop.get(popYears[0])! > 0 ? { affectedPctPop: r2((affPerYear / (pop.get(popYears[0])! * 1e6)) * 100), popYear: popYears[0] } : {}),
  };

  const types = new Map<string, DisasterEvent[]>();
  for (const e of evs) types.set(e.type, [...(types.get(e.type) ?? []), e]);
  out.byType = [...types.entries()].map(([type, list]) => ({ type, ...totals(list) })).sort((a, b) => b.events - a.events || b.deaths - a.deaths || a.type.localeCompare(b.type));

  const pctGdp = (usdBn: number | undefined, year: number) => {
    const g = gdp.get(year);
    return usdBn !== undefined && g && g > 0 ? r2((usdBn / g) * 100) : undefined;
  };
  for (let y = Math.max(EMDAT_FROM, to - 9); y <= to; y++) {
    const list = evs.filter((e) => e.year === y);
    const withDmg = list.filter((e) => e.damage !== undefined);
    const damage = withDmg.length ? r3(withDmg.reduce((a, e) => a + e.damage!, 0)) : undefined;
    const share = pctGdp(damage, y);
    out.years.push({
      year: y,
      events: list.length,
      deaths: list.reduce((a, e) => a + (e.deaths ?? 0), 0),
      affected: list.reduce((a, e) => a + (e.affected ?? 0), 0),
      ...(damage !== undefined ? { damage } : {}),
      ...(share !== undefined ? { damagePctGdp: share } : {}),
    });
  }

  out.largest = [...evs]
    .filter((e) => (e.affected ?? 0) > 0 || (e.deaths ?? 0) > 0)
    .sort((a, b) => (b.affected ?? 0) - (a.affected ?? 0) || (b.deaths ?? 0) - (a.deaths ?? 0) || a.id.localeCompare(b.id))
    .slice(0, 5)
    .map((e) => {
      const share = pctGdp(e.damage, e.year);
      return { ...e, ...(e.damage !== undefined ? { damage: r3(e.damage) } : {}), ...(e.damageAdj !== undefined ? { damageAdj: r3(e.damageAdj) } : {}), ...(share !== undefined ? { damagePctGdp: share } : {}) };
    });
  return out;
}

const big = (v: number) => (v >= 1e6 ? `${r1(v / 1e6)} million` : v.toLocaleString('en-US'));

/** One English sentence for Explain in chat. */
export function disasterSentence(v: DisasterView, country: string): string {
  if (!v.totals || v.from === undefined) return `${country}: natural disasters Missing (${v.missing}).`;
  const top = v.byType.slice(0, 3).map((b) => `${b.type.toLowerCase()} ${b.events}`);
  let s = `EM-DAT lists ${v.totals.events} natural disasters in ${country} from ${v.from} to ${v.to} (${top.join(', ')}), with ${big(v.totals.deaths)} deaths and ${big(v.totals.affected)} people affected reported.`;
  if (v.perYear?.affectedPctPop !== undefined) s += ` On average ${v.perYear.affectedPctPop}% of the population was affected each year.`;
  const l = v.largest[0];
  if (l) s += ` Largest: ${l.name ? `${l.name}, ` : ''}${l.type.toLowerCase()} in ${l.year}, ${big(l.affected ?? 0)} affected${l.damagePctGdp !== undefined ? `, damage ${l.damagePctGdp}% of GDP` : ''}.`;
  return s;
}
