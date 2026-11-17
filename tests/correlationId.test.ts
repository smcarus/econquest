/** Console integration item 3: correlation IDs in the audit log (src/utils/auditLog.ts). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { AUDIT_HEADER, auditRows, checkLog, correlationIdProblem, nextEntry } from '../src/utils/auditLog.ts';
import { appendAudit, auditFiles, readAudit, resetAuditCache, setAuditCorrelation } from '../src/utils/auditStore.ts';

test('correlation IDs: letters, digits and . _ : -, up to 128', () => {
  assert.equal(correlationIdProblem('3f1c2a9e-0d4b-4e7a-9c55-1b2d3e4f5a6b'), null);
  assert.equal(correlationIdProblem('job:2026-11-13.42_retry'), null);
  assert.match(correlationIdProblem('') || '', /empty/);
  assert.match(correlationIdProblem('a'.repeat(129)) || '', /longer than 128/);
  assert.match(correlationIdProblem('has space') || '', /only letters/);
  assert.match(correlationIdProblem('<script>') || '', /only letters/);
});

test('an entry with a correlation ID is chained like any other, and entries without one hash as before', () => {
  const a = nextEntry(null, { kind: 'api', summary: 'one' }, new Date('2026-11-13T00:00:00Z'));
  assert.equal(a.correlationId, undefined);
  const b = nextEntry(a, { kind: 'api', summary: 'two', correlationId: 'trace-1' }, new Date('2026-11-13T00:00:01Z'));
  assert.equal(b.correlationId, 'trace-1');
  const lines = [JSON.stringify(a), JSON.stringify(b)];
  assert.equal(checkLog(lines, { seq: 2, hash: b.hash }).check.ok, true);
  // Changing the ID afterwards breaks the chain.
  const forged = JSON.stringify({ ...b, correlationId: 'trace-2' });
  assert.equal(checkLog([lines[0], forged], { seq: 2, hash: b.hash }).check.ok, false);
  assert.equal(AUDIT_HEADER.at(-1), 'Correlation ID');
  assert.equal(auditRows([b])[0].at(-1), 'trace-1');
  assert.equal(auditRows([a])[0].at(-1), '');
});

test('the store adds the correlation ID of the request being handled', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'eq-corr-'));
  try {
    resetAuditCache();
    const files = auditFiles(dir);
    setAuditCorrelation(() => 'from-request');
    appendAudit(files, { kind: 'api', summary: 'x' });
    appendAudit(files, { kind: 'api', summary: 'y', correlationId: 'explicit' });
    setAuditCorrelation(() => undefined);
    appendAudit(files, { kind: 'api', summary: 'z' });
    const { check, entries } = readAudit(files);
    assert.equal(check.ok, true);
    assert.deepEqual(entries.map((e) => e.correlationId), ['from-request', 'explicit', undefined]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
