/** Keyboard shortcuts (src/utils/shortcuts.ts). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { modLabel, shortcutFor } from '../src/utils/shortcuts';

const body = { tagName: 'BODY' };

test('the five shortcuts', () => {
  assert.equal(shortcutFor({ key: '/', target: body }), 'ask');
  assert.equal(shortcutFor({ key: '?', target: body }), 'help');
  assert.equal(shortcutFor({ key: 'k', metaKey: true, target: body }), 'tools');
  assert.equal(shortcutFor({ key: 'K', ctrlKey: true, target: body }), 'tools');
  assert.equal(shortcutFor({ key: ',', ctrlKey: true, target: body }), 'settings');
  assert.equal(shortcutFor({ key: 'a', target: body }), null);
});

test('single keys never fire while typing', () => {
  assert.equal(shortcutFor({ key: '/', target: { tagName: 'TEXTAREA' } }), null);
  assert.equal(shortcutFor({ key: '?', target: { tagName: 'INPUT', type: 'search' } }), null);
  assert.equal(shortcutFor({ key: '/', target: { tagName: 'DIV', isContentEditable: true } }), null);
  assert.equal(shortcutFor({ key: '/', target: { tagName: 'INPUT', type: 'checkbox' } }), 'ask');
  // With Cmd/Ctrl they still work in a box, as in other apps.
  assert.equal(shortcutFor({ key: 'k', metaKey: true, target: { tagName: 'TEXTAREA' } }), 'tools');
  assert.equal(shortcutFor({ key: '/', altKey: true, target: body }), null);
});

test('the modifier is named for the computer', () => {
  assert.equal(modLabel('MacIntel'), '⌘');
  assert.equal(modLabel('Win32'), 'Ctrl+');
});
