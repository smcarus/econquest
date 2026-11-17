import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { rcCsv, rcSentence, restructuringCalc, type RcResult } from '../src/utils/restructuringCalc.ts';
import { registerEntry } from '../src/data/modelRegister.ts';
import { HIDDEN_GROUPS, READY_BY_ID } from '../src/data/toolsCatalog.ts';

const bullet = { face: 100, couponPct: 5, years: 10, graceYears: 9 };

test('a par bond at its coupon is worth its face; face cut, NPV and market haircuts at each rate', () => {
  const r = restructuringCalc({ oldBond: bullet, newBond: { ...bullet, face: 50 }, ratesPct: [5, null, 5] }) as RcResult;
  assert.equal(r.ok, true);
  assert.equal(r.rows.length, 1, 'blank and repeated rates are left out');
  assert.deepEqual(r.rows[0], { ratePct: 5, pvOld: 100, pvNew: 50, npvHaircutPct: 50, marketHaircutPct: 50 });
  assert.equal(r.faceHaircutPct, 50);
  assert.equal(r.cashflows.length, 10);
  assert.deepEqual(r.cashflows[9], { year: 10, old: 105, new: 52.5 });
  assert.equal(r.totalOld, 150);

  // No face cut, longer and cheaper: the NPV haircut grows with the discount rate; old bond above par below its coupon.
  const ext = restructuringCalc({ oldBond: bullet, newBond: { face: 100, couponPct: 3, years: 20, graceYears: 10 }, ratesPct: [4, 8, 12] }) as RcResult;
  assert.deepEqual(ext.rows.map((x) => x.ratePct), [4, 8, 12]);
  assert.ok(ext.rows[0].npvHaircutPct < ext.rows[1].npvHaircutPct && ext.rows[1].npvHaircutPct < ext.rows[2].npvHaircutPct);
  assert.ok(ext.rows[0].pvOld > 100);
  assert.equal(ext.faceHaircutPct, 0);
  assert.equal(ext.cashflows.length, 20);
  assert.equal(ext.cashflows[15].old, 0, 'the old bond has stopped paying');
  // Market haircut = 1 − PV(new) / old face.
  assert.equal(ext.rows[1].marketHaircutPct, Math.round((1 - ext.rows[1].pvNew / 100) * 10000) / 100);
});

test('every field starts blank: blanks, out-of-range terms and a missing rate are named', () => {
  const none = restructuringCalc({ oldBond: {}, newBond: {}, ratesPct: [] });
  assert.equal(none.ok, false);
  if (none.ok) return;
  assert.equal(none.blank.length, 8);
  assert.equal(none.noRate, true);
  const bad = restructuringCalc({ oldBond: { ...bullet, face: 0 }, newBond: { face: 80, couponPct: 4, years: 5, graceYears: 5 }, ratesPct: [-60] });
  assert.equal(bad.ok, false);
  if (bad.ok) return;
  assert.deepEqual(bad.invalid, ['oldBond.face', 'newBond.graceYears', 'rate.0']);
  const frac = restructuringCalc({ oldBond: { ...bullet, years: 10.5 }, newBond: bullet, ratesPct: [5] });
  assert.ok(!frac.ok && frac.invalid.includes('oldBond.years'));
});

test('sentence and CSV', () => {
  const r = restructuringCalc({ oldBond: bullet, newBond: { ...bullet, face: 50 }, ratesPct: [5] }) as RcResult;
  assert.equal(
    rcSentence(r),
    'Old bond: face 100, coupon 5%, 10 years, 9 grace. New bond: face 50, coupon 5%, 10 years, 9 grace. Face cut 50%; at 5% the old bond is worth 100 and the new 50: NPV haircut 50%, market haircut 50%.',
  );
  const csv = rcCsv(r);
  assert.ok(csv.startsWith('﻿bond,face,coupon_pct,years,grace_years\r\nold,100,5,10,9\r\n'));
  assert.match(csv, /\r\n5,100,50,50,50,50\r\n/);
  assert.match(csv, /\r\n10,105,52\.5\r\n/);
  assert.match(csv, /Sturzenegger and Zettelmeyer 2008/);
});

test('wired: register, tool, panel, hidden desks point at the new tools, sandbox points here', () => {
  assert.equal(registerEntry('restructuring_calc')!.status, 'descriptive');
  assert.equal(READY_BY_ID.restructuring_calc.target.anchor, 'tool-restructuring');
  const desks = HIDDEN_GROUPS.flatMap((g) => g.desks);
  assert.equal(desks.find((d) => d.id === 'quant_restructuring_npv')?.coveredBy, 'restructuring_calc');
  assert.equal(desks.find((d) => d.id === 'debt_investor_base_doom_loop')?.coveredBy, 'bank_sovereign');
  const page = fs.readFileSync('src/components/CountryPage.tsx', 'utf8');
  assert.match(page, /id="tool-restructuring"/);
  assert.match(page, /RestructuringCalcPanel/);
  const panel = fs.readFileSync('src/components/RestructuringCalcPanel.tsx', 'utf8');
  assert.ok(!/useState<Text>\(\{[^}]/.test(panel), 'no field is filled in at start');
  assert.match(fs.readFileSync('src/components/ModelSandboxPanel.tsx', 'utf8'), /sb_rsMoved/);
});
