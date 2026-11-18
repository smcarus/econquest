import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HIDDEN_GROUPS, READY_BY_ID, READY_TOOLS, TOOL_CATEGORIES } from '../src/data/toolsCatalog.ts';

test('tools page: every hidden desk says what it needs, and every "use instead" link resolves', () => {
  const desks = HIDDEN_GROUPS.flatMap((g) => g.desks);
  assert.equal(desks.length, 41, 'all 41 older desks are listed');
  assert.equal(new Set(desks.map((d) => d.id)).size, desks.length, 'no desk is listed twice');
  for (const d of desks) {
    assert.ok(d.needs.length > 10, `${d.id} says what it needs`);
    if (d.coveredBy) assert.ok(READY_BY_ID[d.coveredBy], `${d.id} links to a ready tool`);
  }
  assert.equal(new Set(READY_TOOLS.map((t) => t.id)).size, READY_TOOLS.length);
  assert.ok(READY_TOOLS.every((t) => t.sources && t.what));
});

test('tools page: every ready tool sits in one group, and no group is empty', () => {
  const ids = new Set(TOOL_CATEGORIES.map((c) => c.id));
  assert.equal(ids.size, TOOL_CATEGORIES.length);
  for (const t of READY_TOOLS) assert.ok(ids.has(t.category), `${t.id} has a known group`);
  for (const c of TOOL_CATEGORIES) {
    assert.ok(READY_TOOLS.some((t) => t.category === c.id), `${c.id} has at least one tool`);
    assert.ok(c.purpose.length > 10, `${c.id} says what it is for`);
  }
});

test('no tool group is a catch-all: each holds at most ten tools, and Look back is only about the past', async () => {
  const { READY_TOOLS: tools, TOOL_CATEGORIES: cats } = await import('../src/data/toolsCatalog.ts');
  for (const c of cats) assert.ok(tools.filter((t) => t.category === c.id).length <= 10, `${c.id} holds more than ten tools`);
  const past = tools.filter((t) => t.category === 'history').map((t) => t.id);
  for (const id of ['restructuring_calc', 'growth_accounting', 'bank_sovereign', 'disasters']) assert.ok(!past.includes(id), `${id} is not a look-back tool`);
});

test('find a tool by words, in any order, ignoring case and accents', async () => {
  const { READY_TOOLS: tools } = await import('../src/data/toolsCatalog.ts');
  const { searchTools } = await import('../src/utils/toolSearch.ts');
  assert.ok(searchTools(tools, 'restructuring').some((t) => t.id === 'restructuring_calc'));
  assert.ok(searchTools(tools, 'CYCLONES').some((t) => t.id === 'storm_tracks'));
  assert.deepEqual(searchTools(tools, '   '), []);
  assert.deepEqual(searchTools(tools, 'zzzz-nothing'), []);
  assert.ok(searchTools([{ id: 'x', title: 'Dívida', what: '' }], 'divida').length === 1);
});
