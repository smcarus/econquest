/**
 * Maintainer dashboard for Quests (go-live checklist): what needs doing now, worked out from the
 * files in quests/ on every call. Nothing is stored. Each item names its kind, how many, and which
 * Quests or files, so the screen can say it in the chosen language and name the command that does it.
 */
import type { Quest } from './quests';
import { questSettlesOn } from './quests';
import { resultState, type ResolutionLine } from './questResolve';
import { QUEST_TRANSLATION_LANGS, translationKey, type QuestTranslationMap } from './questTranslations';
import { countedPublicEntries, type PublicEntry } from './questPublicEntries';

export type MaintainerKind = 'fileProblems' | 'chainBroken' | 'resultsDue' | 'testsToRun' | 'draftsToApprove' | 'translationsMissing';

export interface MaintainerItem {
  kind: MaintainerKind;
  n: number;
  /** Quest ids, file paths, or "id (lang)". At most 20 are listed. */
  ids: string[];
  /** The command that does it, when there is one. */
  command?: string;
}

export interface MaintainerSummary {
  today: string;
  counts: { approved: number; drafts: number; openNow: number; publicEntries: number; results: number };
  items: MaintainerItem[];
}

const LIST_MAX = 20;
const item = (kind: MaintainerKind, ids: string[], command?: string): MaintainerItem => ({ kind, n: ids.length, ids: ids.slice(0, LIST_MAX), ...(command ? { command } : {}) });

export function maintainerSummary(p: {
  quests: Array<{ quest: Quest; approved: boolean }>;
  /** checkQuests(...).problems: file path (or "collection") to problems. */
  fileProblems: Record<string, string[]>;
  lines: ResolutionLine[];
  brokenAt: number;
  entries: PublicEntry[];
  translations: QuestTranslationMap;
  /** Signal Quests already run once ("id@version"). */
  testsRun: Set<string>;
  today: string;
}): MaintainerSummary {
  const { quests, lines, today } = p;
  const approved = quests.filter((x) => x.approved);
  const drafts = quests.filter((x) => !x.approved);
  const items: MaintainerItem[] = [];
  const files = Object.keys(p.fileProblems);
  if (files.length) items.push(item('fileProblems', files, 'npm run quests:check'));
  if (p.brokenAt !== -1) items.push(item('chainBroken', [`quests/resolutions.jsonl line ${p.brokenAt + 1}`], 'npm run quests:resolve -- --verify'));
  const due = approved.filter((x) => x.quest.type === 'forecast' && questSettlesOn(x.quest) <= today && resultState(lines, x.quest.id, x.quest.version).state === 'none').map((x) => x.quest.id);
  if (due.length) items.push(item('resultsDue', due, 'npm run quests:resolve'));
  const tests = approved.filter((x) => x.quest.type === 'signal' && x.quest.closesOn < today && !p.testsRun.has(`${x.quest.id}@${x.quest.version}`)).map((x) => x.quest.id);
  if (tests.length) items.push(item('testsToRun', tests, 'npm run quests:run-tests'));
  const ready = drafts.filter((x) => x.quest.opensOn > today && !p.fileProblems[`quests/drafts/${x.quest.id}.json`]).map((x) => x.quest.id);
  if (ready.length) items.push(item('draftsToApprove', ready, 'npm run quests:approve'));
  const missing: string[] = [];
  for (const x of approved) {
    const have = p.translations[translationKey(x.quest.id, x.quest.version)] || {};
    for (const l of QUEST_TRANSLATION_LANGS) if (!have[l]) missing.push(`${x.quest.id} (${l})`);
  }
  if (missing.length) items.push(item('translationsMissing', missing));
  const openNow = approved.filter((x) => x.quest.opensOn <= today && today <= x.quest.closesOn).length;
  const publicEntries = approved.reduce((n, x) => n + countedPublicEntries(p.entries, x.quest.id, x.quest.version).length, 0);
  const results = new Set(lines.filter((l) => l.kind === 'settled' || l.kind === 'unresolvable').map((l) => `${l.questId}@${l.questVersion}`)).size;
  return { today, counts: { approved: approved.length, drafts: drafts.length, openNow, publicEntries, results }, items };
}
