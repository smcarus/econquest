import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OFFICIAL_CALENDAR, daysUntil, upcomingOfficialEvents, nextOfficialEvent } from '../src/data/officialCalendar.ts';

test('every calendar entry is a real date with a source', () => {
  for (const e of OFFICIAL_CALENDAR) {
    assert.match(e.date, /^\d{4}-\d{2}-\d{2}$/, `${e.iso3} ${e.title}`);
    const d = new Date(`${e.date}T00:00:00Z`);
    assert.equal(d.toISOString().slice(0, 10), e.date, `${e.date} is not a calendar date`);
    assert.match(e.sourceUrl, /^https:\/\//, `${e.iso3} ${e.date} has no https source`);
    assert.ok(e.sourceName.trim(), `${e.iso3} ${e.date} has no source name`);
  }
});

test('no duplicate entries', () => {
  // Two different releases on one day (US industrial production and retail sales) are not duplicates.
  const keys = OFFICIAL_CALENDAR.map((e) => `${e.iso3}|${e.category}|${e.date}|${e.title.replace(/,.*$/, '')}`);
  assert.equal(new Set(keys).size, keys.length);
});

test('daysUntil and the upcoming window', () => {
  const now = new Date(2026, 10, 4);
  assert.equal(daysUntil('2026-11-04', now), 0);
  assert.equal(daysUntil('2026-11-11', now), 7);
  const list = upcomingOfficialEvents(['BRA', 'MEX'], 60, now);
  assert.ok(list.every((e) => e.daysUntil >= 0 && e.daysUntil <= 60));
  assert.deepEqual(list.map((e) => e.daysUntil), [...list.map((e) => e.daysUntil)].sort((a, b) => a - b));
  const next = nextOfficialEvent('BRA', 'MPC_DECISION', now);
  if (next) assert.ok(next.daysUntil >= 0);
});

test('CPI and GDP release dates: every G20 country has an official date or says why not (data plan G10)', async () => {
  const { G20_ISO3 } = await import('../src/data/presetsAndBaselines.ts');
  const { RELEASE_GAPS, releaseGap } = await import('../src/data/officialCalendar.ts');
  const now = new Date('2026-11-09T12:00:00Z');
  const releases = OFFICIAL_CALENDAR.filter((e) => e.category === 'CPI_RELEASE' || e.category === 'GDP_RELEASE');
  // Read from each office's own calendar (Mexico's older INPC rows are the one secondary source).
  for (const e of releases.filter((x) => x.iso3 !== 'MEX')) assert.ok(e.primarySource && e.retrieved === '2026-11-09', `${e.iso3} ${e.title}`);
  for (const iso3 of G20_ISO3) {
    for (const cat of ['CPI_RELEASE', 'GDP_RELEASE'] as const) {
      const listed = releases.some((e) => e.iso3 === iso3 && e.category === cat);
      assert.ok(listed || RELEASE_GAPS[iso3]?.[cat], `${iso3} ${cat}: neither a date nor a reason`);
      if (!listed) assert.equal(releaseGap(iso3, cat, now), RELEASE_GAPS[iso3]![cat]);
    }
  }
  assert.equal(nextOfficialEvent('USA', 'CPI_RELEASE', now)?.date, '2026-11-10');
  assert.equal(nextOfficialEvent('GBR', 'GDP_RELEASE', now)?.date, '2026-11-12');
  assert.match(releaseGap('TUR', 'CPI_RELEASE', now), /robots\.txt/);
  // Once every listed date has passed, the reason says so instead of showing an old date.
  assert.match(releaseGap('CHN', 'CPI_RELEASE', new Date('2027-01-01T00:00:00Z')), /Every listed date has passed/);
  assert.match(releaseGap('XXX', 'GDP_RELEASE', now), /not been checked yet/);
});

test('release reasons and labels have Spanish and French', async () => {
  const { attachLanguage, translateText } = await import('../src/i18n/lang');
  const { ES, ES_TEXT } = await import('../src/i18n/es');
  const { FR, FR_TEXT } = await import('../src/i18n/fr');
  const { RELEASE_GAPS, releaseGap } = await import('../src/data/officialCalendar.ts');
  const { RELEASE_HELP } = await import('../src/utils/countryNotes.ts');
  attachLanguage('es', ES, ES_TEXT);
  attachLanguage('fr', FR, FR_TEXT);
  const texts = [
    ...new Set(Object.values(RELEASE_GAPS).flatMap((g) => Object.values(g))),
    releaseGap('XXX', 'CPI_RELEASE'),
    releaseGap('CHN', 'CPI_RELEASE', new Date('2027-01-01T00:00:00Z')),
    RELEASE_HELP,
    'Next GDP release',
  ];
  for (const lang of ['es', 'fr'] as const) assert.deepEqual(texts.filter((x) => translateText(x, lang) === x), [], lang);
});
