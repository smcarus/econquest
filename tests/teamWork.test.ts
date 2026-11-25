import { test } from 'node:test';
import assert from 'node:assert/strict';
import { commentsFor, hashToken, markDone, newComment, newShare, resolveShare, sharePage } from '../src/utils/teamWork.ts';
import { requiredRole } from '../src/utils/permissions.ts';

test('comments: checked input, listed per target in time order, done only by the author or an Admin', () => {
  assert.ok('error' in newComment({ kind: 'x', targetId: 'a', text: 'hi' }, { name: 'A' }));
  assert.ok('error' in newComment({ kind: 'review', targetId: 'a', text: '  ' }, { name: 'A' }));
  assert.ok('error' in newComment({ kind: 'review', targetId: 'a', text: 'x'.repeat(4001) }, { name: 'A' }));
  const a = newComment({ kind: 'review', targetId: 'r1', text: 'Check the debt figure' }, { name: 'Ana', account: 'u1' }, new Date('2026-11-23T10:00:00Z'));
  const b = newComment({ kind: 'review', targetId: 'r1', text: 'Agreed' }, { name: 'Ben', account: 'u2' }, new Date('2026-11-23T09:00:00Z'));
  const c = newComment({ kind: 'report', targetId: 'r1', text: 'Other' }, { name: 'Ben', account: 'u2' });
  if ('error' in a || 'error' in b || 'error' in c) assert.fail();
  const all = [a, b, c];
  assert.deepEqual(commentsFor(all, 'review', 'r1').map((x) => x.by), ['Ben', 'Ana']);
  assert.ok('error' in markDone(all, a.id, { name: 'Ben', account: 'u2', admin: false }));
  const ok = markDone(all, a.id, { name: 'Ana', account: 'u1', admin: false });
  if ('error' in ok) assert.fail();
  assert.equal(ok.find((x) => x.id === a.id)!.done!.by, 'Ana');
  assert.ok(!('error' in markDone(all, b.id, { name: 'Admin', account: 'u9', admin: true })));
});

test('read-only links: only the hash is kept; expiry and withdrawal close them', () => {
  const now = new Date('2026-11-23T10:00:00Z');
  assert.ok('error' in newShare({ kind: 'review', targetId: 'r1', title: 'T', days: 0 }, 'Ana', now));
  assert.ok('error' in newShare({ kind: 'review', targetId: 'r1', title: 'T', days: 91 }, 'Ana', now));
  const s = newShare({ kind: 'review', targetId: 'r1', title: 'Memo', days: 7 }, 'Ana', now);
  if ('error' in s) assert.fail();
  assert.equal(s.link.tokenHash, hashToken(s.token));
  assert.ok(!JSON.stringify(s.link).includes(s.token));
  assert.equal(s.link.expires, '2026-11-30T10:00:00.000Z');
  const links = [s.link];
  assert.ok(!('error' in resolveShare(links, s.token, new Date('2026-11-29T00:00:00Z'))));
  assert.match((resolveShare(links, s.token, new Date('2026-12-01T00:00:00Z')) as { error: string }).error, /expired/);
  assert.match((resolveShare(links, 'x'.repeat(43), now) as { error: string }).error, /not valid/);
  assert.match((resolveShare([{ ...s.link, withdrawn: { by: 'Ana', at: '' } }], s.token, now) as { error: string }).error, /withdrawn/);
});

test('share page escapes text and holds no scripts; Viewers may comment but not make links', () => {
  const html = sharePage('A <b>', '<script>alert(1)</script>', 'note');
  assert.doesNotMatch(html, /<script/);
  assert.match(html, /&lt;script&gt;/);
  assert.equal(requiredRole('POST', '/api/comments'), 'viewer');
  assert.equal(requiredRole('POST', '/api/shares'), 'analyst');
  assert.equal(requiredRole('GET', '/share/abc'), 'viewer');
});
