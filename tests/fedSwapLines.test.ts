import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fedSwapSeries, isCountryCounterparty, nyfedSwapsUrl, outstandingByWednesday, parseNyfedSwaps } from '../src/utils/fedSwapLines.ts';
import { checkConnections } from '../src/utils/connectionCheck.ts';

// Layout as the New York Fed answered on 2026-11-14 (March 2020 operations).
const ANSWER = {
  fxSwaps: {
    operations: [
      { operationType: 'U.S. Dollar Liquidity Swap', counterparty: 'Bank of Japan', currency: 'USD', tradeDate: '2020-03-31', settlementDate: '2020-04-02', maturityDate: '2020-06-25', termInDays: 84, amount: 29724000000, interestRate: 0.32, isSmallValue: '', lastUpdated: '2020-03-31 09:00:00' },
      { operationType: 'U.S. Dollar Liquidity Swap', counterparty: 'European Central Bank', currency: 'USD', tradeDate: '2020-03-31', settlementDate: '2020-04-01', maturityDate: '2020-04-08', termInDays: 7, amount: '3505000000', interestRate: 0.33, isSmallValue: '', lastUpdated: '2020-03-31 09:00:00' },
      { operationType: 'U.S. Dollar Liquidity Swap', counterparty: 'Bank of England', currency: 'USD', tradeDate: '2020-03-31', settlementDate: 'soon', maturityDate: '2020-04-08', amount: 1 },
    ],
  },
};

test('operations: dollars in US$ bn, unreadable rows skipped', () => {
  const ops = parseNyfedSwaps(ANSWER)!;
  assert.equal(ops.length, 2);
  assert.deepEqual(ops[0], { counterparty: 'Bank of Japan', settle: '2020-04-02', mature: '2020-06-25', usdBn: 29.724 });
  assert.equal(parseNyfedSwaps({}), null);
  assert.deepEqual(parseNyfedSwaps({ fxSwaps: { operations: [] } }), []);
  assert.match(nyfedSwapsUrl('2020-01-01', '2020-12-31'), /fxs\/usdollar\/search\.json\?startDate=2020-01-01&endDate=2020-12-31$/);
});

test('outstanding each Wednesday: settled on or before, maturing after', () => {
  const ops = parseNyfedSwaps(ANSWER)!;
  const pts = outstandingByWednesday(ops, '2020-04-15');
  assert.deepEqual(pts, [
    { date: '2020-04-01', value: 3.505 },
    { date: '2020-04-08', value: 29.724 },
    { date: '2020-04-15', value: 29.724 },
  ]);
});

test('series: world total for every country, own central bank only when it drew', () => {
  const pull = { pulledAt: '2020-04-15T10:00:00Z', operations: parseNyfedSwaps(ANSWER)! };
  const jp = fedSwapSeries('JPN', pull, 'JPY');
  assert.ok('points' in jp[0] && jp[0].freq === 'weekly' && jp[0].unit === 'US$ bn');
  assert.ok('points' in jp[1] && jp[1].points.at(-1)!.value === 29.724);
  const de = fedSwapSeries('DEU', pull, 'EUR');
  assert.ok('points' in de[1] && de[1].points[0].value === 3.505);
  const br = fedSwapSeries('BRA', pull, 'BRL');
  assert.ok('reason' in br[1] && /has not drawn/.test(br[1].reason));
  assert.ok(fedSwapSeries('BRA', null).every((s) => 'reason' in s && s.reason === 'The New York Fed has not answered yet'));
  assert.ok(isCountryCounterparty('Banco Central do Brasil', 'BRA'));
  assert.ok(!isCountryCounterparty('European Central Bank', 'GBR', 'GBP'));
});

test('Data health row nyfed_swaps', async () => {
  const rep = await checkConnections({ env: {}, only: ['nyfed_swaps'], fetchFn: async () => new Response(JSON.stringify(ANSWER), { status: 200 }) } as never);
  assert.equal(rep.results[0].state, 'connected');
  assert.match(rep.results[0].sample || '', /Latest operation: Bank of Japan, US\$ 29\.724 bn settled 2020-04-02/);
  const bad = await checkConnections({ env: {}, only: ['nyfed_swaps'], fetchFn: async () => new Response('{"x":1}', { status: 200 }) } as never);
  assert.equal(bad.results[0].state, 'bad_reply');
});
