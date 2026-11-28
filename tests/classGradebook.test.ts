import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { AddressInfo } from 'net';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { DEFAULT_WEIGHTS, deleteOn, deleteWarning, gradeRow, keepDaysProblems, lifecycleStep, markPercent, weightProblems } from '../src/utils/classGradebook';
import { reportSummary } from '../src/utils/classReport';
import { registerClassRoutes } from '../src/server/routes/classes';
import type { Account, Role } from '../src/utils/auth';
import type { SeriesSet } from '../src/utils/seriesHistory';

test('marks read as a percent when they can be: fractions, percents, letters', () => {
  assert.equal(markPercent('7/10'), 70);
  assert.equal(markPercent('85%'), 85);
  assert.equal(markPercent('85'), 85);
  assert.equal(markPercent('b+'), 88);
  assert.equal(markPercent('good'), null);
  assert.equal(markPercent('120'), null);
  assert.equal(markPercent('3/0'), null);
});

test('weights add up to 100; a class is kept 30 to 3650 days', () => {
  assert.deepEqual(weightProblems(DEFAULT_WEIGHTS), []);
  assert.match(weightProblems({ participation: 50, accuracy: 50, calibration: 10, marks: 0 }).join(), /add up to 100 \(now 110\)/);
  assert.match(weightProblems({ participation: -1, accuracy: 51, calibration: 50, marks: 0 }).join(), /0 to 100/);
  assert.deepEqual(keepDaysProblems(365), []);
  assert.equal(keepDaysProblems(10).length, 1);
  assert.equal(keepDaysProblems(36.5).length, 1);
});

test('a grade row: parts out of 100, missing parts share out their weight', () => {
  const empty = reportSummary([]);
  const r = gradeRow({ student: 'Ana', username: 'ana', assignments: 4, handedIn: 3, summary: empty, marks: ['7/10', 'see me'] }, DEFAULT_WEIGHTS);
  assert.equal(r.participation, 75);
  assert.equal(r.accuracy, null);
  assert.equal(r.marksPercent, 70);
  assert.equal(r.marks, '7/10; see me');
  // Only participation (25) and marks (30) have figures: (25 × 75 + 30 × 70) / 55.
  assert.equal(r.total, Math.round(((25 * 75 + 30 * 70) / 55) * 100) / 100);
  assert.equal(gradeRow({ student: 'B', username: 'b', assignments: 0, handedIn: 0, summary: empty, marks: [] }, DEFAULT_WEIGHTS).total, null);
});

test('the end of a class: archived 30 days after its term, deleted after its keeping period, warned in the last 30 days', () => {
  const c = { term: { ends: '2027-01-29' } };
  assert.equal(lifecycleStep(c, '2027-02-28'), null);
  assert.equal(lifecycleStep(c, '2027-03-01'), 'archive');
  const archived = { ...c, archivedAt: '2027-03-01T00:00:00.000Z', keepDays: 60 };
  assert.equal(deleteOn(archived), '2027-04-30');
  assert.equal(deleteWarning(archived, '2027-03-30'), false);
  assert.equal(deleteWarning(archived, '2027-03-31'), true);
  assert.equal(lifecycleStep(archived, '2027-04-29'), null);
  assert.equal(lifecycleStep(archived, '2027-04-30'), 'delete');
});

const acct = (id: string, role: Role): Account => ({ id, username: id, displayName: id.toUpperCase(), role, provider: 'local', passwordHash: 'x', createdAt: '2026-11-01', passwordChangedAt: '2026-11-01' });

test('routes: gradebook with weights, a student record without sensitive topics, read-only archive, then deletion', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'classgrades-'));
  const qdir = path.join(dir, 'quests');
  fs.mkdirSync(path.join(qdir, 'drafts'), { recursive: true });
  fs.writeFileSync(path.join(qdir, 'manifest.json'), '{}\n');
  const accounts = new Map<string, Account>(['prof', 'ta', 's1', 's2'].map((id) => [id, acct(id, id === 'prof' ? 'analyst' : 'viewer')]));
  let clock = new Date('2026-12-01T12:00:00Z');
  const points = Array.from({ length: 900 }, (_, i) => ({ date: new Date(Date.UTC(2025, 0, 1) + i * 86_400_000).toISOString().slice(0, 10), value: 70 + i / 10 }));
  const seriesFor = async (iso3: string): Promise<SeriesSet> => ({ iso3, series: [{ id: 'commodity_eia_rbrte', label: 'Brent crude', unit: '$/bbl', freq: 'daily', source: 'EIA', points }], missing: [] });
  const local = path.join(dir, 'local');
  const audits: string[] = [];
  const app = express();
  app.use(express.json());
  registerClassRoutes(app, {
    enabled: () => true,
    file: path.join(local, 'classes.json'),
    entriesFile: path.join(local, 'class-entries.jsonl'),
    questsDir: qdir,
    authRequired: () => true,
    signedIn: (res) => accounts.get(String(res.req.headers['x-who'] || '')) ?? null,
    accountById: (id) => accounts.get(id),
    accountByUsername: (u) => accounts.get(u),
    makeStudent: () => {
      throw new Error('not used');
    },
    now: () => clock,
    seriesFor,
    audit: (s) => audits.push(s),
  });
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const call = async (who: string, method: string, p: string, body?: unknown) => {
    const r = await fetch(`${url}${p}`, { method, headers: { 'Content-Type': 'application/json', 'x-who': who }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const text = await r.text();
    return { status: r.status, body: r.headers.get('content-type')?.includes('json') ? JSON.parse(text) : text };
  };
  try {
    const made = await call('prof', 'POST', '/api/classes', { name: 'Macro', term: { label: 'Winter', starts: '2026-11-30', ends: '2027-02-15' } });
    const id = made.body.class.id as string;
    for (const s of ['s1', 's2']) await call(s, 'POST', '/api/classes/join', { code: made.body.class.code });
    await call('prof', 'POST', `/api/classes/${id}/members`, { username: 'ta', role: 'marker' });
    const form = { type: 'forecast', title: 'Will Brent be higher at the end of January?', summary: 'Oil after the winter.', level: 'intro', topic: 'commodities', region: 'Global', country: '', opensOn: '2026-12-01', closesOn: '2026-12-20', series: 'commodity_eia_rbrte', kind: 'direction', op: 'higher', on: '2027-01-29' };
    const q = await call('prof', 'POST', `/api/classes/${id}/class-quests`, form);
    await call('prof', 'POST', `/api/classes/${id}/assignments`, { questId: q.body.id, due: '2026-12-10T23:59', aiRule: 'allowed' });
    const debate = await call('prof', 'POST', `/api/classes/${id}/class-quests`, { ...form, type: 'debate', title: 'Should the oil fund be spent now?', positions: 'Spend\nSave', settlesOn: '2027-01-15' });
    await call('prof', 'POST', `/api/classes/${id}/assignments`, { questId: debate.body.id, due: '2026-12-10T23:59', aiRule: 'allowed', sensitive: true });
    const list = (await call('s1', 'GET', `/api/classes/${id}/assignments`)).body.assignments;
    const fa = list.find((x: { answerKind: string }) => x.answerKind === 'probability').id;
    const da = list.find((x: { answerKind: string }) => x.answerKind === 'position').id;
    await call('s1', 'POST', `/api/classes/${id}/assignments/${fa}/entries`, { answer: { probability: 0.8 } });
    await call('s1', 'POST', `/api/classes/${id}/assignments/${da}/entries`, { answer: { position: 2 }, rationale: 'Saving keeps a buffer for the next oil price fall.' });
    const ref = (await call('prof', 'GET', `/api/classes/${id}/assignments/${fa}/entries`)).body.entries[0].ref;
    await call('prof', 'POST', `/api/classes/${id}/assignments/${fa}/feedback`, { ref, text: 'Clear reasoning.', mark: '8/10' });
    const dref = (await call('prof', 'GET', `/api/classes/${id}/assignments/${da}/entries`)).body.entries[0].ref;
    await call('prof', 'POST', `/api/classes/${id}/assignments/${da}/feedback`, { ref: dref, text: 'Thoughtful.', mark: 'A' });

    clock = new Date('2027-02-05T12:00:00Z');
    assert.equal((await call('ta', 'GET', `/api/classes/${id}/gradebook`)).status, 403, 'teacher only');
    const g = await call('prof', 'GET', `/api/classes/${id}/gradebook`);
    assert.deepEqual(g.body.leftOut, { sensitive: 1, voided: 0 });
    const s1 = g.body.rows.find((r: { username: string }) => r.username === 's1');
    assert.equal(s1.assignments, 1, 'the sensitive debate is not counted');
    assert.equal(s1.participation, 100);
    assert.equal(s1.accuracy, 96, 'Brier 0.04 for 80% on what happened');
    assert.equal(s1.marksPercent, 80, 'the mark on the sensitive debate is left out');
    const s2 = g.body.rows.find((r: { username: string }) => r.username === 's2');
    assert.equal(s2.participation, 0);
    assert.equal((await call('prof', 'POST', `/api/classes/${id}/gradebook-settings`, { weights: { participation: 50, accuracy: 50, calibration: 0, marks: 10 } })).status, 400);
    assert.equal((await call('prof', 'POST', `/api/classes/${id}/gradebook-settings`, { weights: { participation: 50, accuracy: 50, calibration: 0, marks: 0 } })).status, 200);
    const csv = await call('prof', 'GET', `/api/classes/${id}/gradebook.csv`);
    assert.match(csv.body, /^\uFEFF?student,username,assignments,handed_in,participation_pct/);
    assert.match(csv.body, /\r\nS1,s1,1,1,100,1,0\.04,96,,[^,]*,,8\/10,80,98\r\n/);
    assert.ok(audits.some((a) => a.includes('downloaded the gradebook')));

    const rec = await call('s1', 'GET', `/api/classes/${id}/my-record.csv`);
    assert.match(rec.body, /Will Brent be higher/);
    assert.match(rec.body, /Clear reasoning\./);
    assert.doesNotMatch(rec.body, /oil fund|Thoughtful/, 'sensitive topics never leave this copy');
    assert.equal((await call('prof', 'GET', `/api/classes/${id}/my-record.csv`)).status, 403);

    // 30 days after the term: archived, read-only, with its deletion day.
    clock = new Date('2027-03-20T12:00:00Z');
    const listed = await call('s1', 'GET', '/api/classes');
    assert.equal(listed.body.classes[0].archived, true);
    assert.equal(listed.body.classes[0].deleteOn, '2028-03-19');
    assert.equal(listed.body.classes[0].deleteWarning, false);
    assert.equal(listed.body.classes[0].keepDays, undefined, 'only the teacher sees the keeping period');
    assert.equal((await call('prof', 'POST', `/api/classes/${id}/assignments`, { questId: q.body.id, due: '2027-03-25T23:59', aiRule: 'allowed' })).status, 400);
    assert.equal((await call('prof', 'POST', `/api/classes/${id}/teams`, { name: 'Late', usernames: ['s1', 's2', 'ta'] })).body.error, 'This class is archived');
    assert.equal((await call('prof', 'POST', `/api/classes/${id}/keep`, { keepDays: 5 })).status, 400);
    const kept = await call('prof', 'POST', `/api/classes/${id}/keep`, { keepDays: 40 });
    assert.equal(kept.body.class.deleteOn, '2027-04-29');
    clock = new Date('2027-04-01T12:00:00Z');
    assert.equal((await call('s1', 'GET', '/api/classes')).body.classes[0].deleteWarning, true, 'the last 30 days');
    assert.equal((await call('prof', 'GET', `/api/classes/${id}/gradebook.csv`)).status, 200, 'the gradebook can still be downloaded');

    // After the keeping period the class and everything kept for it are gone.
    clock = new Date('2027-04-29T12:00:00Z');
    assert.deepEqual((await call('prof', 'GET', '/api/classes')).body.classes, []);
    for (const f of ['class-entries.jsonl', 'class-feedback.jsonl']) assert.equal(fs.readFileSync(path.join(local, f), 'utf8').trim(), '', `${f} emptied`);
    assert.equal(fs.existsSync(path.join(local, 'class-quests', id)), false);
    assert.ok(audits.some((a) => a.includes('were deleted at the end of its keeping period')));
  } finally {
    await new Promise((r) => server.close(r));
  }
});
