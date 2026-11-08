import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { AddressInfo } from 'net';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { addMonths } from '../src/utils/backtest';
import { entryProblems } from '../src/utils/questEntries';
import { entryFileText, publicEntryProblems, type PublicEntry } from '../src/utils/questPublicEntries';
import { describeTestVerdict, questTestId, signalSpec, signalTestProblems, SIGNAL_METHODS, SIGNAL_TEMPLATE, type QuestTestVerdict, type SignalTest } from '../src/utils/questSignal';
import { readQuestFiles, writeManifest } from '../src/utils/questStore';
import { computeStats } from '../src/utils/questStats';
import { appendTestRun, loadTestRecord, testRecordPath } from '../src/utils/questTestStore';
import { runQuestTests } from '../src/utils/questTestRun';
import { questProblems, type SignalQuest } from '../src/utils/quests';
import { trackRecordMarkdown, trackRows } from '../src/utils/trackRecordDoc';
import { registerQuestRoutes } from '../src/server/routes/quests';

const sig: SignalQuest = { ...JSON.parse(fs.readFileSync(path.join(process.cwd(), 'quests', 'drafts', 'credit-gap-crisis-signal.json'), 'utf8')), approvedBy: 'smcarus' };
const t = (over: Partial<SignalTest> = {}): SignalTest => ({ ...SIGNAL_TEMPLATE, ...over });
const entry = (login: string, test: SignalTest, extra: Partial<PublicEntry> = {}): PublicEntry => ({ questId: sig.id, questVersion: 1, questHash: 'h', login, n: 1, answer: { test }, via: 'pull-request', ...extra });

test('a proposed test names a rule the app can run, gives every setting, and a pass mark no looser than the floor', () => {
  assert.deepEqual(signalTestProblems(SIGNAL_TEMPLATE), []);
  assert.match(signalTestProblems(t({ method: 'credit_gap' as never })).join(), /test\.method: one of/);
  assert.match(signalTestProblems(t({ params: { lookbackWeeks: 156 } })).join(), /give every setting.*missing minLookbackWeeks/);
  assert.match(signalTestProblems(t({ params: { ...SIGNAL_TEMPLATE.params, magic: 1 } })).join(), /magic: not a setting/);
  assert.match(signalTestProblems(t({ passMark: { ...SIGNAL_TEMPLATE.passMark, maxPValue: 0.1 } })).join(), /maxPValue: above 0 and at most 0\.05/);
  assert.match(signalTestProblems(t({ passMark: { ...SIGNAL_TEMPLATE.passMark, minCases: 10 } })).join(), /minCases: a whole number, at least 30/);
  assert.match(signalTestProblems(t({ passMark: { ...SIGNAL_TEMPLATE.passMark, minYears: 3 } })).join(), /minYears/);
  assert.match(signalTestProblems(t({ hypothesis: 'short' })).join(), /hypothesis/);
  assert.match(signalTestProblems(t({ knownLimits: [] })).join(), /knownLimits/);
  assert.match(signalTestProblems(t({ sample: { from: 'last year' } })).join(), /sample\.from/);
  assert.match(signalTestProblems({ ...SIGNAL_TEMPLATE, framework: 1 }).join(), /test\.framework: not part of a test/);
  assert.match(signalTestProblems(SIGNAL_TEMPLATE, ['cycle_clock']).join(), /this Quest takes cycle_clock/);
  for (const [m, def] of Object.entries(SIGNAL_METHODS)) assert.ok(def.params.length > 0, m);
});

test('a Signal Quest may limit the rules; its tests are public entries checked like any other', () => {
  assert.deepEqual(questProblems({ ...sig, methods: ['cftc_crowding'] }, { approved: true }), []);
  assert.match(questProblems({ ...sig, methods: ['astrology'] }, { approved: true }).join(), /methods: one or more of/);
  assert.match(questProblems({ ...sig, id: 'test-verdicts' }, { approved: true }).join(), /name of a file/);
  assert.deepEqual(entryProblems({ answer: { test: SIGNAL_TEMPLATE } }, sig, '2027-01-05'), []);
  assert.deepEqual(publicEntryProblems(entry('alice', SIGNAL_TEMPLATE), `quests/entries/${sig.id}/alice.1.json`, { quest: sig, hash: 'h', approved: true }), []);
  assert.match(publicEntryProblems(entry('alice', t({ passMark: { ...SIGNAL_TEMPLATE.passMark, maxPValue: 0.2 } })), `quests/entries/${sig.id}/alice.1.json`, { quest: sig, hash: 'h', approved: true }).join(), /maxPValue/);
});

test('the test runs under its own id, as a method 2 test registered when entries closed', () => {
  assert.equal(questTestId(sig.id, 'alice'), 'quest_credit-gap-crisis-signal_alice');
  assert.equal(questTestId(sig.id, '~amira', 2), 'quest_credit-gap-crisis-signal_v2_-amira');
  const spec = signalSpec(SIGNAL_TEMPLATE, { questId: sig.id, questVersion: 1, login: 'alice', n: 2, registeredOn: sig.closesOn });
  assert.deepEqual([spec.id, spec.version, spec.framework, spec.registeredOn, spec.method], ['quest_credit-gap-crisis-signal_alice', 2, 2, '2027-03-31', 'cftc_crowding']);
});

const cliTest: SignalTest = {
  hypothesis: 'A turn in the OECD leading indicator comes before a policy-rate move the same way within six months more often than after any month.',
  method: 'cli_turn_policy',
  params: { confirmMonths: 2, publicationLagMonths: 1, windowMonths: 6 },
  sample: { from: '1990-01' },
  passMark: { minCases: 30, minLiftPts: 10, maxPValue: 0.05, minYears: 8 },
  knownLimits: ['Today\'s vintage of the leading indicator, not the one published at the time.'],
};
// One leading-indicator peak and one cut in Brazil (as in tests/backtest.test.ts): one case, too few to judge.
const cli = Array.from({ length: 36 }, (_, i) => ({ period: addMonths('2000-01', i), value: i <= 17 ? 99 + i * 0.1 : 99 + 17 * 0.1 - (i - 17) * 0.1 }));
const bisCsv = ['FREQ,REF_AREA,UNIT_MEASURE,TIME_PERIOD,OBS_VALUE', ...cli.map((p) => `M,BR,368,${p.period},${p.period >= '2001-12' ? 5 : 6}`)].join('\n');
const dbn = { series: { docs: [{ dimensions: { REF_AREA: 'BRA', FREQ: 'M', MEASURE: 'LI', ADJUSTMENT: 'AA', METHODOLOGY: 'H', UNIT_MEASURE: 'IX', TRANSFORMATION: 'IX' }, period: cli.map((p) => p.period), value: cli.map((p) => p.value) }] } };
const feeds = async (url: string) => {
  if (url.includes('stats.bis.org')) return bisCsv;
  if (url.includes('db.nomics')) return JSON.stringify(dbn);
  throw new Error('HTTP 503');
};

function questDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qsig-'));
  fs.mkdirSync(path.join(dir, 'drafts'));
  fs.writeFileSync(path.join(dir, `${sig.id}.json`), `${JSON.stringify(sig, null, 2)}\n`);
  writeManifest(dir, Object.fromEntries(readQuestFiles(dir).filter((f) => f.approved).map((f) => [f.name, f.hash])));
  const hash = readQuestFiles(dir).find((f) => f.approved)!.hash;
  fs.mkdirSync(path.join(dir, 'entries', sig.id), { recursive: true });
  const put = (e: PublicEntry) => fs.writeFileSync(path.join(dir, 'entries', sig.id, `${e.login}.${e.n}.json`), entryFileText(e));
  return { dir, hash, put };
}

test('each counted test is run once through the app\'s own runner; nothing is recorded when a test could not run', async () => {
  const { dir, hash, put } = questDir();
  put(entry('alice', { ...cliTest, passMark: { ...cliTest.passMark, minLiftPts: 5 } }, { questHash: hash }));
  put(entry('alice', cliTest, { questHash: hash, n: 2 }));
  put(entry('bob', SIGNAL_TEMPLATE, { questHash: hash }));
  put(entry('carol', t({ passMark: { ...SIGNAL_TEMPLATE.passMark, maxPValue: 0.5 } }), { questHash: hash }));
  const out = await runQuestTests({ questsDir: dir, quest: sig, questHash: hash, by: 'smcarus', now: new Date('2027-04-02T10:00:00Z'), fetcher: feeds });
  assert.deepEqual(out.skipped.map((s) => s.path), [`quests/entries/${sig.id}/carol.1.json`], 'a test below the floor is left out, never fixed');
  assert.deepEqual(out.notRun, ['bob.1.json (cftc_crowding)'], 'the CFTC feed did not answer');
  assert.ok(out.problems.some((p) => /CFTC did not answer/.test(p)));
  const [a] = out.verdicts;
  assert.deepEqual([a.login, a.n, a.id, a.version, a.verdict, a.method, a.registeredOn], ['alice', 2, 'quest_credit-gap-crisis-signal_alice', 2, 'too_few_cases', 'cli_turn_policy', '2027-03-31']);
  assert.equal(a.p, undefined, 'no p is recorded for too few cases');
  assert.match(a.summary, /1 cases, 1 series/);
  assert.match(a.entryHash, /^[0-9a-f]{64}$/);
});

test('the record takes each Quest\'s run once and refuses a hand-broken file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qrec-'));
  const file = testRecordPath(dir);
  assert.deepEqual(loadTestRecord(file).record.verdicts, []);
  const v: QuestTestVerdict = { questId: sig.id, questVersion: 1, login: 'alice', n: 1, entryHash: 'e'.repeat(64), id: questTestId(sig.id, 'alice'), version: 1, method: 'cftc_crowding', registeredOn: sig.closesOn, maxPValue: 0.05, ranAt: '2027-04-02T10:00:00Z', by: 'smcarus', verdict: 'passed', p: 0.004, summary: 'Lift 12 points.' };
  const run = { questId: sig.id, questVersion: 1, ranAt: '2027-04-02T10:00:00Z', by: 'smcarus', where: "the maintainer's computer" };
  appendTestRun(file, run, [v]);
  assert.throws(() => appendTestRun(file, run, []), /were run on 2027-04-02T10:00:00Z; each is run once/);
  fs.writeFileSync(file, JSON.stringify({ runs: [], verdicts: [v, v] }));
  assert.match(loadTestRecord(file).problems.join(), /recorded twice/);
  assert.throws(() => appendTestRun(file, { ...run, questId: 'other' }, []), /Restore it from git/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(process.cwd(), 'quests', 'test-verdicts.json'), 'utf8')).verdicts.length, 0, 'no verdict is on record before a real run');
});

test('Quest tests join the Holm family of the track record, so each one raises the bar for the app\'s own passes', () => {
  const own = [{ id: 'cftc_crowding', version: 2, ranAt: '2026-11-06T02:31Z', verdict: 'passed' as const, method: 2, summary: 'p 0.004' }];
  const files = [{ kind: 'backtest' as const, id: 'cftc_crowding', version: 2, file: 'cftc_crowding.v2.json', maxPValue: 0.05 }];
  const qv = (login: string, p: number, verdict: QuestTestVerdict['verdict'] = 'failed'): QuestTestVerdict => ({ questId: sig.id, questVersion: 1, login, n: 1, entryHash: 'a'.repeat(64), id: questTestId(sig.id, login), version: 1, method: 'cftc_crowding', registeredOn: sig.closesOn, maxPValue: 0.05, ranAt: '2027-04-02T10:00:00Z', by: 'smcarus', verdict, p, summary: `p ${p}` });
  assert.equal(trackRows(own, files)[0].holds, true);
  const rows = trackRows(own, files, Array.from({ length: 14 }, (_, i) => qv(`u${i}`, 0.5)));
  assert.equal(rows.length, 15);
  assert.equal(rows[0].adjusted, 0.06);
  assert.equal(rows[0].holds, false, 'fifteen tests tried: 0.004 x 15 = 0.06, above 0.05');
  const md = trackRecordMarkdown(own, files, [], [qv('alice', 0.001, 'passed')]);
  assert.match(md, /\| quest_credit-gap-crisis-signal_alice v1 \| Quest test, method 2 \| 2027-03-31 \| 2027-04-02 \| Passed \|/);
  assert.match(md, /entered by alice to Signal Quest credit-gap-crisis-signal, entry file \[quests\/entries\/credit-gap-crisis-signal\/alice\.1\.json\]\(\.\.\/quests\/entries\/credit-gap-crisis-signal\/alice\.1\.json\)/);
  assert.equal(describeTestVerdict(qv('a', 0.001, 'passed'), { adjusted: 0.002, holds: true }).label, 'Validated');
  assert.equal(describeTestVerdict(qv('a', 0.03, 'passed'), { adjusted: 0.09, holds: false }).label, 'Provisional pass');
  assert.equal(describeTestVerdict(qv('a', 0.3)).label, 'Failed');
});

test('routes and stats: tests hidden until close, then each with its verdict and Holm reading; never logged privately', async () => {
  const { dir, hash, put } = questDir();
  put(entry('alice', cliTest, { questHash: hash }));
  let today = '2027-01-05';
  const app = express();
  app.use(express.json());
  registerQuestRoutes(app, { seriesFor: async (iso3) => ({ iso3, series: [], missing: [] }), enabled: () => true, dir, entryFile: path.join(dir, 'e.jsonl'), today: () => today, repo: () => 'e-conquest/econquest' });
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const get = async (p: string) => (await fetch(base + p)).json();
  try {
    assert.equal((await get(`/api/quests/${sig.id}/entries`)).open, true);
    const d = await get(`/api/quests/${sig.id}/draft-entry?login=bob&test=${encodeURIComponent(JSON.stringify(SIGNAL_TEMPLATE))}`);
    assert.deepEqual(JSON.parse(d.text).answer, { test: SIGNAL_TEMPLATE });
    assert.match((await get(`/api/quests/${sig.id}/draft-entry?login=bob&test=nonsense`)).error, /test: a test/);
    const priv = await fetch(`${base}/api/quests/${sig.id}/private`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answer: { test: SIGNAL_TEMPLATE } }) });
    assert.equal(priv.status, 400);
    today = '2027-04-02';
    const before = await get(`/api/quests/${sig.id}/entries`);
    assert.equal(before.ran, null);
    assert.equal(before.entries[0].verdict, undefined);
    appendTestRun(testRecordPath(dir), { questId: sig.id, questVersion: 1, ranAt: '2027-04-02T10:00:00Z', by: 'smcarus', where: 'test' }, [
      { questId: sig.id, questVersion: 1, login: 'alice', n: 1, entryHash: 'a'.repeat(64), id: questTestId(sig.id, 'alice'), version: 1, method: 'cli_turn_policy', registeredOn: sig.closesOn, maxPValue: 0.05, ranAt: '2027-04-02T10:00:00Z', by: 'smcarus', verdict: 'passed', p: 0.01, summary: 'Lift 12 points.' },
    ]);
    const after = await get(`/api/quests/${sig.id}/entries`);
    const v = after.entries[0].verdict;
    assert.equal(v.verdict, 'passed');
    assert.ok(v.family > 1, 'counted with every test on record');
    assert.equal(v.label, v.holds ? 'Validated' : 'Provisional pass');
    assert.ok(v.adjusted >= 0.01);
    const stats = await get('/api/quests/stats');
    assert.deepEqual(stats.contributors[0].tests, [{ questId: sig.id, title: sig.title, verdict: 'passed' }]);
  } finally {
    await new Promise((r) => server.close(r));
  }
  assert.deepEqual(computeStats({ quests: [{ quest: sig, approved: true }], entries: [entry('dan', cliTest)], lines: [], accounts: {} }).contributors[0].tests, [{ questId: sig.id, title: sig.title, verdict: null }]);
});
