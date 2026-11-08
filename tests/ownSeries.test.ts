import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { AddressInfo } from 'net';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createMemoryPlatform } from '../src/platform/memory';
import { auditFiles, readAudit } from '../src/utils/auditStore';
import {
  checkOwnMeta,
  checkOwnUpload,
  deleteOwnSeries,
  listOwnSeries,
  loadOwnSeries,
  ownSeriesView,
  OWN_SERIES_FOLDER,
  parseOwnCsv,
  readDate,
  readNumber,
  saveOwnSeries,
} from '../src/engine/ownSeries';

const META = { label: 'Ghana: cocoa purchases', unit: 'tonnes', freq: 'monthly', iso3: 'GHA', source: 'Ghana Cocoa Board report 2025, table 4' };

test('a plain two-column file is read oldest first, blanks skipped and counted', () => {
  const p = parseOwnCsv('date,value\n2024-03,3.5\n2024-01,3.2\n2024-02,\n2024-04,NA\n2024-05,..\n', 'monthly');
  assert.deepEqual(p.problems, []);
  assert.deepEqual(p.points, [
    { date: '2024-01', value: 3.2 },
    { date: '2024-03', value: 3.5 },
  ]);
  assert.equal(p.rowsRead, 5);
  assert.equal(p.blank, 3);
});

test('semicolons and tabs allow a decimal comma; a byte-order mark and Windows line ends are fine', () => {
  const semi = parseOwnCsv('﻿fecha;valor\r\n2024-01;3,5\r\n2024-02;-0,25\r\n', 'monthly');
  assert.deepEqual(semi.problems, []);
  assert.deepEqual(semi.points.map((x) => x.value), [3.5, -0.25]);
  assert.equal(semi.separator, ';');
  const tab = parseOwnCsv('date\tvalue\n2024\t1,5\n2025\t2\n', 'annual');
  assert.deepEqual(tab.points, [
    { date: '2024', value: 1.5 },
    { date: '2025', value: 2 },
  ]);
});

test('a comma inside a number in a comma file is refused with a reason, never guessed', () => {
  const p = parseOwnCsv('date,value\n2024-01,"1,234.5"\n2024-02,2\n', 'monthly');
  assert.equal(p.points.length, 0);
  assert.match(p.problems[0] ?? '', /Line 2: .*thousands separators/);
});

test('extra columns need "date" and "value" names', () => {
  assert.match(parseOwnCsv('a,b,c\n2024,1,2\n', 'annual').problems[0] ?? '', /name the two to use "date" and "value"/);
  const ok = parseOwnCsv('country,date,value,note\nGHA,2024-Q1,1,x\nGHA,2024Q2,2,y\n', 'quarterly');
  assert.deepEqual(ok.points.map((x) => x.date), ['2024-Q1', '2024-Q2']);
});

test('a file without a header row, duplicate dates, bad numbers and unclear dates are refused by line', () => {
  assert.match(parseOwnCsv('2024-01,1\n2024-02,2\n', 'monthly').problems[0] ?? '', /looks like data/);
  const dup = parseOwnCsv('date,value\n2024-01,1\n2024-01-15,2\n', 'monthly');
  assert.match(dup.problems[0] ?? '', /Line 3: 2024-01 appears twice \(first on line 2\)/);
  const bad = parseOwnCsv('date,value\n2024-01,abc\n03/04/2025,1\n2024-13,2\n', 'monthly');
  assert.equal(bad.points.length, 0);
  assert.match(bad.problems.join(' '), /"abc" is not a number/);
  assert.match(bad.problems.join(' '), /day-first or month-first/);
  assert.match(bad.problems.join(' '), /"2024-13" is not a month/);
  assert.match(parseOwnCsv('date,value\n2024-01,1\n', 'monthly').problems[0] ?? '', /At least two dated figures/);
  assert.match(parseOwnCsv('', 'monthly').problems[0] ?? '', /empty/);
});

test('long lists of problems are cut with a count', () => {
  const rows = Array.from({ length: 30 }, (_, i) => `2024-01-${String(i + 1).padStart(2, '0')},x`).join('\n');
  const p = parseOwnCsv(`date,value\n${rows}\n`, 'daily');
  assert.equal(p.problems.length, 21);
  assert.match(p.problems[20] ?? '', /and 10 more problems/);
});

test('dates and numbers are read strictly', () => {
  assert.deepEqual(readDate('2024-02-29', 'daily'), { date: '2024-02-29' });
  assert.ok('reason' in readDate('2023-02-29', 'daily'));
  assert.deepEqual(readDate('2024 q3', 'quarterly'), { date: '2024-Q3' });
  assert.ok('reason' in readDate('1700', 'annual'));
  assert.equal(readNumber('1e3', ','), 1000);
  assert.equal(readNumber('3,5', ','), null);
  assert.equal(readNumber('3,5', ';'), 3.5);
  assert.equal(readNumber('12%', ','), null);
});

test('the description needs a name, unit, frequency, country and source', () => {
  const m = checkOwnMeta({});
  assert.ok('problems' in m && m.problems.length === 5);
  const ok = checkOwnMeta({ ...META, label: '  Ghana:   cocoa  ', licence: '', note: 'Rebased' });
  assert.ok('meta' in ok);
  assert.equal(ok.meta.label, 'Ghana: cocoa');
  assert.equal(ok.meta.note, 'Rebased');
  assert.equal('licence' in ok.meta, false);
  assert.ok('meta' in checkOwnMeta({ ...META, iso3: 'wld' }));
  const c = checkOwnUpload({ ...META, source: '' }, 'date,value\n2024-01,1\n2024-02,2\n');
  assert.equal(c.ok, false);
  assert.match(c.ok ? '' : c.problems[0] ?? '', /where the figures came from/);
});

test('save, list, load, show as "Your file" and delete; an edited copy is flagged', async () => {
  const platform = createMemoryPlatform({ now: Date.UTC(2026, 10, 8, 3) });
  const csv = 'date,value\n2024-01,10\n2024-02,12\n';
  const made = await saveOwnSeries(platform, META, csv);
  assert.ok('saved' in made);
  const s = made.saved;
  assert.match(s.id, /^own_ghana_cocoa_purchases_[0-9a-f]{8}$/);
  assert.equal(s.savedAt, '2026-11-08T03:00:00.000Z');
  assert.equal(s.csvSha256.length, 64);
  const list = await listOwnSeries(platform);
  assert.equal(list.length, 1);
  assert.deepEqual([list[0]?.count, list[0]?.first, list[0]?.last, list[0]?.intact], [2, '2024-01', '2024-02', true]);
  const view = ownSeriesView(s);
  assert.equal(view.source, 'Your file: Ghana Cocoa Board report 2025, table 4');
  assert.equal(view.own, true);
  assert.match(view.about, /has not checked these figures.*Terms of use not given/);

  // Change a figure behind the app's back.
  const name = `${OWN_SERIES_FOLDER}/${s.id}.json`;
  const edited = JSON.parse(platform.fileMap.get(name) ?? '{}');
  edited.points[0].value = 99;
  platform.fileMap.set(name, JSON.stringify(edited));
  assert.equal((await loadOwnSeries(platform, s.id))?.intact, false);
  assert.equal((await listOwnSeries(platform))[0]?.intact, false);

  assert.equal(await loadOwnSeries(platform, '../secrets'), null);
  assert.equal(await deleteOwnSeries(platform, 'own_nope_00000000'), false);
  assert.equal(await deleteOwnSeries(platform, s.id), true);
  assert.deepEqual(await listOwnSeries(platform), []);
});

test('nothing is written when a check fails', async () => {
  const platform = createMemoryPlatform();
  const made = await saveOwnSeries(platform, META, 'date,value\n2024-01,x\n');
  assert.ok('problems' in made);
  assert.equal(platform.fileMap.size, 0);
});

test('routes: check saves nothing, save and delete are audited, viewers are refused', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'own-'));
  process.env.DATA_DIR = dir;
  const { registerOwnSeriesRoutes } = await import('../src/server/routes/ownSeries');
  const platform = createMemoryPlatform();
  let role: 'admin' | 'viewer' = 'admin';
  const app = express();
  app.use(express.json({ limit: '5mb' }));
  registerOwnSeriesRoutes(app, {
    platform,
    refuseRemoteChange: () => false,
    signedIn: () => ({ id: 'u1', username: 'sam', name: 'Sam', role }) as never,
  });
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const post = (p: string, body: unknown) => fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  try {
    const csv = 'date,value\n2024-01,10\n2024-02,\n2024-03,12\n';
    const check = await (await post('/api/own-series/check', { meta: META, csv })).json();
    assert.deepEqual([check.ok, check.count, check.blank, check.first.date, check.last.date], [true, 2, 1, '2024-01', '2024-03']);
    assert.equal(platform.fileMap.size, 0);
    const notACountry = await (await post('/api/own-series/check', { meta: { ...META, iso3: 'XYZ' }, csv })).json();
    assert.equal(notACountry.ok, false);
    assert.match(notACountry.problems[0], /XYZ is not an ISO 3166 country code/);
    assert.equal((await post('/api/own-series', { meta: { ...META, iso3: 'XYZ' }, csv })).status, 400);
    const badCheck = await (await post('/api/own-series/check', { meta: {}, csv: '' })).json();
    assert.equal(badCheck.ok, false);
    assert.ok(badCheck.problems.length >= 2);

    role = 'viewer';
    assert.equal((await post('/api/own-series', { meta: META, csv })).status, 403);
    role = 'admin';
    const bad = await post('/api/own-series', { meta: META, csv: 'date,value\n2024-01,x\n' });
    assert.equal(bad.status, 400);
    const saved = (await (await post('/api/own-series', { meta: META, csv })).json()).saved;
    assert.equal(saved.count, 2);
    const list = (await (await fetch(`${base}/api/own-series`)).json()).series;
    assert.equal(list.length, 1);
    const one = await (await fetch(`${base}/api/own-series/${saved.id}`)).json();
    assert.equal(one.meta.source, META.source);
    assert.equal(one.intact, true);
    assert.equal((await fetch(`${base}/api/own-series/own_nope_00000000`)).status, 404);
    role = 'viewer';
    assert.equal((await fetch(`${base}/api/own-series/${saved.id}`, { method: 'DELETE' })).status, 403);
    role = 'admin';
    assert.equal((await fetch(`${base}/api/own-series/${saved.id}`, { method: 'DELETE' })).status, 200);
    assert.equal((await (await fetch(`${base}/api/own-series`)).json()).series.length, 0);

    // Audit entries are written in turn after the reply; reading the log waits for those already queued.
    await readAudit(auditFiles(dir));
    const audit = fs.readFileSync(path.join(dir, 'local', 'audit', 'audit-log.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
    assert.deepEqual(audit.map((e) => [e.kind, e.summary.split(' ')[0]]), [
      ['own_data', 'Loaded'],
      ['own_data', 'Deleted'],
    ]);
    assert.equal(audit[0].detail.csvSha256, saved.csvSha256);
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test('your series join the country or world list labelled "Your file"; sharing mode holds them back', async () => {
  const { ownSeriesViewsFor, isOwnSource } = await import('../src/engine/ownSeries');
  const { withheldReason } = await import('../src/utils/shareMode');
  const { licenceLabelForSource } = await import('../src/utils/licenceLookup');
  const platform = createMemoryPlatform();
  const csv = 'date,value\n2024-01,10\n2024-02,12\n';
  const gha = await saveOwnSeries(platform, META, csv);
  await saveOwnSeries(platform, { ...META, label: 'Cocoa world stocks', iso3: 'WLD' }, csv);
  assert.ok('saved' in gha);
  const views = await ownSeriesViewsFor(platform, 'gha');
  assert.deepEqual(views.map((v) => [v.label, v.own]), [['Ghana: cocoa purchases', true]]);
  assert.equal((await ownSeriesViewsFor(platform, 'WLD')).length, 1);
  assert.equal((await ownSeriesViewsFor(platform, 'KEN')).length, 0);
  const name = `${OWN_SERIES_FOLDER}/${gha.saved.id}.json`;
  const edited = JSON.parse(platform.fileMap.get(name) ?? '{}');
  edited.points[1].value = 13;
  platform.fileMap.set(name, JSON.stringify(edited));
  assert.match((await ownSeriesViewsFor(platform, 'GHA'))[0]?.about ?? '', /^Changed outside the app/);
  const src = views[0]?.source ?? '';
  assert.equal(isOwnSource(src), true);
  assert.equal(isOwnSource('IMF WEO'), false);
  assert.match(withheldReason(src) ?? '', /your own file/);
  assert.match(licenceLabelForSource(src), /^Your own file/);
});
