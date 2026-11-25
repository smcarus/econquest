import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addNewDefaultWatchlists, buildBaselineOpenData, DEFAULT_WATCHLISTS, G20_ISO3, LOWER_INCOME_ISO3, SOVEREIGN_CATALOG } from '../src/data/presetsAndBaselines.ts';
import { FRED_10Y_SERIES } from '../src/utils/officialYields.ts';
import { missingReason } from '../src/utils/liveFigures.ts';

// The three groups that shipped first; later groups reach existing users through addNewDefaultWatchlists.
const OLD = DEFAULT_WATCHLISTS.filter((g) => !['wl_official_yields', 'wl_g20', 'wl_lower_income'].includes(g.id));

test('Poland and Chile are in the catalog and have a FRED 10Y series', () => {
  for (const iso3 of ['POL', 'CHL']) {
    assert.ok(SOVEREIGN_CATALOG.some((c) => c.iso3 === iso3), iso3);
    assert.ok(FRED_10Y_SERIES[iso3], iso3);
  }
});

test('the official yields group holds only countries with a free official feed', () => {
  const g = DEFAULT_WATCHLISTS.find((w) => w.id === 'wl_official_yields')!;
  const isos = g.items.map((i) => i.iso3);
  assert.deepEqual(isos, ['BRA', 'MEX', 'ZAF', 'POL', 'CHL', 'GBR', 'JPN']);
  for (const iso of isos) assert.ok(iso === 'BRA' || FRED_10Y_SERIES[iso], iso);
});

test('an existing user gets the new group once, appended after their own', () => {
  const custom = { id: 'mine', name: 'Mine', description: '', isCustom: true, items: [] };
  const first = addNewDefaultWatchlists([...OLD, custom], null);
  assert.deepEqual(first.groups.map((g) => g.id).slice(-4), ['mine', 'wl_g20', 'wl_official_yields', 'wl_lower_income']);
  // They delete it: it does not come back.
  const kept = first.groups.filter((g) => g.id !== 'wl_official_yields');
  const second = addNewDefaultWatchlists(kept, first.seen);
  assert.equal(second.groups.some((g) => g.id === 'wl_official_yields'), false);
});

test('a user who removed an original default group does not get it back', () => {
  const r = addNewDefaultWatchlists(OLD.slice(1), null);
  assert.equal(r.groups.some((g) => g.id === OLD[0].id), false);
});

test('the G20 group lists all 19 member countries once, in the G20 order, first for a new user', () => {
  const g = DEFAULT_WATCHLISTS[0];
  assert.equal(g.id, 'wl_g20');
  assert.equal(g.items.length, 19);
  assert.equal(new Set(g.items.map((i) => i.iso3)).size, 19);
  assert.deepEqual(g.items.map((i) => i.iso3), G20_ISO3);
  for (const it of g.items) {
    assert.ok(it, 'every G20 member is in the catalog');
    assert.ok(it.countryName && it.currencyCode && it.region && it.focusTheme, it.iso3);
    // No built-in figures: every number waits for a feed.
    for (const v of [it.yield10YPct, it.cds5YBps, it.debtToGdpPct, it.fxReservesMonths]) assert.ok(Number.isNaN(v), it.iso3);
  }
});

test('each G20 member gets its own empty snapshot, not another country\'s', () => {
  for (const iso3 of G20_ISO3) {
    const snap = buildBaselineOpenData(iso3);
    assert.equal(snap.iso3, iso3);
    assert.ok(Number.isNaN(snap.imfIndicators.debtToGdpPct));
  }
});

test('an existing user who already had the official yields group gets the G20 group once', () => {
  const saved = DEFAULT_WATCHLISTS.filter((g) => g.id !== 'wl_g20');
  const seen = saved.map((g) => g.id);
  const first = addNewDefaultWatchlists(saved, seen);
  assert.equal(first.groups[first.groups.length - 1].id, 'wl_g20');
  assert.equal(first.groups.filter((g) => g.id === 'wl_lower_income').length, 1);
  const second = addNewDefaultWatchlists(first.groups.filter((g) => g.id !== 'wl_g20'), first.seen);
  assert.equal(second.groups.some((g) => g.id === 'wl_g20'), false);
});

test('the US now has an official 10Y yield, and Australia and Canada say why their policy rate is missing', () => {
  assert.equal(FRED_10Y_SERIES.USA, 'IRLTLT01USM156N');
  for (const iso3 of ['AUS', 'CAN']) {
    const r = missingReason('policy', iso3);
    assert.equal(r.short, 'Not pulled yet');
    assert.match(r.help, /does publish/);
  }
  assert.equal(missingReason('policy', 'EGY').short, 'Not in BIS policy rates');
});

test('the lower-income group holds 15 countries once, each in the catalog with no built-in figures, and reaches existing users once', () => {
  const g = DEFAULT_WATCHLISTS.find((w) => w.id === 'wl_lower_income')!;
  assert.equal(DEFAULT_WATCHLISTS[0].id, 'wl_g20', 'the G20 stays first for a new user');
  assert.deepEqual(g.items.map((i) => i.iso3), LOWER_INCOME_ISO3);
  assert.equal(new Set(LOWER_INCOME_ISO3).size, 15);
  for (const it of g.items) {
    assert.ok(it && it.countryName && it.currencyCode && it.region && it.focusTheme, String(it?.iso3));
    for (const v of [it.yield10YPct, it.cds5YBps, it.debtToGdpPct, it.fxReservesMonths]) assert.ok(Number.isNaN(v), it.iso3);
    assert.equal(buildBaselineOpenData(it.iso3).iso3, it.iso3);
  }
  const saved = DEFAULT_WATCHLISTS.filter((w) => w.id !== 'wl_lower_income');
  const first = addNewDefaultWatchlists(saved, saved.map((w) => w.id));
  assert.equal(first.groups[first.groups.length - 1].id, 'wl_lower_income');
  const second = addNewDefaultWatchlists(first.groups.filter((w) => w.id !== 'wl_lower_income'), first.seen);
  assert.equal(second.groups.some((w) => w.id === 'wl_lower_income'), false);
});
