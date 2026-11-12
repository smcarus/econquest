/**
 * Writes Quest results into quests/resolutions.jsonl (npm run quests:resolve). Each line is fixed:
 * it carries the hash of the line before, so a changed or removed line shows. Commit the file after.
 *
 * The app works out the results, because it has the feeds; it must be running with QUESTS_ENABLED=on
 * (Docker: http://127.0.0.1:3737; `npm run dev`: http://127.0.0.1:3000; or set APP_URL).
 *
 *   npm run quests:resolve -- --by <login>                      record every settled result now due
 *   npm run quests:resolve -- --by <login> --dry-run            show what would be recorded
 *   npm run quests:resolve -- --by <login> --unresolvable <id>  also record that Quest as Unresolvable
 *                                                               (never automatic: a feed may be down)
 *   npm run quests:resolve -- --by <login> --decide <id> stands|unresolvable "reason"
 *                                                               a maintainer's decision on a dispute
 *   npm run quests:resolve -- --by <login> --withdraw <id> "reason"   withdraw a Quest with no result
 *   npm run quests:resolve -- --by <login> --note <id> "text"   a note, e.g. the source revised the figure
 *   npm run quests:resolve -- --by <login> --replicate <id> <figure> "where the app shows it"
 *                                                               a Replication Quest: record the app's own
 *                                                               figure (as the app shows it, with the panel,
 *                                                               settings and date), once entries have closed
 *   npm run quests:resolve -- --verify                          check the chain only
 *
 * Only approved Quests (in quests/ and quests/manifest.json) get results; drafts never do.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadQuests } from '../src/utils/questStore.ts';
import { describeOutcome, resultState, type ResolutionDraft } from '../src/utils/questResolve.ts';
import { appendResolution, loadResolutions, resolutionsPath } from '../src/utils/questResolveStore.ts';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'quests');
const file = resolutionsPath(dir);
const argv = process.argv.slice(2);
const flag = (name: string) => argv.includes(name);
const after = (name: string, n = 1) => {
  const i = argv.indexOf(name);
  return i === -1 ? null : argv.slice(i + 1, i + 1 + n);
};
const fail = (msg: string): never => {
  console.error(msg);
  process.exit(1);
};

const rec = loadResolutions(file);
if (rec.brokenAt !== -1) fail(`quests/resolutions.jsonl is broken at line ${rec.brokenAt + 1} (a line was changed, removed or reordered). Nothing was written. Restore it from git: git checkout -- quests/resolutions.jsonl`);
if (flag('--verify')) {
  console.log(`quests/resolutions.jsonl: ${rec.lines.length} line(s), chain holds.`);
  process.exit(0);
}

const by = after('--by')?.[0];
if (!by || by.startsWith('--')) fail('Say who is recording: --by <your GitHub login>');
const dry = flag('--dry-run');
const quests = loadQuests(dir);
const approved = (id: string) => {
  const x = quests.find((q) => q.quest.id === id);
  if (!x) fail(`No Quest with id ${id}`);
  if (!x!.approved) fail(`${id} is a draft; only approved Quests get results`);
  return x!;
};
const write = (d: ResolutionDraft) => {
  if (dry) return console.log(`would write: ${d.kind} ${d.questId} ${d.reason ?? ''}`);
  const line = appendResolution(file, d);
  console.log(`wrote line ${line.seq}: ${line.kind} ${line.questId}`);
};
const base = (x: ReturnType<typeof approved>) => ({ at: new Date().toISOString(), questId: x.quest.id, questVersion: x.quest.version, questHash: x.hash, by: by! });

const decide = after('--decide', 3);
const withdraw = after('--withdraw', 2);
const note = after('--note', 2);
const replicate = after('--replicate', 3);
if (replicate) {
  const [id, figure, from] = replicate;
  const x = approved(id);
  if (x.quest.type !== 'replication') fail(`${id} is a ${x.quest.type} Quest; --replicate is for Replication Quests`);
  const value = Number(figure);
  if (!figure || !Number.isFinite(value)) fail('--replicate <id> <figure> "where the app shows it": the figure as a number');
  if (!from || from.length < 10) fail('Say where the app shows the figure: the panel, the settings and the date you read it');
  if (new Date().toISOString().slice(0, 10) <= x.quest.closesOn) fail(`Entries close on ${x.quest.closesOn}; record the app's figure after that`);
  if (resultState(rec.lines, x.quest.id, x.quest.version).state !== 'none') fail(`${id} already has a result or was withdrawn; a dispute decision (--decide) is the way to change where it stands`);
  const tolerance = (x.quest as { tolerance: number }).tolerance;
  write({ ...base(x), kind: 'settled', outcome: { answer: 'replication', value, tolerance, from } });
} else if (decide) {
  const [id, choice, reason] = decide;
  if (choice !== 'stands' && choice !== 'unresolvable') fail('--decide <id> stands|unresolvable "reason"');
  if (!reason) fail('Give the reason for the decision');
  const x = approved(id);
  const st = resultState(rec.lines, x.quest.id, x.quest.version);
  if (st.state !== 'settled' && st.state !== 'unresolvable') fail(`${id} has no recorded result to decide on`);
  write({ ...base(x), kind: 'decision', decision: choice as 'stands' | 'unresolvable', reason });
} else if (withdraw) {
  const [id, reason] = withdraw;
  if (!reason) fail('Give the reason for withdrawing');
  const x = approved(id);
  if (resultState(rec.lines, x.quest.id, x.quest.version).state !== 'none') fail(`${id} already has a result or was withdrawn; a dispute decision (--decide) is the way to change where it stands`);
  write({ ...base(x), kind: 'withdrawn', reason });
} else if (note) {
  const [id, text] = note;
  if (!text) fail('Give the text of the note');
  write({ ...base(approved(id)), kind: 'note', reason: text });
} else {
  const wantUnresolvable = new Set(argv.flatMap((a, i) => (a === '--unresolvable' && argv[i + 1] ? [argv[i + 1]] : [])));
  const candidates = process.env.APP_URL ? [process.env.APP_URL] : ['http://127.0.0.1:3737', 'http://127.0.0.1:3000'];
  let reply: { enabled?: boolean; reason?: string; due?: Array<{ questId: string; title: string; approved: boolean; result: ResolutionDraft | null; waiting?: string }> } | null = null;
  for (const url of candidates) {
    try {
      reply = await (await fetch(`${url}/api/quests/due`, { signal: AbortSignal.timeout(120_000) })).json();
      console.log(`Asked the app at ${url} for Quests due a result.`);
      break;
    } catch {
      /* try the next */
    }
  }
  if (!reply) fail(`No app answered at ${candidates.join(' or ')}. Start it (npm run dev, or the Docker app) and run this again.`);
  if (!reply!.enabled) fail(`Quests are switched off in the running app: ${reply!.reason ?? ''} Set QUESTS_ENABLED=on and restart it.`);
  const due = reply!.due ?? [];
  if (!due.length) console.log('No approved Quest is due a result.');
  for (const d of due) {
    const x = quests.find((q) => q.quest.id === d.questId);
    if (!x?.approved) continue;
    if (resultState(loadResolutions(file).lines, x.quest.id, x.quest.version).state !== 'none') {
      console.log(`skip ${d.questId}: already in this folder's quests/resolutions.jsonl (the app's copy is older)`);
      continue;
    }
    if (!d.result) {
      console.log(`wait ${d.questId}: ${d.waiting ?? 'not published yet'}`);
      continue;
    }
    if (d.result.questHash !== x.hash) {
      console.log(`skip ${d.questId}: the app has a different copy of the Quest file; rebuild or restart it from this folder first`);
      continue;
    }
    const draft: ResolutionDraft = { ...d.result, by: by!, at: new Date().toISOString() };
    if (draft.kind === 'unresolvable' && !wantUnresolvable.has(d.questId)) {
      console.log(`check ${d.questId}: the feeds give Unresolvable (${draft.reason}). If that is right, run again with --unresolvable ${d.questId}`);
      continue;
    }
    console.log(`${d.questId}: ${describeOutcome(draft)}`);
    write(draft);
  }
}
