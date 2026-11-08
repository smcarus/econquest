import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { dailyDue, formatDaily, interestingLines, readDaily, testsDue, writeDaily, type DailyRun } from '../src/utils/dailyRun.ts';

const at = (s: string) => new Date(s);

test('daily run: first start runs; a second start the same day does not; next morning does', () => {
  assert.equal(dailyDue({}, at('2026-11-08T08:00:00Z')).due, true);
  const d = { last: { startedAt: '2026-11-08T08:00:00Z', finishedAt: '2026-11-08T08:40:00Z', steps: [] } };
  const later = dailyDue(d, at('2026-11-08T15:00:00Z'));
  assert.equal(later.due, false);
  assert.match(later.reason, /already ran today/);
  assert.equal(dailyDue(d, at('2026-11-09T07:30:00Z')).due, true);
  assert.equal(dailyDue(d, at('2026-11-08T15:00:00Z'), true).due, true);
});

test('daily run: one still going is left alone; one stopped long ago runs again', () => {
  const d = { last: { startedAt: '2026-11-08T08:00:00Z', steps: [] } };
  assert.equal(dailyDue(d, at('2026-11-08T09:00:00Z')).due, false);
  assert.equal(dailyDue(d, at('2026-11-08T21:00:00Z')).due, true);
});

test('daily run: a run that found no connection is tried again after an hour', () => {
  const d = { last: { startedAt: '2026-11-08T08:00:00Z', finishedAt: '2026-11-08T08:01:00Z', offline: true, steps: [] } };
  assert.equal(dailyDue(d, at('2026-11-08T08:30:00Z')).due, false);
  assert.equal(dailyDue(d, at('2026-11-08T09:30:00Z')).due, true);
});

test('weekly tests: due with no run on record or after 7 days', () => {
  assert.equal(testsDue(undefined, at('2026-11-08T00:00:00Z')), true);
  assert.equal(testsDue('2026-11-02T03:30:00Z', at('2026-11-08T00:00:00Z')), false);
  assert.equal(testsDue('2026-11-01T03:30:00Z', at('2026-11-08T04:00:00Z')), true);
});

test('script output: saved files and the not-saved list are picked out', () => {
  const out = ['Saved SDN.CSV (1.2 MB) from x', 'Not saved (2):', '  ADD.CSV: HTTP 403 (download it by hand)', '  consolidated.xml: timeout', '', 'Folder: y', 'Not saved: data_gpr_export.xls: HTTP 500'].join('\n');
  const got = interestingLines(out);
  assert.deepEqual(got.saved, ['Saved SDN.CSV (1.2 MB) from x']);
  assert.deepEqual(got.problems, ['ADD.CSV: HTTP 403 (download it by hand)', 'consolidated.xml: timeout', 'data_gpr_export.xls: HTTP 500']);
  const weo = interestingLines('Not found automatically (download by hand from the IMF WEO database page if needed):\n  WEO2005Apr.xls (HTTP 404)');
  assert.deepEqual(weo.problems, ['WEO2005Apr.xls (HTTP 404)']);
});

test('report: one line per step, details and the by-hand list in the full form; file round trip', () => {
  const run: DailyRun = {
    startedAt: '2026-11-08T08:00:00Z',
    finishedAt: '2026-11-08T08:40:00Z',
    where: 'docker',
    steps: [
      { id: 'gpr', label: 'GPR', outcome: 'done', note: '1 new file' },
      { id: 'tests', label: 'Tests', outcome: 'skipped', note: 'last run 2026-11-02' },
      { id: 'check', label: 'Connection check', outcome: 'failed', note: '1 did not answer', details: ['No answer: BIS'] },
    ],
  };
  const short = formatDaily(run);
  assert.match(short, /OK {3}GPR: 1 new file/);
  assert.match(short, /SKIP Tests/);
  assert.doesNotMatch(short, /No answer: BIS/);
  const full = formatDaily(run, { full: true });
  assert.match(full, /No answer: BIS/);
  assert.match(full, /ACLED/);
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'daily-')), 'local', 'daily-run.json');
  writeDaily(file, { last: run });
  assert.deepEqual(readDaily(file), { last: run });
  assert.deepEqual(readDaily(file + '.none'), {});
});

test('npm run daily: runs offline against fixtures, writes the report, and does not run twice in a day', async () => {
  const { spawnSync } = await import('node:child_process');
  const { fileURLToPath } = await import('node:url');
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'econquest-daily-'));
  const run = () =>
    spawnSync(process.execPath, ['--import', 'tsx', path.join(root, 'server.ts'), '--daily', '--countries=MEX'], {
      cwd: root,
      env: { ...process.env, NODE_OPTIONS: `--import ${path.join(root, 'tests/helpers/offline-fetch.mjs')}`, DATA_DIR: dataDir, COMTRADE_API_KEY: '', GEMINI_API_KEY: '', SCHEDULE_BACKTESTS: 'off', PRELOAD_STEP_TIMEOUT_S: '20' },
      encoding: 'utf8',
      timeout: 240_000,
    });
  try {
    const first = run();
    assert.equal(first.status, 0, first.stderr.slice(-2000));
    const saved = readDaily(path.join(dataDir, 'local', 'daily-run.json')).last!;
    assert.ok(saved.finishedAt);
    assert.deepEqual(saved.steps.map((s) => s.id), ['feeds', 'weo', 'sanctions', 'gpr', 'ucdp', 'nowcasts', 'tests', 'check']);
    assert.equal(saved.steps.find((s) => s.id === 'tests')!.outcome, 'skipped');
    assert.match(first.stdout, /Download by hand/);
    const second = run();
    assert.equal(second.status, 0);
    assert.match(second.stdout, /Not run: already ran today/);
  } finally {
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});
