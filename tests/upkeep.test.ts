import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DATA_LICENCES, LICENCE_RECHECK_DAYS, licenceCheckDue, licencesDue } from '../src/data/dataLicences.ts';
import { ENDED_AFTER_DAYS, possiblyEnded } from '../src/utils/dataHealth.ts';

test('a licence row is due a re-read only after twelve months', () => {
  assert.equal(LICENCE_RECHECK_DAYS, 365);
  const now = new Date('2027-11-12T00:00:00Z');
  assert.equal(licenceCheckDue({ checked: '2026-11-11' }, now), true);
  assert.equal(licenceCheckDue({ checked: '2026-11-13' }, now), false);
  assert.equal(licenceCheckDue({ checked: 'not a date' }, now), false);
  assert.deepEqual(licencesDue(new Date('2026-11-11T00:00:00Z')), [], 'every row was read within the year');
  const later = licencesDue(new Date('2028-01-01T00:00:00Z'));
  assert.equal(later.length, DATA_LICENCES.filter((r) => !r.ended).length);
});

test('a source failing for thirty days and three checks in a row may have ended', () => {
  assert.equal(ENDED_AFTER_DAYS, 30);
  const now = new Date('2026-12-15T00:00:00Z');
  const base = { state: 'no_answer' as const, failingSince: '2026-11-10T05:30:00Z', failuresInRow: 30 };
  assert.equal(possiblyEnded(base, now), true);
  assert.equal(possiblyEnded({ ...base, failingSince: '2026-11-20T05:30:00Z' }, now), false, 'under 30 days');
  assert.equal(possiblyEnded({ ...base, failuresInRow: 2 }, now), false, 'too few checks');
  assert.equal(possiblyEnded({ ...base, state: 'connected' }, now), false);
  assert.equal(possiblyEnded({ ...base, failingSince: undefined }, now), false);
});

test('dependency updates come once a month, grouped, and the upkeep routine is written down', () => {
  const dep = readFileSync(new URL('../.github/dependabot.yml', import.meta.url), 'utf8');
  assert.doesNotMatch(dep, /interval: (weekly|daily)/);
  assert.equal((dep.match(/interval: monthly/g) || []).length, 3);
  const doc = readFileSync(new URL('../docs/MAINTENANCE.md', import.meta.url), 'utf8');
  for (const part of ['## Every day', '## Once a month', '## Once a year', '## When a source ends', 'Nothing is filled in from elsewhere']) assert.ok(doc.includes(part), part);
});
