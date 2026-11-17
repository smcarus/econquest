/**
 * World Bank development projects (group R, step R5, Sam 17 November 2026): the World Bank projects
 * under way in each country, how much was committed, and for IDA credits and grants how much has
 * been paid out against the time gone.
 *
 * - World Bank Projects API (search.worldbank.org/api/v2/projects, no key; the Projects & Operations
 *   dataset is CC BY 4.0). All active projects worldwide, read 1,000 at a time. The reply is
 *   { total, projects: { P123456: {...} } }; fields used: id, project_name, countrycode (a list of
 *   two-letter codes), boardapprovaldate (ISO), closingdate ("12/31/2029 12:00:00 AM"),
 *   curr_total_commitment, curr_ida_commitment, curr_ibrd_commitment (US$ millions, as text; the
 *   totalcommamt text in whole dollars is the fallback), lendinginstr, url. Layout read live from
 *   the API on 17 November 2026.
 * - World Bank Finances One, "IDA Statement of Credits, Grants and Guarantees - Latest Available
 *   Snapshot" (dataset DS00001, CC BY 4.0, no key): one row per IDA credit or grant with its project
 *   ID, original principal, cancelled, disbursed and undisbursed amounts in US dollars. Read 1,000
 *   rows at a time and added up by project. NOT VERIFIED LIVE: the column names are written from the
 *   dataset's published field list (project_id, original_principal_amount_us_, cancelled_amount_us_,
 *   disbursed_amount_us_, undisbursed_amount_us_) because the API refuses this cloud session. Keys
 *   are matched ignoring case and punctuation, so a different spelling still matches; a reply
 *   without them gives no paid-out figure (Missing with the reason), never a guessed one.
 *   IBRD loans (middle-income countries) have no paid-out figure here yet.
 *
 * For each active project: share of its planned life gone (from board approval to closing) and, for
 * IDA, the share of the committed amount paid out. A project is flagged as paying out slowly when
 * at least a quarter of its life has gone and the share paid out is more than 25 points below the
 * share of time gone. Budget support loans (development policy) pay out in one or two tranches and
 * are never flagged. A rough reading, not a judgement: projects often pay out slowly at first.
 *
 * Browser-safe, pure.
 */

export const WB_PROJECTS_URL = 'https://search.worldbank.org/api/v2/projects';
export const WB_PROJECTS_PAGE = 1000;
export const IDA_CREDITS_URL = 'https://datacatalogapi.worldbank.org/dexapps/fone/api/apiservice';
export const IDA_CREDITS_PAGE = 1000;

export const projectsPageUrl = (offset: number, rows = WB_PROJECTS_PAGE) =>
  `${WB_PROJECTS_URL}?format=json&status_exact=Active&rows=${rows}&os=${offset}`;

export const projectsCountryUrl = (iso2: string, rows = 5) => `${WB_PROJECTS_URL}?format=json&status_exact=Active&countrycode_exact=${encodeURIComponent(iso2)}&rows=${rows}`;

export const idaCreditsPageUrl = (skip: number, top = IDA_CREDITS_PAGE) => `${IDA_CREDITS_URL}?datasetId=DS00001&resourceId=RS00001&top=${top}&skip=${skip}&type=json`;

export const WB_PROJECTS_SOURCES = 'World Bank Projects & Operations (search.worldbank.org API) and Finances One IDA Statement of Credits, Grants and Guarantees (DS00001), CC BY 4.0';

export const WB_PROJECTS_METHOD =
  'Active World Bank projects in the country with the amount committed, board approval and closing dates, and the share of each project\'s planned life gone. For IDA credits and grants, the amount paid out so far against the amount committed (less cancellations), from the IDA statement of credits. A project is flagged as paying out slowly when a quarter or more of its life has gone and the share paid out is more than 25 points below the share of time gone; budget support loans are never flagged. A description, not a judgement of the project.';

export interface WbProject {
  id: string;
  name: string;
  /** Two-letter World Bank country codes (a regional project lists several). */
  countries: string[];
  approved?: string;
  closing?: string;
  /** US$ millions. */
  commitment?: number;
  ida?: number;
  ibrd?: number;
  instrument?: string;
  url?: string;
}

export interface IdaTotals {
  principal: number;
  cancelled: number;
  disbursed: number;
  undisbursed: number;
  credits: number;
}

export interface WbProjectsPull {
  pulledAt: string;
  projects: WbProject[];
  /** IDA amounts by project ID, US dollars; null when the IDA statement was not read. */
  ida: Record<string, IdaTotals> | null;
  idaPulledAt?: string;
}

const num = (v: unknown): number | undefined => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  if (typeof v !== 'string') return undefined;
  const s = v.replace(/[,\s$]/g, '');
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
};

/** "2024-10-17T00:00:00Z" or "12/31/2029 12:00:00 AM" to "YYYY-MM-DD". */
export function wbDate(v: unknown): string | undefined {
  if (typeof v !== 'string' || !v.trim()) return undefined;
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const us = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (us) return `${us[3]}-${us[1].padStart(2, '0')}-${us[2].padStart(2, '0')}`;
  return undefined;
}

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : Array.isArray(v) && typeof v[0] === 'string' ? v[0].trim() : undefined);

/** One page of the Projects API, or null when the reply is not in the expected layout. */
export function parseProjectsPage(json: unknown): { total: number; projects: WbProject[] } | null {
  const o = json as { total?: unknown; projects?: unknown } | null;
  if (!o || typeof o !== 'object' || !o.projects || typeof o.projects !== 'object') return null;
  const projects: WbProject[] = [];
  for (const [key, raw] of Object.entries(o.projects as Record<string, unknown>)) {
    const p = raw as Record<string, unknown>;
    if (!p || typeof p !== 'object') continue;
    const id = str(p.id) || key;
    if (!/^P\d+$/.test(id)) continue;
    const cc = Array.isArray(p.countrycode) ? p.countrycode.filter((x): x is string => typeof x === 'string') : typeof p.countrycode === 'string' ? [p.countrycode] : [];
    const totalWhole = num(p.totalcommamt);
    const commitment = num(p.curr_total_commitment) ?? (totalWhole !== undefined ? totalWhole / 1e6 : undefined);
    projects.push({
      id,
      name: str(p.project_name) || id,
      countries: cc.map((c) => c.toUpperCase()),
      ...(wbDate(p.boardapprovaldate) ? { approved: wbDate(p.boardapprovaldate) } : {}),
      ...(wbDate(p.closingdate) ? { closing: wbDate(p.closingdate) } : {}),
      ...(commitment !== undefined ? { commitment } : {}),
      ...(num(p.curr_ida_commitment) !== undefined ? { ida: num(p.curr_ida_commitment) } : {}),
      ...(num(p.curr_ibrd_commitment) !== undefined ? { ibrd: num(p.curr_ibrd_commitment) } : {}),
      ...(str(p.lendinginstr) ? { instrument: str(p.lendinginstr) } : {}),
      ...(str(p.url) ? { url: str(p.url) } : {}),
    });
  }
  return { total: num(o.total) ?? projects.length, projects };
}

const norm = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');
const IDA_KEYS = {
  project: ['projectid'],
  principal: ['originalprincipalamountus', 'originalprincipalamount'],
  cancelled: ['cancelledamountus', 'cancelledamount'],
  disbursed: ['disbursedamountus', 'disbursedamount'],
  undisbursed: ['undisbursedamountus', 'undisbursedamount'],
};

/** One page of the IDA statement: its rows, or null when the reply has no rows array. */
export function parseIdaPage(json: unknown): Array<Record<string, unknown>> | null {
  const o = json as { data?: unknown; value?: unknown } | unknown[] | null;
  const rows = Array.isArray(o) ? o : Array.isArray((o as { data?: unknown })?.data) ? (o as { data: unknown[] }).data : Array.isArray((o as { value?: unknown })?.value) ? (o as { value: unknown[] }).value : null;
  if (!rows) return null;
  return rows.filter((r): r is Record<string, unknown> => !!r && typeof r === 'object');
}

/** Adds IDA rows up by project ID. Rows without a project ID or a disbursed figure are skipped. */
export function idaByProject(rows: Array<Record<string, unknown>>): Record<string, IdaTotals> {
  const out: Record<string, IdaTotals> = {};
  for (const r of rows) {
    const byNorm = new Map(Object.entries(r).map(([k, v]) => [norm(k), v]));
    const get = (names: string[]) => names.map((n) => byNorm.get(n)).find((v) => v !== undefined && v !== null && v !== '');
    const pid = str(get(IDA_KEYS.project));
    const disbursed = num(get(IDA_KEYS.disbursed));
    if (!pid || !/^P\d+$/.test(pid) || disbursed === undefined) continue;
    const t = (out[pid] ??= { principal: 0, cancelled: 0, disbursed: 0, undisbursed: 0, credits: 0 });
    t.principal += num(get(IDA_KEYS.principal)) ?? 0;
    t.cancelled += num(get(IDA_KEYS.cancelled)) ?? 0;
    t.disbursed += disbursed;
    t.undisbursed += num(get(IDA_KEYS.undisbursed)) ?? 0;
    t.credits += 1;
  }
  return out;
}

export interface ProjectRow {
  id: string;
  name: string;
  approved?: string;
  closing?: string;
  commitment?: number;
  instrument?: string;
  url?: string;
  /** Share of the planned life gone, % (0 to 100). */
  timeGonePct?: number;
  /** IDA share paid out, % of committed less cancelled. */
  paidOutPct?: number;
  /** IDA amount paid out, US$ millions. */
  paidOut?: number;
  slow: boolean;
  regional: boolean;
}

export interface WbProjectsProfile {
  asOf?: string;
  missing?: string;
  rows: ProjectRow[];
  count: number;
  /** US$ millions committed to the active projects listed. */
  committed?: number;
  /** IDA, summed over projects with a paid-out figure: US$ millions. */
  idaPaidOut?: number;
  idaStillToPay?: number;
  slowCount: number;
  /** Why no project has a paid-out share (IDA statement not read or no IDA projects). */
  paidOutMissing?: string;
  sources: string;
  method: string;
}

const r1 = (v: number) => Math.round(v * 10) / 10;
const day = (s: string) => Date.parse(`${s}T00:00:00Z`);

export function isBudgetSupport(instrument?: string): boolean {
  return !!instrument && /development policy/i.test(instrument);
}

export function wbProjectsProfile(pull: WbProjectsPull | null, iso2: string | null, today: string): WbProjectsProfile {
  const out: WbProjectsProfile = { rows: [], count: 0, slowCount: 0, sources: WB_PROJECTS_SOURCES, method: WB_PROJECTS_METHOD };
  if (!pull) {
    out.missing = 'The World Bank project list has not been downloaded yet (it comes with the daily download; Data health > World Bank projects)';
    return out;
  }
  out.asOf = pull.pulledAt.slice(0, 10);
  if (!iso2) {
    out.missing = 'No two-letter country code for this country, so its World Bank projects cannot be matched';
    return out;
  }
  const mine = pull.projects.filter((p) => p.countries.includes(iso2.toUpperCase()));
  if (!mine.length) {
    out.missing = 'The World Bank lists no active project in this country';
    return out;
  }
  const now = day(today);
  out.rows = mine
    .map((p) => {
      const row: ProjectRow = { id: p.id, name: p.name, slow: false, regional: p.countries.length > 1 };
      for (const k of ['approved', 'closing', 'commitment', 'instrument', 'url'] as const) if (p[k] !== undefined) (row as unknown as Record<string, unknown>)[k] = p[k];
      if (p.approved && p.closing) {
        const a = day(p.approved);
        const c = day(p.closing);
        if (c > a) row.timeGonePct = r1(Math.min(100, Math.max(0, ((now - a) / (c - a)) * 100)));
      }
      const t = pull.ida?.[p.id];
      if (t) {
        const net = t.principal - t.cancelled;
        if (net > 0) row.paidOutPct = r1(Math.min(100, (t.disbursed / net) * 100));
        row.paidOut = r1(t.disbursed / 1e6);
      }
      if (row.timeGonePct !== undefined && row.paidOutPct !== undefined && !isBudgetSupport(p.instrument)) {
        row.slow = row.timeGonePct >= 25 && row.paidOutPct < row.timeGonePct - 25;
      }
      return row;
    })
    .sort((a, b) => (b.commitment ?? -1) - (a.commitment ?? -1));
  out.count = out.rows.length;
  const committed = out.rows.reduce((s, r) => s + (r.commitment ?? 0), 0);
  if (out.rows.some((r) => r.commitment !== undefined)) out.committed = r1(committed);
  out.slowCount = out.rows.filter((r) => r.slow).length;
  const withIda = mine.map((p) => pull.ida?.[p.id]).filter((t): t is IdaTotals => !!t);
  if (withIda.length) {
    out.idaPaidOut = r1(withIda.reduce((s, t) => s + t.disbursed, 0) / 1e6);
    out.idaStillToPay = r1(withIda.reduce((s, t) => s + t.undisbursed, 0) / 1e6);
  } else {
    out.paidOutMissing = pull.ida
      ? 'None of these projects is an IDA credit or grant in the IDA statement (IBRD loans have no paid-out figure here yet)'
      : 'The IDA statement of credits could not be read, so no paid-out share is shown';
  }
  return out;
}

const money = (m: number) => (m >= 1000 ? `US$${(m / 1000).toFixed(1)} bn` : `US$${Math.round(m)} m`);

/** One English sentence for Explain in chat. */
export function wbProjectsSentence(p: WbProjectsProfile, country: string): string {
  if (p.missing) return `${country}: World Bank projects Missing (${p.missing}).`;
  let s = `${country} has ${p.count} active World Bank project${p.count === 1 ? '' : 's'}`;
  if (p.committed !== undefined) s += ` with ${money(p.committed)} committed`;
  s += ` (World Bank list of ${p.asOf}).`;
  if (p.idaPaidOut !== undefined && p.idaStillToPay !== undefined) s += ` IDA credits and grants: ${money(p.idaPaidOut)} paid out, ${money(p.idaStillToPay)} still to pay.`;
  if (p.slowCount) s += ` ${p.slowCount} paying out slowly for the time gone.`;
  return s;
}
