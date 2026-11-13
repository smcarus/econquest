/**
 * Holdings write API (console integration item 7): JSON positions follow the CSV rules, a list is
 * all or nothing, and a sender only ever changes its own positions.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apiHoldingView, mergeApiHoldings, parseApiHolding, parseApiHoldings } from '../src/utils/holdingsApi';
import type { Holding } from '../src/utils/holdings';

test('one position: ISO codes, notional sign gives the side, identifiers checked, entity ID kept exactly', () => {
  const r = parseApiHolding({ country: 'za', notional_usd_mm: -8, type: 'fx', entity_id: 'Desk A/123', ticker: 'zar' }, 'Position 1');
  assert.deepEqual(r.errors, []);
  assert.equal(r.holding!.iso3, 'ZAF');
  assert.equal(r.holding!.side, 'SHORT');
  assert.equal(r.holding!.notionalUsdMm, 8);
  assert.equal(r.holding!.assetClass, 'FX');
  assert.equal(r.holding!.entityId, 'Desk A/123');
  assert.equal(r.holding!.instrument, 'ZAF position');
  assert.equal(parseApiHolding({ country: 'BRA', notional_usd_mm: 10, type: 'LC_BOND' }, 'x').holding!.assetClass, 'LC_BOND');
  const bad = parseApiHolding({ country: 'XX1', notional_usd_mm: 'ten', side: 'flat', duration: -1, isin: 'US0378331006X' }, 'Position 2');
  assert.equal(bad.holding, undefined);
  assert.ok(bad.errors.length >= 4);
  assert.ok(bad.errors.every((e) => e.startsWith('Position 2')));
});

test('a list is all or nothing; a repeated entity_id is refused', () => {
  assert.equal(parseApiHoldings([{ country: 'BR', notional_usd_mm: 1 }, { country: 'MX' }]).holdings.length, 0);
  assert.match(parseApiHoldings([{ country: 'BR', notional_usd_mm: 1, entity_id: 'a' }, { country: 'MX', notional_usd_mm: 1, entity_id: 'a' }]).errors[0]!, /sent twice/);
  assert.match(parseApiHoldings('nope').errors[0]!, /holdings/);
});

test('merge: replace and upsert touch only this sender; ids stay for a known entity_id', () => {
  const saved = [
    { id: 'h_app', iso3: 'BRA', instrument: 'mine', assetClass: 'HC_BOND', side: 'LONG', notionalUsdMm: 5 },
    { id: 'h_other', iso3: 'MEX', instrument: 'other', assetClass: 'FX', side: 'LONG', notionalUsdMm: 5, from: 'tok2', fromName: 'Other' },
    { id: 'h_old', iso3: 'TUR', instrument: 'old', assetClass: 'CDS', side: 'LONG', notionalUsdMm: 5, entityId: 'p1', from: 'tok1', fromName: 'Console' },
  ] as Holding[];
  const inc = parseApiHoldings([{ country: 'TUR', notional_usd_mm: 9, entity_id: 'p1' }, { country: 'IDN', notional_usd_mm: 3, entity_id: 'p2' }]).holdings;
  const up = mergeApiHoldings(saved, inc, { id: 'tok1', name: 'Console' }, 'upsert');
  assert.deepEqual(up.map((h) => h.id).slice(0, 2), ['h_app', 'h_other']);
  assert.equal(up.find((h) => h.entityId === 'p1')!.id, 'h_old');
  assert.equal(up.find((h) => h.entityId === 'p1')!.notionalUsdMm, 9);
  assert.equal(up.length, 4);
  const rep = mergeApiHoldings(up, [], { id: 'tok1', name: 'Console' }, 'replace');
  assert.deepEqual(rep.map((h) => h.id), ['h_app', 'h_other']);
  assert.deepEqual(apiHoldingView(up.find((h) => h.entityId === 'p2')!), { id: up.find((h) => h.entityId === 'p2')!.id, country: 'IDN', instrument: 'IDN position', type: 'HC_BOND', side: 'long', notional_usd_mm: 3, entity_id: 'p2' });
});
