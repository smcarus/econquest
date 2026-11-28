import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyFeatureChange, featureState, parseFeatureFile } from '../src/utils/featureSwitches';

test('feature switches: a choice in the app wins over .env; without one, .env decides', () => {
  assert.deepEqual(featureState({}, 'quests', false), { on: false, source: 'env', envOn: false });
  assert.deepEqual(featureState({}, 'quests', true), { on: true, source: 'env', envOn: true });
  assert.deepEqual(featureState({ quests: 'on' }, 'quests', false), { on: true, source: 'app', envOn: false });
  assert.deepEqual(featureState({ quests: 'off' }, 'quests', true), { on: false, source: 'app', envOn: true });
  assert.deepEqual(featureState({ quests: 'on' }, 'classes', false), { on: false, source: 'env', envOn: false });
});

test('feature switches: a broken or odd file reads as no choice', () => {
  for (const raw of [null, 'x', [], { quests: 'yes', classes: true }]) assert.deepEqual(parseFeatureFile(raw), {});
  assert.deepEqual(parseFeatureFile({ quests: 'on', classes: 'off', by: 'admin', extra: 1 }), { quests: 'on', classes: 'off', by: 'admin' });
});

test('feature switches: on and off save a choice, env removes it, anything else changes nothing', () => {
  const a = applyFeatureChange({}, { quests: 'on' }, 'admin', '2026-11-28T15:00:00Z');
  assert.deepEqual(a, { file: { quests: 'on', since: '2026-11-28T15:00:00Z', by: 'admin' }, problems: [] });
  const b = applyFeatureChange(a.file, { quests: 'env', classes: 'off' }, 'this computer', '2026-11-28T16:00:00Z');
  assert.deepEqual(b.file, { classes: 'off', since: '2026-11-28T16:00:00Z', by: 'this computer' });
  for (const body of [{}, { quests: 'maybe' }, { exam: 'on' }, null]) {
    const r = applyFeatureChange(a.file, body, 'admin', 'now');
    assert.equal(r.file, a.file);
    assert.ok(r.problems.length > 0, JSON.stringify(body));
  }
});
