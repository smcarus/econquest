/**
 * scripts/safe-pull.sh (used by `npm run go` and `npm run update`): files the app writes itself
 * are backed up to data/local/backups/ and put back so `git pull` goes through; files changed by
 * hand are left alone and named.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(root, 'scripts', 'safe-pull.sh');
const hasBash = process.platform !== 'win32' && spawnSync('bash', ['--version']).status === 0;

function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.org', '-c', 'init.defaultBranch=main', ...args], { cwd, encoding: 'utf8' });
}
function write(dir: string, rel: string, text: string): void {
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
  fs.writeFileSync(path.join(dir, rel), text);
}

/** An "upstream" repo and a clone of it standing in for the Mac folder. */
function setup(): { up: string; mac: string; done: () => void } {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'safe-pull-'));
  const up = path.join(base, 'up');
  fs.mkdirSync(up);
  git(up, 'init', '-q');
  write(up, 'docs/METHODS.md', 'methods v1\n');
  write(up, 'docs/validation/recorded-verdicts.json', '{"v":1}\n');
  write(up, 'README.md', 'readme v1\n');
  write(up, 'scripts/safe-pull.sh', fs.readFileSync(script, 'utf8'));
  git(up, 'add', '-A');
  git(up, 'commit', '-qm', 'one');
  const mac = path.join(base, 'mac');
  git(base, 'clone', '-q', up, mac);
  return { up, mac, done: () => fs.rmSync(base, { recursive: true, force: true }) };
}
const run = (mac: string) => spawnSync('bash', ['scripts/safe-pull.sh'], { cwd: mac, encoding: 'utf8' });

test('safe-pull: generated files are backed up and reset, the pull goes through, hand edits stay', { skip: !hasBash }, () => {
  const { up, mac, done } = setup();
  try {
    write(up, 'docs/METHODS.md', 'methods v2\n');
    git(up, 'commit', '-qam', 'two');
    write(mac, 'docs/METHODS.md', 'methods local\n');
    write(mac, 'tests/fixtures/recorded/new.json', 'local recording\n');
    write(mac, 'README.md', 'readme mine\n');
    const r = run(mac);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.equal(fs.readFileSync(path.join(mac, 'docs/METHODS.md'), 'utf8'), 'methods v2\n');
    assert.equal(fs.readFileSync(path.join(mac, 'README.md'), 'utf8'), 'readme mine\n');
    assert.equal(fs.existsSync(path.join(mac, 'tests/fixtures/recorded/new.json')), false);
    const backups = fs.readdirSync(path.join(mac, 'data/local/backups'));
    assert.equal(backups.length, 1);
    const b = path.join(mac, 'data/local/backups', backups[0]);
    assert.equal(fs.readFileSync(path.join(b, 'docs/METHODS.md'), 'utf8'), 'methods local\n');
    assert.equal(fs.readFileSync(path.join(b, 'tests/fixtures/recorded/new.json'), 'utf8'), 'local recording\n');
    assert.match(r.stdout, /README\.md/);
  } finally {
    done();
  }
});

test('safe-pull: a hand-edited file that blocks the pull stops it, untouched, and is named', { skip: !hasBash }, () => {
  const { up, mac, done } = setup();
  try {
    write(up, 'README.md', 'readme v2\n');
    git(up, 'commit', '-qam', 'two');
    write(mac, 'README.md', 'readme mine\n');
    const r = run(mac);
    assert.equal(r.status, 1);
    assert.equal(fs.readFileSync(path.join(mac, 'README.md'), 'utf8'), 'readme mine\n');
    assert.match(r.stdout, /git pull stopped/);
    assert.equal(fs.existsSync(path.join(mac, 'data/local/backups')), false);
  } finally {
    done();
  }
});

test('safe-pull: nothing changed locally means a plain pull and no backup folder', { skip: !hasBash }, () => {
  const { mac, done } = setup();
  try {
    const r = run(mac);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.equal(fs.existsSync(path.join(mac, 'data/local/backups')), false);
  } finally {
    done();
  }
});

test('safe-pull: a release pinned for the term keeps the code until its last day, then pulls again', { skip: !hasBash }, () => {
  const { up, mac, done } = setup();
  try {
    write(up, 'README.md', 'readme v2\n');
    git(up, 'commit', '-qam', 'two');
    const later = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    write(mac, 'data/local/class-release.json', JSON.stringify({ version: '0.3.0', commit: 'abc', pinnedOn: '2026-11-28', until: later }));
    const pinned = spawnSync('bash', ['scripts/safe-pull.sh'], { cwd: mac, encoding: 'utf8', env: { ...process.env, DATA_DIR: '' } });
    assert.equal(pinned.status, 0, pinned.stdout + pinned.stderr);
    assert.match(pinned.stdout, new RegExp(`Pinned for the term \\(until ${later}\\)`));
    assert.equal(fs.readFileSync(path.join(mac, 'README.md'), 'utf8'), 'readme v1\n', 'no pull while pinned');
    write(mac, 'data/local/class-release.json', JSON.stringify({ version: '0.3.0', commit: 'abc', pinnedOn: '2026-01-01', until: '2026-01-31' }));
    const lapsed = spawnSync('bash', ['scripts/safe-pull.sh'], { cwd: mac, encoding: 'utf8', env: { ...process.env, DATA_DIR: '' } });
    assert.equal(lapsed.status, 0, lapsed.stdout + lapsed.stderr);
    assert.equal(fs.readFileSync(path.join(mac, 'README.md'), 'utf8'), 'readme v2\n', 'the pin lapsed: pulled');
  } finally {
    done();
  }
});
