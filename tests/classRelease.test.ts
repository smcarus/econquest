import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import { classEnvChanges, pinHolds, pinSentence, setEnvValues, studentAddress } from '../src/utils/classRelease';

const pin = { version: '0.3.0', commit: 'abcdef1234', pinnedOn: '2026-11-28', until: '2027-05-07' };

test('the term pin holds through its last day, then lapses by itself', () => {
  assert.equal(pinHolds(pin, '2027-05-07'), true);
  assert.equal(pinHolds(pin, '2027-05-08'), false);
  assert.equal(pinHolds(null, '2027-01-01'), false);
  assert.match(pinSentence(pin, '2027-01-01'), /version 0\.3\.0 \(abcdef1\) until 2027-05-07/);
  assert.match(pinSentence(pin, '2027-06-01'), /ended on 2027-05-07/);
});

test('.env: the class lines replace the live line or the first example, and nothing else changes', () => {
  const text = '# HOST=""   # comment\nFRED_API_KEY="k"\n# CLASSES_ENABLED="off"\n';
  assert.equal(setEnvValues(text, classEnvChanges(false)), 'HOST="0.0.0.0"\nFRED_API_KEY="k"\nCLASSES_ENABLED="on"\n');
  assert.equal(setEnvValues('HOST="127.0.0.1"\n# HOST=""\n', { HOST: '0.0.0.0' }), 'HOST="0.0.0.0"\n# HOST=""\n');
  assert.equal(setEnvValues('', classEnvChanges(true)), 'CLASSES_ENABLED="on"\n');
});

test('the address students open is a private network address', () => {
  assert.equal(studentAddress([{ address: '127.0.0.1', family: 'IPv4', internal: true }, { address: '203.0.113.5', family: 'IPv4', internal: false }, { address: '192.168.1.20', family: 'IPv4', internal: false }], 3000), 'http://192.168.1.20:3000');
  assert.equal(studentAddress([{ address: '::1', family: 'IPv6', internal: true }], 3000), null);
});

test('npm run class:setup is wired and the school IT page exists', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  assert.equal(pkg.scripts['class:setup'], 'tsx scripts/class-setup.ts');
  const it = fs.readFileSync('docs/SCHOOL_IT.md', 'utf8');
  for (const must of ['3000', 'CLASSES_ENABLED', 'class-release.json', 'data/local']) assert.ok(it.includes(must), `SCHOOL_IT.md mentions ${must}`);
});
