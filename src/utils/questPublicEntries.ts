/**
 * Public Quest entries (Quests step 6): a forecast (or, from step 9, a Debate position and its argument) entered on the public repository by pull request,
 * one small file per entry at quests/entries/<quest id>/<login>.<n>.json.
 *
 * Rules the entry checker enforces (CI runs it on every pull request that adds entries):
 *   - an entry is added, never changed or removed; a pull request with entries holds nothing else
 *   - the login in the file name is the pull request's author (a maintainer may post an emailed
 *     entry for someone GitHub blocks, under a ~name, with the time the email was received)
 *   - only approved Quests, only while entries are open (judged by the time CI runs, which GitHub
 *     sets and nobody can change; a push after close re-runs it and fails)
 *   - a replacement is the next number, <login>.2.json and so on; every earlier entry is kept, and
 *     the highest number counts
 *   - one entry per Quest per pull request
 *
 * Entries are not shown in the app until entries close, so nobody copies the crowd from there. Pull
 * requests on GitHub are public, which the docs say plainly. Browser-safe, pure.
 */
import { entryProblems, type EntryAnswer, type EntryQuest } from './questEntries';

export interface PublicEntry {
  questId: string;
  questVersion: number;
  /** SHA-256 of the Quest file the entry answers. */
  questHash: string;
  login: string;
  /** 1 for a first entry, 2 for its replacement, and so on. */
  n: number;
  answer: EntryAnswer;
  rationale?: string;
  via: 'pull-request' | 'email';
  /** Emailed entries: when the maintainer received the email (ISO), and who posted it. */
  receivedAt?: string;
  postedBy?: string;
}

export const ENTRIES_DIR = 'quests/entries';
const GITHUB_LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
/** An emailed entry's name: ~ and a short lowercase name, so it can never be someone's GitHub login. */
const EMAIL_NAME = /^~[a-z0-9-]{1,30}$/;
const FILE = /^([~A-Za-z0-9][A-Za-z0-9-]{0,38})\.([1-9]\d{0,3})\.json$/;
/** How long after close a maintainer may still post an entry emailed before close. */
export const EMAIL_POST_DAYS = 7;

export const isEntrantName = (s: string) => GITHUB_LOGIN.test(s) || EMAIL_NAME.test(s);
export const entryPath = (questId: string, login: string, n: number) => `${ENTRIES_DIR}/${questId}/${login}.${n}.json`;

/** quests/entries/<id>/<login>.<n>.json -> its parts, or null. */
export function parseEntryPath(p: string): { questId: string; login: string; n: number } | null {
  const parts = p.split('/');
  if (parts.length !== 4 || `${parts[0]}/${parts[1]}` !== ENTRIES_DIR) return null;
  const m = FILE.exec(parts[3]);
  if (!m || !isEntrantName(m[1])) return null;
  return { questId: parts[2], login: m[1], n: Number(m[2]) };
}

/** The entry file a person writes: fixed key order, two-space JSON, newline at the end. */
export function entryFileText(e: PublicEntry): string {
  const ordered: PublicEntry = {
    questId: e.questId,
    questVersion: e.questVersion,
    questHash: e.questHash,
    login: e.login,
    n: e.n,
    answer: e.answer,
    ...(e.rationale ? { rationale: e.rationale } : {}),
    via: e.via,
    ...(e.receivedAt ? { receivedAt: e.receivedAt } : {}),
    ...(e.postedBy ? { postedBy: e.postedBy } : {}),
  };
  return `${JSON.stringify(ordered, null, 2)}\n`;
}

/** Problems with one entry file's contents, against its path and the Quest it answers. */
export function publicEntryProblems(raw: unknown, filePath: string, quest: { quest: EntryQuest; hash: string; approved: boolean } | undefined): string[] {
  const at = parseEntryPath(filePath);
  if (!at) return [`${filePath}: entries go in ${ENTRIES_DIR}/<quest id>/<login>.<n>.json`];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return ['not a JSON object'];
  const e = raw as Partial<PublicEntry>;
  const out: string[] = [];
  const known = new Set(['questId', 'questVersion', 'questHash', 'login', 'n', 'answer', 'rationale', 'via', 'receivedAt', 'postedBy']);
  for (const k of Object.keys(e)) if (!known.has(k)) out.push(`${k}: not a field of an entry`);
  if (e.questId !== at.questId) out.push(`questId: must be ${at.questId}, the folder it is in`);
  if (e.login !== at.login) out.push(`login: must be ${at.login}, as in the file name`);
  if (e.n !== at.n) out.push(`n: must be ${at.n}, as in the file name`);
  if (!quest) return [...out, `No Quest with id ${at.questId}`];
  if (!quest.approved) out.push('Only approved Quests take public entries; this one is a draft');
  if (e.questVersion !== quest.quest.version) out.push(`questVersion: the Quest is version ${quest.quest.version}`);
  if (e.questHash !== quest.hash) out.push('questHash: does not match the Quest file (copy it from the app or the Quest page)');
  if (e.via === 'email') {
    if (!EMAIL_NAME.test(at.login)) out.push('An emailed entry is posted under a ~name, e.g. ~amira');
    if (typeof e.receivedAt !== 'string' || Number.isNaN(Date.parse(e.receivedAt))) out.push('receivedAt: when the email was received (ISO time)');
    if (typeof e.postedBy !== 'string' || !GITHUB_LOGIN.test(e.postedBy)) out.push('postedBy: the maintainer who posted it');
  } else if (e.via === 'pull-request') {
    if (!GITHUB_LOGIN.test(at.login)) out.push('A ~name is only for emailed entries');
    if (e.receivedAt !== undefined || e.postedBy !== undefined) out.push('receivedAt and postedBy are only for emailed entries');
  } else {
    out.push('via: "pull-request" or "email"');
  }
  // Answer and rationale: the same rules as a private entry (dates are checked against the change, below).
  for (const p of entryProblems({ answer: e.answer as EntryAnswer, rationale: e.rationale }, quest.quest, quest.quest.opensOn)) if (!/^Entries (open|closed)/.test(p)) out.push(p);
  return out;
}

export interface EntryChange {
  /** git diff --name-status lines against the base branch: A, M, D (renames off). */
  files: Array<{ status: string; path: string }>;
  /** Entry file paths already on the base branch. */
  existing: string[];
  /** Contents of each added file, by path. */
  read: (path: string) => string;
  author: string;
  maintainers: string[];
  /** When the check runs (ISO), set by CI. */
  now: string;
  questFor: (id: string) => { quest: EntryQuest; hash: string; approved: boolean } | undefined;
}

/**
 * Checks a pull request that adds entries. Returns problems by path ("change" for the whole pull
 * request); empty when it may be merged. A pull request with no entry files returns nothing.
 */
export function checkEntryChange(c: EntryChange): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const add = (k: string, p: string) => (out[k] ||= []).push(p);
  const entryFiles = c.files.filter((f) => f.path.startsWith(`${ENTRIES_DIR}/`));
  if (!entryFiles.length) return out;
  const others = c.files.filter((f) => !f.path.startsWith(`${ENTRIES_DIR}/`));
  if (others.length) add('change', `A pull request with entries holds only entries; also changed: ${others.map((f) => f.path).join(', ')}`);
  const today = c.now.slice(0, 10);
  const maintainer = c.maintainers.includes(c.author);
  const seenQuest = new Set<string>();
  for (const f of entryFiles) {
    if (f.status !== 'A') {
      add(f.path, 'An entry is never changed or removed; a replacement is a new file with the next number');
      continue;
    }
    const at = parseEntryPath(f.path);
    if (!at) {
      add(f.path, `Entries go in ${ENTRIES_DIR}/<quest id>/<login>.<n>.json`);
      continue;
    }
    if (seenQuest.has(at.questId)) add(f.path, 'One entry per Quest in a pull request');
    seenQuest.add(at.questId);
    let raw: unknown;
    try {
      raw = JSON.parse(c.read(f.path));
    } catch (e) {
      add(f.path, `not valid JSON: ${(e as Error).message}`);
      continue;
    }
    const q = c.questFor(at.questId);
    for (const p of publicEntryProblems(raw, f.path, q)) add(f.path, p);
    const e = raw as Partial<PublicEntry>;
    if (EMAIL_NAME.test(at.login)) {
      if (!maintainer) add(f.path, 'Only a maintainer posts emailed entries (~names)');
      if (e.postedBy !== undefined && e.postedBy !== c.author) add(f.path, `postedBy: must be ${c.author}, who opened this pull request`);
    } else if (at.login !== c.author) {
      add(f.path, `The file is named for ${at.login}, but this pull request was opened by ${c.author}; you can only enter for yourself`);
    }
    if (q) {
      if (EMAIL_NAME.test(at.login) && typeof e.receivedAt === 'string') {
        const got = e.receivedAt.slice(0, 10);
        if (got < q.quest.opensOn || got > q.quest.closesOn) add(f.path, `receivedAt: entries were open ${q.quest.opensOn} to ${q.quest.closesOn}`);
        const lastPost = new Date(Date.parse(`${q.quest.closesOn}T00:00:00Z`) + EMAIL_POST_DAYS * 86_400_000).toISOString().slice(0, 10);
        if (today > lastPost) add(f.path, `Emailed entries are posted within ${EMAIL_POST_DAYS} days of close`);
        if (Date.parse(e.receivedAt) > Date.parse(c.now)) add(f.path, 'receivedAt: is in the future');
      } else {
        if (today < q.quest.opensOn) add(f.path, `Entries open on ${q.quest.opensOn}`);
        if (today > q.quest.closesOn) add(f.path, `Entries closed on ${q.quest.closesOn} (this check ran ${c.now}, after a push or a re-run; the time cannot be set back)`);
      }
    }
    const prior = c.existing.map(parseEntryPath).filter((x): x is NonNullable<typeof x> => !!x && x.questId === at.questId && x.login === at.login);
    const next = prior.reduce((m, x) => Math.max(m, x.n), 0) + 1;
    if (at.n !== next) add(f.path, prior.length ? `This replaces entry ${next - 1}; name it ${at.login}.${next}.json (if your entry ${next - 1} is still waiting to be merged, wait for it or ask in the pull request)` : `A first entry is ${at.login}.1.json`);
  }
  return out;
}

/** The entry that counts for each person on a Quest: the highest number. */
export function countedPublicEntries(entries: PublicEntry[], questId: string, version: number): PublicEntry[] {
  const best = new Map<string, PublicEntry>();
  for (const e of entries) {
    if (e.questId !== questId || e.questVersion !== version) continue;
    const prev = best.get(e.login);
    if (!prev || e.n > prev.n) best.set(e.login, e);
  }
  return [...best.values()].sort((a, b) => a.login.localeCompare(b.login));
}

/** Median and quartiles of the counted answers (the crowd), shown only after close. */
export function entrySpread(values: number[]): { n: number; low: number; median: number; high: number } | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const q = (p: number) => {
    const i = (s.length - 1) * p;
    const lo = Math.floor(i);
    return Math.round((s[lo] + (s[Math.ceil(i)] - s[lo]) * (i - lo)) * 1e4) / 1e4;
  };
  return { n: s.length, low: q(0.25), median: q(0.5), high: q(0.75) };
}

/** GitHub's "new file" page, prefilled; GitHub offers a fork to anyone who cannot write to the repository. */
export function newFileUrl(repo: string, branch: string, filePath: string, text: string): string {
  return `https://github.com/${repo}/new/${encodeURIComponent(branch)}?filename=${encodeURIComponent(filePath)}&value=${encodeURIComponent(text)}`;
}
