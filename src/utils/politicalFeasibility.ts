/**
 * Political feasibility (G36), shown beside the options in a Policy review. Three descriptions of how
 * hard a policy may be to pass and keep, each cut at the review's As of day:
 *
 * - Elections: the next and the last election on file in the official calendar (dates typed from
 *   official sources, src/data/officialCalendar.ts). Countries without a row read Missing.
 * - Checks and balances, government fractionalisation, polarisation and years left in the
 *   executive's term, from the Database of Political Institutions (DPI, Inter-American Development
 *   Bank), read only from the file the user saves in data/local/dpi/ (utils/dpiStore.ts). Its reuse
 *   terms are not confirmed, so nothing from it is shipped. Latest year before the As of year.
 * - Unrest: the share of the country's GDELT events that were protests and violence in the latest
 *   complete month before the As of month, against every earlier month saved (GDELT 1.0 files the app
 *   downloads; needs 24 months).
 *
 * No score and no AI: each figure with its source and date, gaps Missing with the reason. Browser-safe,
 * pure.
 */
import type { OfficialCalendarEvent } from '../data/officialCalendar';
import { v1Reading, type V1Reading, type V1Series } from './gdeltDaily';

export const DPI_FIELDS = ['system', 'checks', 'frac', 'polariz', 'yrcurnt'] as const;
export type DpiField = (typeof DPI_FIELDS)[number];

export interface DpiRow {
  year: number;
  /** Numbers as published; a field the file leaves blank or codes -999 is absent. */
  values: Partial<Record<DpiField, number>>;
}

export interface DpiTable {
  countries: Map<string, DpiRow[]>;
  file: string;
  firstYear: number;
  lastYear: number;
}

export const DPI_CITATION = 'Database of Political Institutions 2020 (DPI2020), Inter-American Development Bank (Cruz, Keefer and Scartascini)';
export const DPI_URL = 'https://publications.iadb.org/en/database-political-institutions-2020-dpi2020';
export const DPI_SETUP_HELP = `Checks and balances and government fractionalisation come from the Database of Political Institutions (DPI2020, Inter-American Development Bank; free download, reuse terms not confirmed, so the app ships none of it). Get the data file (.csv or .xlsx) through the IDB publication page, ${DPI_URL} (when checked on 11 November 2026 the page itself had no data link, so it may need a search on the IDB site), and put it in data/local/dpi/. The app reads it on this computer; nothing is sent anywhere.`;

/** What each DPI field means, in plain words (DPI2020 codebook). */
export const DPI_LABEL: Record<DpiField, string> = {
  system: 'Political system (0 = presidential, 1 = assembly-elected president, 2 = parliamentary)',
  checks: 'Checks and balances (number of veto players; 1 = none beyond the executive)',
  frac: 'Fractionalisation of the legislature (chance that two members picked at random are from different parties, 0 to 1)',
  polariz: 'Polarisation (largest left-right gap between the executive and the main parties, 0 to 2)',
  yrcurnt: "Years left in the executive's current term",
};

export const PF_METHOD =
  'Each figure is cut at the As of day: elections on file before and after it; the DPI row for the latest year before the As of year; GDELT months before the As of month, the latest complete month against all earlier saved months (percentile 90 = higher than in 90% of earlier months). A description, not a score or a forecast.';

const norm = (s: unknown) => String(s ?? '').trim();

/** One table (rows of text) into the DPI table, or the reason it did not read. */
export function dpiTable(rows: Iterable<string[]>, file: string): DpiTable | { reason: string } {
  const all = [...rows];
  let at = -1;
  let h: string[] = [];
  for (let i = 0; i < Math.min(all.length, 20); i++) {
    const r = all[i].map((x) => norm(x).toLowerCase());
    if (r.includes('year') && r.includes('ifs') && DPI_FIELDS.some((f) => r.includes(f))) {
      at = i;
      h = r;
      break;
    }
  }
  if (at < 0) return { reason: 'no header row with ifs, year and the DPI columns (checks, frac, ...)' };
  const ifs = h.indexOf('ifs');
  const year = h.indexOf('year');
  const cols = DPI_FIELDS.map((f) => [f, h.indexOf(f)] as const).filter(([, i]) => i >= 0);
  const countries = new Map<string, DpiRow[]>();
  let firstYear = Infinity;
  let lastYear = -Infinity;
  for (const row of all.slice(at + 1)) {
    const code = norm(row[ifs]).toUpperCase();
    const y = Number(norm(row[year]));
    if (!/^[A-Z]{3}$/.test(code) || !Number.isInteger(y)) continue;
    const values: DpiRow['values'] = {};
    for (const [f, i] of cols) {
      const raw = norm(row[i]);
      const v = Number(raw);
      if (raw !== '' && Number.isFinite(v) && v > -900) values[f] = v;
    }
    const list = countries.get(code) ?? [];
    list.push({ year: y, values });
    countries.set(code, list);
    firstYear = Math.min(firstYear, y);
    lastYear = Math.max(lastYear, y);
  }
  if (!countries.size) return { reason: 'no rows with a three-letter ifs code and a year under the header' };
  for (const list of countries.values()) list.sort((a, b) => a.year - b.year);
  return { countries, file, firstYear, lastYear };
}

export interface ElectionLine {
  title: string;
  date: string;
  sourceName: string;
  sourceUrl: string;
  legalDeadline?: boolean;
}

export interface PoliticalFeasibility {
  iso3: string;
  asOf: string;
  nextElection?: ElectionLine & { daysAway: number };
  lastElection?: ElectionLine;
  /** Set when no election on file is after the As of day. */
  electionMissing?: string;
  dpi?: DpiRow & { file: string };
  dpiCode?: 'no_file' | 'no_row' | 'no_year' | 'unreadable';
  dpiMissing?: string;
  unrest?: V1Reading;
  unrestMissing?: string;
  sources: string[];
  method: string;
}

const line = (e: OfficialCalendarEvent): ElectionLine => ({
  title: e.title,
  date: e.date,
  sourceName: e.sourceName,
  sourceUrl: e.sourceUrl,
  ...(e.dateKind === 'legal_deadline' ? { legalDeadline: true } : {}),
});

export function politicalFeasibility(
  iso3: string,
  asOf: string,
  input: { calendar: OfficialCalendarEvent[]; dpi: { table: DpiTable | null; reason?: string }; gdelt: V1Series | null },
): PoliticalFeasibility {
  const day = asOf.slice(0, 10);
  const elections = input.calendar.filter((e) => e.iso3 === iso3 && e.category === 'ELECTION').sort((a, b) => a.date.localeCompare(b.date));
  const next = elections.find((e) => e.date >= day);
  const last = [...elections].reverse().find((e) => e.date < day);
  const daysAway = next ? Math.round((Date.parse(`${next.date}T00:00:00Z`) - Date.parse(`${day}T00:00:00Z`)) / 86400000) : 0;

  const asOfYear = Number(day.slice(0, 4));
  let dpi: PoliticalFeasibility['dpi'];
  let dpiCode: PoliticalFeasibility['dpiCode'];
  let dpiMissing: string | undefined;
  if (!input.dpi.table) {
    dpiCode = input.dpi.reason ? 'unreadable' : 'no_file';
    dpiMissing = input.dpi.reason || 'No Database of Political Institutions file in data/local/dpi/ (its reuse terms are not confirmed, so the app ships none of it)';
  } else {
    const rows = input.dpi.table.countries.get(iso3);
    const row = rows?.filter((r) => r.year < asOfYear && Object.keys(r.values).length).pop();
    if (row) dpi = { ...row, file: input.dpi.table.file };
    else if (!rows) {
      dpiCode = 'no_row';
      dpiMissing = `The DPI file you saved (${input.dpi.table.file}) has no row for this country`;
    } else {
      dpiCode = 'no_year';
      dpiMissing = `The DPI file you saved has no year before ${asOfYear} with figures for this country`;
    }
  }

  const month = day.slice(0, 7);
  const cut = input.gdelt ? { ...input.gdelt, points: input.gdelt.points.filter((p) => p.month < month) } : null;
  const unrest = v1Reading(cut) ?? undefined;
  const unrestMissing = unrest
    ? undefined
    : input.gdelt
      ? `Fewer than 24 complete months of GDELT events before ${month} are saved for this country`
      : 'No GDELT monthly event files are saved for this country (Menu > Offline data)';

  const sources = [
    ...(next || last ? [...new Set([next, last].filter(Boolean).map((e) => `${e!.sourceName} (${e!.sourceUrl})`))] : []),
    ...(dpi ? [`${DPI_CITATION}, from ${dpi.file}`] : []),
    ...(unrest ? ['GDELT 1.0 event files (data.gdeltproject.org), monthly counts by country'] : []),
  ];
  return {
    iso3,
    asOf: day,
    ...(next ? { nextElection: { ...line(next), daysAway } } : { electionMissing: last ? 'No election after the As of day is on file in the official calendar' : 'No election date for this country is on file in the official calendar' }),
    ...(last ? { lastElection: line(last) } : {}),
    ...(dpi ? { dpi } : { dpiCode, dpiMissing }),
    ...(unrest ? { unrest } : { unrestMissing }),
    sources,
    method: PF_METHOD,
  };
}
