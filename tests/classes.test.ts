import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { AddressInfo } from 'net';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { classProblems, classView, formatJoinCode, joinCodeFrom, nicknameProblems, normaliseJoinCode, studentUsername, type SchoolClass } from '../src/utils/classes';
import { registerClassRoutes } from '../src/server/routes/classes';
import { requiredRole } from '../src/utils/permissions';
import type { Account, Role } from '../src/utils/auth';

const acct = (id: string, role: Role): Account => ({ id, username: id, displayName: id.toUpperCase(), role, provider: 'local', passwordHash: 'x', createdAt: '2026-11-01', passwordChangedAt: '2026-11-01' });

test('join codes: eight characters with no look-alikes, typed in any case with or without the dash', () => {
  const code = joinCodeFrom(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 99]));
  assert.equal(code, 'ABCDEFGH');
  assert.equal(formatJoinCode(code), 'ABCD-EFGH');
  assert.equal(normaliseJoinCode(' abcd-efgh '), 'ABCDEFGH');
  assert.equal(normaliseJoinCode('ABCD-EFG0'), '', 'no zero');
  assert.equal(normaliseJoinCode('ABCDEFG'), '');
});

test('a class needs a name and a real term', () => {
  assert.deepEqual(classProblems({ name: 'Macro 101', term: { label: 'Spring 2027', starts: '2027-01-11', ends: '2027-05-07' } }), []);
  assert.deepEqual(classProblems({ name: ' ', term: { label: '', starts: '2027-02-30', ends: '2027-05-07' } }), ['Give the class a name', 'Name the term, for example Spring 2027', 'Give the first and last day of the term as dates']);
  assert.deepEqual(classProblems({ name: 'A', term: { label: 'T', starts: '2027-05-07', ends: '2027-01-11' } }), ['The term cannot end before it starts']);
});

test('student usernames from nicknames: no accents, unique', () => {
  const taken = new Set(['jose']);
  assert.equal(studentUsername('José', (u) => taken.has(u)), 'jose-2');
  assert.equal(studentUsername('Ana María', () => false), 'ana-maria');
  assert.equal(studentUsername('!', () => false), 'student');
  assert.deepEqual(nicknameProblems([]), ['Give at least one nickname, one per line']);
  assert.deepEqual(nicknameProblems(['ok', '<b>']), ['"<b>" may not contain < > or control characters']);
});

test('what each role sees: students never see the other students or the code', () => {
  const cls: SchoolClass = { id: 'c', name: 'Macro', term: { label: 'T', starts: '2027-01-01', ends: '2027-05-01' }, code: 'ABCDEFGH', createdAt: '', createdBy: 't', members: [{ accountId: 't', role: 'teacher', joinedAt: '' }, { accountId: 'm', role: 'marker', joinedAt: '' }, { accountId: 's', role: 'student', joinedAt: '' }, { accountId: 's2', role: 'student', joinedAt: '' }] };
  const nameOf = (id: string) => ({ username: id, displayName: id.toUpperCase() });
  const teacher = classView(cls, 't', nameOf)!;
  assert.equal(teacher.code, 'ABCD-EFGH');
  assert.deepEqual(teacher.members!.map((m) => m.role), ['teacher', 'marker', 'student', 'student']);
  const marker = classView(cls, 'm', nameOf)!;
  assert.equal(marker.code, undefined);
  assert.equal(marker.members!.length, 4);
  const student = classView(cls, 's', nameOf)!;
  assert.equal(student.members, undefined);
  assert.equal(student.code, undefined);
  assert.deepEqual(student.teachers, ['T']);
  assert.equal(student.memberCount, 4);
  assert.equal(classView(cls, 'stranger', nameOf), null);
});

test('a Viewer may join a class but not make one', () => {
  assert.equal(requiredRole('POST', '/api/classes/join'), 'viewer');
  assert.equal(requiredRole('POST', '/api/classes'), 'analyst');
  assert.equal(requiredRole('POST', '/api/classes/x/students'), 'analyst');
  assert.equal(requiredRole('GET', '/api/classes'), 'viewer');
});

test('routes: off, sign-in needed, make, join, add a marker, make student accounts, new code, archive', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'classes-'));
  const accounts = new Map<string, Account>([['prof', acct('prof', 'analyst')], ['ta', acct('ta', 'viewer')], ['stu', acct('stu', 'viewer')]]);
  const log: string[] = [];
  let on = false;
  let required = false;
  const app = express();
  app.use(express.json());
  registerClassRoutes(app, {
    enabled: () => on,
    file: path.join(dir, 'classes.json'),
    authRequired: () => required,
    signedIn: (res) => accounts.get(String(res.req.headers['x-who'] || '')) ?? null,
    accountById: (id) => accounts.get(id),
    accountByUsername: (u) => [...accounts.values()].find((a) => a.username === u),
    makeStudent: (username, displayName) => {
      const a = { ...acct(username, 'viewer'), displayName };
      accounts.set(a.id, a);
      return { account: a, password: `pw-${username}` };
    },
    audit: (s) => log.push(s),
    now: () => new Date('2026-12-01T10:00:00Z'),
  });
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const call = async (who: string, method: string, url: string, body?: unknown) => {
    const r = await fetch(`${base}${url}`, { method, headers: { 'Content-Type': 'application/json', 'x-who': who }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: r.status, body: await r.json() };
  };
  try {
    assert.equal((await call('prof', 'GET', '/api/classes')).body.enabled, false);
    assert.equal((await call('prof', 'POST', '/api/classes', {})).status, 404);
    on = true;
    const noSign = await call('prof', 'GET', '/api/classes');
    assert.equal(noSign.body.needSignIn, true);
    assert.equal((await call('prof', 'POST', '/api/classes', {})).status, 400);
    required = true;
    assert.equal((await call('stu', 'GET', '/api/classes')).body.canCreate, false);
    assert.equal((await call('stu', 'POST', '/api/classes', { name: 'x', term: { label: 'T', starts: '2027-01-01', ends: '2027-02-01' } })).status, 403);
    const made = await call('prof', 'POST', '/api/classes', { name: 'Macro 101', term: { label: 'Spring 2027', starts: '2027-01-11', ends: '2027-05-07' } });
    assert.equal(made.status, 200);
    const id = made.body.class.id as string;
    const code = made.body.class.code as string;
    assert.match(code, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    assert.equal(made.body.class.myRole, 'teacher');

    const joined = await call('stu', 'POST', '/api/classes/join', { code: code.toLowerCase() });
    assert.equal(joined.status, 200);
    assert.equal(joined.body.class.myRole, 'student');
    assert.equal(joined.body.class.members, undefined);
    assert.equal((await call('stu', 'POST', '/api/classes/join', { code })).status, 409);
    assert.equal((await call('stu', 'POST', '/api/classes/join', { code: 'ZZZZ-ZZZZ' })).status, 404);
    assert.equal((await call('stu', 'POST', `/api/classes/${id}/code`)).status, 403, 'a student cannot change the code');

    const marker = await call('prof', 'POST', `/api/classes/${id}/members`, { username: 'ta', role: 'marker' });
    assert.equal(marker.status, 200);
    const taView = await call('ta', 'GET', `/api/classes/${id}`);
    assert.equal(taView.body.class.myRole, 'marker');
    assert.equal(taView.body.class.members.length, 3);
    assert.equal(taView.body.class.code, undefined);

    const kids = await call('prof', 'POST', `/api/classes/${id}/students`, { nicknames: ['José', 'Amina', ''] });
    assert.equal(kids.status, 200);
    assert.deepEqual(kids.body.created.map((c: { username: string; password: string }) => [c.username, c.password]), [['jose', 'pw-jose'], ['amina', 'pw-amina']]);
    assert.equal(kids.body.class.memberCount, 5);
    assert.equal(accounts.get('jose')!.role, 'viewer');

    assert.equal((await call('prof', 'DELETE', `/api/classes/${id}/members/prof`)).status, 409, 'the last teacher stays');
    assert.equal((await call('prof', 'DELETE', `/api/classes/${id}/members/amina`)).body.class.memberCount, 4);

    const recoded = await call('prof', 'POST', `/api/classes/${id}/code`);
    assert.notEqual(recoded.body.class.code, code);
    assert.equal((await call('ta', 'POST', '/api/classes/join', { code })).status, 404, 'the old code stops working');

    assert.equal((await call('prof', 'POST', `/api/classes/${id}/archive`, { archived: true })).body.class.archived, true);
    const fresh = await call('prof', 'GET', '/api/classes');
    assert.equal(fresh.body.classes[0].archived, true);
    assert.equal((await call('ta', 'POST', '/api/classes/join', { code: recoded.body.class.code })).status, 400);
    assert.ok(log.some((l) => /made 2 student account\(s\) for the class "Macro 101": jose, amina/.test(l)));
    assert.equal(fs.statSync(path.join(dir, 'classes.json')).mode & 0o777, 0o600);
  } finally {
    await new Promise((r) => server.close(r));
  }
});
