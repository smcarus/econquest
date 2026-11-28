import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { AddressInfo } from 'net';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { aiProblems, assignmentsIcs, dueFor, dueProblems, entriesVisibleToStudents, latestEntries, shiftLocal, zonedToUtc, type ClassAssignment, type ClassEntry } from '../src/utils/classAssignments';
import { registerClassRoutes } from '../src/server/routes/classes';
import { requiredRole } from '../src/utils/permissions';
import type { Account, Role } from '../src/utils/auth';
import { repoQuest } from './repoQuest';

test('due times: a local time in the class time zone becomes the right instant, summer time included', () => {
  assert.equal(zonedToUtc('2027-01-15T23:59', 'America/Chicago'), '2027-01-16T05:59:00.000Z');
  assert.equal(zonedToUtc('2027-07-15T23:59', 'America/Chicago'), '2027-07-16T04:59:00.000Z');
  assert.equal(zonedToUtc('2027-03-01T09:00', 'Africa/Nairobi'), '2027-03-01T06:00:00.000Z');
  assert.equal(zonedToUtc('2027-02-30T09:00', 'UTC'), null);
  assert.equal(zonedToUtc('2027-02-01T09:00', 'Not/AZone'), null);
  assert.equal(shiftLocal('2027-01-30T23:59', 3), '2027-02-02T23:59');
});

const base: ClassAssignment = { id: 'a1', questId: 'q', questVersion: 1, title: 'Brent', due: '2026-12-10T23:59', dueUtc: '2026-12-10T23:59:00.000Z', aiRule: 'note', extensions: [{ accountId: 's2', due: '2026-12-12T23:59', dueUtc: '2026-12-12T23:59:00.000Z' }], createdAt: '' };

test('extensions are private to one student, and entries stay hidden until the last due time', () => {
  assert.equal(dueFor(base, 's1').dueUtc, '2026-12-10T23:59:00.000Z');
  assert.equal(dueFor(base, 's2').extended, true);
  assert.equal(entriesVisibleToStudents(base, '2026-12-11T00:00:00.000Z'), false, 'one student still has time');
  assert.equal(entriesVisibleToStudents(base, '2026-12-13T00:00:00.000Z'), true);
  assert.equal(entriesVisibleToStudents({ ...base, revealedAt: 'x' }, '2026-12-01T00:00:00.000Z'), true, 'the teacher may show them early');
  assert.deepEqual(dueProblems('2026-12-25T10:00', 'UTC', '2026-12-20', '2026-12-01T00:00:00.000Z'), ['The Quest takes entries only until 2026-12-20, so the due time cannot be later']);
  assert.deepEqual(dueProblems('2026-11-25T10:00', 'UTC', '2026-12-20', '2026-12-01T00:00:00.000Z'), ['The due time has already passed']);
  assert.equal(aiProblems('allowed', '', false).length, 0);
  assert.equal(aiProblems('note', 'short', false).length, 1);
  assert.equal(aiProblems('none', '', true).length, 0);
  const e = (accountId: string, at: string) => ({ id: at, classId: 'c', assignmentId: 'a1', accountId, at }) as ClassEntry;
  assert.deepEqual(latestEntries([e('s1', '1'), e('s1', '2'), e('s2', '3')], 'a1').map((x) => x.at), ['2', '3']);
  const ics = assignmentsIcs('Macro, 101', [base], 's2', '2026-12-01T00:00:00.000Z');
  assert.match(ics, /DTSTART:20261212T235900Z/);
  assert.match(ics, /X-WR-CALNAME:Macro\\, 101/);
});

test('a student (Viewer) may hand in an assignment; setting one needs an Analyst', () => {
  assert.equal(requiredRole('POST', '/api/classes/c1/assignments/a1/entries'), 'viewer');
  assert.equal(requiredRole('POST', '/api/classes/c1/assignments'), 'analyst');
  assert.equal(requiredRole('POST', '/api/classes/c1/assignments/a1/extension'), 'analyst');
});

const acct = (id: string, role: Role): Account => ({ id, username: id, displayName: id.toUpperCase(), role, provider: 'local', passwordHash: 'x', createdAt: '2026-11-01', passwordChangedAt: '2026-11-01' });

test('routes: set a Quest, hand in, hidden entries, extension, reveal, copy to next term, calendar', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'classasg-'));
  const qdir = path.join(dir, 'quests');
  fs.mkdirSync(path.join(qdir, 'drafts'), { recursive: true });
  const brent = repoQuest('tutorial-brent-week.json');
  fs.writeFileSync(path.join(qdir, 'drafts', 'tutorial-brent-week.json'), JSON.stringify({ ...brent, registeredOn: '2026-11-01', opensOn: '2026-11-02', closesOn: '2027-06-30', rule: { ...brent.rule, to: { on: '2027-07-01' } }, fallback: brent.fallback === 'unresolvable' ? 'unresolvable' : { ...brent.fallback, rule: { ...brent.fallback.rule, to: { on: '2027-07-01' } } } }, null, 2));
  fs.writeFileSync(path.join(qdir, 'manifest.json'), '{}\n');
  const accounts = new Map<string, Account>(['prof', 's1', 's2'].map((id) => [id, acct(id, id === 'prof' ? 'analyst' : 'viewer')]));
  let clock = new Date('2026-12-01T12:00:00Z');
  const app = express();
  app.use(express.json());
  registerClassRoutes(app, {
    enabled: () => true,
    file: path.join(dir, 'classes.json'),
    entriesFile: path.join(dir, 'class-entries.jsonl'),
    questsDir: qdir,
    authRequired: () => true,
    signedIn: (res) => accounts.get(String(res.req.headers['x-who'] || '')) ?? null,
    accountById: (id) => accounts.get(id),
    accountByUsername: (u) => accounts.get(u),
    makeStudent: () => {
      throw new Error('not used');
    },
    now: () => clock,
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
    const made = await call('prof', 'POST', '/api/classes', { name: 'Macro', timeZone: 'America/Chicago', term: { label: 'Winter', starts: '2026-11-30', ends: '2027-01-29' } });
    const id = made.body.class.id as string;
    assert.equal(made.body.class.timeZone, 'America/Chicago');
    for (const s of ['s1', 's2']) await call(s, 'POST', '/api/classes/join', { code: made.body.class.code });
    const quests = await call('prof', 'GET', `/api/classes/${id}/quests`);
    assert.deepEqual(quests.body.quests.map((q: { id: string }) => q.id), ['tutorial-brent-week']);
    assert.equal((await call('s1', 'GET', `/api/classes/${id}/quests`)).status, 403);
    assert.equal((await call('prof', 'POST', `/api/classes/${id}/assignments`, { questId: 'tutorial-brent-week', due: '2027-07-10T23:59', aiRule: 'note' })).status, 400, 'after the Quest closes');
    assert.equal((await call('prof', 'POST', `/api/classes/${id}/assignments`, { questId: 'tutorial-brent-week', due: '2026-12-10T23:59', aiRule: 'note', instructions: 'Read the Brent page first.' })).status, 200);
    const list = await call('s1', 'GET', `/api/classes/${id}/assignments`);
    const aid = list.body.assignments[0].id as string;
    assert.equal(list.body.assignments[0].dueUtc, '2026-12-11T05:59:00.000Z', '23:59 in Chicago');
    assert.equal(list.body.assignments[0].answerKind, 'probability');
    assert.equal(list.body.assignments[0].entryCount, undefined, 'students do not see counts');

    assert.equal((await call('s1', 'POST', `/api/classes/${id}/assignments/${aid}/entries`, { answer: { probability: 0.7 } })).status, 400, 'the AI note is required');
    assert.equal((await call('s1', 'POST', `/api/classes/${id}/assignments/${aid}/entries`, { answer: { probability: 0.7 }, aiNote: 'I did not use AI tools.' })).status, 200);
    assert.equal((await call('s2', 'POST', `/api/classes/${id}/assignments/${aid}/entries`, { answer: { probability: 0.4 }, aiNote: 'Used a chatbot to check terms.' })).status, 200);
    assert.equal((await call('prof', 'POST', `/api/classes/${id}/assignments/${aid}/entries`, { answer: { probability: 0.4 } })).status, 403);
    const hidden = await call('s1', 'GET', `/api/classes/${id}/assignments/${aid}/entries`);
    assert.equal(hidden.body.hiddenUntilDue, true);
    assert.deepEqual(hidden.body.entries.map((e: { name: string }) => e.name), ['S1']);
    const teacher = await call('prof', 'GET', `/api/classes/${id}/assignments/${aid}/entries`);
    assert.equal(teacher.body.entries.length, 2);
    assert.equal(teacher.body.entries[1].ai.note, 'Used a chatbot to check terms.');

    assert.equal((await call('prof', 'POST', `/api/classes/${id}/assignments/${aid}/extension`, { username: 's2', due: '2026-12-14T12:00' })).status, 200);
    clock = new Date('2026-12-12T12:00:00Z');
    assert.equal((await call('s1', 'POST', `/api/classes/${id}/assignments/${aid}/entries`, { answer: { probability: 0.9 }, aiNote: 'I did not use AI tools.' })).status, 400, 'past due');
    assert.equal((await call('s2', 'POST', `/api/classes/${id}/assignments/${aid}/entries`, { answer: { probability: 0.5 }, aiNote: 'Used a chatbot to check terms.' })).status, 200, 'the extension holds');
    assert.equal((await call('s1', 'GET', `/api/classes/${id}/assignments/${aid}/entries`)).body.hiddenUntilDue, true, 's2 still has time');
    assert.equal((await call('prof', 'POST', `/api/classes/${id}/assignments/${aid}/reveal`)).status, 200);
    const shown = await call('s1', 'GET', `/api/classes/${id}/assignments/${aid}/entries`);
    assert.deepEqual(shown.body.entries.map((e: { name: string; answer: { probability: number } }) => [e.name, e.answer.probability]), [['S1', 0.7], ['S2', 0.5]]);
    assert.equal(shown.body.entries[0].ai, undefined, 'students do not see AI notes');

    const ics = await call('s2', 'GET', `/api/classes/${id}/calendar.ics`);
    assert.match(ics.body, /DTSTART:20261214T180000Z/);

    const next = await call('prof', 'POST', '/api/classes', { name: 'Macro', timeZone: 'America/Chicago', term: { label: 'Spring', starts: '2027-01-25', ends: '2027-05-07' } });
    const copy = await call('prof', 'POST', `/api/classes/${next.body.class.id}/copy`, { fromClassId: id });
    assert.equal(copy.body.copied.length, 1);
    assert.deepEqual(copy.body.skipped, []);
    const moved = await call('prof', 'GET', `/api/classes/${next.body.class.id}/assignments`);
    assert.equal(moved.body.assignments[0].due, '2027-02-04T23:59', 'moved by the 56 days between term starts');
    assert.equal(moved.body.assignments[0].extensions.length, 0, 'extensions are not copied');
  } finally {
    await new Promise((r) => server.close(r));
  }
});
