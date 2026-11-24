/**
 * src/utils/codeUpdateNode.ts: scripts that test live sources update the folder first when it is
 * behind GitHub, and run again on the new code; otherwise they say why not and run as they are.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { checkAndUpdate, type CodeUpdateDeps } from '../src/utils/codeUpdateNode.ts';

function fake(over: Partial<CodeUpdateDeps> & { answers?: Record<string, string | null> } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'code-update-'));
  fs.mkdirSync(path.join(root, '.git'));
  const calls: string[] = [];
  const lines: string[] = [];
  const answers: Record<string, string | null> = { 'git rev-parse': 'origin/main\n', 'git fetch': '', 'git rev-list': '0\n', bash: '', ...over.answers };
  let reran = false;
  const deps: CodeUpdateDeps = {
    root,
    env: {},
    platform: 'darwin',
    log: (l) => lines.push(l),
    run: (cmd, args) => {
      const key = cmd === 'git' ? `git ${args[0]}` : cmd;
      calls.push(`${cmd} ${args.join(' ')}`);
      return key in answers ? answers[key] : '';
    },
    rerun: (() => {
      reran = true;
      return 'rerun' as never;
    }) as () => never,
    ...over,
  };
  return { deps, calls, lines, reran: () => reran, done: () => fs.rmSync(root, { recursive: true, force: true }) };
}

test('code update: up to date runs as is', () => {
  const f = fake();
  try {
    assert.equal(checkAndUpdate(f.deps), 'current');
    assert.equal(f.reran(), false);
    assert.ok(!f.calls.some((c) => c.startsWith('bash')));
  } finally {
    f.done();
  }
});

test('code update: behind GitHub pulls with safe-pull.sh and runs the script again', () => {
  const f = fake({ answers: { 'git rev-list': '3\n' } });
  try {
    checkAndUpdate(f.deps);
    assert.equal(f.reran(), true);
    assert.ok(f.calls.some((c) => c.startsWith('bash') && c.endsWith(path.join('scripts', 'safe-pull.sh'))));
    assert.match(f.lines.join('\n'), /3 update\(s\) behind origin\/main/);
  } finally {
    f.done();
  }
});

test('code update: a pull that stops runs the code here and says so', () => {
  const f = fake({ answers: { 'git rev-list': '2\n', bash: null } });
  try {
    assert.equal(checkAndUpdate(f.deps), 'pull-failed');
    assert.equal(f.reran(), false);
    assert.match(f.lines.join('\n'), /may be out of date/);
  } finally {
    f.done();
  }
});

test('code update: offline, no upstream, Windows, turned off or already checked', () => {
  const offline = fake({ answers: { 'git fetch': null } });
  const noUp = fake({ answers: { 'git rev-parse': null } });
  const win = fake({ platform: 'win32', answers: { 'git rev-list': '1\n' } });
  const off = fake({ env: { ECONQUEST_NO_UPDATE: '1' } });
  const again = fake({ env: { ECONQUEST_CODE_CHECKED: '1' } });
  try {
    assert.equal(checkAndUpdate(offline.deps), 'offline');
    assert.equal(checkAndUpdate(noUp.deps), 'no-upstream');
    assert.equal(checkAndUpdate(win.deps), 'windows');
    assert.equal(win.reran(), false);
    assert.equal(checkAndUpdate(off.deps), 'off');
    assert.equal(off.calls.length, 0);
    assert.equal(checkAndUpdate(again.deps), 'off');
  } finally {
    for (const f of [offline, noUp, win, off, again]) f.done();
  }
});

test('code update: no .git folder (inside Docker) does nothing', () => {
  const f = fake();
  try {
    fs.rmSync(path.join(f.deps.root, '.git'), { recursive: true });
    assert.equal(checkAndUpdate(f.deps), 'no-git');
    assert.equal(f.calls.length, 0);
  } finally {
    f.done();
  }
});
