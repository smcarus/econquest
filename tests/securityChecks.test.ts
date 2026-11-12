/**
 * Release checks from the security and Windows review (G43): the Docker set-up publishes nothing
 * to the network by itself, Ollama lets no web page in, and the Windows start scripts can run on
 * Windows PowerShell 5.1.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

test('docker-compose.yml: every published port is on 127.0.0.1, and Ollama takes no web origin', () => {
  const compose = read('docker-compose.yml');
  const ports = [...compose.matchAll(/^\s*-\s*"([^"]+:\d+)"\s*$/gm)].map((m) => m[1]).filter((p) => /^[\d.]*:?\$?\{?[\w:-]*\}?:\d+$|^\d+:\d+$|^127\./.test(p));
  assert.ok(ports.length >= 3, `found ports: ${ports.join(', ')}`);
  for (const p of ports) assert.match(p, /^127\.0\.0\.1:/, `port ${p} would be open to the network`);
  assert.doesNotMatch(compose, /OLLAMA_ORIGINS=\*/);
});

test('start scripts and the generated .env never open Ollama to every web page', () => {
  for (const f of ['scripts/start-mac.sh', 'scripts/econquest.sh', 'scripts/start-windows.ps1', 'server.ts', 'src/components/ManualAndAiModelDialogs.tsx']) {
    assert.doesNotMatch(read(f), /OLLAMA_ORIGINS="?\*|corsOrigins: '\*'|corsOrigins \|\| '\*'/, f);
  }
});

test('Windows start scripts: plain ASCII, exit codes checked, Windows line endings on checkout', () => {
  for (const f of ['scripts/start-windows.ps1', 'scripts/start-windows.bat']) {
    const bad = [...read(f)].findIndex((c) => c.charCodeAt(0) > 127);
    assert.equal(bad, -1, `${f} has a non-ASCII character, which Windows PowerShell 5.1 misreads`);
  }
  const ps = read('scripts/start-windows.ps1');
  assert.match(ps, /\$ErrorActionPreference = "Continue"/);
  assert.match(ps, /docker info \*> \$null\r?\nif \(\$LASTEXITCODE -ne 0\)/);
  const lines = ps.split(/\r?\n/);
  lines.forEach((l, i) => {
    if (/^\s*docker compose (.* )?(up|build)\b/.test(l)) assert.match(lines[i + 1] || '', /Stop-IfFailed/, `no exit-code check after: ${l.trim()}`);
  });
  assert.match(read('.gitattributes'), /\*\.bat text eol=crlf/);
  assert.match(read('.gitattributes'), /\*\.ps1 text eol=crlf/);
});

test('Windows check: every text file checks out with Unix line endings, so hashed files match on Windows', () => {
  assert.match(read('.gitattributes'), /^\* text=auto eol=lf$/m);
});

test('Windows check: a helper loaded with --import is given as a file URL, never a bare path (Windows paths start "D:")', () => {
  const dirs = ['tests', 'tests/helpers', 'tests/smoke', 'scripts'];
  for (const d of dirs) {
    for (const f of fs.readdirSync(path.join(root, d))) {
      if (!/\.(ts|mjs)$/.test(f)) continue;
      const text = read(`${d}/${f}`);
      assert.doesNotMatch(text, /--import \$\{path\.join/, `${d}/${f} passes a bare path to --import`);
    }
  }
});
