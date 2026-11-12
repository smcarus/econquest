import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { AddressInfo } from 'net';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { checkEntryChange, countedPublicEntries, entryFileText, entryPath, entrySpread, newFileUrl, parseEntryPath, publicEntryProblems, type EntryChange, type PublicEntry } from '../src/utils/questPublicEntries';
import { loadPublicEntries, readPublicEntryFiles } from '../src/utils/questPublicEntryStore';
import { loadQuests, readQuestFiles, writeManifest } from '../src/utils/questStore';
import { questsRepo, registerQuestRoutes } from '../src/server/routes/quests';
import type { ForecastQuest } from '../src/utils/quests';
import type { SeriesSet } from '../src/utils/seriesHistory';

const brent: ForecastQuest = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'quests', 'drafts', 'tutorial-brent-week.json'), 'utf8'));
const quest = { ...brent, registeredOn: '2026-11-01', opensOn: '2026-11-02', closesOn: '2026-12-11', approvedBy: 'smcarus' } as ForecastQuest;
const HASH = 'a'.repeat(64);
const qFor = (id: string) => (id === quest.id ? { quest, hash: HASH, approved: true } : undefined);
const entry = (login: string, n: number, extra: Partial<PublicEntry> = {}): PublicEntry => ({ questId: quest.id, questVersion: 1, questHash: HASH, login, n, answer: { probability: 0.6 }, via: 'pull-request', ...extra });

function change(files: Record<string, string | null>, over: Partial<EntryChange> = {}): Record<string, string[]> {
  return checkEntryChange({
    files: Object.keys(files).map((p) => ({ status: files[p] === null ? 'M' : 'A', path: p })),
    existing: [],
    read: (p) => files[p] ?? '',
    author: 'alice',
    maintainers: ['smcarus'],
    now: '2026-12-01T10:00:00Z',
    questFor: qFor,
    ...over,
  });
}

test('entry paths: quests/entries/<id>/<login>.<n>.json, ~names for emailed entries', () => {
  assert.deepEqual(parseEntryPath('quests/entries/tutorial-brent-week/alice.2.json'), { questId: 'tutorial-brent-week', login: 'alice', n: 2 });
  assert.deepEqual(parseEntryPath('quests/entries/x/~amira.1.json'), { questId: 'x', login: '~amira', n: 1 });
  for (const bad of ['quests/entries/x/alice.json', 'quests/entries/x/alice.0.json', 'quests/entries/x/y/alice.1.json', 'quests/x/alice.1.json', 'quests/entries/x/-a.1.json']) assert.equal(parseEntryPath(bad), null, bad);
  assert.equal(entryPath('q', 'bob', 3), 'quests/entries/q/bob.3.json');
});

test('a first entry opened while entries are open, by its own author, passes', () => {
  const p = entryPath(quest.id, 'alice', 1);
  assert.deepEqual(change({ [p]: entryFileText(entry('alice', 1)) }), {});
});

test('the checker refuses entries for someone else, after close, changed, mixed with other files, misnumbered, or one Quest twice', () => {
  const p1 = entryPath(quest.id, 'alice', 1);
  const text = entryFileText(entry('alice', 1));
  assert.match(change({ [p1]: text }, { author: 'mallory' })[p1].join(), /opened by mallory; you can only enter for yourself/);
  assert.match(change({ [p1]: text }, { now: '2026-12-12T00:00:01Z' })[p1].join(), /Entries closed on 2026-12-11/);
  assert.match(change({ [p1]: text }, { now: '2026-11-01T23:00:00Z' })[p1].join(), /Entries open on 2026-11-02/);
  assert.match(change({ [p1]: null })[p1].join(), /never changed or removed/);
  assert.match(change({ [p1]: text, 'src/App.tsx': 'x' }).change.join(), /holds only entries; also changed: src\/App\.tsx/);
  assert.match(change({ [entryPath(quest.id, 'alice', 2)]: entryFileText(entry('alice', 2)) })[entryPath(quest.id, 'alice', 2)].join(), /A first entry is alice\.1\.json/);
  // A replacement is the next number after what is on the base branch.
  const p2 = entryPath(quest.id, 'alice', 2);
  assert.deepEqual(change({ [p2]: entryFileText(entry('alice', 2)) }, { existing: [p1] }), {});
  assert.match(change({ [p1]: text }, { existing: [p1] })[p1].join(), /name it alice\.2\.json/);
  // Bad answer and wrong Quest hash.
  const bad = entryFileText({ ...entry('alice', 1), answer: { probability: 1.5 }, questHash: 'b'.repeat(64) });
  const probs = change({ [p1]: bad })[p1].join(' | ');
  assert.match(probs, /probability from 0 to 1/);
  assert.match(probs, /questHash: does not match/);
  // A draft Quest takes no public entries.
  assert.match(change({ [p1]: text }, { questFor: () => ({ quest, hash: HASH, approved: false }) })[p1].join(), /Only approved Quests/);
  // Files outside quests/entries only: nothing to check here.
  assert.deepEqual(change({ 'src/App.tsx': 'x' }), {});
});

test('emailed entries: only a maintainer posts them, under a ~name, received before close, posted within 7 days', () => {
  const p = entryPath(quest.id, '~amira', 1);
  const e = entry('~amira', 1, { via: 'email', receivedAt: '2026-12-10T08:00:00Z', postedBy: 'smcarus' });
  assert.deepEqual(change({ [p]: entryFileText(e) }, { author: 'smcarus', now: '2026-12-14T09:00:00Z' }), {});
  assert.match(change({ [p]: entryFileText(e) }, { author: 'alice' })[p].join(), /Only a maintainer/);
  assert.match(change({ [p]: entryFileText({ ...e, receivedAt: '2026-12-12T08:00:00Z' }) }, { author: 'smcarus', now: '2026-12-14T09:00:00Z' })[p].join(), /entries were open 2026-11-02 to 2026-12-11/);
  assert.match(change({ [p]: entryFileText(e) }, { author: 'smcarus', now: '2026-12-19T09:00:00Z' })[p].join(), /within 7 days/);
  // A GitHub login cannot be posted as emailed, and a ~name cannot come by pull request.
  assert.match(publicEntryProblems({ ...entry('bob', 1), via: 'email', receivedAt: '2026-12-01T00:00:00Z', postedBy: 'smcarus' }, entryPath(quest.id, 'bob', 1), qFor(quest.id)).join(), /~name/);
  assert.match(publicEntryProblems(entry('~x', 1), entryPath(quest.id, '~x', 1), qFor(quest.id)).join(), /only for emailed/);
});

test('the highest number counts per person; the spread is the middle half', () => {
  const all = [entry('alice', 1), entry('alice', 2, { answer: { probability: 0.9 } }), entry('bob', 1, { answer: { probability: 0.2 } }), entry('carol', 1, { questVersion: 2 })];
  const c = countedPublicEntries(all, quest.id, 1);
  assert.deepEqual(c.map((e) => `${e.login}.${e.n}`), ['alice.2', 'bob.1']);
  assert.deepEqual(entrySpread([0.2, 0.9]), { n: 2, low: 0.375, median: 0.55, high: 0.725 });
  assert.equal(entrySpread([]), null);
  assert.equal(newFileUrl('o/r', 'main', 'quests/entries/q/a.1.json', '{"x":1}\n'), 'https://github.com/o/r/new/main?filename=quests%2Fentries%2Fq%2Fa.1.json&value=%7B%22x%22%3A1%7D%0A');
  assert.equal(questsRepo(' e-conquest/econquest '), 'e-conquest/econquest');
  assert.equal(questsRepo('not a repo'), '');
});

test('every entry file in quests/entries passes the checker', () => {
  const dir = path.join(process.cwd(), 'quests');
  const quests = loadQuests(dir);
  for (const f of readPublicEntryFiles(dir)) {
    const at = parseEntryPath(f.rel);
    const q = at && quests.find((x) => x.quest.id === at.questId);
    assert.deepEqual(f.parseError ? [f.parseError] : publicEntryProblems(f.entry, f.rel, q ? { quest: q.quest as ForecastQuest, hash: q.hash, approved: q.approved } : undefined), [], f.rel);
  }
});

test('routes: entries hidden until close, then scored with the spread; draft entry needs QUESTS_REPO and an open approved Quest', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qpub-'));
  fs.mkdirSync(path.join(dir, 'drafts'));
  fs.writeFileSync(path.join(dir, 'tutorial-brent-week.json'), `${JSON.stringify(quest, null, 2)}\n`);
  writeManifest(dir, Object.fromEntries(readQuestFiles(dir).filter((f) => f.approved).map((f) => [f.name, f.hash])));
  const hash = readQuestFiles(dir).find((f) => f.approved)!.hash;
  fs.mkdirSync(path.join(dir, 'entries', quest.id), { recursive: true });
  for (const e of [entry('alice', 1, { questHash: hash }), entry('alice', 2, { questHash: hash, answer: { probability: 0.9 } }), entry('bob', 1, { questHash: hash, answer: { probability: 0.2 } })]) fs.writeFileSync(path.join(dir, 'entries', quest.id, `${e.login}.${e.n}.json`), entryFileText(e));
  assert.equal(loadPublicEntries(dir).length, 3);
  const t0 = Date.parse('2026-01-01T00:00:00Z');
  const pts = Array.from({ length: 360 }, (_, i) => ({ date: new Date(t0 + i * 86_400_000).toISOString().slice(0, 10), value: 60 + i * 0.05 }));
  const seriesFor = async (iso3: string): Promise<SeriesSet> => ({ iso3, series: [{ id: 'commodity_eia_rbrte', label: 'Brent', unit: '$/bbl', freq: 'daily', source: 'EIA', points: pts }], missing: [] });
  let today = '2026-12-01';
  let repo = '';
  const app = express();
  registerQuestRoutes(app, { seriesFor, enabled: () => true, dir, entryFile: path.join(dir, 'e.jsonl'), today: () => today, repo: () => repo });
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const get = async (p: string) => (await fetch(base + p)).json();
  try {
    const hidden = await get(`/api/quests/${quest.id}/entries`);
    assert.equal(hidden.open, true);
    assert.equal(hidden.count, 2);
    assert.equal(hidden.entries, undefined, 'no answers before close');
    assert.match((await get(`/api/quests/${quest.id}/draft-entry?login=dan&probability=0.5`)).error, /QUESTS_REPO/);
    repo = 'e-conquest/econquest';
    const d = await get(`/api/quests/${quest.id}/draft-entry?login=alice&probability=0.7&rationale=Supply%20cuts`);
    assert.equal(d.path, `quests/entries/${quest.id}/alice.3.json`);
    assert.equal(d.replaces, 2);
    assert.match(d.url, /^https:\/\/github\.com\/e-conquest\/econquest\/new\/main\?filename=quests%2Fentries%2F/);
    assert.deepEqual(JSON.parse(d.text), { questId: quest.id, questVersion: 1, questHash: hash, login: 'alice', n: 3, answer: { probability: 0.7 }, rationale: 'Supply cuts', via: 'pull-request' });
    assert.match((await get(`/api/quests/${quest.id}/draft-entry?login=~x&probability=0.5`)).error, /GitHub login/);
    assert.match((await get(`/api/quests/${quest.id}/draft-entry?login=dan&probability=2`)).error, /0 to 1/);
    today = '2026-12-20';
    assert.match((await get(`/api/quests/${quest.id}/draft-entry?login=dan&probability=0.5`)).error, /Entries closed/);
    const after = await get(`/api/quests/${quest.id}/entries`);
    assert.equal(after.open, false);
    assert.deepEqual(after.entries.map((e: { login: string; n: number }) => `${e.login}.${e.n}`), ['alice.2', 'bob.1']);
    assert.equal(after.entries[0].score.status, 'settled');
    assert.equal(after.spread.median, 0.55);
  } finally {
    await new Promise((r) => server.close(r));
  }
});
