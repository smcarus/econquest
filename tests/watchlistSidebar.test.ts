/**
 * The watchlist screen (Briefing > Watchlist) drew every row's 10Y yield, debt and reserves with
 * toFixed, so a Missing figure (null in saved rows) crashed the whole app. Missing now reads "–".
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixedOrDash } from '../src/components/WatchlistSidebar';

test('a figure is shown with its unit', () => {
  assert.equal(fixedOrDash(15.294, 1, '%'), '15.3%');
  assert.equal(fixedOrDash(93.3, 0, '%'), '93%');
  assert.equal(fixedOrDash(8.42, 1, 'm'), '8.4m');
  assert.equal(fixedOrDash(0, 1, '%'), '0.0%');
});

test('a Missing figure reads as a dash, never a crash', () => {
  assert.equal(fixedOrDash(null, 1, '%'), '–');
  assert.equal(fixedOrDash(undefined, 0, '%'), '–');
  assert.equal(fixedOrDash(Number.NaN, 1, 'm'), '–');
});
