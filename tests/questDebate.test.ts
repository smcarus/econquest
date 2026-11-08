import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { AddressInfo } from 'net';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { briefNumbers, checkArgument, evidenceMap, evidenceMarkdown, parseBrief, BRIEF_LABEL, type DebateBrief } from '../src/utils/questDebate';
import { readBrief, writeBrief, briefPath } from '../src/utils/questBriefStore';
import { entryProblems, ARGUMENT_MIN } from '../src/utils/questEntries';
import { checkEntryChange, entryFileText, publicEntryProblems, type PublicEntry } from '../src/utils/questPublicEntries';
import { questProblems, type DebateQuest, type ForecastQuest } from '../src/utils/quests';
import { readQuestFiles, writeManifest } from '../src/utils/questStore';
import { computeStats } from '../src/utils/questStats';
import { EXPORT_NOTICE } from '../src/utils/disclaimer';
import { registerQuestRoutes } from '../src/server/routes/quests';
import type { LiveWatchlistItem } from '../src/types/council';

const read = (f: string) => JSON.parse(fs.readFileSync(path.join(process.cwd(), 'quests', 'drafts', f), 'utf8'));
const debate: DebateQuest = { ...read('egy-reserves-debate.json'), approvedBy: 'smcarus', related: ['tutorial-brent-week'] };
const brent: ForecastQuest = { ...read('tutorial-brent-week.json'), approvedBy: 'smcarus' };
const ARG = 'Reserves only recover when the exchange rate can move, as the past two years show clearly.';

const entry = (login: string, n: number, position: number, extra: Partial<PublicEntry> = {}): PublicEntry => ({
  questId: debate.id,
  questVersion: 1,
  questHash: 'h',
  login,
  n,
  answer: { position },
  rationale: ARG,
  via: 'pull-request',
  ...extra,
});

test('a Debate entry picks a listed position and argues it', () => {
  const ok = entryProblems({ answer: { position: 2 }, rationale: ARG }, debate, '2026-12-05');
  assert.deepEqual(ok, []);
  assert.match(entryProblems({ answer: { position: 5 }, rationale: ARG }, debate, '2026-12-05').join(), /position, 1 to 4/);
  assert.match(entryProblems({ answer: { position: 1.5 }, rationale: ARG }, debate, '2026-12-05').join(), /position/);
  assert.match(entryProblems({ answer: { probability: 0.5 }, rationale: ARG }, debate, '2026-12-05').join(), /position/);
  assert.match(entryProblems({ answer: { position: 1 }, rationale: 'Too short' }, debate, '2026-12-05').join(), new RegExp(`at least ${ARGUMENT_MIN}`));
  assert.match(entryProblems({ answer: { position: 1 } }, debate, '2026-12-05').join(), /argument/);
  assert.match(entryProblems({ answer: { position: 1 }, rationale: ARG }, debate, '2027-03-01').join(), /Entries closed/);
  // A forecast still wants a probability.
  assert.match(entryProblems({ answer: { position: 1 } }, brent, '2026-12-05').join(), /probability/);
});

test('public Debate entries pass the same checks as forecasts', () => {
  const q = { quest: debate, hash: 'h', approved: true };
  assert.deepEqual(publicEntryProblems(entry('alice', 1, 3), `quests/entries/${debate.id}/alice.1.json`, q), []);
  assert.match(publicEntryProblems(entry('alice', 1, 9), `quests/entries/${debate.id}/alice.1.json`, q).join(), /position/);
  const change = checkEntryChange({
    files: [{ status: 'A', path: `quests/entries/${debate.id}/alice.1.json` }],
    existing: [],
    read: () => entryFileText(entry('alice', 1, 3)),
    author: 'alice',
    maintainers: ['smcarus'],
    now: '2026-12-05T10:00:00Z',
    questFor: () => q,
  });
  assert.deepEqual(change, {});
});

test('Quest files: related must name other Quests; "briefs" is a reserved id', () => {
  const draft = { ...debate, approvedBy: undefined };
  assert.deepEqual(questProblems(draft, { approved: false }), []);
  assert.match(questProblems({ ...draft, related: ['Not An Id'] }, { approved: false }).join(), /related/);
  assert.match(questProblems({ ...draft, related: [debate.id] }, { approved: false }).join(), /related/);
  assert.match(questProblems({ ...draft, id: 'briefs' }, { approved: false }).join(), /name of a file or folder/);
});

const goodReply = JSON.stringify({
  positions: debate.positions.map((_, i) => ({ position: i + 1, strongest: `The best case for position ${['one', 'two', 'three', 'four'][i]}.`, weakest: 'Its opponents will say it takes too long.', check: 'Look at reserves and the current account.' })),
});

test('the opening brief: one paragraph set per position, and no figures of its own', () => {
  const ok = parseBrief(`Here it is:\n${goodReply}\nThanks`, debate);
  assert.ok('positions' in ok && ok.positions.length === 4 && ok.positions[0].check.includes('reserves'));
  const withNumber = JSON.parse(goodReply);
  withNumber.positions[1].strongest = 'Reserves rose by 40% after the float in 2024.';
  const bad = parseBrief(JSON.stringify(withNumber), debate);
  assert.ok('problems' in bad);
  assert.match(bad.problems.join(), /Position 2: "strongest" states a figure \(40, 2024\)/);
  // A word with a digit that is already in the Quest's own words is allowed (e.g. a group name in the title).
  const g20 = { ...debate, title: 'Is the G20 framework enough for Egypt?' };
  assert.deepEqual(briefNumbers('The G20 framework matters.', g20), []);
  assert.deepEqual(briefNumbers('The G7 framework matters.', g20), ['G7']);
  const short = { positions: JSON.parse(goodReply).positions.slice(0, 3) };
  assert.match((parseBrief(JSON.stringify(short), debate) as { problems: string[] }).problems.join(), /covers 3 positions/);
  assert.match((parseBrief('no json here', debate) as { problems: string[] }).problems.join(), /not return JSON/);
  const empty = JSON.parse(goodReply);
  empty.positions[0].weakest = '';
  assert.match((parseBrief(JSON.stringify(empty), debate) as { problems: string[] }).problems.join(), /"weakest" is empty/);
});

test('a brief is written once with its hash, and an edited file is flagged', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qbr-'));
  const positions = (parseBrief(goodReply, debate) as { positions: DebateBrief['positions'] }).positions;
  const b = writeBrief(dir, { questId: debate.id, questVersion: 1, questHash: 'h', model: 'qwen2.5:32b', temperature: 0, seed: 42, writtenAt: '2026-11-30T10:00:00Z', by: 'smcarus', label: BRIEF_LABEL, positions });
  assert.equal(readBrief(dir, debate.id, 1)!.hashOk, true);
  assert.throws(() => writeBrief(dir, { ...b }), /recorded once/);
  const file = briefPath(dir, debate.id, 1);
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('too long', 'too slow'));
  assert.equal(readBrief(dir, debate.id, 1)!.hashOk, false);
  assert.equal(readBrief(dir, debate.id, 2), null);
  // Briefs live in a folder, so they are never read as Quests.
  assert.deepEqual(readQuestFiles(dir), []);
});

test('Claim Check reads an argument against the Quest country; the evidence map counts and exports', () => {
  const egy = { iso3: 'EGY', countryName: 'Egypt', cpiInflationPct: 12, cpiSource: 'live' } as unknown as LiveWatchlistItem;
  const checks = checkArgument("Egypt's inflation is 30%, far too high to float now.", debate, [egy]);
  assert.equal(checks[0].verdict, 'differs');
  assert.match(checkArgument('Inflation is 12% and falling.', { countries: ['TUR'] }, [egy])[0].reading, /TUR\) is not on the watchlist/);
  assert.deepEqual(checkArgument('No figures in this one at all, only words.', { countries: ['TUR'] }, [egy]), []);
  const entries = [entry('alice', 2, 1), entry('bob', 1, 1), entry('~amira', 1, 4, { via: 'email' }), entry('carol', 1, 7)];
  const m = evidenceMap(debate, entries, { check: (t) => (t.includes('exchange') ? [{ verdict: 'matches', reading: 'ok' }] : []), related: [{ questId: 'tutorial-brent-week', title: 'Brent', result: 'No result yet' }] });
  assert.equal(m.total, 3);
  assert.equal(m.skipped, 1);
  assert.deepEqual(m.positions.map((p) => p.count), [2, 0, 0, 1]);
  assert.equal(m.positions[0].matches, 2);
  const md = evidenceMarkdown(m, { model: 'qwen2.5:32b', label: BRIEF_LABEL, positions: (parseBrief(goodReply, debate) as { positions: DebateBrief['positions'] }).positions } as DebateBrief, '2027-03-01');
  assert.match(md, /^# Evidence map: What would most reliably rebuild Egypt's foreign reserves\?/);
  assert.match(md, /\| 1\. A more flexible exchange rate \| 2 \| 2 \| 0 \|/);
  assert.match(md, /\*\*~amira\*\* \(emailed\)/);
  assert.match(md, /Nobody argued this position/);
  assert.match(md, /Strongest case: The best case for position one/);
  assert.match(md, /What related Forecast Quests found[\s\S]*Brent/);
  assert.ok(md.includes(EXPORT_NOTICE));
});

test('stats list the Debates a person argued, never scored', () => {
  const s = computeStats({ quests: [{ quest: debate, approved: true }], entries: [entry('alice', 1, 2)], lines: [], accounts: {} });
  assert.deepEqual(s.contributors.map((c) => [c.login, c.debates.map((d) => d.questId), c.entered]), [['alice', [debate.id], 0]]);
  assert.deepEqual(s.board.allTime, []);
});

test('routes: Debate entries privately and publicly, hidden until close, then each argument; detail has the brief and related results', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qdb-'));
  fs.mkdirSync(path.join(dir, 'drafts'));
  fs.writeFileSync(path.join(dir, `${debate.id}.json`), `${JSON.stringify(debate, null, 2)}\n`);
  fs.writeFileSync(path.join(dir, `${brent.id}.json`), `${JSON.stringify(brent, null, 2)}\n`);
  writeManifest(dir, Object.fromEntries(readQuestFiles(dir).filter((f) => f.approved).map((f) => [f.name, f.hash])));
  const hash = readQuestFiles(dir).find((f) => f.name === `${debate.id}.json`)!.hash;
  fs.mkdirSync(path.join(dir, 'entries', debate.id), { recursive: true });
  for (const e of [entry('alice', 1, 1, { questHash: hash }), entry('bob', 1, 3, { questHash: hash })]) fs.writeFileSync(path.join(dir, 'entries', debate.id, `${e.login}.${e.n}.json`), entryFileText(e));
  writeBrief(dir, { questId: debate.id, questVersion: 1, questHash: hash, model: 'qwen2.5:32b', temperature: 0, seed: 42, writtenAt: '2026-11-30T10:00:00Z', by: 'smcarus', label: BRIEF_LABEL, positions: (parseBrief(goodReply, debate) as { positions: DebateBrief['positions'] }).positions });
  let today = '2026-12-05';
  const app = express();
  app.use(express.json());
  registerQuestRoutes(app, { seriesFor: async (iso3) => ({ iso3, series: [], missing: [] }), enabled: () => true, dir, entryFile: path.join(dir, 'e.jsonl'), today: () => today, repo: () => 'e-conquest/econquest' });
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const get = async (p: string) => (await fetch(base + p)).json();
  const post = async (p: string, body: unknown) => (await fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
  try {
    const d = await get(`/api/quests/${debate.id}`);
    assert.equal(d.brief.hashOk, true);
    assert.equal(d.brief.brief.positions.length, 4);
    assert.deepEqual(d.related, [{ questId: brent.id, title: brent.title, result: `No result yet (due ${brent.rule.kind === 'direction' ? brent.rule.to.on : ''})` }]);
    const hidden = await get(`/api/quests/${debate.id}/entries`);
    assert.equal(hidden.open, true);
    assert.equal(hidden.count, 2);
    assert.equal(hidden.entries, undefined);
    const logged = await post(`/api/quests/${debate.id}/private`, { answer: { position: 2 }, rationale: ARG });
    assert.deepEqual(logged.entry.answer, { position: 2 });
    assert.match((await post(`/api/quests/${debate.id}/private`, { answer: { position: 2 }, rationale: 'short' })).error, /argument/);
    const mine = await get('/api/quests/private');
    assert.equal(mine.entries[0].score.status, 'debate');
    const draft = await get(`/api/quests/${debate.id}/draft-entry?login=dan&position=4&rationale=${encodeURIComponent(ARG)}`);
    assert.deepEqual(JSON.parse(draft.text).answer, { position: 4 });
    assert.equal(draft.path, `quests/entries/${debate.id}/dan.1.json`);
    today = '2027-03-01';
    const after = await get(`/api/quests/${debate.id}/entries`);
    assert.equal(after.open, false);
    assert.equal(after.answer, 'position');
    assert.deepEqual(after.entries.map((e: { login: string; answer: { position: number } }) => [e.login, e.answer.position]), [['alice', 1], ['bob', 3]]);
    assert.equal(after.entries[0].rationale, ARG);
    const stats = await get('/api/quests/stats');
    assert.deepEqual(stats.contributors.map((c: { login: string; debates: unknown[] }) => [c.login, c.debates.length]), [['alice', 1], ['bob', 1]]);
  } finally {
    await new Promise((r) => server.close(r));
  }
});
