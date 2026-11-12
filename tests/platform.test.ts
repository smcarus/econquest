import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { HIDDEN, hideKeysInFields, hideKeysInText, safeFileName, safeFolderName, safeSecretName } from '../src/platform/names';
import { createMemoryPlatform } from '../src/platform/memory';
import { createNodePlatform, nodeRequest, SECRETS_FILE } from '../src/platform/node';
import type { Platform } from '../src/platform/types';
import { makeSecretBox } from '../src/utils/secretBox';

test('file names stay inside the data folder', () => {
  assert.equal(safeFileName('local/watch-rules.json'), 'local/watch-rules.json');
  assert.equal(safeFileName('./local//a.json'), 'local/a.json');
  assert.equal(safeFileName('local\\b.json'), 'local/b.json');
  for (const bad of ['', '  ', '/etc/passwd', '../x', 'a/../../x', 'local/../..', 'C:\\x', 'a\0b', '.']) {
    assert.throws(() => safeFileName(bad), `${JSON.stringify(bad)} should be refused`);
  }
  assert.equal(safeFolderName(''), '');
  assert.equal(safeFolderName('local'), 'local');
  assert.throws(() => safeFolderName('../up'));
});

test('secret names are plain', () => {
  assert.equal(safeSecretName('gemini_api_key'), 'gemini_api_key');
  for (const bad of ['', 'a b', '../k', 'x'.repeat(65), '-lead']) assert.throws(() => safeSecretName(bad));
});

test('keys are hidden in log messages and fields', () => {
  const google = `AIza${'x'.repeat(35)}`;
  const openai = `sk-proj-${'a'.repeat(30)}`;
  const anthropic = `sk-ant-api03-${'b'.repeat(30)}`;
  assert.equal(hideKeysInText(`key=${google} and ${openai} and ${anthropic}`), `key=${HIDDEN} and ${HIDDEN} and ${HIDDEN}`);
  assert.equal(hideKeysInText('Authorization: Bearer abcdefgh12345678'), `Authorization: ${HIDDEN}`);
  assert.deepEqual(hideKeysInFields({ apiKey: 'plain', note: `uses ${google}`, count: 3, nested: { token: 't', ok: 'fine' }, emptyKey: '' }), {
    apiKey: HIDDEN,
    note: `uses ${HIDDEN}`,
    count: 3,
    nested: { token: HIDDEN, ok: 'fine' },
    emptyKey: '',
  });
});

async function exerciseFiles(p: Platform): Promise<void> {
  assert.equal(await p.files.read('local/missing.json'), null);
  assert.equal(await p.files.size('local/missing.json'), null);
  await p.files.write('local/a.json', '{"a":1}');
  await p.files.write('local/a.json', '{"a":2}');
  assert.equal(await p.files.read('local/a.json'), '{"a":2}');
  await p.files.append('local/log.jsonl', 'one\n');
  await p.files.append('local/log.jsonl', 'two\n');
  assert.equal(await p.files.read('local/log.jsonl'), 'one\ntwo\n');
  await p.files.write('local/sub/b.json', 'é');
  assert.equal(await p.files.size('local/sub/b.json'), 2);
  assert.deepEqual(await p.files.list('local'), ['local/a.json', 'local/log.jsonl', 'local/sub/b.json']);
  assert.deepEqual(await p.files.list('nowhere'), []);
  await p.files.remove('local/a.json');
  await p.files.remove('local/a.json');
  assert.equal(await p.files.read('local/a.json'), null);
  await assert.rejects(() => p.files.write('../escape.json', 'x'));
  await assert.rejects(() => p.files.read('/etc/hosts'));
}

async function exerciseSecrets(p: Platform): Promise<void> {
  assert.equal(await p.secrets.get('gemini'), null);
  await p.secrets.set('gemini', 'k1');
  await p.secrets.set('openai', 'k2');
  assert.equal(await p.secrets.get('gemini'), 'k1');
  assert.deepEqual(await p.secrets.names(), ['gemini', 'openai']);
  await p.secrets.remove('gemini');
  await p.secrets.remove('gemini');
  assert.equal(await p.secrets.get('gemini'), null);
  await assert.rejects(() => p.secrets.set('../bad', 'x'));
}

test('the in-memory platform keeps the file and secret rules', async () => {
  const p = createMemoryPlatform();
  await exerciseFiles(p);
  await exerciseSecrets(p);
  p.setNow(42);
  assert.equal(p.clock.now(), 42);
  p.log.warn(`failed with AIza${'q'.repeat(30)}`, { key: 'abc' });
  assert.deepEqual(p.logLines, [{ level: 'warn', message: `failed with ${HIDDEN}`, fields: { key: HIDDEN } }]);
});

test('the in-memory platform answers web requests from the test handler only', async () => {
  const p = createMemoryPlatform({ http: (req) => ({ status: req.url.endsWith('/x') ? 200 : 404, body: '{"v":1}', headers: { 'Content-Type': 'application/json' } }) });
  const ok = await p.http.request({ url: 'https://example.org/x' });
  assert.equal(ok.ok, true);
  assert.deepEqual(await ok.json(), { v: 1 });
  assert.equal(ok.headers['content-type'], 'application/json');
  assert.equal((await p.http.request({ url: 'https://example.org/y' })).ok, false);
  assert.equal(p.requests.length, 2);
  await assert.rejects(() => createMemoryPlatform().http.request({ url: 'https://example.org' }), /No network/);
});

function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'platform-'));
}

test('the server platform keeps the file and secret rules on disk', async () => {
  const dir = tempDir();
  const p = createNodePlatform({ dataDir: dir, logLine: () => undefined });
  await exerciseFiles(p);
  await exerciseSecrets(p);
  assert.ok(!fs.readdirSync(path.join(dir, 'local')).some((n) => n.endsWith('.tmp')), 'no temporary files left');
  if (process.platform !== 'win32') {
    assert.equal(fs.statSync(path.join(dir, SECRETS_FILE)).mode & 0o777, 0o600);
  }
});

test('the server platform encrypts secrets when a master key is set', async () => {
  const dir = tempDir();
  const box = makeSecretBox('m'.repeat(40), 'test');
  const p = createNodePlatform({ dataDir: dir, secretBox: box, logLine: () => undefined });
  await p.secrets.set('gemini', 'AIza-very-secret');
  const raw = fs.readFileSync(path.join(dir, SECRETS_FILE), 'utf8');
  assert.ok(!raw.includes('very-secret'), 'the key must not be readable in the file');
  assert.equal(await p.secrets.get('gemini'), 'AIza-very-secret');
  // Without the master key an encrypted value reads as missing, never as the scrambled text.
  const noKey = createNodePlatform({ dataDir: dir, logLine: () => undefined });
  assert.equal(await noKey.secrets.get('gemini'), null);
});

test('the server platform writes one JSON log line with keys hidden', () => {
  const lines: string[] = [];
  const p = createNodePlatform({ dataDir: tempDir(), logLine: (l) => lines.push(l) });
  p.log.error('feed failed', { source: 'imf', apiKey: 'zzz', url: `https://x.org/?key=AIza${'k'.repeat(30)}` });
  const line = JSON.parse(lines[0] ?? '{}');
  assert.equal(line.level, 'error');
  assert.equal(line.message, 'feed failed');
  assert.equal(line.apiKey, HIDDEN);
  assert.equal(line.url, `https://x.org/?key=${HIDDEN}`);
  assert.equal(line.source, 'imf');
});

test('server web requests return status, headers and body, and time out', async () => {
  const fakeFetch = (async (url: string | URL | Request, init?: RequestInit) => {
    if (String(url).includes('slow')) {
      return new Promise<Response>((_, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('aborted'))));
    }
    return new Response('{"ok":true}', { status: 201, headers: { 'X-Test': 'yes' } });
  }) as typeof fetch;
  const res = await nodeRequest({ url: 'https://example.org/a', method: 'POST', body: '{}' }, fakeFetch);
  assert.equal(res.status, 201);
  assert.equal(res.ok, true);
  assert.equal(res.headers['x-test'], 'yes');
  assert.deepEqual(await res.json(), { ok: true });
  await assert.rejects(() => nodeRequest({ url: 'https://slow.example.org/', timeoutMs: 30 }, fakeFetch), /No reply from slow\.example\.org within/);
});
