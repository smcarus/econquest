/**
 * Fiscal rules check (G35): the fiscal rules that bind a country and whether its latest figures meet
 * the ones with a published number.
 *
 * Two sources:
 * - Supranational rules typed from the treaty texts (EU, WAEMU, CEMAC): a limit, the figure it is
 *   measured on and the text it comes from. These are law, not data. Each is checked against the
 *   saved IMF yearly history (government debt GGXWDG_NGDP, overall balance GGXCNL_G01_GDP_PT), latest
 *   year before the current year, so IMF projections are never used.
 * - National rules from the IMF Fiscal Rules Dataset (1985-2024), read only from the workbook the user
 *   saves in data/local/imf-fiscal-rules/ (utils/fiscalRulesStore.ts). The IMF has not confirmed reuse
 *   terms, so nothing from it is shipped. It says which kinds of rule a country has (expenditure,
 *   revenue, budget balance, debt) and since when; the numeric limits are described only in the IMF's
 *   text, so national rules are listed, not checked against figures.
 *
 * No built-in figures; a gap reads Missing with the reason. Browser-safe, pure.
 */

export interface YearValue {
  year: number;
  value: number;
}

export type RuleKind = 'er' | 'rr' | 'bbr' | 'dr';
export const RULE_KINDS: RuleKind[] = ['er', 'rr', 'bbr', 'dr'];
export const RULE_KIND_NAME: Record<RuleKind, string> = {
  er: 'Expenditure rule',
  rr: 'Revenue rule',
  bbr: 'Budget balance rule',
  dr: 'Debt rule',
};

export type TreatyFigure = 'debt_gdp' | 'overall_balance';

export interface TreatyRule {
  id: string;
  body: 'EU' | 'WAEMU' | 'CEMAC';
  kind: RuleKind;
  /** The figure the limit is measured on, or null when the app has no such figure. */
  figure: TreatyFigure | null;
  limit: number;
  /** 'max' = the figure must be at most the limit; 'min' = at least. */
  direction: 'max' | 'min';
  rule: string;
  source: string;
  /** Why the app's figure is only close to the one the rule is measured on. */
  caveat: string;
  /** Set when figure is null. */
  missing?: string;
}

const EU = ['AUT', 'BEL', 'BGR', 'HRV', 'CYP', 'CZE', 'DNK', 'EST', 'FIN', 'FRA', 'DEU', 'GRC', 'HUN', 'IRL', 'ITA', 'LVA', 'LTU', 'LUX', 'MLT', 'NLD', 'POL', 'PRT', 'ROU', 'SVK', 'SVN', 'ESP', 'SWE'];
const WAEMU = ['BEN', 'BFA', 'CIV', 'GNB', 'MLI', 'NER', 'SEN', 'TGO'];
const CEMAC = ['CMR', 'CAF', 'TCD', 'COG', 'GNQ', 'GAB'];

export const TREATY_MEMBERS: Record<TreatyRule['body'], string[]> = { EU, WAEMU, CEMAC };

const EU_SOURCE = 'Treaty on the Functioning of the European Union, Protocol (No 12) on the excessive deficit procedure, Article 1';
const EU_CAVEAT = 'The EU test uses Eurostat excessive deficit procedure figures; the IMF figure is close but can differ.';
const WAEMU_SOURCE = 'WAEMU Additional Act No 01/2015/CCEG/UEMOA, convergence, stability, growth and solidarity pact (first-rank criteria)';
const WAEMU_CAVEAT = 'WAEMU measures total public debt and the overall balance including grants in its own surveillance figures; the IMF figures are close but can differ.';
const CEMAC_SOURCE = 'CEMAC multilateral surveillance convergence criteria, as revised in 2016';
const CEMAC_CAVEAT = 'CEMAC measures total public debt in its own surveillance figures; the IMF figure is close but can differ.';

export const TREATY_RULES: TreatyRule[] = [
  { id: 'eu_deficit', body: 'EU', kind: 'bbr', figure: 'overall_balance', limit: -3, direction: 'min', rule: 'Government deficit at most 3% of GDP', source: EU_SOURCE, caveat: EU_CAVEAT },
  { id: 'eu_debt', body: 'EU', kind: 'dr', figure: 'debt_gdp', limit: 60, direction: 'max', rule: 'Government debt at most 60% of GDP, or falling towards it at a satisfactory pace', source: EU_SOURCE, caveat: EU_CAVEAT },
  { id: 'waemu_balance', body: 'WAEMU', kind: 'bbr', figure: 'overall_balance', limit: -3, direction: 'min', rule: 'Overall fiscal balance including grants at least -3% of GDP', source: WAEMU_SOURCE, caveat: WAEMU_CAVEAT },
  { id: 'waemu_debt', body: 'WAEMU', kind: 'dr', figure: 'debt_gdp', limit: 70, direction: 'max', rule: 'Total public debt at most 70% of GDP', source: WAEMU_SOURCE, caveat: WAEMU_CAVEAT },
  {
    id: 'cemac_balance',
    body: 'CEMAC',
    kind: 'bbr',
    figure: null,
    limit: -1.5,
    direction: 'min',
    rule: 'Reference fiscal balance at least -1.5% of GDP',
    source: CEMAC_SOURCE,
    caveat: '',
    missing: 'The reference fiscal balance sets aside part of oil revenue and is published only in CEMAC and IMF country reports; no series the app reads measures it, so it is not checked',
  },
  { id: 'cemac_debt', body: 'CEMAC', kind: 'dr', figure: 'debt_gdp', limit: 70, direction: 'max', rule: 'Total public debt at most 70% of GDP', source: CEMAC_SOURCE, caveat: CEMAC_CAVEAT },
];

export const FIGURE_SOURCE: Record<TreatyFigure, string> = {
  debt_gdp: 'IMF World Economic Outlook, general government gross debt (GGXWDG_NGDP)',
  overall_balance: 'IMF Fiscal Monitor, general government net lending/borrowing (GGXCNL_G01_GDP_PT)',
};

export interface TreatyCheck {
  rule: TreatyRule;
  year?: number;
  value?: number;
  /** null when there is no figure to check. */
  meets: boolean | null;
  /** Room left under the rule in points of GDP; negative = by how much it is missed. */
  room?: number;
  missing?: string;
  /** 'no_figure': nothing saved before beforeYear; 'no_measure': the app has no series for the rule's measure. */
  missingCode?: 'no_figure' | 'no_measure';
}

/** One country in the IMF Fiscal Rules Dataset workbook. */
export interface NationalRules {
  name: string;
  /** The latest year the workbook has for this country. */
  year: number;
  has: Record<RuleKind, boolean>;
  /** First year of the unbroken run of years with the rule that ends at `year`. */
  since: Partial<Record<RuleKind, number>>;
  /** Other columns of that row, as written in the workbook (legal basis, escape clause, ...). */
  details: Array<{ label: string; value: string }>;
}

export interface FiscalRulesTable {
  countries: Map<string, NationalRules>;
  file: string;
  firstYear: number;
  lastYear: number;
  /** Country names in the workbook the app could not match to a country code. */
  unmatched: string[];
}

export const FISCAL_RULES_CITATION = '"Fiscal Rules Dataset: 1985-2024", International Monetary Fund, Washington, DC (2025)';
export const FISCAL_RULES_URL = 'https://www.imf.org/en/topics/fiscal-policies/fiscal-rules-dataset';
export const FISCAL_RULES_SETUP_HELP = `National fiscal rules come from the IMF Fiscal Rules Dataset, 1985-2024 (free download; the IMF has not confirmed reuse terms, so the app ships none of it). Download the Dataset (XLSX) from ${FISCAL_RULES_URL} and put it in data/local/imf-fiscal-rules/. The app reads it on this computer; nothing is sent anywhere.`;
export const NATIONAL_LIMITS_NOTE = 'The IMF workbook says which kinds of national rule are in force; their numeric limits are described only in the IMF\'s text, so national rules are listed, not checked against figures.';
export const FR_METHOD =
  'Each supranational limit is checked against the latest year before the current year in the saved IMF history (projections are never used). Room = limit minus debt for a debt ceiling, balance minus limit for a deficit floor; negative room means the rule is missed that year. National rules are read from the IMF workbook you saved, in its latest year.';

const norm = (s: string) => String(s ?? '').trim();
const lower = (s: string) => norm(s).toLowerCase();

const KIND_HEADER: Array<[RuleKind, RegExp]> = [
  ['er', /^(er|expenditure rules?)$/],
  ['rr', /^(rr|revenue rules?)$/],
  ['bbr', /^(bbr|(budget|balanced budget) balance rules?|budget balance rules?|balanced budget rules?)$/],
  ['dr', /^(dr|debt rules?)$/],
];

const truthy = (v: string) => /^(1|1\.0+|yes|y)$/i.test(norm(v));

/** The header row of the long layout (one row per country and year), or null. */
export function findHeader(rows: string[][]): { at: number; country: number; iso: number; year: number; kinds: Partial<Record<RuleKind, number>> } | null {
  for (let at = 0; at < Math.min(rows.length, 40); at++) {
    const h = rows[at].map(lower);
    const country = h.findIndex((x) => /^(country|country name|economy|countries)$/.test(x));
    const year = h.findIndex((x) => x === 'year');
    if (country < 0 || year < 0) continue;
    const kinds: Partial<Record<RuleKind, number>> = {};
    for (const [k, re] of KIND_HEADER) {
      const i = h.findIndex((x) => re.test(x));
      if (i >= 0) kinds[k] = i;
    }
    if (Object.keys(kinds).length < 2) continue;
    const iso = h.findIndex((x) => /^(iso|iso3|iso code|iso3 code|iso_code|code)$/.test(x));
    return { at, country, iso, year, kinds };
  }
  return null;
}

/** Lower-case, accents and punctuation removed, "the" dropped: for matching country names. */
export function nameKey(s: string): string {
  return lower(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\bthe\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * One worksheet into the table, or the reason it did not read. `names` maps nameKey(country name) to
 * a country code, for workbooks without a code column.
 */
export function fiscalRulesTable(rows: Iterable<string[]>, file: string, names: Record<string, string>): FiscalRulesTable | { reason: string } {
  const all = [...rows];
  const h = findHeader(all);
  if (!h) return { reason: 'no header row with Country, Year and at least two of ER, RR, BBR and DR' };
  const header = all[h.at].map(norm);
  const used = new Set([h.country, h.iso, h.year, ...Object.values(h.kinds)]);
  const detailCols = header.map((label, i) => ({ label, i })).filter((c) => c.label && !used.has(c.i));
  const byIso = new Map<string, Array<{ year: number; row: string[] }>>();
  const nameOf = new Map<string, string>();
  const unmatched = new Set<string>();
  for (const row of all.slice(h.at + 1)) {
    const name = norm(row[h.country]);
    const year = Number(norm(row[h.year]));
    if (!name || !Number.isInteger(year) || year < 1900 || year > 2100) continue;
    const code = h.iso >= 0 ? norm(row[h.iso]).toUpperCase() : '';
    const iso3 = /^[A-Z]{3}$/.test(code) ? code : names[nameKey(name)];
    if (!iso3) {
      unmatched.add(name);
      continue;
    }
    nameOf.set(iso3, name);
    const list = byIso.get(iso3) ?? [];
    list.push({ year, row });
    byIso.set(iso3, list);
  }
  if (!byIso.size) return { reason: unmatched.size ? `no country name matched a country code (for example ${[...unmatched].slice(0, 3).join(', ')})` : 'no rows with a country and a year under the header' };
  const countries = new Map<string, NationalRules>();
  let firstYear = Infinity;
  let lastYear = -Infinity;
  for (const [iso3, list] of byIso) {
    list.sort((a, b) => a.year - b.year);
    firstYear = Math.min(firstYear, list[0].year);
    const latest = list[list.length - 1];
    lastYear = Math.max(lastYear, latest.year);
    const has = { er: false, rr: false, bbr: false, dr: false } as Record<RuleKind, boolean>;
    const since: NationalRules['since'] = {};
    for (const k of RULE_KINDS) {
      const col = h.kinds[k];
      if (col === undefined) continue;
      has[k] = truthy(latest.row[col]);
      if (!has[k]) continue;
      let start = latest.year;
      for (let i = list.length - 2; i >= 0; i--) {
        if (list[i].year !== start - 1 || !truthy(list[i].row[col])) break;
        start = list[i].year;
      }
      since[k] = start;
    }
    const details = detailCols
      .map((c) => ({ label: c.label, value: norm(latest.row[c.i]) }))
      .filter((d) => d.value && d.value !== '-');
    countries.set(iso3, { name: nameOf.get(iso3) || iso3, year: latest.year, has, since, details });
  }
  return { countries, file, firstYear, lastYear, unmatched: [...unmatched].sort() };
}

/** Latest value strictly before `beforeYear`. */
function latestBefore(points: YearValue[] | undefined, beforeYear: number): YearValue | undefined {
  return (points ?? []).filter((p) => p.year < beforeYear && Number.isFinite(p.value)).sort((a, b) => b.year - a.year)[0];
}

export function treatyRulesFor(iso3: string): TreatyRule[] {
  return TREATY_RULES.filter((r) => TREATY_MEMBERS[r.body].includes(iso3));
}

export interface FiscalRulesCheck {
  iso3: string;
  /** Years from this one on are not read (IMF projections). */
  beforeYear: number;
  treaty: TreatyCheck[];
  national: NationalRules | null;
  /** Why national rules are missing, when they are. */
  nationalMissing?: string;
  /** 'no_file': nothing saved; 'no_row': the workbook has no row for the country; 'unreadable': the file did not read (reason in nationalMissing). */
  nationalCode?: 'no_file' | 'no_row' | 'unreadable';
  countriesInFile?: number;
  file?: string;
  sources: string[];
  method: string;
}

export function fiscalRulesCheck(
  iso3: string,
  beforeYear: number,
  series: Partial<Record<TreatyFigure, YearValue[]>>,
  imf: { table: FiscalRulesTable | null; reason?: string },
): FiscalRulesCheck {
  const treaty: TreatyCheck[] = treatyRulesFor(iso3).map((rule) => {
    if (!rule.figure) return { rule, meets: null, missing: rule.missing, missingCode: 'no_measure' };
    const p = latestBefore(series[rule.figure], beforeYear);
    if (!p) return { rule, meets: null, missing: `No ${rule.figure === 'debt_gdp' ? 'government debt' : 'overall balance'} figure before ${beforeYear} is saved for this country (${FIGURE_SOURCE[rule.figure]})`, missingCode: 'no_figure' };
    const room = rule.direction === 'max' ? rule.limit - p.value : p.value - rule.limit;
    return { rule, year: p.year, value: p.value, meets: room >= 0, room: Math.round(room * 100) / 100 };
  });
  const national = imf.table?.countries.get(iso3) ?? null;
  const nationalMissing = national
    ? undefined
    : imf.table
      ? `The IMF Fiscal Rules Dataset you saved (${imf.table.file}) has no row for this country; it covers ${imf.table.countries.size} economies`
      : imf.reason || 'No IMF Fiscal Rules Dataset in data/local/imf-fiscal-rules/ (the IMF has not confirmed reuse terms, so the app ships none of it)';
  const sources = [
    ...new Set(treaty.flatMap((c) => [c.rule.source, ...(c.rule.figure ? [FIGURE_SOURCE[c.rule.figure]] : [])])),
    ...(national && imf.table ? [`${FISCAL_RULES_CITATION}, from ${imf.table.file}`] : []),
  ];
  const nationalCode = national ? undefined : imf.table ? 'no_row' : imf.reason ? 'unreadable' : 'no_file';
  return { iso3, beforeYear, treaty, national, ...(nationalMissing ? { nationalMissing, nationalCode } : {}), ...(imf.table ? { countriesInFile: imf.table.countries.size } : {}), ...(imf.table ? { file: imf.table.file } : {}), sources, method: FR_METHOD };
}

/** One plain sentence for the brief and the explain button. */
export function frSentence(c: FiscalRulesCheck, countryName: string): string {
  const parts: string[] = [];
  const checked = c.treaty.filter((t) => t.meets !== null);
  if (checked.length) {
    parts.push(
      `${countryName} ${checked
        .map((t) => `${t.meets ? 'meets' : 'misses'} the ${t.rule.body} ${t.rule.kind === 'dr' ? 'debt' : 'balance'} limit (${t.value} vs ${t.rule.limit}% of GDP, ${t.year})`)
        .join(' and ')}.`,
    );
  } else if (!c.treaty.length) parts.push(`${countryName} is not bound by an EU, WAEMU or CEMAC fiscal limit.`);
  if (c.national) {
    const kinds = RULE_KINDS.filter((k) => c.national!.has[k]);
    parts.push(kinds.length ? `National rules in the IMF dataset (${c.national.year}): ${kinds.map((k) => `${RULE_KIND_NAME[k].toLowerCase()} since ${c.national!.since[k]}`).join(', ')}.` : `The IMF dataset lists no national fiscal rule in ${c.national.year}.`);
  }
  return parts.join(' ');
}
