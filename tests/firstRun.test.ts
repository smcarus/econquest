import { test } from 'node:test';
import assert from 'node:assert/strict';
import { firstRunSteps, showFirstRun } from '../src/utils/firstRun.ts';

const none = { FRED_API_KEY: 'none', GEMINI_API_KEY: 'none' } as const;

test('a fresh install shows every step open', () => {
  const steps = firstRunSteps({ liveCount: 0, keySources: { ...none }, aiProvider: 'gemini', watchlistTouched: false });
  assert.deepEqual(steps.map((s) => s.done), [false, false, false, false]);
  assert.equal(showFirstRun(steps, false), true);
  assert.equal(showFirstRun(steps, true), false, 'hidden by the user');
});

test('steps tick themselves off from the app state', () => {
  const steps = firstRunSteps({ liveCount: 3, keySources: { FRED_API_KEY: 'app', GEMINI_API_KEY: 'none' }, aiProvider: 'ollama', watchlistTouched: true });
  assert.deepEqual(steps.map((s) => s.done), [true, true, true, true]);
  assert.equal(showFirstRun(steps, false), false, 'gone once everything is done');
});

test('Gemini counts as chosen only with a key; a FRED key in .env counts', () => {
  const steps = firstRunSteps({ liveCount: 0, keySources: { FRED_API_KEY: 'env', GEMINI_API_KEY: 'none' }, aiProvider: 'gemini', watchlistTouched: false });
  assert.equal(steps.find((s) => s.id === 'fred')!.done, true);
  assert.equal(steps.find((s) => s.id === 'ai')!.done, false);
  const withKey = firstRunSteps({ liveCount: 0, keySources: { GEMINI_API_KEY: 'app' }, aiProvider: 'gemini', watchlistTouched: false });
  assert.equal(withKey.find((s) => s.id === 'ai')!.done, true);
});

test('keys still loading count as not set', () => {
  const steps = firstRunSteps({ liveCount: 0, aiProvider: 'gemini', watchlistTouched: false });
  assert.equal(steps.find((s) => s.id === 'fred')!.done, false);
});
