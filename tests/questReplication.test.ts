import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { AddressInfo } from 'net';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { entryProblems, isCodeUrl, replicationScore } from '../src/utils/questEntries';
import { entryFileText, publicEntryProblems, type PublicEntry } from '../src/utils/questPublicEntries';
import { describeOutcome } from '../src/utils/questResolve';
import { appendResolution, resolutionsPath } from '../src/utils/questResolveStore';
import { readQuestFiles, writeManifest } from '../src/utils/questStore';
import { computeStats } from '../src/utils/questStats';
import type { ReplicationQuest } from '../src/utils/quests';
import { registerQuestRoutes } from '../src/server/routes/quests';

const rep: ReplicationQuest = { ...JSON.parse(fs.readFileSync(path.join(process.cwd(), 'quests', 'drafts', 'bra-bohn-replication.json'), 'utf8')), approvedBy: 'smcarus' };
const CODE = 'https://github.com/alice/bohn/blob/main/bohn.R';
const entry = (login: string, value: number, extra: Partial<PublicEntry> = {}): PublicEntry => ({ questId: rep.id, questVersion: 1, questHash: 'h', login, n: 1, answer: { value }, code: CODE, via: 'pull-request', ...extra });

test('a Replication entry gives the figure and a public link to the script', () => {
  assert.deepEqual(entryProblems({ answer: { value: 0.061 }, code: CODE }, rep, '2026-12-05'), []);
  assert.match(entryProblems({ answer: { value: 0.061 } }, rep, '2026-12-05').join(), /Code: the public https address/);
  assert.match(entryProblems({ answer: { value: 0.061 }, code: 'http://example.com/x.R' }, rep, '2026-12-05').join(), /Code/);
  assert.match(entryProblems({ answer: { probability: 0.5 }, code: CODE }, rep, '2026-12-05').join(), /figure your script produced/);
  assert.equal(isCodeUrl('https://gist.github.com/alice/abc123'), true);
  assert.equal(isCodeUrl('https://github.com'), false);
  assert.deepEqual(publicEntryProblems(entry('alice', 0.06), `quests/entries/${rep.id}/alice.1.json`, { quest: rep, hash: 'h', approved: true }), []);
  assert.equal(JSON.parse(entryFileText(entry('alice', 0.06))).code, CODE);
});

test('a match is within the tolerance of the app\'s recorded figure', () => {
  assert.equal(replicationScore(0.064, 0.06, 0.005).matched, true);
  assert.equal(replicationScore(0.065, 0.06, 0.005).matched, true, 'the edge counts');
  const off = replicationScore(0.07, 0.06, 0.005);
  assert.equal(off.matched, false);
  assert.equal(off.difference, 0.01);
  assert.match(describeOutcome({ kind: 'settled', outcome: { answer: 'replication', value: 0.06, tolerance: 0.005, from: 'History & data, Bohn panel, 2027-03-01' } }), /app's figure is 0\.06 \(History & data/);
});

test('routes and stats: entries hidden until close; after the figure is recorded each entry reproduces it or not', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qrep-'));
  fs.mkdirSync(path.join(dir, 'drafts'));
  fs.writeFileSync(path.join(dir, `${rep.id}.json`), `${JSON.stringify(rep, null, 2)}\n`);
  writeManifest(dir, Object.fromEntries(readQuestFiles(dir).filter((f) => f.approved).map((f) => [f.name, f.hash])));
  const hash = readQuestFiles(dir).find((f) => f.approved)!.hash;
  fs.mkdirSync(path.join(dir, 'entries', rep.id), { recursive: true });
  for (const e of [entry('alice', 0.062, { questHash: hash }), entry('bob', 0.09, { questHash: hash, rationale: 'The app uses the wrong debt vintage.' })]) fs.writeFileSync(path.join(dir, 'entries', rep.id, `${e.login}.1.json`), entryFileText(e));
  let today = '2026-12-05';
  const app = express();
  app.use(express.json());
  registerQuestRoutes(app, { seriesFor: async (iso3) => ({ iso3, series: [], missing: [] }), enabled: () => true, dir, entryFile: path.join(dir, 'e.jsonl'), today: () => today, repo: () => 'e-conquest/econquest' });
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const get = async (p: string) => (await fetch(base + p)).json();
  try {
    assert.equal((await get(`/api/quests/${rep.id}/entries`)).open, true);
    const d = await get(`/api/quests/${rep.id}/draft-entry?login=carol&value=0.061&code=${encodeURIComponent(CODE)}`);
    assert.deepEqual([JSON.parse(d.text).answer, JSON.parse(d.text).code], [{ value: 0.061 }, CODE]);
    assert.match((await get(`/api/quests/${rep.id}/draft-entry?login=carol&value=0.061`)).error, /Code/);
    const logged = await (await fetch(`${base}/api/quests/${rep.id}/private`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answer: { value: 0.0601 }, code: CODE }) })).json();
    assert.deepEqual(logged.entry.answer, { value: 0.0601 });
    today = '2027-03-01';
    const waiting = await get(`/api/quests/${rep.id}/entries`);
    assert.equal(waiting.entries[0].score.status, 'waiting');
    appendResolution(resolutionsPath(dir), { at: '2027-03-01T10:00:00Z', kind: 'settled', questId: rep.id, questVersion: 1, questHash: hash, by: 'smcarus', outcome: { answer: 'replication', value: 0.06, tolerance: 0.005, from: 'History & data, Bohn panel, Brazil, 2027-03-01' } });
    const after = await get(`/api/quests/${rep.id}/entries`);
    assert.deepEqual(after.entries.map((e: { login: string; score: { matched: boolean } }) => [e.login, e.score.matched]), [['alice', true], ['bob', false]]);
    assert.equal(after.entries[0].code, CODE);
    assert.equal((await get('/api/quests/private')).entries[0].score.matched, true);
    const stats = await get('/api/quests/stats');
    assert.deepEqual(stats.contributors.map((c: { login: string; replications: Array<{ matched: boolean }> }) => [c.login, c.replications[0].matched]), [['alice', true], ['bob', false]]);
  } finally {
    await new Promise((r) => server.close(r));
  }
  const s = computeStats({ quests: [{ quest: rep, approved: true }], entries: [entry('dan', 0.06)], lines: [], accounts: {} });
  assert.deepEqual(s.contributors[0].replications, [{ questId: rep.id, title: rep.title, matched: null }]);
});
