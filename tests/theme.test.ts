/** Dark or light: the computer's setting until the switch is pressed (src/utils/theme.ts). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialDark, systemPrefersDark } from '../src/utils/theme';

test('with no saved choice the computer decides', () => {
  assert.equal(initialDark(null, undefined, true), true);
  assert.equal(initialDark(null, undefined, false), false);
  // A saved session alone is not a choice (it records whatever was showing).
  assert.equal(initialDark(null, false, true), true);
});

test('a saved choice wins over the computer, and the saved session agrees with it', () => {
  assert.equal(initialDark(false, undefined, true), false);
  assert.equal(initialDark(true, undefined, false), true);
  assert.equal(initialDark(true, false, true), false);
});

test('outside a browser the setting reads as light', () => {
  assert.equal(systemPrefersDark(), false);
});
