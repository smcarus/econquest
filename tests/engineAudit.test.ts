import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'crypto';
import { canonicalJson, entryHash, nextEntry } from '../src/engine/auditLog';
import { AUDIT_HEAD_NAME, AUDIT_LOG_NAME, createAuditStore } from '../src/engine/auditStore';
import { createMemoryPlatform } from '../src/platform/memory';

test('entry hashes are the same as before the move (Node SHA-256 over the canonical JSON)', () => {
  const e = nextEntry(null, { kind: 'idea', summary: 'Logged an idea — “quotes” and é', detail: { b: 1, a: [1, 2] }, by: { id: 'u1', username: 'sam', name: 'Sam' } }, new Date('2026-11-08T02:00:00Z'));
  const { hash, ...rest } = e;
  const expected = createHash('sha256').update(canonicalJson({ seq: rest.seq, at: rest.at, kind: rest.kind, summary: rest.summary, detail: rest.detail ?? null, prev: rest.prev, by: rest.by })).digest('hex');
  assert.equal(hash, expected);
  assert.equal(entryHash(rest), expected);
});

test('many entries logged at once keep their order and an unbroken chain', async () => {
  const platform = createMemoryPlatform();
  const store = createAuditStore(platform);
  const written = await Promise.all(Array.from({ length: 25 }, (_, i) => store.append({ kind: 'data', summary: `step ${i}` })));
  assert.deepEqual(written.map((e) => e?.seq), Array.from({ length: 25 }, (_, i) => i + 1));
  const { check, entries } = await store.read();
  assert.equal(check.ok, true);
  assert.equal(entries.length, 25);
  assert.equal(JSON.parse(platform.fileMap.get(AUDIT_HEAD_NAME) ?? '{}').seq, 25);
  // A new store (an app restart) carries on from the file.
  const again = await createAuditStore(platform).append({ kind: 'data', summary: 'after restart' });
  assert.equal(again?.seq, 26);
  assert.equal((await store.raw()).trim().split('\n').length, 26);
});

test('a failed write returns null, is logged without keys, and the next write recovers', async () => {
  const platform = createMemoryPlatform();
  const store = createAuditStore(platform);
  await store.append({ kind: 'data', summary: 'one' });
  const realAppend = platform.files.append;
  platform.files.append = async () => { throw new Error(`disk full near AIza${'k'.repeat(30)}`); };
  assert.equal(await store.append({ kind: 'data', summary: 'lost' }), null);
  assert.equal(platform.logLines.at(-1)?.level, 'error');
  assert.ok(!JSON.stringify(platform.logLines).includes('AIza'));
  platform.files.append = realAppend;
  const three = await store.append({ kind: 'data', summary: 'two' });
  assert.equal(three?.seq, 2);
  assert.equal((await store.read()).check.ok, true);
  assert.ok(platform.fileMap.get(AUDIT_LOG_NAME)?.includes('"summary":"two"'));
});
