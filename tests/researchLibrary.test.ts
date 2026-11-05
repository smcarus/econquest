import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_SAVED_DOCS, EMPTY_LIBRARY, addBrief, addDoc, parseLibrary, removeBrief, summarise } from '../src/utils/researchLibrary.ts';

const brief = (askedAt: string, o = {}) => ({ question: `Q ${askedAt}`, askedAt, scopeNote: 'Brazil', answers: [], synthesis: null, ...o });

test('conversations: one entry per conversation, newest first, with the summary headline', () => {
  let lib = addBrief(EMPTY_LIBRARY, brief('2026-11-05T01:00:00Z')).lib;
  lib = addBrief(lib, brief('2026-11-05T02:00:00Z', { synthesis: { brief: { headline: 'Debt is rising.', points: [], disagreements: [], gaps: [] }, removed: [] } })).lib;
  lib = addBrief(lib, brief('2026-11-05T03:00:00Z', { startedAt: '2026-11-05T01:00:00Z', earlier: [{ question: 'Q1' }] })).lib;
  const s = summarise(lib).briefs;
  assert.deepEqual(s.map((b) => [b.question, b.turns]), [['Q 2026-11-05T03:00:00Z', 2], ['Q 2026-11-05T02:00:00Z', 1]]);
  assert.equal(s[1].headline, 'Debt is rising.');
  assert.equal(removeBrief(lib, s[0].id).briefs.length, 1);
});

test('documents: same id replaces, capped, and a broken file reads as empty', () => {
  let lib = EMPTY_LIBRARY;
  for (let i = 0; i < MAX_SAVED_DOCS + 3; i++) lib = addDoc(lib, { id: `d${i}`, title: `Doc ${i}`, text: 'text', addedAt: '2026-11-05' });
  assert.equal(lib.docs.length, MAX_SAVED_DOCS);
  assert.equal(lib.docs[0].id, `d${MAX_SAVED_DOCS + 2}`);
  lib = addDoc(lib, { id: 'd5', title: 'New title', text: 'text', addedAt: '2026-11-05' });
  assert.equal(lib.docs.filter((d) => d.id === 'd5').length, 1);
  assert.deepEqual(parseLibrary(null), { briefs: [], docs: [] });
  assert.deepEqual(parseLibrary({ briefs: [{ nope: 1 }], docs: [{ id: 'x', title: 't', text: '' }] }), { briefs: [], docs: [] });
});
