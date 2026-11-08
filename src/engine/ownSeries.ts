/**
 * Your own data: a series you load from a CSV file (for example figures from your national
 * statistics office that no connected feed carries). It is kept exactly as you gave it, labelled
 * "Your file" everywhere it shows, and never mixed with feed figures, filled in or smoothed.
 *
 * The file needs two columns, a date and a value, with a header row. Commas, semicolons or tabs
 * separate the columns. With semicolons or tabs, a decimal comma (3,5) is read as 3.5, which is how
 * many countries write numbers. A blank value, "NA", "n/a", "..", "-" or "Missing" means no figure
 * for that date: the row is counted and skipped, never filled.
 *
 * Dates, by frequency:
 *   daily and weekly  YYYY-MM-DD
 *   monthly           YYYY-MM (a full date YYYY-MM-DD is read as its month)
 *   quarterly         YYYY-Qn, YYYYQn or "YYYY Qn"
 *   annual            YYYY
 * Day-first and month-first dates (03/04/2025) are refused because they cannot be told apart.
 *
 * Each saved series keeps the SHA-256 of the file you loaded and of the figures read from it, so
 * the app can tell if the saved copy was changed outside the app.
 *
 * Shared engine: runs on the server, the phone and in tests; reaches files only through Platform.
 */
import type { Platform } from '../platform/types';

export const OWN_SERIES_FORMAT = 1;
export const OWN_SERIES_FOLDER = 'local/own-series';
/** Largest CSV text accepted, in characters. */
export const OWN_CSV_MAX_CHARS = 2_000_000;
/** Most data rows read from one file. */
export const OWN_MAX_ROWS = 50_000;
/** Most series kept at once. */
export const OWN_MAX_SERIES = 200;
export const OWN_LABEL_MAX = 120;
export const OWN_TEXT_MAX = 500;
/** Problems listed by line before the rest are counted. */
const PROBLEMS_SHOWN = 20;

export type OwnFreq = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
export const OWN_FREQS: readonly OwnFreq[] = ['daily', 'weekly', 'monthly', 'quarterly', 'annual'];
/** Country code for a series that is not about one country (a world price, a regional total). */
export const OWN_NO_COUNTRY = 'WLD';

export interface OwnSeriesMeta {
  /** What the series is, in your words ("Ghana: cocoa purchases, tonnes"). */
  label: string;
  /** Unit ("tonnes", "% y/y", "GHS millions"). */
  unit: string;
  freq: OwnFreq;
  /** ISO 3166 alpha-3 country code, or WLD when it is not about one country. */
  iso3: string;
  /** Where the figures came from ("Ghana Cocoa Board annual report 2025, table 4"). Required. */
  source: string;
  /** The source's terms of use, if you know them ("CC BY 4.0", "free with credit"). */
  licence?: string;
  /** Anything else a reader should know (breaks in the series, rebasing). */
  note?: string;
}

export interface OwnPoint {
  date: string;
  value: number;
}

export interface OwnParse {
  points: OwnPoint[];
  /** Data rows read (after the header). */
  rowsRead: number;
  /** Rows with no figure (blank, NA, ..), skipped. */
  blank: number;
  /** Plain sentences; empty when the file is fine. */
  problems: string[];
  /** The column separator found: ",", ";" or "\t". */
  separator: string;
}

export interface OwnSeriesFile {
  format: number;
  id: string;
  meta: OwnSeriesMeta;
  points: OwnPoint[];
  rowsRead: number;
  blank: number;
  /** SHA-256 of the CSV text as loaded. */
  csvSha256: string;
  /** SHA-256 of the figures read (see pointsDigestText). */
  pointsSha256: string;
  /** ISO time it was saved. */
  savedAt: string;
}

/** What a list shows: everything but the figures. */
export interface OwnSeriesSummary {
  id: string;
  meta: OwnSeriesMeta;
  count: number;
  first: string | null;
  last: string | null;
  savedAt: string;
  csvSha256: string;
  /** False when the saved figures no longer match their stored fingerprint. */
  intact: boolean;
}

/** The shape every chart and download already reads (src/utils/seriesHistory.ts Series). */
export interface OwnSeriesView {
  id: string;
  label: string;
  unit: string;
  freq: OwnFreq;
  source: string;
  pulledAt: string;
  points: OwnPoint[];
  about: string;
  /** Always true: lets every reader tell your figures from a feed's. */
  own: true;
  licence: string | null;
}

const BLANK = new Set(['', 'na', 'n/a', 'n.a.', '..', '...', '-', '–', 'missing', 'null', 'nan', '#n/a']);

function splitLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line.charAt(i);
    if (quoted) {
      if (ch === '"') {
        if (line.charAt(i + 1) === '"') {
          cur += '"';
          i++;
        } else quoted = false;
      } else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

function findSeparator(header: string): string {
  const count = (s: string) => header.split(s).length - 1;
  const tabs = count('\t');
  const semis = count(';');
  if (tabs > 0 && tabs >= semis) return '\t';
  if (semis > 0) return ';';
  return ',';
}

/** The value as a number, or null when the text is not a plain number. */
export function readNumber(raw: string, sep: string): number | null {
  let t = raw.replace(/\s/g, '');
  if (sep !== ',' && /^[-+]?\d+,\d+$/.test(t)) t = t.replace(',', '.');
  if (!/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(t)) return null;
  const v = Number(t);
  return Number.isFinite(v) ? v : null;
}

function validDay(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1) return false;
  const days = [31, (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1] ?? 0;
  return d <= days;
}

/** The date in the app's form for this frequency, or a reason it cannot be read. */
export function readDate(raw: string, freq: OwnFreq): { date: string } | { reason: string } {
  const t = raw.trim();
  if (/^\d{1,2}[/.]\d{1,2}[/.]\d{2,4}$/.test(t)) return { reason: `"${t}" could be day-first or month-first; write it as YYYY-MM-DD` };
  const yearOk = (y: number) => y >= 1800 && y <= 2200;
  if (freq === 'annual') {
    const m = /^(\d{4})$/.exec(t);
    if (!m || !yearOk(Number(m[1]))) return { reason: `"${t}" is not a year (YYYY)` };
    return { date: m[1] ?? '' };
  }
  if (freq === 'quarterly') {
    const m = /^(\d{4})[-\s]?Q([1-4])$/i.exec(t);
    if (!m || !yearOk(Number(m[1]))) return { reason: `"${t}" is not a quarter (YYYY-Qn)` };
    return { date: `${m[1]}-Q${m[2]}` };
  }
  const full = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (freq === 'monthly') {
    const m = /^(\d{4})-(\d{2})$/.exec(t) || full;
    if (!m || !yearOk(Number(m[1])) || Number(m[2]) < 1 || Number(m[2]) > 12) return { reason: `"${t}" is not a month (YYYY-MM)` };
    if (full && !validDay(Number(full[1]), Number(full[2]), Number(full[3]))) return { reason: `"${t}" is not a real date` };
    return { date: `${m[1]}-${m[2]}` };
  }
  if (!full || !yearOk(Number(full[1]))) return { reason: `"${t}" is not a date (YYYY-MM-DD)` };
  if (!validDay(Number(full[1]), Number(full[2]), Number(full[3]))) return { reason: `"${t}" is not a real date` };
  return { date: t };
}

/** Reads the CSV text into dated figures, oldest first, with every problem found. */
export function parseOwnCsv(text: string, freq: OwnFreq): OwnParse {
  const problems: string[] = [];
  let hidden = 0;
  const problem = (line: number, msg: string) => {
    if (problems.length < PROBLEMS_SHOWN) problems.push(`Line ${line}: ${msg}.`);
    else hidden++;
  };
  const empty: OwnParse = { points: [], rowsRead: 0, blank: 0, problems, separator: ',' };
  if (text.length > OWN_CSV_MAX_CHARS) {
    problems.push(`The file is too large (${text.length.toLocaleString('en')} characters; the most is ${OWN_CSV_MAX_CHARS.toLocaleString('en')}).`);
    return empty;
  }
  const lines = text.replace(/^﻿/, '').split(/\r\n|\n|\r/);
  const headerAt = lines.findIndex((l) => l.trim() !== '');
  if (headerAt < 0) {
    problems.push('The file is empty.');
    return empty;
  }
  const headerLine = lines[headerAt] ?? '';
  const sep = findSeparator(headerLine);
  const header = splitLine(headerLine, sep).map((h) => h.toLowerCase());
  let dateCol = 0;
  let valueCol = 1;
  if (header.length < 2) {
    problems.push('The first row needs two column names, a date and a value (for example: date,value).');
    return { ...empty, separator: sep };
  }
  if (header.length > 2) {
    dateCol = header.indexOf('date');
    valueCol = header.indexOf('value');
    if (dateCol < 0 || valueCol < 0) {
      problems.push('With more than two columns, name the two to use "date" and "value" in the first row.');
      return { ...empty, separator: sep };
    }
  }
  if (readNumber(header[valueCol] ?? '', sep) !== null && 'date' in readDate(header[dateCol] ?? '', freq)) {
    problems.push('The first row looks like data. Add a header row, for example: date,value.');
    return { ...empty, separator: sep };
  }

  const seen = new Map<string, number>();
  const points: OwnPoint[] = [];
  let rowsRead = 0;
  let blank = 0;
  for (let i = headerAt + 1; i < lines.length; i++) {
    const raw = lines[i] ?? '';
    if (raw.trim() === '') continue;
    const lineNo = i + 1;
    rowsRead++;
    if (rowsRead > OWN_MAX_ROWS) {
      problems.push(`The file has more than ${OWN_MAX_ROWS.toLocaleString('en')} rows; split it into smaller files.`);
      return { points: [], rowsRead, blank, problems, separator: sep };
    }
    const cells = splitLine(raw, sep);
    const d = readDate(cells[dateCol] ?? '', freq);
    if ('reason' in d) {
      problem(lineNo, d.reason);
      continue;
    }
    const cell = cells[valueCol] ?? '';
    if (BLANK.has(cell.toLowerCase())) {
      blank++;
      continue;
    }
    const v = readNumber(cell, sep);
    if (v === null) {
      problem(lineNo, sep === ',' && /\d,\d/.test(cell) ? `"${cell}" has a comma inside the number; remove thousands separators, or use semicolons between columns if the comma is a decimal point` : `"${cell}" is not a number`);
      continue;
    }
    const before = seen.get(d.date);
    if (before !== undefined) {
      problem(lineNo, `${d.date} appears twice (first on line ${before})`);
      continue;
    }
    seen.set(d.date, lineNo);
    points.push({ date: d.date, value: v });
  }
  if (hidden) problems.push(`…and ${hidden} more problem${hidden === 1 ? '' : 's'}.`);
  points.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  if (!problems.length && points.length < 2) problems.push(`At least two dated figures are needed; the file has ${points.length}.`);
  return { points: problems.length ? [] : points, rowsRead, blank, problems, separator: sep };
}

const clean = (v: unknown, max: number): string => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

/** The description, tidied, or the list of fields still needed. */
export function checkOwnMeta(input: unknown): { meta: OwnSeriesMeta } | { problems: string[] } {
  const b = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const problems: string[] = [];
  const label = clean(b['label'], OWN_LABEL_MAX);
  const unit = clean(b['unit'], 60);
  const source = clean(b['source'], OWN_TEXT_MAX);
  const iso3 = clean(b['iso3'], 3).toUpperCase();
  const freq = OWN_FREQS.find((f) => f === b['freq']);
  if (!label) problems.push('a name for the series');
  if (!unit) problems.push('its unit');
  if (!freq) problems.push('its frequency (daily, weekly, monthly, quarterly or annual)');
  if (!/^[A-Z]{3}$/.test(iso3)) problems.push(`a country (three-letter code, or ${OWN_NO_COUNTRY} when it is not about one country)`);
  if (!source) problems.push('where the figures came from');
  if (problems.length || !freq) return { problems };
  const meta: OwnSeriesMeta = { label, unit, freq, iso3, source };
  const licence = clean(b['licence'], OWN_TEXT_MAX);
  const note = clean(b['note'], OWN_TEXT_MAX);
  if (licence) meta.licence = licence;
  if (note) meta.note = note;
  return { meta };
}

export async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (x) => x.toString(16).padStart(2, '0')).join('');
}

/** The text the figures' fingerprint is taken over: one "date,value" line each, oldest first. */
export function pointsDigestText(points: readonly OwnPoint[]): string {
  return points.map((p) => `${p.date},${p.value}`).join('\n');
}

const fileName = (id: string) => `${OWN_SERIES_FOLDER}/${id}.json`;
const ID_RE = /^own_[a-z0-9_]{1,40}_[0-9a-f]{8}$/;
export const isOwnSeriesId = (id: string): boolean => ID_RE.test(id);

function slug(label: string): string {
  return label.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30) || 'series';
}

function readFile(text: string | null): OwnSeriesFile | null {
  if (!text) return null;
  try {
    const f = JSON.parse(text) as OwnSeriesFile;
    if (!f || typeof f !== 'object' || typeof f.id !== 'string' || !Array.isArray(f.points) || !f.meta) return null;
    return f;
  } catch {
    return null;
  }
}

async function summarise(f: OwnSeriesFile): Promise<OwnSeriesSummary> {
  return {
    id: f.id,
    meta: f.meta,
    count: f.points.length,
    first: f.points[0]?.date ?? null,
    last: f.points[f.points.length - 1]?.date ?? null,
    savedAt: f.savedAt,
    csvSha256: f.csvSha256,
    intact: (await sha256Hex(pointsDigestText(f.points))) === f.pointsSha256,
  };
}

export type OwnCheck =
  | { ok: true; meta: OwnSeriesMeta; parse: OwnParse }
  | { ok: false; problems: string[]; parse: OwnParse | null };

/** Checks a description and CSV without saving anything. */
export function checkOwnUpload(metaInput: unknown, csv: unknown): OwnCheck {
  const m = checkOwnMeta(metaInput);
  const text = typeof csv === 'string' ? csv : '';
  const freq = 'meta' in m ? m.meta.freq : OWN_FREQS.find((f) => f === (metaInput as Record<string, unknown> | null)?.['freq']);
  const parse = text && freq ? parseOwnCsv(text, freq) : null;
  const problems: string[] = [];
  if ('problems' in m) problems.push(`The description needs ${m.problems.join(', ')}.`);
  if (!text) problems.push('Choose a CSV file.');
  if (parse) problems.push(...parse.problems);
  if (problems.length || !('meta' in m) || !parse) return { ok: false, problems, parse };
  return { ok: true, meta: m.meta, parse };
}

export async function listOwnSeries(platform: Platform): Promise<OwnSeriesSummary[]> {
  const names = (await platform.files.list(OWN_SERIES_FOLDER)).filter((n) => n.endsWith('.json'));
  const out: OwnSeriesSummary[] = [];
  for (const n of names) {
    const f = readFile(await platform.files.read(`${OWN_SERIES_FOLDER}/${n.split('/').pop() ?? n}`));
    if (f) out.push(await summarise(f));
  }
  return out.sort((a, b) => a.meta.label.localeCompare(b.meta.label));
}

export async function loadOwnSeries(platform: Platform, id: string): Promise<(OwnSeriesFile & { intact: boolean }) | null> {
  if (!isOwnSeriesId(id)) return null;
  const f = readFile(await platform.files.read(fileName(id)));
  if (!f) return null;
  return { ...f, intact: (await sha256Hex(pointsDigestText(f.points))) === f.pointsSha256 };
}

/** Checks and saves a series. Nothing is written unless every check passes. */
export async function saveOwnSeries(platform: Platform, metaInput: unknown, csv: unknown): Promise<{ saved: OwnSeriesFile } | { problems: string[] }> {
  const check = checkOwnUpload(metaInput, csv);
  if (!check.ok) return { problems: check.problems };
  const existing = (await platform.files.list(OWN_SERIES_FOLDER)).filter((n) => n.endsWith('.json'));
  if (existing.length >= OWN_MAX_SERIES) return { problems: [`You already keep ${OWN_MAX_SERIES} series; delete one first.`] };
  const savedAt = new Date(platform.clock.now()).toISOString();
  const csvSha256 = await sha256Hex(csv as string);
  const pointsSha256 = await sha256Hex(pointsDigestText(check.parse.points));
  const id = `own_${slug(check.meta.label)}_${(await sha256Hex(`${check.meta.iso3}|${check.meta.label}|${savedAt}|${csvSha256}`)).slice(0, 8)}`;
  const saved: OwnSeriesFile = {
    format: OWN_SERIES_FORMAT,
    id,
    meta: check.meta,
    points: check.parse.points,
    rowsRead: check.parse.rowsRead,
    blank: check.parse.blank,
    csvSha256,
    pointsSha256,
    savedAt,
  };
  await platform.files.write(fileName(id), JSON.stringify(saved));
  return { saved };
}

export async function deleteOwnSeries(platform: Platform, id: string): Promise<boolean> {
  if (!isOwnSeriesId(id)) return false;
  if ((await platform.files.read(fileName(id))) === null) return false;
  await platform.files.remove(fileName(id));
  return true;
}

/** A saved series in the shape charts and downloads read, labelled as yours. */
export function ownSeriesView(f: OwnSeriesFile): OwnSeriesView {
  const extra = [f.meta.note, f.meta.licence ? `Terms: ${f.meta.licence}.` : 'Terms of use not given.'].filter(Boolean).join(' ');
  return {
    id: f.id,
    label: f.meta.label,
    unit: f.meta.unit,
    freq: f.meta.freq,
    source: `Your file: ${f.meta.source}`,
    pulledAt: f.savedAt,
    points: f.points,
    about: `Loaded by you from a CSV file on ${f.savedAt.slice(0, 10)}; the app has not checked these figures. ${extra}`.trim(),
    own: true,
    licence: f.meta.licence ?? null,
  };
}
