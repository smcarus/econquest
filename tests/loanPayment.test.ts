import { test } from 'node:test';
import assert from 'node:assert/strict';
import { balanceAfter, cbLastMove, loanEffect, monthlyPayment } from '../src/utils/loanPayment.ts';

test('PY3 monthlyPayment: annuity, zero rate and interest-only', () => {
  assert.equal(Math.round(monthlyPayment(200000, 6, 360) * 100) / 100, 1199.1);
  assert.equal(monthlyPayment(12000, 0, 12), 1000);
  assert.equal(monthlyPayment(100000, 6, 360, 'interest_only'), 500);
  assert.ok(Math.abs(balanceAfter(200000, 6, 360, 360)) < 1e-6);
});

test('PY3 loanEffect: variable loans move at once and show the central bank line', () => {
  const cb = { period: '2026-09', fromPct: 4.25, toPct: 4, changePts: -0.25, source: 'BIS' };
  const r = loanEffect({ balance: 200000, ratePct: 6, years: 30, type: 'variable', kind: 'repayment' }, 1, cb);
  assert.ok(r.ok);
  assert.equal(r.payment, 1199.1);
  assert.equal(r.withChange, 1330.6);
  assert.equal(r.startsAfterMonths, 0);
  assert.ok(r.cb && r.cb.diff < 0);
  const m = loanEffect({ balance: 200000, ratePct: 6, years: 30, type: 'variable', kind: 'repayment' }, 1, { missing: 'No series' });
  assert.ok(m.ok && m.cbMissing === 'No series' && !m.cb);
});

test('PY3 loanEffect: fixed loans change only after the fixed period, with no central bank line', () => {
  const r = loanEffect({ balance: 200000, ratePct: 6, years: 30, type: 'fixed', kind: 'repayment', fixedYearsLeft: 2 }, 1, null);
  assert.ok(r.ok);
  assert.equal(r.startsAfterMonths, 24);
  assert.ok(r.withChange > r.payment && r.withChange < 1330.6);
  assert.equal(r.cb, undefined);
  assert.equal(r.cbMissing, undefined);
  // At the same rate the payment after the fixed period is the same (the annuity property).
  const same = loanEffect({ balance: 200000, ratePct: 6, years: 30, type: 'fixed', kind: 'repayment', fixedYearsLeft: 2 }, 0, null);
  assert.ok(same.ok && same.diff === 0);
});

test('PY3 loanEffect checks the inputs', () => {
  assert.equal(loanEffect({ balance: 0, ratePct: 6, years: 30, type: 'variable', kind: 'repayment' }, 1, null).ok, false);
  assert.equal(loanEffect({ balance: 1000, ratePct: 1, years: 30, type: 'variable', kind: 'repayment' }, -2, null).ok, false);
  assert.equal(loanEffect({ balance: 1000, ratePct: 1, years: 5, type: 'fixed', kind: 'repayment', fixedYearsLeft: 6 }, 0, null).ok, false);
});

test('PY3 cbLastMove: BIS first, then the IMF monthly series, else Missing', () => {
  const b = cbLastMove({ lastMove: { period: '2026-09', fromPct: 4.25, toPct: 4 }, bank: 'Bank of England', rate: 'Bank Rate' }, null);
  assert.ok('changePts' in b && b.changePts === -0.25 && /Bank of England/.test(b.source));
  const none = cbLastMove({ historyFrom: '2020-01' }, null);
  assert.ok('missing' in none && /2020-01/.test(none.missing));
  const i = cbLastMove(null, { points: [{ period: '2026-07', value: 27 }, { period: '2026-08', value: 25 }, { period: '2026-09', value: 25 }], long: 'IMF policy rate' });
  assert.ok('changePts' in i && i.period === '2026-08' && i.changePts === -2);
  assert.ok('missing' in cbLastMove(null, null));
});
