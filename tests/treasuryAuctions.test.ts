import test from 'node:test';
import assert from 'node:assert/strict';
import { fdNumber, latestUstAuctions, parseUstAuctions, ustAuctionSeries, ustAuctionsUrl, ustAuctionValue, ustDemandReading, ustAuctionSummary } from '../src/utils/treasuryAuctions';

// Rows in the shape the Fiscal Data API sends: every value as text, "null" when not published.
const row = (o: Record<string, string>) => ({
  security_type: 'Note',
  reopening: 'No',
  high_investment_rate: 'null',
  inflation_index_security: 'No',
  floating_rate: 'No',
  cash_management_bill_cmb: 'No',
  offering_amt: '42000000000',
  total_accepted: '42010000000',
  comp_accepted: '41500000000',
  indirect_bidder_accepted: '29050000000',
  ...o,
});
const reply = {
  data: [
    // Announced, not yet held: no results, skipped.
    row({ auction_date: '2026-11-10', original_security_term: '10-Year', security_term: '10-Year', bid_to_cover_ratio: 'null', high_yield: 'null' }),
    row({ auction_date: '2026-10-08', original_security_term: '10-Year', security_term: '9-Year 11-Month', reopening: 'Yes', bid_to_cover_ratio: '2.31', high_yield: '4.112' }),
    row({ auction_date: '2026-09-10', original_security_term: '10-Year', security_term: '10-Year', bid_to_cover_ratio: '2.55', high_yield: '4.050' }),
    row({ auction_date: '2026-08-12', original_security_term: '10-Year', security_term: '10-Year', bid_to_cover_ratio: '2.61', high_yield: '4.200' }),
    row({ auction_date: '2026-10-06', security_type: 'Bill', original_security_term: '13-Week', security_term: '13-Week', bid_to_cover_ratio: '2.90', high_yield: 'null', high_investment_rate: '3.845', indirect_bidder_accepted: 'null' }),
    // Left out: TIPS, floating-rate notes, cash management bills, terms the app does not follow.
    row({ auction_date: '2026-10-09', original_security_term: '10-Year', bid_to_cover_ratio: '2.40', high_yield: '1.900', inflation_index_security: 'Yes' }),
    row({ auction_date: '2026-10-29', original_security_term: '2-Year', bid_to_cover_ratio: '3.10', high_yield: 'null', floating_rate: 'Yes' }),
    row({ auction_date: '2026-10-07', security_type: 'Bill', original_security_term: '13-Week', bid_to_cover_ratio: '3.00', high_investment_rate: '3.9', cash_management_bill_cmb: 'Yes' }),
    row({ auction_date: '2026-10-21', security_type: 'Bond', original_security_term: '20-Year', bid_to_cover_ratio: '2.50', high_yield: '4.600' }),
  ],
};

test('Fiscal Data text values: numbers read, "null" and junk give nothing', () => {
  assert.equal(fdNumber('2.31'), 2.31);
  assert.equal(fdNumber('42,000'), 42000);
  assert.equal(fdNumber('null'), undefined);
  assert.equal(fdNumber(''), undefined);
  assert.equal(fdNumber(undefined), undefined);
  assert.equal(fdNumber('n/a'), undefined);
});

test('the request asks for ten years of auctions, newest first, in one page, with no key', () => {
  const u = new URL(ustAuctionsUrl(new Date('2026-11-08T00:00:00Z')));
  assert.equal(u.host, 'api.fiscaldata.treasury.gov');
  assert.equal(u.searchParams.get('filter'), 'auction_date:gte:2016-11-01');
  assert.equal(u.searchParams.get('sort'), '-auction_date');
  assert.match(u.searchParams.get('fields')!, /bid_to_cover_ratio/);
  assert.ok(!/key/i.test(u.search));
});

test('only held, regular auctions of the followed terms are kept, oldest first, by original term', () => {
  const a = parseUstAuctions(reply)!;
  assert.deepEqual(
    a.map((x) => `${x.date} ${x.tenor}`),
    ['2026-08-12 10y', '2026-09-10 10y', '2026-10-06 13w', '2026-10-08 10y']
  );
  const reopen = a.find((x) => x.date === '2026-10-08')!;
  assert.equal(reopen.reopening, true);
  assert.equal(reopen.bidToCover, 2.31);
  assert.equal(reopen.highYieldPct, 4.112);
  assert.equal(reopen.offeringUsdBn, 42);
  assert.equal(reopen.indirectPct, 70);
  const bill = a.find((x) => x.tenor === '13w')!;
  assert.equal(bill.highYieldPct, 3.845, 'bills use the high investment rate');
  assert.equal(bill.indirectPct, undefined, 'no indirect share when not published');
  assert.equal(parseUstAuctions({ nope: 1 }), null);
  assert.deepEqual(parseUstAuctions({ data: [] }), []);
});

test('the latest auction of each term, against the average of the ones before it', () => {
  const pull = { pulledAt: '2026-11-08T12:00:00Z', auctions: parseUstAuctions(reply)! };
  const latest = latestUstAuctions(pull);
  assert.deepEqual(latest.map((x) => x.tenor), ['13w', '10y']);
  const ten = latest.find((x) => x.tenor === '10y')!;
  assert.equal(ten.priorAvgBidToCover, 2.58);
  assert.equal(ustDemandReading(ten), 'demand weaker than recent auctions');
  assert.equal(ustAuctionValue(ten), 'bid-to-cover 2.31, high yield 4.112%, indirect 70.0%');
  assert.equal(ustDemandReading(latest[0]), undefined, 'one auction: no comparison');
  assert.equal(ustAuctionSummary(pull)?.latest.length, 2);
  assert.equal(ustAuctionSummary(null), undefined);
  assert.equal(ustAuctionSummary({ pulledAt: 'x', auctions: [] }), undefined);
});

test('chartable series on the United States page only, Missing with a reason where there is nothing', () => {
  const pull = { pulledAt: '2026-11-08T12:00:00Z', auctions: parseUstAuctions(reply)! };
  assert.deepEqual(ustAuctionSeries('BRA', pull), []);
  const s = ustAuctionSeries('usa', pull);
  const btc = s.find((x) => x.id === 'ust_auction_btc_10y')!;
  assert.ok('points' in btc);
  if ('points' in btc) {
    assert.deepEqual(btc.points.map((p) => p.value), [2.61, 2.55, 2.31]);
    assert.equal(btc.freq, 'monthly');
  }
  const bill = s.find((x) => x.id === 'ust_auction_btc_13w')!;
  assert.ok('points' in bill && bill.freq === 'weekly');
  const none = s.find((x) => x.id === 'ust_auction_btc_30y')!;
  assert.ok('reason' in none && /No held auction/.test(none.reason));
  const notYet = ustAuctionSeries('USA', null);
  assert.ok(notYet.every((x) => 'reason' in x && /not answered yet/.test(x.reason)));
});
