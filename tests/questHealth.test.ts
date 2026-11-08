import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import express from 'express';
import type { AddressInfo } from 'net';
import { registerQuestRoutes } from '../src/server/routes/quests';
import path from 'path';
import { GRACE_DAYS, questHealth } from '../src/utils/questHealth';
import { boardHtml } from '../src/utils/questBoard';
import { computeStats } from '../src/utils/questStats';
import { buildDataset, csvCell } from '../src/utils/questDataset';
import type { PublicEntry } from '../src/utils/questPublicEntries';
import type { ResolutionLine } from '../src/utils/questResolve';
import type { DebateQuest, ForecastQuest, ReplicationQuest, SignalQuest } from '../src/utils/quests';
import type { QuestTestVerdict } from '../src/utils/questSignal';
import { RESEARCH_NOTICE } from '../src/utils/disclaimer';

const read = (f: string) => JSON.parse(fs.readFileSync(path.join(process.cwd(), 'quests', 'drafts', f), 'utf8'));
// tutorial: closes 2026-12-11, due 2026-12-18; tur: closes 2026-12-31, due 2027-06-30
const brent: ForecastQuest = { ...read('tutorial-brent-week.json'), approvedBy: 'smcarus' };
const tur: ForecastQuest = { ...read('tur-policy-2027h1.json'), approvedBy: 'smcarus' };
// replication and debate close 2027-02-28, due 2027-03-15; signal closes 2027-03-31, due 2027-04-30
const rep: ReplicationQuest = { ...read('bra-bohn-replication.json'), approvedBy: 'smcarus' };
const deb: DebateQuest = { ...read('egy-reserves-debate.json'), approvedBy: 'smcarus' };
const sig: SignalQuest = { ...read('credit-gap-crisis-signal.json'), approvedBy: 'smcarus' };
const draft: ForecastQuest = { ...brent, id: 'draft-one', approvedBy: undefined };
const quests = [brent, tur, rep, deb, sig].map((quest) => ({ quest, approved: true })).concat([{ quest: draft, approved: false }]);
const e = (questId: string, login: string, answer: PublicEntry['answer'], extra: Partial<PublicEntry> = {}): PublicEntry => ({ questId, questVersion: 1, questHash: 'h', login, n: 1, answer, via: 'pull-request', ...extra });
const entries: PublicEntry[] = [
  e(brent.id, 'alice', { probability: 0.6 }),
  e(brent.id, 'alice', { probability: 0.7 }, { n: 2, rationale: '=SUM(A1) "quoted", and more' }),
  e(brent.id, 'bob', { probability: 0.4 }),
  e(tur.id, 'alice', { probability: 0.3 }),
  e(rep.id, '~amina', { value: 0.06 }, { via: 'email', code: 'https://github.com/a/b/blob/main/x.R', receivedAt: '2027-02-01T09:00:00Z' }),
  e(deb.id, 'bob', { position: 1 }, { rationale: 'x'.repeat(50) }),
  e(sig.id, 'carol', { test: { method: 'cftc_crowding' } as never }),
  e(draft.id, 'dan', { probability: 0.5 }),
];
const line = (seq: number, questId: string, at: string, extra: Partial<ResolutionLine> = {}): ResolutionLine => ({ seq, at, kind: 'settled', questId, questVersion: 1, questHash: 'h', by: 'smcarus', prev: 'p', hash: `h${seq}`, ...extra });
const lines: ResolutionLine[] = [
  line(1, brent.id, '2026-12-19T08:00:00Z', { outcome: { answer: 'probability', happened: true, baseRate: 0.5 }, readings: [{ value: 80, date: '2026-12-18' }], via: 'rule' }),
  line(2, rep.id, '2027-04-20T08:00:00Z', { outcome: { answer: 'replication', value: 0.06, tolerance: 0.005, from: 'History & data' } }),
];
const tests: QuestTestVerdict[] = [];
const crowd = { n: 1, needs: 11 };

test('health counts people by closing month, entries per Quest, and results recorded on time', () => {
  const h = questHealth({ quests, entries, lines, tests, crowd, today: '2027-05-20' });
  assert.equal(h.firstOpened, '2026-12-01');
  assert.equal(h.reviewOn, '2027-06-01');
  assert.equal(h.approved, 5, 'drafts are left out');
  assert.equal(h.closed, 5);
  assert.deepEqual(h.months, [
    { month: '2026-12', questsClosed: 2, entries: 3, people: 2 },
    { month: '2027-02', questsClosed: 2, entries: 2, people: 2 },
    { month: '2027-03', questsClosed: 1, entries: 1, people: 1 },
  ]);
  assert.equal(h.totalEntries, 6, 'a replacement replaces, never adds');
  assert.equal(h.totalPeople, 4);
  assert.equal(h.returning, 1, 'bob entered in two months');
  assert.equal(h.perQuest.find((q) => q.id === brent.id)!.entries, 2);
  assert.equal(h.medianEntries, 1);
  const st = Object.fromEntries(h.onTime.quests.map((q) => [q.id, q.state]));
  assert.equal(st[brent.id], 'on_time');
  assert.equal(st[rep.id], 'late', `recorded more than ${GRACE_DAYS} days after it was due`);
  assert.equal(st[sig.id], 'overdue', 'a Signal Quest with a test entered and no verdict');
  assert.equal(st[tur.id], undefined, 'not due yet');
  assert.equal(st[deb.id], undefined, 'debates have no result');
  assert.deepEqual([h.onTime.due, h.onTime.onTime, h.onTime.late, h.onTime.overdue], [3, 1, 1, 1]);
  assert.equal(h.onTime.share, 1 / 3);
  assert.deepEqual(h.crowd, crowd);
});

test('health: inside the grace period a due Quest waits; a test verdict settles a Signal Quest; nothing approved means nothing to measure', () => {
  const h = questHealth({ quests, entries, lines, tests: [{ questId: sig.id, questVersion: 1, ranAt: '2027-05-02T03:30:00Z' } as QuestTestVerdict], crowd, today: '2027-05-03' });
  assert.equal(h.onTime.quests.find((q) => q.id === sig.id)!.state, 'on_time');
  const early = questHealth({ quests, entries, lines: [], tests, crowd, today: '2026-12-25' });
  assert.equal(early.onTime.quests.find((q) => q.id === brent.id)!.state, 'waiting');
  assert.equal(early.onTime.share, null);
  const none = questHealth({ quests: [{ quest: draft, approved: false }], entries, lines, tests, crowd, today: '2027-05-03' });
  assert.equal(none.approved, 0);
  assert.equal(none.reviewOn, null);
  assert.equal(none.medianEntries, null);
});

test('the board shows the health section', () => {
  const stats = computeStats({ quests, entries, lines, accounts: {} });
  const health = questHealth({ quests, entries, lines, tests, crowd: stats.crowd, today: '2027-05-20' });
  const html = boardHtml({ stats, quests, lines, profiles: [], health, repo: '', today: '2027-05-20' });
  assert.match(html, /<h2>Is it working\?<\/h2>/);
  assert.match(html, /reviewed on 2027-06-01/);
  assert.match(html, /33% of results were recorded within 14 days/);
});

test('CSV cells are quoted when needed and formula-like text is defused', () => {
  assert.equal(csvCell('plain'), 'plain');
  assert.equal(csvCell('a, "b"'), '"a, ""b"""');
  assert.equal(csvCell('=1+1'), "'=1+1");
  assert.equal(csvCell(-0.5), '-0.5', 'numbers are left alone');
  assert.equal(csvCell(undefined), '');
  assert.equal(csvCell({ a: 1 }), '"{""a"":1}"');
});

test('the yearly dataset holds the Quests that closed in the year, all their entries and results, and no stance profiles', () => {
  const stats = computeStats({ quests, entries, lines, accounts: {} });
  const ds = buildDataset({ year: '2026', quests: quests.map((q) => ({ ...q, hash: `sha-${q.quest.id}` })), entries, lines, tests, stats, repo: 'e-conquest/econquest', builtOn: '2028-01-05' });
  assert.deepEqual(Object.keys(ds.files).sort(), ['CITATION.cff', 'README.md', 'entries.csv', 'quests.csv', 'results.csv', 'scores.csv', 'test-verdicts.csv']);
  assert.deepEqual(ds.counts, { quests: 2, entries: 4, results: 1, verdicts: 0, scores: 2 });
  const q = ds.files['quests.csv'].split('\r\n');
  assert.match(q[0], /^quest_id,version,type,title/);
  assert.ok(q[1].startsWith(`${brent.id},1,forecast,`), 'ordered by closing day');
  assert.match(q[1], /sha-tutorial-brent-week/);
  assert.match(q[1], /US EIA daily spot prices/);
  assert.doesNotMatch(ds.files['quests.csv'], /draft-one|bra-bohn/);
  const en = ds.files['entries.csv'];
  assert.match(en, new RegExp(`${brent.id},1,h,alice,1,false,pull-request,0.6`));
  assert.match(en, new RegExp(`${brent.id},1,h,alice,2,true,pull-request,0.7`));
  assert.match(en, /"'=SUM\(A1\) ""quoted"", and more"/);
  assert.match(ds.files['results.csv'], /^seq,at,kind/);
  assert.match(ds.files['results.csv'], /1,2026-12-19T08:00:00Z,settled,tutorial-brent-week,1,h,probability,true,0.5/);
  assert.match(ds.files['scores.csv'], /tutorial-brent-week,alice,probability,0.7,true/);
  const readme = ds.files['README.md'];
  assert.match(readme, /# EconQuest Quests dataset 2026/);
  assert.match(readme, /https:\/\/github\.com\/e-conquest\/econquest/);
  assert.match(readme, /Stance profiles/);
  assert.match(readme, /CC BY 4\.0/);
  assert.match(readme, /U\.S\. Energy Information Administration|EIA/);
  assert.ok(readme.includes(RESEARCH_NOTICE));
  assert.match(ds.files['CITATION.cff'], /license: CC-BY-4.0/);
  assert.doesNotMatch(Object.values(ds.files).join('\n'), /axes|shownSince|fx_regime/, 'no stance profile data');
  const y27 = buildDataset({ year: '2027', quests: quests.map((x) => ({ ...x, hash: 'h' })), entries, lines, tests, stats, repo: '', builtOn: '2028-01-05' });
  assert.equal(y27.counts.quests, 3);
  assert.match(y27.files['entries.csv'], /~amina/);
  assert.doesNotMatch(y27.files['README.md'], /github\.com/);
});

test('GET /api/quests/health is off with the switch and on works from the files', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qhealth-'));
  let on = false;
  const app = express();
  registerQuestRoutes(app, { seriesFor: async (iso3) => ({ iso3, series: [], missing: [] }), enabled: () => on, dir, entryFile: path.join(dir, 'e.jsonl') });
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    assert.equal((await (await fetch(`${base}/api/quests/health`)).json()).enabled, false);
    on = true;
    const j = await (await fetch(`${base}/api/quests/health`)).json();
    assert.equal(j.approved, 0);
    assert.equal(j.onTime.graceDays, GRACE_DAYS);
    fs.writeFileSync(path.join(dir, 'resolutions.jsonl'), 'not json\n');
    assert.match((await (await fetch(`${base}/api/quests/health`)).json()).error, /broken at line 1/);
  } finally {
    await new Promise((r) => server.close(r));
  }
});
