import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { feedbackLine, issueText, issueUrl, parseFeedback, ratedQuestions, scrub, summariseFeedback, type FeedbackEntry } from '../src/utils/feedback';
import { appendFeedback, loadFeedback } from '../src/utils/feedbackStore';
import { APP_CITATION } from '../src/utils/citation';

const at = (s: string) => new Date(`2026-11-11T${s}Z`);
const ok = (v: unknown, when = at('10:00:00')) => {
  const out = parseFeedback(v, when);
  assert.ok('entry' in out, JSON.stringify(out));
  return out.entry;
};

test('a flag on a figure keeps the note, figure, source and app version', () => {
  const e = ok({ kind: 'flag', target: 'figure', note: ' Looks a year old ', figure: { iso3: 'bra', label: 'Inflation', value: '4.4%', source: 'IMF WEO, Oct 2026' } });
  assert.equal(e.note, 'Looks a year old');
  assert.deepEqual(e.figure, { iso3: 'BRA', label: 'Inflation', value: '4.4%', source: 'IMF WEO, Oct 2026' });
  assert.equal(e.appVersion, APP_CITATION.version);
  assert.equal(e.id, 'fb-20261111100000000');
});

test('bad input is refused with a reason', () => {
  assert.match((parseFeedback({ kind: 'like' }) as any).error, /flag or a rating/);
  assert.match((parseFeedback({ kind: 'flag', target: 'figure', note: 'x' }) as any).error, /few words/);
  assert.match((parseFeedback({ kind: 'flag', target: 'figure', note: 'Wrong value' }) as any).error, /Which figure/);
  assert.match((parseFeedback({ kind: 'rating', target: 'figure', rating: 'up' }) as any).error, /Only council answers/);
  assert.match((parseFeedback({ kind: 'rating', target: 'answer', answer: { question: 'Q?' } }) as any).error, /thumbs/);
  assert.match((parseFeedback({ kind: 'rating', target: 'answer', rating: 'up' }) as any).error, /question is missing/);
});

test('anything that looks like a key is blanked before saving', () => {
  assert.equal(scrub('see https://x.org/data?api_key=abc123&y=1'), 'see https://x.org/data?api_key=…&y=1');
  assert.equal(scrub('token AbCdEfGhIjKlMnOpQrStUvWxYz0123456789 here'), 'token … here');
  const e = ok({ kind: 'flag', target: 'answer', note: 'My key ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh leaked?', answer: { question: 'Why is inflation high?', askedAt: '2026-11-11T09:00:00Z' } });
  assert.doesNotMatch(JSON.stringify(e), /ABCDEFGHIJKLMNOP/);
});

test('the issue link: filled in, nothing sent; a paid figure leaves its value out', () => {
  const free = ok({ kind: 'flag', target: 'figure', note: 'Wrong period', figure: { label: 'Policy rate', value: '13.75%', source: 'BIS' } });
  assert.match(issueText(free).body, /Value shown: 13\.75%/);
  const url = issueUrl(free);
  assert.ok(url.startsWith('https://github.com/e-conquest/econquest/issues/new?title=Flag%3A%20Policy%20rate&body='));
  const paid = ok({ kind: 'flag', target: 'figure', note: 'Odd jump', figure: { label: 'CDS 5y', value: '231 bps', source: 'Your subscription: Macrobond, series x' } });
  const t = issueText(paid);
  assert.doesNotMatch(t.body, /231/);
  assert.match(t.body, /left out \(a figure from a paid subscription\)/);
});

test('ratings: the newest per answer counts; the export holds questions, ratings and reasons only', () => {
  const answer = { question: 'Why is inflation high?', askedAt: '2026-11-11T09:00:00Z', snapshotId: 's1' };
  const entries: FeedbackEntry[] = [
    ok({ kind: 'rating', target: 'answer', rating: 'down', answer }, at('10:00:00')),
    ok({ kind: 'rating', target: 'answer', rating: 'up', note: 'Clear', answer }, at('10:01:00')),
    ok({ kind: 'rating', target: 'answer', rating: 'down', note: 'Misses the FX side', answer: { question: 'Debt outlook?', askedAt: '2026-11-11T09:30:00Z' } }, at('10:02:00')),
    ok({ kind: 'flag', target: 'figure', note: 'Too old', figure: { label: 'Debt', value: '80', source: 'IMF' } }, at('10:03:00')),
  ];
  const rated = ratedQuestions(entries);
  assert.deepEqual(rated.map((r) => [r.question, r.rating, r.reason]), [['Why is inflation high?', 'up', 'Clear'], ['Debt outlook?', 'down', 'Misses the FX side']]);
  assert.doesNotMatch(JSON.stringify(rated), /figure|"80"/);
  const s = summariseFeedback(entries);
  assert.deepEqual({ ...s, last: undefined }, { flags: 1, flaggedFigures: 1, flaggedAnswers: 0, ratings: 2, up: 1, down: 1, last: undefined });
  assert.match(feedbackLine(s), /^1 flag \(1 on figures, 0 on answers\) and 2 answer ratings \(1 up, 1 down\)/);
  assert.equal(feedbackLine(summariseFeedback([])), 'No flags or answer ratings yet.');
});

test('the file: one line per entry, added to, readable back, private', () => {
  const file = path.join(mkdtempSync(path.join(tmpdir(), 'eq-fb-')), 'local', 'feedback.jsonl');
  appendFeedback(file, ok({ kind: 'flag', target: 'figure', note: 'Wrong', figure: { label: 'A', value: '1', source: 'B' } }));
  appendFeedback(file, ok({ kind: 'rating', target: 'answer', rating: 'up', answer: { question: 'Q?', askedAt: 'x' } }));
  assert.equal(readFileSync(file, 'utf8').trim().split('\n').length, 2);
  assert.equal(loadFeedback(file).length, 2);
  if (process.platform !== 'win32') assert.equal(statSync(file).mode & 0o777, 0o600);
});
