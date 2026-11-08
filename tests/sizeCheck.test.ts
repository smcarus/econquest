import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { measureBuild, overLimits, startFilesFromHtml, TARGETS } from '../scripts/size-check';

test('start files are the entry script and module preloads, not styles or remote files', () => {
  const html = `<script type="module" crossorigin src="/assets/index-a.js"></script>
<link rel="modulepreload" crossorigin href="/assets/vendor-b.js">
<link rel="stylesheet" href="/assets/index.css">
<link rel="icon" href="/logo.png">
<script src="https://cdn.example.org/x.js"></script>`;
  assert.deepEqual(startFilesFromHtml(html), ['assets/index-a.js', 'assets/vendor-b.js']);
});

test('a build is measured and judged against its limits', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'size-'));
  fs.mkdirSync(path.join(dir, 'assets'));
  fs.writeFileSync(path.join(dir, 'index.html'), '<script type="module" src="/assets/main.js"></script>');
  fs.writeFileSync(path.join(dir, 'assets', 'main.js'), 'a'.repeat(3 * 1024));
  fs.writeFileSync(path.join(dir, 'assets', 'later.js'), 'b'.repeat(5 * 1024));
  const m = measureBuild(dir);
  assert.equal(m.startKB, 3);
  assert.equal(m.largestJsKB, 5);
  assert.equal(m.largestJsFile, 'assets/later.js');
  assert.ok(m.startGzipKB < m.startKB);
  assert.deepEqual(overLimits(m, { startKB: 10, startGzipKB: 10, largestJsKB: 10, totalMB: 1 }), []);
  const over = overLimits(m, { startKB: 2, startGzipKB: 10, largestJsKB: 4, totalMB: 1 });
  assert.equal(over.length, 2);
  assert.match(over[0] ?? '', /Start code is 3 KB; the limit is 2 KB/);
});

test('the phone limits match the build plan', () => {
  const phone = TARGETS.find((t) => t.name === 'phone');
  assert.deepEqual(phone?.limits, { startKB: 1000, startGzipKB: 300, largestJsKB: 400, totalMB: 20 });
});
