import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CORE_REPORTS, isCoreCountryTab, loadShowAllTools, visibleNav, visibleReport } from '../src/utils/simpleMode.ts';
import { DEFAULT_REPORT, NAV, NAV_LABEL } from '../src/data/navigation.ts';

test('core view: no Tools in the top bar; all of it with the switch on', () => {
  assert.ok(!visibleNav(NAV, false).includes('desks'));
  assert.deepEqual(visibleNav(NAV, true), NAV);
});

test('core view: Brief, MarketEdge and Overview only on the Country page', () => {
  assert.ok(isCoreCountryTab('brief') && isCoreCountryTab('macro') && isCoreCountryTab('overview') && isCoreCountryTab('history'));
  for (const t of ['debt', 'markets', 'geo', 'scenarios', 'restructuring']) assert.equal(isCoreCountryTab(t), false);
});

test('core view: the default report template is shown', () => {
  assert.ok(CORE_REPORTS.includes(visibleReport(DEFAULT_REPORT, false)));
  assert.equal(visibleReport('ic', false), 'book');
  assert.equal(visibleReport('client', false), 'client_review');
  assert.equal(visibleReport('ic', true), 'ic');
});

test('switch is off when nothing is saved (or storage is missing)', () => {
  assert.equal(loadShowAllTools(), false);
});

test('no roles: Workspace leads the navigation, labels as Sam set them (2026-11-04)', () => {
  assert.equal(NAV[0], 'today');
  assert.equal(NAV_LABEL.today, 'Workspace');
  assert.equal(NAV_LABEL.research, 'Research');
  // Country Research, Compare and Portfolio are one Research page (Sam, 2026-11-05).
  assert.deepEqual(NAV.slice(0, 3), ['today', 'research', 'reports']);
});
