import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { dataDirProblem, ollamaBaseUrlDefault } from '../src/utils/serverRuntime';

test('Ollama URL: OLLAMA_BASE_URL wins, trailing slash dropped', () => {
  assert.equal(ollamaBaseUrlDefault({ OLLAMA_BASE_URL: 'http://gpu-box:11434/' }), 'http://gpu-box:11434');
  assert.equal(ollamaBaseUrlDefault({ OLLAMA_BASE_URL: ' http://ollama:11434 ', SELF_HOSTED_DOCKER: 'true' }), 'http://ollama:11434');
});

test('Ollama URL: without a setting, Docker looks at the host, never its own localhost', () => {
  assert.equal(ollamaBaseUrlDefault({ SELF_HOSTED_DOCKER: 'true' }), 'http://host.docker.internal:11434');
  assert.equal(ollamaBaseUrlDefault({}), 'http://localhost:11434');
  assert.equal(ollamaBaseUrlDefault({ OLLAMA_BASE_URL: '   ' }), 'http://localhost:11434');
});

test('data folder check: writable folder passes and leaves no file behind', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eq-data-'));
  assert.equal(dataDirProblem(dir), null);
  assert.deepEqual(fs.readdirSync(path.join(dir, 'local')), []);
});

test('data folder check: a folder that cannot be created says what to fix', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eq-data-'));
  const file = path.join(dir, 'not-a-folder');
  fs.writeFileSync(file, 'x');
  const problem = dataDirProblem(file);
  assert.ok(problem && problem.includes('Cannot write to the data folder'), String(problem));
});

test('data folder check: a read-only state folder from an older version is caught at start', { skip: process.getuid?.() === 0 }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eq-data-'));
  fs.mkdirSync(path.join(dir, 'live'));
  fs.chmodSync(path.join(dir, 'live'), 0o555);
  const problem = dataDirProblem(dir);
  fs.chmodSync(path.join(dir, 'live'), 0o755);
  assert.ok(problem && problem.includes(path.join(dir, 'live')), String(problem));
});
