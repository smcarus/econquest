/**
 * Quests (open-source questions anyone can answer, argue and check). Step 2 of the Quests plan: the
 * file format and its checks.
 *
 * A Quest is one JSON file. Drafts live in quests/drafts/ and may be edited; an approved Quest lives
 * in quests/ and is fixed when merged: its SHA-256 goes in quests/manifest.json, and a changed file
 * needs a new version (a new file), exactly like the pre-registered tests in docs/validation/.
 *
 * Four types:
 *   forecast     settled from a feed by a rule in src/utils/questRules.ts
 *   signal       contributors propose pre-registered tests; each is run once and badged as usual
 *   replication  reproduce a figure the app shows, within a stated tolerance
 *   debate       not scored; closes with an evidence map of the positions and the figures cited
 *
 * A Quest file never holds a data figure: every number shown with it is read live from a feed. The
 * numbers it may hold are question parameters (a threshold, a tolerance).
 *
 * Browser-safe, pure.
 */
import { isDate, ruleAnswer, ruleProblems, ruleSettleDate, type QuestRule } from './questRules';

export const QUEST_TYPES = ['forecast', 'signal', 'replication', 'debate'] as const;
export type QuestType = (typeof QUEST_TYPES)[number];

export const QUEST_TOPICS = ['monetary', 'fiscal', 'fx', 'external', 'debt', 'growth', 'inflation', 'commodities', 'positioning', 'geopolitics'] as const;
export type QuestTopic = (typeof QUEST_TOPICS)[number];

export const QUEST_REGIONS = ['Americas', 'EMEA', 'Asia-Pacific', 'Global'] as const;
export type QuestRegion = (typeof QUEST_REGIONS)[number];

/** Tools a Replication Quest can point at. */
export const REPLICATION_TOOLS = ['exercises', 'history_data', 'replication_pack', 'econometrics_lab', 'model_sandbox'] as const;
export type ReplicationTool = (typeof REPLICATION_TOOLS)[number];

export const TITLE_MAX = 160;
export const SUMMARY_MAX = 1200;
export const POSITION_MAX = 200;

export interface QuestBase {
  id: string;
  version: number;
  type: QuestType;
  title: string;
  /** Plain-words background: what is being asked and why it matters. No figures. */
  summary: string;
  countries: string[];
  topics: QuestTopic[];
  region: QuestRegion;
  /** The day it was written down (and, once approved, merged). */
  registeredOn: string;
  opensOn: string;
  closesOn: string;
  /** GitHub login of the author. */
  author: string;
  /** GitHub login of the maintainer who approved it; absent on a draft. */
  approvedBy?: string;
  /** Set only for the beginner Quest that settles within a week. */
  tutorial?: boolean;
  /** Link to the GitHub Discussion, added when it is opened. */
  discussion?: string;
  knownLimits: string[];
}

export interface ForecastQuest extends QuestBase {
  type: 'forecast';
  rule: QuestRule;
  /** What happens if the series has no value: another series to read instead, or Unresolvable. */
  fallback: { rule: QuestRule } | 'unresolvable';
}

export interface SignalQuest extends QuestBase {
  type: 'signal';
  /** The idea to test, in words. Entries are pre-registered test files that follow the signal standard. */
  hypothesis: string;
  settlesOn: string;
}

export interface ReplicationQuest extends QuestBase {
  type: 'replication';
  tool: ReplicationTool;
  /** What to reproduce, as the app labels it, and the settings to use. */
  target: string;
  /** Largest absolute difference from the app's figure that counts as a match, in the figure's unit. */
  tolerance: number;
  settlesOn: string;
}

export interface DebateQuest extends QuestBase {
  type: 'debate';
  /** Two to four positions an entry can take. */
  positions: string[];
  settlesOn: string;
}

export type Quest = ForecastQuest | SignalQuest | ReplicationQuest | DebateQuest;

export type QuestHorizon = 'week' | 'month' | 'quarter' | 'year' | 'multi_year';

export const HORIZON_LABEL: Record<QuestHorizon, string> = {
  week: 'Within a week',
  month: 'Within a month',
  quarter: 'Within a quarter',
  year: 'Within a year',
  multi_year: 'More than a year',
};

/** The day a Quest's result is due (a Forecast Quest: the last date its rule reads). */
export function questSettlesOn(q: Quest): string {
  return q.type === 'forecast' ? ruleSettleDate(q.rule) : q.settlesOn;
}

const days = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

/** How long from entries closing to the result. */
export function questHorizon(q: Quest): QuestHorizon {
  const d = days(q.closesOn, questSettlesOn(q));
  if (d <= 8) return 'week';
  if (d <= 35) return 'month';
  if (d <= 100) return 'quarter';
  if (d <= 380) return 'year';
  return 'multi_year';
}

export type QuestStatus = 'draft' | 'upcoming' | 'open' | 'closed' | 'due';

/** Status from the dates alone; settled, unresolvable and withdrawn come from the resolution record (step 5). */
export function questStatus(q: Quest, today: string): QuestStatus {
  if (!q.approvedBy) return 'draft';
  if (today < q.opensOn) return 'upcoming';
  if (today <= q.closesOn) return 'open';
  if (today < questSettlesOn(q)) return 'closed';
  return 'due';
}

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const str = (s: unknown, max: number) => typeof s === 'string' && s.trim().length > 0 && s.length <= max;

/** File name a Quest must be saved under. */
export function questFileName(q: Pick<Quest, 'id' | 'version'>): string {
  return q.version === 1 ? `${q.id}.json` : `${q.id}.v${q.version}.json`;
}

export interface QuestCheckOptions {
  /** True for a file in quests/ (approved and fixed); false for quests/drafts/. */
  approved: boolean;
  /** The file's name, checked against id and version. */
  fileName?: string;
}

/** Everything wrong with a Quest file; empty when it passes. */
export function questProblems(raw: unknown, opts: QuestCheckOptions): string[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return ['not a JSON object'];
  const q = raw as Partial<Quest> & Record<string, unknown>;
  const out: string[] = [];
  if (typeof q.id !== 'string' || !ID.test(q.id) || q.id.length > 60) out.push('id: lower-case words joined by hyphens, at most 60 characters');
  if (!Number.isInteger(q.version) || (q.version as number) < 1) out.push('version: a whole number from 1');
  if (opts.fileName && typeof q.id === 'string' && Number.isInteger(q.version) && opts.fileName !== questFileName(q as Quest)) out.push(`file name: must be ${questFileName(q as Quest)}`);
  if (!QUEST_TYPES.includes(q.type as QuestType)) out.push(`type: one of ${QUEST_TYPES.join(', ')}`);
  if (!str(q.title, TITLE_MAX)) out.push(`title: 1 to ${TITLE_MAX} characters`);
  if (!str(q.summary, SUMMARY_MAX)) out.push(`summary: 1 to ${SUMMARY_MAX} characters`);
  if (!Array.isArray(q.countries) || !q.countries.length || !q.countries.every((c) => typeof c === 'string' && /^[A-Z]{3}$/.test(c))) out.push('countries: at least one ISO3 code (WLD for the world)');
  if (!Array.isArray(q.topics) || !q.topics.length || !q.topics.every((t) => QUEST_TOPICS.includes(t as QuestTopic))) out.push(`topics: one or more of ${QUEST_TOPICS.join(', ')}`);
  if (!QUEST_REGIONS.includes(q.region as QuestRegion)) out.push(`region: one of ${QUEST_REGIONS.join(', ')}`);
  if (typeof q.author !== 'string' || !LOGIN.test(q.author)) out.push('author: a GitHub login');
  if (q.approvedBy !== undefined && (typeof q.approvedBy !== 'string' || !LOGIN.test(q.approvedBy))) out.push('approvedBy: a GitHub login');
  if (opts.approved && !q.approvedBy) out.push('approvedBy: an approved Quest names the maintainer who approved it');
  if (!opts.approved && q.approvedBy) out.push('approvedBy: a draft has no approver; move the file to quests/ when it is approved');
  if (q.discussion !== undefined && (typeof q.discussion !== 'string' || !/^https:\/\/github\.com\/[^/]+\/[^/]+\/discussions\/\d+$/.test(q.discussion))) out.push('discussion: a https://github.com/<owner>/<repo>/discussions/<n> link');
  if (!Array.isArray(q.knownLimits) || !q.knownLimits.every((k) => str(k, 400))) out.push('knownLimits: a list of short sentences (it may be empty)');
  for (const k of ['registeredOn', 'opensOn', 'closesOn'] as const) if (!isDate(q[k])) out.push(`${k}: a YYYY-MM-DD date`);
  if (out.some((p) => /^(registeredOn|opensOn|closesOn|type)/.test(p))) return out;
  const base = q as Quest;
  if (base.opensOn < base.registeredOn) out.push('opensOn: cannot be before registeredOn');
  if (base.closesOn <= base.opensOn) out.push('closesOn: must be after opensOn');

  switch (base.type) {
    case 'forecast': {
      out.push(...ruleProblems(base.rule, base.closesOn));
      if (base.fallback !== 'unresolvable') {
        const fb = base.fallback as { rule?: QuestRule } | undefined;
        if (!fb?.rule) out.push('fallback: { "rule": ... } or "unresolvable"');
        else {
          out.push(...ruleProblems(fb.rule, base.closesOn).map((p) => `fallback.${p}`));
          if (base.rule && fb.rule.kind !== base.rule.kind) out.push('fallback.rule: must be the same kind as the rule');
          else if (base.rule && ruleAnswer(fb.rule) !== ruleAnswer(base.rule)) out.push('fallback.rule: must take the same kind of answer');
        }
      }
      if (base.rule?.ref && !base.countries.includes(base.rule.ref.country)) out.push('countries: must include the country of the rule');
      break;
    }
    case 'signal':
      if (!str(base.hypothesis, SUMMARY_MAX)) out.push(`hypothesis: 1 to ${SUMMARY_MAX} characters`);
      break;
    case 'replication':
      if (!REPLICATION_TOOLS.includes(base.tool)) out.push(`tool: one of ${REPLICATION_TOOLS.join(', ')}`);
      if (!str(base.target, SUMMARY_MAX)) out.push('target: what to reproduce');
      if (typeof base.tolerance !== 'number' || !(base.tolerance > 0)) out.push('tolerance: a number above zero');
      break;
    case 'debate':
      if (!Array.isArray(base.positions) || base.positions.length < 2 || base.positions.length > 4 || !base.positions.every((p) => str(p, POSITION_MAX))) out.push(`positions: 2 to 4 short positions (up to ${POSITION_MAX} characters each)`);
      else if (new Set(base.positions.map((p) => p.trim().toLowerCase())).size !== base.positions.length) out.push('positions: must differ');
      break;
  }
  if (base.type !== 'forecast') {
    const s = (base as SignalQuest).settlesOn;
    if (!isDate(s)) out.push('settlesOn: a YYYY-MM-DD date');
    else if (s <= base.closesOn) out.push('settlesOn: must be after closesOn');
  }
  if (base.tutorial && base.type === 'forecast' && !out.length && questHorizon(base) !== 'week') out.push('tutorial: a tutorial Quest settles within a week of closing');
  return out;
}

/**
 * Checks across all Quest files: one id+version per file, and each approved file's hash listed in
 * the manifest (a changed approved file needs a new version, never an edit).
 */
export function collectionProblems(
  files: Array<{ name: string; approved: boolean; json: unknown; hash: string }>,
  manifest: Record<string, string>,
): string[] {
  const out: string[] = [];
  const seen = new Map<string, string>();
  for (const f of files) {
    const q = f.json as Partial<Quest> | null;
    if (q && typeof q.id === 'string' && typeof q.version === 'number') {
      const key = `${q.id}@${q.version}`;
      if (seen.has(key)) out.push(`${f.name}: same id and version as ${seen.get(key)}`);
      seen.set(key, f.name);
    }
    if (f.approved) {
      if (!manifest[f.name]) out.push(`${f.name}: not in quests/manifest.json (run npm run quests:check -- --add)`);
      else if (manifest[f.name] !== f.hash) out.push(`${f.name}: changed after it was approved (hash does not match the manifest); write a new version instead`);
    }
  }
  const approvedNames = new Set(files.filter((f) => f.approved).map((f) => f.name));
  for (const name of Object.keys(manifest)) if (!approvedNames.has(name)) out.push(`quests/manifest.json lists ${name}, which is missing; an approved Quest is withdrawn by a resolution line, never deleted`);
  return out;
}
