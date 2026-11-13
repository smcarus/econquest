/**
 * Deployment (console integration item 11): the daily-download deadline, service tokens made from
 * the command line seen by a running server at once, and an audit entry written by another process
 * continuing the chain instead of forking it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { deadlineInputs, deadlineNote, parseDeadline } from '../src/utils/dailyDeadline';
import { dailyRunInputs } from '../src/server/eventSources';
import { ApiTokenStore } from '../src/utils/apiTokenStore';
import { appendAudit, auditFiles, readAudit, resetAuditCache } from '../src/utils/auditStore';
import { nextEntry } from '../src/utils/auditLog';

const d = parseDeadline('7:30', 'America/New_York').deadline!;

test('deadline setting: HH:MM, off, or a problem named', () => {
  assert.deepEqual(d, { time: '07:30', timeZone: 'America/New_York' });
  assert.equal(parseDeadline('', 'UTC').deadline, null);
  assert.equal(parseDeadline('off', 'UTC').deadline, null);
  assert.match(parseDeadline('25:00', 'UTC').problem!, /07:30/);
});

test('before the deadline nothing; at it, a run that finished in the window is fine', () => {
  // 12:00Z = 07:00 in New York (EST).
  const run = { last: { startedAt: '2026-11-13T07:00:00Z', finishedAt: '2026-11-13T11:00:00Z', steps: [] } } as never;
  assert.deepEqual(deadlineInputs(run, d, new Date('2026-11-13T12:00:00Z')), []);
  assert.deepEqual(deadlineInputs(run, d, new Date('2026-11-13T13:00:00Z')), []);
  // A run that finished the evening before (after yesterday's deadline) counts for today.
  const evening = { last: { startedAt: '2026-11-13T01:00:00Z', finishedAt: '2026-11-13T02:00:00Z', steps: [] } } as never;
  assert.deepEqual(deadlineInputs(evening, d, new Date('2026-11-13T13:00:00Z')), []);
});

test('missed deadline: one feed_failed for the day, saying what was seen', () => {
  const running = { last: { startedAt: '2026-11-13T11:00:00Z', steps: [] } } as never;
  const [e] = deadlineInputs(running, d, new Date('2026-11-13T12:31:00Z'));
  assert.equal(e!.type, 'feed_failed');
  assert.equal(e!.as_of, '2026-11-13');
  assert.equal(e!.discriminator, 'deadline:2026-11-13');
  assert.match(e!.summary, /missed its 07:30 deadline \(America\/New_York\) for 2026-11-13: the run that started at 06:00 has not finished/);
  const old = { last: { startedAt: '2026-11-11T07:00:00Z', finishedAt: '2026-11-11T08:00:00Z', steps: [] } } as never;
  assert.match(deadlineInputs(old, d, new Date('2026-11-13T13:00:00Z'))[0]!.summary, /the last run finished on 2026-11-11 at 03:00/);
  assert.match(deadlineInputs({} as never, d, new Date('2026-11-13T13:00:00Z'))[0]!.summary, /no daily download has ever run/);
});

test('daily_download_ready carries which deadline the run counts for', () => {
  const run = { startedAt: '2026-11-13T07:00:00Z', finishedAt: '2026-11-13T13:00:00Z', steps: [{ id: 'feeds', label: 'Feeds', outcome: 'done' as const }] };
  const ready = dailyRunInputs(run as never, d).find((e) => e.type === 'daily_download_ready')!;
  assert.deepEqual((ready.data as { deadline: unknown }).deadline, { time: '07:30', time_zone: 'America/New_York', counts_for: '2026-11-14', after_deadline_of: '2026-11-13' });
  assert.deepEqual(deadlineNote('2026-11-13T11:00:00Z', d), { time: '07:30', time_zone: 'America/New_York', counts_for: '2026-11-13', after_deadline_of: null });
  assert.equal((dailyRunInputs(run as never).find((e) => e.type === 'daily_download_ready')!.data as { deadline?: unknown }).deadline, undefined);
});

test('a token made by another process (npm run tokens) is seen by the running store at once', async () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tokens-')), 'local', 'api-tokens.json');
  const server = new ApiTokenStore(file);
  assert.equal(server.list().length, 0);
  await new Promise((r) => setTimeout(r, 20));
  const cli = new ApiTokenStore(file);
  const made = cli.create({ name: 'Service', scopes: ['read:events'], createdBy: 'the command line' });
  assert.ok(!('error' in made));
  if ('error' in made) return;
  assert.equal(server.resolve(made.secret)?.name, 'Service');
  await new Promise((r) => setTimeout(r, 20));
  cli.revoke(made.token.id, 'the command line');
  assert.equal(server.resolve(made.secret), null, 'a revoke from the command line takes effect at once');
});

test('an audit entry written by another process continues the chain', () => {
  resetAuditCache();
  const files = auditFiles(fs.mkdtempSync(path.join(os.tmpdir(), 'audit-two-')));
  appendAudit(files, { kind: 'data', summary: 'from the server' });
  // Another process appends the next entry the way appendAudit does.
  const lines = fs.readFileSync(files.log, 'utf8').trim().split('\n');
  const last = JSON.parse(lines.at(-1)!);
  fs.appendFileSync(files.log, JSON.stringify(nextEntry(last, { kind: 'api', summary: 'from the command line' })) + '\n');
  appendAudit(files, { kind: 'data', summary: 'from the server again' });
  const r = readAudit(files);
  assert.equal(r.check.ok, true, r.check.problem);
  assert.equal(r.entries.length, 3);
});
