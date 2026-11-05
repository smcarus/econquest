import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HIDDEN_GROUPS, READY_BY_ID, READY_TOOLS } from '../src/data/toolsCatalog.ts';

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
