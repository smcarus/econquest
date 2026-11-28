/** The Menu: Tools on its own, then Set up, Check the data and Learn (Sam's choice, 18 November 2026). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { menuGroupOf, menuRank } from '../src/utils/menuGroups';

const KEYS = ['settings', 'tools', 'offline', 'health', 'account', 'users', 'audit', 'register', 'ideas', 'own-data', 'quests', 'share', 'exam', 'about', 'report', 'manual', 'worked', 'yours'];

test('every Menu item has a group, and Tools comes first', () => {
  const sorted = [...KEYS].sort((a, b) => menuRank(a) - menuRank(b));
  assert.equal(sorted[0], 'tools');
  assert.deepEqual(sorted.filter((k) => menuGroupOf(k) === 'check'), ['health', 'register', 'audit', 'ideas']);
  assert.deepEqual(sorted.filter((k) => menuGroupOf(k) === 'learn'), ['yours', 'manual', 'worked', 'about', 'report', 'quests']);
  const groups = sorted.map(menuGroupOf);
  assert.deepEqual([...new Set(groups)], ['top', 'setup', 'check', 'learn']);
  for (const g of ['setup', 'check', 'learn']) assert.ok(groups.filter((x) => x === g).length <= 7, `${g} stays short`);
});
