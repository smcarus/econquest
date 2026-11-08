/**
 * Economic stance profiles (Quests step 11): opt-in, self-declared, never inferred.
 *
 *   Axes        eight fixed questions on economics, not party politics: each a slider between two
 *               plain positions, -2 to 2 (0 = no lean), or left out. No left-right label, no party
 *               names, nothing marked good or bad.
 *   Sign-up     a person sets them in their own copy of the app (kept in that browser only) and, if
 *               they want a profile, adds quests/profiles/<login>.json by their own pull request on
 *               GitHub. The check allows only the person themselves (a maintainer may remove one on
 *               request). Git history keeps every version, which the app says plainly before they start.
 *   Never       the app never guesses a stance from forecasts or arguments.
 *   Groups      tables of stance against skill are left empty for now: publishing them safely needs a
 *               way to collect stances without names, which the project does not have (Sam, 2026-11-08).
 *
 * Why: one research question, whether people who hold a view forecast better or worse on the
 * Quests that test it. A stance tied to a name is a political opinion about a person (special-category
 * data under GDPR Article 9), so only the person can put their name to one.
 *
 * Browser-safe, pure.
 */

export interface StanceAxis {
  id: string;
  /** The question in plain words. */
  question: string;
  /** The position at -2. */
  first: string;
  /** The position at +2. */
  second: string;
  /** What the axis is about, for a reader with no training in economics. */
  explain: string;
  /** Quest topics whose results bear on it (src/utils/quests.ts QUEST_TOPICS). */
  topics: string[];
}

export const STANCE_AXES: StanceAxis[] = [
  { id: 'inflation_growth', question: 'When they clash, what should come first?', first: 'Keeping inflation low', second: 'Keeping growth and jobs up', explain: 'Raising interest rates slows price rises but can cost jobs for a while; cutting them does the opposite.', topics: ['inflation', 'monetary', 'growth'] },
  { id: 'fiscal', question: 'When a government runs a large deficit, it should mostly…', first: 'Cut the deficit soon', second: 'Keep spending to support the economy', explain: 'A deficit is spending above tax income, paid for by borrowing. Cutting it steadies debt; keeping it up can soften a downturn.', topics: ['fiscal', 'debt'] },
  { id: 'fx_regime', question: 'The exchange rate should be…', first: 'Allowed to float with the market', second: 'Managed by the central bank', explain: 'A floating currency absorbs shocks by moving; a managed one is steadier but uses up reserves and can break suddenly.', topics: ['fx'] },
  { id: 'capital', question: 'Money moving in and out of a country should be…', first: 'Free to move', second: 'Limited by controls when needed', explain: 'Open flows bring investment but can leave fast in a panic; controls slow both.', topics: ['external', 'fx'] },
  { id: 'cb_independence', question: 'The central bank should…', first: 'Set rates fully on its own', second: 'Answer more to the elected government', explain: 'An independent central bank is trusted more on inflation; one closer to government can act with it in a crisis.', topics: ['monetary', 'inflation'] },
  { id: 'restructuring', question: 'When a country cannot pay its debts, the deal should lean towards…', first: 'Lenders getting more back', second: 'The country getting more relief', explain: 'Tougher terms protect lenders and future lending; softer ones help the country recover sooner.', topics: ['debt'] },
  { id: 'sanctions', question: 'Economic sanctions…', first: 'Mostly change what governments do', second: 'Mostly do not', explain: 'Sanctions limit trade or finance with a country to press its government; how often they work is disputed.', topics: ['geopolitics'] },
  { id: 'trade', question: 'Trade policy should lean towards…', first: 'Open trade', second: 'Protecting home industry', explain: 'Open trade lowers prices and widens markets; protection shields jobs in some industries at a cost to buyers.', topics: ['external', 'growth'] },
];

export const STANCE_AXIS_IDS = STANCE_AXES.map((a) => a.id);

export type StanceValue = -2 | -1 | 0 | 1 | 2;
export type Stances = Partial<Record<string, StanceValue>>;

const LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;

/** A named profile, added by the person's own pull request: quests/profiles/<login>.json. */
export interface StanceProfile {
  login: string;
  axes: Stances;
  /** The day the person chose to show it. */
  shownSince: string;
}

export const PROFILES_DIR = 'quests/profiles';
export const profilePath = (login: string) => `${PROFILES_DIR}/${login}.json`;

export function stancesProblems(axes: unknown): string[] {
  if (!axes || typeof axes !== 'object' || Array.isArray(axes)) return ['axes: the stances, as { "<axis>": -2 to 2 }'];
  const out: string[] = [];
  const entries = Object.entries(axes as Record<string, unknown>);
  if (!entries.length) out.push('axes: set at least one stance');
  for (const [k, v] of entries) {
    if (!STANCE_AXIS_IDS.includes(k)) out.push(`axes.${k}: not one of the axes (${STANCE_AXIS_IDS.join(', ')})`);
    else if (!Number.isInteger(v) || (v as number) < -2 || (v as number) > 2) out.push(`axes.${k}: a whole number from -2 to 2`);
  }
  return out;
}

export function profileProblems(raw: unknown, filePath: string): string[] {
  const m = new RegExp(`^${PROFILES_DIR}/([A-Za-z0-9-]{1,39})\\.json$`).exec(filePath);
  if (!m || !LOGIN.test(m[1])) return [`${filePath}: a profile goes in ${PROFILES_DIR}/<GitHub login>.json`];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return ['not a JSON object'];
  const p = raw as Partial<StanceProfile> & Record<string, unknown>;
  const out: string[] = [];
  for (const k of Object.keys(p)) if (!['login', 'axes', 'shownSince'].includes(k)) out.push(`${k}: not part of a profile`);
  if (p.login !== m[1]) out.push(`login: must be ${m[1]}, as in the file name`);
  if (typeof p.shownSince !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(p.shownSince)) out.push('shownSince: the day you chose to show it, YYYY-MM-DD');
  out.push(...stancesProblems(p.axes));
  return out;
}

/** The profile file a person adds: fixed key order, two-space JSON. */
export function profileFileText(p: StanceProfile): string {
  const axes = Object.fromEntries(STANCE_AXIS_IDS.filter((k) => p.axes[k] !== undefined).map((k) => [k, p.axes[k]]));
  return `${JSON.stringify({ login: p.login, axes, shownSince: p.shownSince }, null, 2)}\n`;
}

/**
 * Checks a pull request that touches quests/profiles/: it holds only profile files; each is added or
 * changed by the person it names; a removal is by that person or a maintainer (on request).
 */
export function checkProfileChange(c: { files: Array<{ status: string; path: string }>; read: (p: string) => string; author: string; maintainers: string[] }): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const add = (k: string, p: string) => (out[k] ||= []).push(p);
  const mine = c.files.filter((f) => f.path.startsWith(`${PROFILES_DIR}/`));
  if (!mine.length) return out;
  const others = c.files.filter((f) => !f.path.startsWith(`${PROFILES_DIR}/`));
  if (others.length) add('change', `A pull request with a stance profile holds only profiles; also changed: ${others.map((f) => f.path).join(', ')}`);
  for (const f of mine) {
    const login = f.path.slice(PROFILES_DIR.length + 1).replace(/\.json$/, '');
    if (f.status === 'D') {
      if (login !== c.author && !c.maintainers.includes(c.author)) add(f.path, `Only ${login} or a maintainer can remove this profile`);
      continue;
    }
    if (login !== c.author) add(f.path, `The profile is named for ${login}, but this pull request was opened by ${c.author}; you can only show your own stances`);
    let raw: unknown;
    try {
      raw = JSON.parse(c.read(f.path));
    } catch (e) {
      add(f.path, `not valid JSON: ${(e as Error).message}`);
      continue;
    }
    for (const p of profileProblems(raw, f.path)) add(f.path, p);
  }
  return out;
}

/** A stance in words, e.g. "Leans strongly towards: Keeping inflation low". */
export function stanceWords(axis: StanceAxis, v: StanceValue | undefined): string {
  if (v === undefined) return 'Not set';
  if (v === 0) return 'No lean either way';
  return `${Math.abs(v) === 2 ? 'Leans strongly towards' : 'Leans towards'}: ${v < 0 ? axis.first : axis.second}`;
}
