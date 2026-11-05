import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  applyKeysToEnv,
  describeKeys,
  effectiveKeys,
  envKeySnapshot,
  isLocalRequest,
  keySources,
  loadSettings,
  maskKey,
  saveSettings,
  settingsFilePath,
  withKey,
  withoutKey,
} from '../src/utils/userSettings.ts';

const GOOD = 'abcdef0123456789abcdef0123456789';

test('a FRED key must be 32 lower-case letters and digits', () => {
  assert.ok('error' in withKey({ apiKeys: {} }, 'FRED_API_KEY', 'short'));
  assert.ok('error' in withKey({ apiKeys: {} }, 'FRED_API_KEY', GOOD.toUpperCase()));
  assert.ok('error' in withKey({ apiKeys: {} }, 'FRED_API_KEY', ''));
  assert.ok('error' in withKey({ apiKeys: {} }, 'NOT_A_KEY', GOOD));
  const ok = withKey({ apiKeys: {} }, 'FRED_API_KEY', `  ${GOOD}\n`);
  assert.ok('settings' in ok);
  assert.equal(ok.settings.apiKeys.FRED_API_KEY, GOOD);
});

test('a key saved in the app wins over .env, and removing it goes back to .env', () => {
  const envFile = { FRED_API_KEY: 'fromenv' };
  const saved = { apiKeys: { FRED_API_KEY: GOOD } };
  assert.equal(effectiveKeys(envFile, saved).FRED_API_KEY, GOOD);
  assert.equal(keySources(envFile, saved).FRED_API_KEY, 'app');
  const env: Record<string, string | undefined> = { ...envFile };
  applyKeysToEnv(env, envFile, saved);
  assert.equal(env.FRED_API_KEY, GOOD);
  applyKeysToEnv(env, envFile, withoutKey(saved, 'FRED_API_KEY'));
  assert.equal(env.FRED_API_KEY, 'fromenv');
  applyKeysToEnv(env, {}, { apiKeys: {} });
  assert.equal(env.FRED_API_KEY, undefined);
  assert.equal(keySources({}, { apiKeys: {} }).FRED_API_KEY, 'none');
});

test('the browser only ever sees the last four characters', () => {
  assert.equal(maskKey(GOOD), '••••6789');
  assert.equal(maskKey('short'), '••••');
  assert.equal(maskKey(''), '');
  const [fred] = describeKeys({ FRED_API_KEY: 'x' }, { apiKeys: { FRED_API_KEY: GOOD } });
  assert.equal(fred.source, 'app');
  assert.equal(fred.masked, '••••6789');
  assert.equal(fred.envAlsoSet, true);
  assert.ok(!JSON.stringify(fred).includes(GOOD));
});

test('settings file: saved readable by this user only, broken or missing reads as empty', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'econquest-settings-'));
  try {
    const file = settingsFilePath(dir);
    assert.deepEqual(loadSettings(file), { apiKeys: {} });
    saveSettings(file, { apiKeys: { FRED_API_KEY: GOOD } });
    assert.equal(statSync(file).mode & 0o777, 0o600);
    assert.equal(loadSettings(file).apiKeys.FRED_API_KEY, GOOD);
    assert.match(readFileSync(file, 'utf8'), /FRED_API_KEY/);
    writeFileSync(file, '{not json');
    assert.deepEqual(loadSettings(file), { apiKeys: {} });
    writeFileSync(file, JSON.stringify({ apiKeys: { FRED_API_KEY: GOOD, SOMETHING_ELSE: 'x' } }));
    assert.deepEqual(loadSettings(file).apiKeys, { FRED_API_KEY: GOOD });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('keys can be changed only from this computer unless SETTINGS_ALLOW_REMOTE is true', () => {
  assert.ok(isLocalRequest('127.0.0.1', {}));
  assert.ok(isLocalRequest('::1', {}));
  assert.ok(isLocalRequest('::ffff:127.0.0.1', {}));
  assert.ok(!isLocalRequest('192.168.1.20', {}));
  assert.ok(!isLocalRequest(undefined, {}));
  assert.ok(isLocalRequest('172.17.0.1', { SETTINGS_ALLOW_REMOTE: 'true' }));
});

test('the .env snapshot keeps only the known keys', () => {
  assert.deepEqual(envKeySnapshot({ FRED_API_KEY: 'a', PATH: '/bin' }), { FRED_API_KEY: 'a' });
});
