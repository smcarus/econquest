import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Every outside build step and base image is pinned to a fixed version (a commit or a digest), so a
// changed or hijacked tag cannot change what CI runs or what goes into the image. Dependabot keeps
// the pins current (.github/dependabot.yml). The comment after each pin names the version.

const workflows = join(process.cwd(), '.github', 'workflows');

test('every GitHub Actions step is pinned to a full commit', () => {
  const loose: string[] = [];
  for (const file of readdirSync(workflows).filter((f) => f.endsWith('.yml'))) {
    const lines = readFileSync(join(workflows, file), 'utf8').split('\n');
    lines.forEach((line, i) => {
      const m = line.match(/^\s*(?:-\s*)?uses:\s*([^\s#]+)/);
      if (!m || m[1].startsWith('./')) return;
      if (!/@[0-9a-f]{40}$/.test(m[1]) || !/#\s*v\d/.test(line)) loose.push(`${file}:${i + 1} ${m[1]}`);
    });
  }
  assert.deepEqual(loose, []);
});

test('every Docker base image is pinned to a digest', () => {
  const loose: string[] = [];
  for (const file of ['Dockerfile', join('models', 'Dockerfile')]) {
    readFileSync(join(process.cwd(), file), 'utf8').split('\n').forEach((line, i) => {
      if (/^FROM\s/i.test(line) && !/@sha256:[0-9a-f]{64}/.test(line)) loose.push(`${file}:${i + 1}`);
    });
  }
  assert.deepEqual(loose, []);
});
