import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { AddressInfo } from 'net';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { questForecastRows, QUEST_FORECAST_HEADER } from '../src/utils/questDataApi';
import { entryFileText, type PublicEntry } from '../src/utils/questPublicEntries';
import { readQuestFiles, writeManifest } from '../src/utils/questStore';
import { appendResolution, resolutionsPath } from '../src/utils/questResolveStore';
import { registerQuestRoutes } from '../src/server/routes/quests';
import type { ForecastQuest } from '../src/utils/quests';
import type { SeriesSet } from '../src/utils/seriesHistory';

const brent: ForecastQuest = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'quests', 'drafts', 'tutorial-brent-week.json'), 'utf8'));
const quest = { ...brent, registeredOn: '2026-11-01', opensOn: '2026-11-02', closesOn: '2026-12-11', approvedBy: 'smcarus' } as ForecastQuest;
const col = (row: unknown[], name: string) => row[QUEST_FORECAST_HEADER.indexOf(name)];

function setUp() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qdata-'));
  fs.mkdirSync(path.join(dir, 'drafts'));
  fs.writeFileSync(path.join(dir, 'tutorial-brent-week.json'), `${JSON.stringify(quest, null, 2)}\n`);
  writeManifest(dir, Object.fromEntries(readQuestFiles(dir).filter((f) => f.approved).map((f) => [f.name, f.hash])));
  const hash = readQuestFiles(dir).find((f) => f.approved)!.hash;
  const entry = (login: string, n: number, p: number): PublicEntry => ({ questId: quest.id, questVersion: 1, questHash: hash, login, n, answer: { probability: p }, via: 'pull-request' });
  fs.mkdirSync(path.join(dir, 'entries', quest.id), { recursive: true });
  for (const e of [entry('alice', 1, 0.6), entry('alice', 2, 0.9), entry('bob', 1, 0.2)]) fs.writeFileSync(path.join(dir, 'entries', quest.id, `${e.login}.${e.n}.json`), entryFileText(e));
  return { dir, hash };
}

test('settled forecasts: one row per counted entry, scored from the recorded result', () => {
  const settled = { seq: 1, at: '2026-12-19T10:00:00Z', kind: 'settled' as const, questId: quest.id, questVersion: 1, questHash: 'x', by: 'smcarus', outcome: { answer: 'probability' as const, happened: true, baseRate: 0.5 }, readings: [{ value: 70, date: '2026-12-11' }, { value: 72, date: '2026-12-18' }], via: 'rule' as const, prev: 'GENESIS', hash: 'h' };
  const entries: PublicEntry[] = [
    { questId: quest.id, questVersion: 1, questHash: 'x', login: 'alice', n: 1, answer: { probability: 0.6 }, via: 'pull-request' },
    { questId: quest.id, questVersion: 1, questHash: 'x', login: 'alice', n: 2, answer: { probability: 0.9 }, via: 'pull-request' },
  ];
  const rows = questForecastRows([{ quest, approved: true }], entries, [settled]);
  assert.equal(rows.length, 1, 'only the latest entry counts');
  const r = rows[0]!;
  assert.equal(r.length, QUEST_FORECAST_HEADER.length);
  assert.equal(col(r, 'login'), 'alice');
  assert.equal(col(r, 'entry_n'), 2);
  assert.equal(col(r, 'forecast'), 0.9);
  assert.equal(col(r, 'happened'), 1);
  assert.equal(col(r, 'benchmark_kind'), 'base_rate');
  assert.equal(col(r, 'score_kind'), 'brier');
  assert.equal(col(r, 'score'), 0.01);
  assert.equal(col(r, 'benchmark_score'), 0.25);
  assert.equal(col(r, 'skill'), 0.24);
  assert.equal(col(r, 'readings'), '70 on 2026-12-11; 72 on 2026-12-18');
  assert.match(String(col(r, 'rule')), /^Yes if /);
  // No result recorded, or a draft: nothing is served.
  assert.deepEqual(questForecastRows([{ quest, approved: true }], entries, []), []);
  assert.deepEqual(questForecastRows([{ quest, approved: false }], entries, [settled]), []);
  // Unresolvable: the row is there, the score is empty.
  const unres = questForecastRows([{ quest, approved: true }], entries, [{ ...settled, kind: 'unresolvable', outcome: undefined, readings: undefined, reason: 'The feed stopped' }]);
  assert.equal(col(unres[0]!, 'result'), 'unresolvable');
  assert.equal(col(unres[0]!, 'score'), null);
  assert.equal(col(unres[0]!, 'happened'), null);
});

test('routes: off answers nothing; on serves JSON and the table; a broken record serves nothing', async () => {
  const { dir, hash } = setUp();
  const seriesFor = async (iso3: string): Promise<SeriesSet> => ({ iso3, series: [], missing: [] });
  let on = false;
  const app = express();
  registerQuestRoutes(app, { seriesFor, enabled: () => on, dir, entryFile: path.join(dir, 'e.jsonl'), today: () => '2026-12-20' });
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    assert.equal((await (await fetch(`${base}/api/quests/settled`)).json()).enabled, false);
    const offCsv = await fetch(`${base}/api/export/quests/forecasts.csv`);
    assert.equal(offCsv.status, 404);
    assert.equal((await offCsv.json()).error, 'QUESTS_OFF');

    on = true;
    assert.deepEqual((await (await fetch(`${base}/api/quests/settled`)).json()).rows, [], 'no result recorded yet');
    appendResolution(resolutionsPath(dir), { at: '2026-12-19T10:00:00Z', kind: 'settled', questId: quest.id, questVersion: 1, questHash: hash, by: 'smcarus', outcome: { answer: 'probability', happened: false, baseRate: 0.5 }, readings: [{ value: 70, date: '2026-12-11' }, { value: 69, date: '2026-12-18' }], via: 'rule' });
    const json = await (await fetch(`${base}/api/quests/settled`)).json();
    assert.deepEqual(json.rows.map((r: { login: string; forecast: number; score: number }) => [r.login, r.forecast, r.score]), [['alice', 0.9, 0.81], ['bob', 0.2, 0.04]]);
    assert.equal(json.rows[0].happened, 0);

    const forScript = await fetch(`${base}/api/export/quests/forecasts.csv`, { headers: { 'User-Agent': 'econquest-python-helper' } });
    const text = await forScript.text();
    assert.ok(text.startsWith(`${QUEST_FORECAST_HEADER.join(',')}\r\n`), 'no byte order mark for the helpers');
    assert.equal(text.trim().split('\r\n').length, 3);
    const forExcel = Buffer.from(await (await fetch(`${base}/api/export/quests/forecasts.csv`)).arrayBuffer());
    assert.deepEqual([...forExcel.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'Excel gets the byte order mark');
    const xlsx = await fetch(`${base}/api/export/quests/forecasts.xlsx`);
    assert.equal(xlsx.status, 200);
    assert.match(String(xlsx.headers.get('content-type')), /spreadsheetml/);

    // A results file edited by hand breaks the chain: nothing is served.
    const file = resolutionsPath(dir);
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('"happened":false', '"happened":true'));
    assert.equal((await fetch(`${base}/api/quests/settled`)).status, 409);
    assert.equal((await fetch(`${base}/api/export/quests/forecasts.csv`)).status, 409);
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test('the Python, R and Stata helpers read the settled Quest forecasts', () => {
  const root = process.cwd();
  assert.match(fs.readFileSync(path.join(root, 'scripts/data-api/econquest.py'), 'utf8'), /def quest_forecasts\(.*\n[\s\S]*"\/api\/export\/quests\/forecasts\.csv"/);
  assert.match(fs.readFileSync(path.join(root, 'scripts/data-api/econquest.R'), 'utf8'), /eq_quest_forecasts <- function[\s\S]*"\/api\/export\/quests\/forecasts\.csv"/);
  assert.match(fs.readFileSync(path.join(root, 'scripts/data-api/econquest.do'), 'utf8'), /program define econquest_quests[\s\S]*"\/api\/export\/quests\/forecasts\.csv"/);
});

test('drafts take private entries only until the first Quest is approved (maintainer, 28 November)', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qdraft-'));
  fs.mkdirSync(path.join(dir, 'drafts'));
  const draft = { ...brent, id: 'draft-brent-week', registeredOn: '2026-11-01', opensOn: '2026-11-02', closesOn: '2026-12-11' } as ForecastQuest;
  fs.writeFileSync(path.join(dir, 'drafts', 'draft-brent-week.json'), `${JSON.stringify(draft, null, 2)}\n`);
  writeManifest(dir, {});
  const seriesFor = async (iso3: string): Promise<SeriesSet> => ({ iso3, series: [], missing: [] });
  const app = express();
  app.use(express.json());
  registerQuestRoutes(app, { seriesFor, enabled: () => true, dir, entryFile: path.join(dir, 'e.jsonl'), today: () => '2026-12-01' });
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const log = (id: string) => fetch(`${base}/api/quests/${id}/private`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answer: { probability: 0.6 } }) });
  try {
    assert.equal((await log(draft.id)).status, 200, 'no Quest approved yet: the draft takes it');
    // Approve one Quest: the draft now refuses, the approved one takes it.
    fs.writeFileSync(path.join(dir, 'tutorial-brent-week.json'), `${JSON.stringify(quest, null, 2)}\n`);
    writeManifest(dir, Object.fromEntries(readQuestFiles(dir).filter((f) => f.approved).map((f) => [f.name, f.hash])));
    const refused = await log(draft.id);
    assert.equal(refused.status, 400);
    assert.match((await refused.json()).error, /Drafts take private entries only until the first Quest is approved/);
    assert.equal((await log(quest.id)).status, 200);
  } finally {
    await new Promise((r) => server.close(r));
  }
});
