import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calendarHealth, localDay, RUNNING_OUT_DAYS, STALE_DAYS } from '../src/utils/calendarHealth.ts';
import { OFFICIAL_CALENDAR, type OfficialCalendarEvent } from '../src/data/officialCalendar.ts';

const ev = (iso3: string, category: OfficialCalendarEvent['category'], date: string, retrieved = '2026-11-04'): OfficialCalendarEvent => ({
  iso3,
  category,
  title: `${iso3} ${category}`,
  date,
  sourceName: `${iso3} source`,
  sourceUrl: `https://example.org/${iso3}`,
  primarySource: true,
  retrieved,
});

test('flags schedules running out, ended and read long ago; one-off events never run out', () => {
  const events = [
    ev('BRA', 'MPC_DECISION', '2026-11-04'),
    ev('BRA', 'MPC_DECISION', '2027-12-08'),
    ev('IDN', 'MPC_DECISION', '2026-11-19'),
    ev('IDN', 'MPC_DECISION', '2026-12-16'),
    ev('ZAF', 'ELECTION', '2026-11-04'),
    ev('EGY', 'IMF_PROGRAMME', '2026-12-15'),
    ev('GBR', 'MPC_DECISION', '2027-12-16', '2026-09-01'),
  ];
  const h = calendarHealth(events, ['BRA', 'IDN', 'ZAF', 'EGY', 'GBR', 'usa'], '2026-11-08');
  const row = (iso3: string) => h.rows.find((r) => r.iso3 === iso3)!;
  assert.deepEqual(row('BRA').flags, []);
  assert.equal(row('BRA').upcoming, 1);
  assert.equal(row('BRA').nextDate, '2027-12-08');
  assert.deepEqual(row('IDN').flags, ['running_out']);
  assert.equal(row('IDN').nextDate, '2026-11-19');
  assert.deepEqual(row('ZAF').flags, ['ended']);
  assert.equal(row('ZAF').nextDate, null);
  assert.deepEqual(row('EGY').flags, []);
  assert.deepEqual(row('GBR').flags, ['old_check']);
  assert.equal(row('GBR').ageDays, 68);
  assert.deepEqual(h.noDecisionDates, ['EGY', 'USA', 'ZAF']);
  assert.equal(h.needsLook, 3 + 3);
  // Flagged rows first.
  assert.ok(h.rows.findIndex((r) => !r.flags.length) > h.rows.findIndex((r) => r.flags.length > 0));
});

test('thresholds sit at the edges stated', () => {
  const edge = calendarHealth([ev('MEX', 'CPI_RELEASE', '2027-01-07', '2026-10-09')], [], '2026-11-08');
  assert.equal(RUNNING_OUT_DAYS, 60);
  assert.equal(STALE_DAYS, 30);
  // 60 days ahead counts as running out; 30 days old does not yet count as an old check.
  assert.deepEqual(edge.rows[0].flags, ['running_out']);
  assert.equal(edge.rows[0].ageDays, 30);
});

test('the real calendar reads without error and every row names its source', () => {
  const h = calendarHealth(OFFICIAL_CALENDAR, ['BRA', 'SAU'], localDay(new Date(2026, 10, 8)));
  assert.ok(h.rows.length > 0);
  assert.ok(h.rows.every((r) => /^https:\/\//.test(r.sourceUrl) && r.sourceName));
  assert.ok(h.noDecisionDates.includes('SAU'));
  assert.ok(!h.noDecisionDates.includes('BRA'));
});
