/**
 * Public Quest entries (npm run quests:entries): files in quests/entries/<id>/<login>.<n>.json.
 *
 *   npm run quests:entries
 *       check every entry file in this folder (format, Quest, numbering)
 *   npm run quests:entries -- --pr
 *       the check CI runs on a pull request that adds entries (needs BASE_REF, PR_AUTHOR, HEAD_SHA
 *       and, optionally, QUESTS_MAINTAINERS from the workflow; the time is the time it runs). It runs
 *       from the base branch and reads the entry files from the pull request's head commit.
 *   npm run quests:entries -- --by <login> --email ~name --quest <id> --received <ISO time>
 *                              (--probability 0.6 | --level 41.5 | --position 2) [--rationale "..."]
 *       (a Debate Quest takes --position, 1 for the first listed, and needs --rationale: the argument)
 *       write an entry someone emailed because GitHub blocks them; commit it in a pull request
 *       of its own within 7 days of close
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadQuests } from '../src/utils/questStore.ts';
import { checkEntryChange, entryFileText, entryPath, parseEntryPath, publicEntryProblems, type PublicEntry } from '../src/utils/questPublicEntries.ts';
import { readPublicEntryFiles } from '../src/utils/questPublicEntryStore.ts';
import type { EntryQuest } from '../src/utils/questEntries.ts';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'quests');
const argv = process.argv.slice(2);
const opt = (name: string) => {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
};
const fail = (msg: string): never => {
  console.error(msg);
  process.exit(1);
};
const quests = loadQuests(dir);
const questFor = (id: string) => {
  const x = quests.find((q) => q.quest.id === id && (q.quest.type === 'forecast' || q.quest.type === 'debate'));
  return x ? { quest: x.quest as EntryQuest, hash: x.hash, approved: x.approved } : undefined;
};
const maintainers = (process.env.QUESTS_MAINTAINERS || 'smcarus').split(/[\s,]+/).filter(Boolean);
const git = (...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });

if (argv.includes('--pr')) {
  const base = process.env.BASE_REF;
  const author = process.env.PR_AUTHOR;
  const head = process.env.HEAD_SHA || 'HEAD';
  if (!base || !author) fail('--pr needs BASE_REF and PR_AUTHOR (set by .github/workflows/quests.yml)');
  const files = git('diff', '--name-status', '--no-renames', `origin/${base}...${head}`)
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      const [status, p] = l.split('\t');
      return { status: status.charAt(0), path: p };
    });
  let existing: string[] = [];
  try {
    existing = git('ls-tree', '-r', '--name-only', `origin/${base}`, '--', 'quests/entries').split('\n').filter(Boolean);
  } catch {
    existing = [];
  }
  const now = new Date().toISOString();
  const problems = checkEntryChange({ files, existing, read: (p) => git('show', `${head}:${p}`), author: author!, maintainers, now, questFor });
  const entries = files.filter((f) => f.path.startsWith('quests/entries/'));
  if (!entries.length) {
    console.log('No entry files in this pull request.');
    process.exit(0);
  }
  console.log(`Checked at ${now} for ${author}.`);
  for (const f of entries) console.log(problems[f.path] ? `FAIL ${f.path}\n${problems[f.path].map((p) => `     - ${p}`).join('\n')}` : `ok   ${f.path}`);
  if (problems.change) console.log(`FAIL pull request\n${problems.change.map((p) => `     - ${p}`).join('\n')}`);
  process.exit(Object.keys(problems).length ? 1 : 0);
}

const emailName = opt('--email');
if (emailName) {
  const by = opt('--by');
  const id = opt('--quest');
  const received = opt('--received');
  if (!by || !id || !received) fail('--email ~name needs --by <your login>, --quest <id> and --received <ISO time>');
  const q = questFor(id!);
  if (!q) fail(`No forecast or debate Quest with id ${id}`);
  const quest = q!.quest;
  const answer = quest.type === 'debate' ? { position: Number(opt('--position')) } : quest.rule.kind === 'level' ? { level: Number(opt('--level')) } : { probability: Number(opt('--probability')) };
  const existing = readPublicEntryFiles(dir).map((f) => parseEntryPath(f.rel)).filter((x) => x && x.questId === id && x.login === emailName);
  const n = existing.reduce((m, x) => Math.max(m, x!.n), 0) + 1;
  const rationale = opt('--rationale');
  const entry: PublicEntry = { questId: id!, questVersion: q!.quest.version, questHash: q!.hash, login: emailName, n, answer, ...(rationale ? { rationale } : {}), via: 'email', receivedAt: new Date(received!).toISOString(), postedBy: by! };
  const rel = entryPath(id!, emailName, n);
  const problems = publicEntryProblems(entry, rel, q);
  if (problems.length) fail(`Not written:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), entryFileText(entry), { flag: 'wx' });
  console.log(`Wrote ${rel}. Commit it in a pull request of its own (git commit -s).`);
  process.exit(0);
}

const files = readPublicEntryFiles(dir);
let bad = 0;
for (const f of files) {
  const at = parseEntryPath(f.rel);
  const p = f.parseError ? [`not valid JSON: ${f.parseError}`] : publicEntryProblems(f.entry, f.rel, at ? questFor(at.questId) : undefined);
  if (at && at.n > 1 && !files.some((g) => g.rel === entryPath(at.questId, at.login, at.n - 1))) p.push(`entry ${at.n - 1} is missing; entries are never removed`);
  if (p.length) bad++;
  console.log(p.length ? `FAIL ${f.rel}\n${p.map((x) => `     - ${x}`).join('\n')}` : `ok   ${f.rel}`);
}
console.log(files.length ? `${files.length} entry file(s), ${bad} with problems.` : 'No entry files yet.');
process.exit(bad ? 1 : 0);
