import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { maintainerSummary } from '../src/utils/questMaintainer';
import { checkQuests, loadQuests, loadTranslations } from '../src/utils/questStore';
import type { ForecastQuest, Quest } from '../src/utils/quests';
import fs from 'fs';
import { repoQuest } from './repoQuest';

const brent: ForecastQuest = repoQuest('tutorial-brent-week.json');

test('the dashboard lists results due, drafts ready, missing translations and a broken chain, with the command for each', () => {
  const approved = { ...brent, approvedBy: 'smcarus', registeredOn: '2026-11-01', opensOn: '2026-11-02', closesOn: '2026-11-10' } as Quest;
  const draft = { ...brent, id: 'later-draft', registeredOn: '2026-11-01', opensOn: '2026-12-20', closesOn: '2026-12-30', rule: { ...brent.rule, to: { on: '2027-01-05' } } } as Quest;
  const s = maintainerSummary({ quests: [{ quest: approved, approved: true }, { quest: draft, approved: false }], fileProblems: {}, lines: [], brokenAt: -1, entries: [], translations: {}, testsRun: new Set(), today: '2026-12-19' });
  const kinds = Object.fromEntries(s.items.map((i) => [i.kind, i]));
  assert.deepEqual(kinds.resultsDue?.ids, [brent.id]);
  assert.equal(kinds.resultsDue?.command, 'npm run quests:resolve');
  assert.deepEqual(kinds.draftsToApprove?.ids, ['later-draft']);
  assert.equal(kinds.translationsMissing?.n, 3);
  assert.equal(kinds.chainBroken, undefined);
  assert.deepEqual(s.counts, { approved: 1, drafts: 1, openNow: 0, publicEntries: 0, results: 0 });
  const broken = maintainerSummary({ quests: [], fileProblems: { 'quests/x.json': ['bad'] }, lines: [], brokenAt: 4, entries: [], translations: {}, testsRun: new Set(), today: '2026-12-01' });
  assert.deepEqual(broken.items.map((i) => i.kind), ['fileProblems', 'chainBroken']);
  assert.match(broken.items[1]!.ids[0]!, /line 5/);
  assert.deepEqual(maintainerSummary({ quests: [], fileProblems: {}, lines: [], brokenAt: -1, entries: [], translations: {}, testsRun: new Set(), today: '2026-12-01' }).items, []);
});

test('on the files in quests/ today: no file problems, every draft is ready to approve before it opens', () => {
  const dir = path.join(process.cwd(), 'quests');
  const quests = loadQuests(dir);
  const s = maintainerSummary({ quests, fileProblems: checkQuests(dir).problems, lines: [], brokenAt: -1, entries: [], translations: loadTranslations(dir, quests), testsRun: new Set(), today: '2026-11-28' });
  assert.equal(s.items.find((i) => i.kind === 'fileProblems'), undefined);
  const drafts = quests.filter((x) => !x.approved).length;
  const item = s.items.find((i) => i.kind === 'draftsToApprove');
  assert.equal(item?.n ?? 0, drafts, 'every draft is listed as ready to approve (none listed when there are no drafts)');
  assert.ok((item?.ids.length ?? 0) <= 20, 'at most 20 listed');
});
