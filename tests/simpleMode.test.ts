import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CORE_REPORTS, isCoreCountryTab, loadShowAllTools, visibleNav, visibleReport } from '../src/utils/simpleMode.ts';
import { USER_ROLES } from '../src/data/roles.ts';

test('core view: no Tools in the top bar for any role; all of it with the switch on', () => {
  for (const r of USER_ROLES) {
    assert.ok(!visibleNav(r.nav, false).includes('desks'), r.id);
    assert.deepEqual(visibleNav(r.nav, true), r.nav);
    assert.ok(r.home.area !== 'desks', `${r.id} must not start on a hidden page`);
  }
});

test('core view: Brief, MarketEdge and Overview only on the Country page', () => {
  assert.ok(isCoreCountryTab('brief') && isCoreCountryTab('macro') && isCoreCountryTab('overview'));
  for (const t of ['debt', 'markets', 'geo', 'scenarios', 'restructuring']) assert.equal(isCoreCountryTab(t), false);
});

test('core view: every role opens a report template that is shown', () => {
  for (const r of USER_ROLES) assert.ok(CORE_REPORTS.includes(visibleReport(r.report, false)), r.id);
  assert.equal(visibleReport('ic', false), 'book');
  assert.equal(visibleReport('client', false), 'client_review');
  assert.equal(visibleReport('ic', true), 'ic');
});

test('switch is off when nothing is saved (or storage is missing)', () => {
  assert.equal(loadShowAllTools(), false);
});

test('every role opens on Workspace, and Workspace leads the navigation (Sam, 2026-11-04)', async () => {
  const { USER_ROLES, NAV_LABEL } = await import('../src/data/roles.ts');
  for (const r of USER_ROLES) {
    assert.equal(r.home.area, 'today', r.id);
    assert.equal(r.nav[0], 'today', r.id);
  }
  assert.equal(NAV_LABEL.today, 'Workspace');
  assert.equal(NAV_LABEL.country, 'Country Research');
});
