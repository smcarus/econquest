/**
 * Pickers reach every country the app covers, not only the open watchlist (lower-income countries
 * were "already in the app" yet missing from Research and Policy review), and Council chat pulls
 * a covered country named in a question instead of saying it is not on the watchlist.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { otherCountries } from '../src/utils/countryChoices';
import { coveredOffWatchlist } from '../src/utils/askCouncil';
import { LOWER_INCOME_ISO3, SOVEREIGN_CATALOG } from '../src/data/presetsAndBaselines';
import { toLive } from '../src/utils/liveFigures';

const g20 = SOVEREIGN_CATALOG.filter((c) => ['BRA', 'USA', 'IND'].includes(c.iso3));

test('other countries: everything covered but not on the list, sorted, no repeats, hidden left out', () => {
  const rest = otherCountries(g20, [...SOVEREIGN_CATALOG, ...SOVEREIGN_CATALOG], new Set(['GHA']));
  const codes = rest.map((c) => c.iso3);
  assert.ok(!codes.includes('BRA') && !codes.includes('IND'), 'watchlist countries are not repeated');
  assert.ok(!codes.includes('GHA'), 'hidden countries stay out');
  assert.equal(new Set(codes).size, codes.length);
  for (const iso3 of LOWER_INCOME_ISO3.filter((c) => !['IND', 'GHA'].includes(c))) assert.ok(codes.includes(iso3), `${iso3} is reachable`);
  const names = rest.map((c) => c.countryName);
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)));
});

test('council: a covered country off the watchlist is pulled; an uncovered one is not', () => {
  const items = g20.map(toLive);
  const covered = SOVEREIGN_CATALOG.map((c) => c.iso3);
  assert.deepEqual(coveredOffWatchlist('How is Kenya doing on inflation and debt?', items, covered), ['KEN']);
  assert.deepEqual(coveredOffWatchlist('Compare Kenya with Brazil', items, covered), ['KEN']);
  assert.deepEqual(coveredOffWatchlist('Is Brazil behind the curve?', items, covered), []);
  // Iceland is not in the app's list, so it stays an "Add for this question" choice.
  assert.deepEqual(coveredOffWatchlist('What about Iceland?', items, covered), []);
});
