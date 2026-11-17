/**
 * US Treasury auctions (plan G1, data plan F1): how much demand there is at each sale of US
 * government debt.
 *
 * Source: the US Treasury Fiscal Data API, "Treasury Securities Auctions Data" (auctions_query),
 * free and with no key. Fiscal Data's terms: the data are "free, without restriction, and
 * available to copy, adapt, redistribute, or otherwise use for non-commercial or commercial
 * purposes." TreasuryDirect asks robots not to read it, so it is not used.
 *
 * Every value arrives as text, and a figure not published (or not yet published, for an auction
 * announced but not held) is the word "null"; those auctions are skipped, never filled in.
 *
 * What the app reads, for the regular sales of bills, notes and bonds (inflation-protected
 * securities, floating-rate notes and cash management bills are left out, because their yields
 * are not comparable): the auction date, the original term (a reopened 10-year note counts as a
 * 10-year), bid-to-cover (dollars bid for each dollar sold), the high yield (bills: the high
 * investment rate, the bond-equivalent yield), the amount offered and accepted, and the share
 * that went to indirect bidders (mostly foreign official and investment buyers) when published.
 */

export const UST_AUCTION_SOURCE = 'US Treasury Fiscal Data (Treasury Securities Auctions Data)';
export const UST_AUCTION_HOST = 'api.fiscaldata.treasury.gov';
const ENDPOINT = `https://${UST_AUCTION_HOST}/services/api/fiscal_service/v1/accounting/od/auctions_query`;

const FIELDS = [
  'auction_date',
  'security_type',
  'original_security_term',
  'security_term',
  'reopening',
  'bid_to_cover_ratio',
  'high_yield',
  'high_investment_rate',
  'offering_amt',
  'total_accepted',
  'comp_accepted',
  'indirect_bidder_accepted',
  'inflation_index_security',
  'floating_rate',
  'cash_management_bill_cmb',
];

/** The regular terms the app follows, shortest first. `id` makes the series ids, ust_auction_btc_<id>. */
export const UST_TENORS: Array<{ id: string; term: string; kind: 'bill' | 'note' | 'bond'; label: string }> = [
  { id: '13w', term: '13-Week', kind: 'bill', label: '13-week bill' },
  { id: '26w', term: '26-Week', kind: 'bill', label: '26-week bill' },
  { id: '2y', term: '2-Year', kind: 'note', label: '2-year note' },
  { id: '5y', term: '5-Year', kind: 'note', label: '5-year note' },
  { id: '10y', term: '10-Year', kind: 'note', label: '10-year note' },
  { id: '30y', term: '30-Year', kind: 'bond', label: '30-year bond' },
];

/** Years of auctions asked for: enough for a chart and a test, small enough for one reply. */
export const UST_AUCTION_YEARS = 10;

/** One request: every regular field the app reads, auctions on or after `from`, newest first. */
export function ustAuctionsUrl(now: Date = new Date(), years = UST_AUCTION_YEARS): string {
  const from = new Date(Date.UTC(now.getUTCFullYear() - years, now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const q = new URLSearchParams({
    fields: FIELDS.join(','),
    filter: `auction_date:gte:${from}`,
    sort: '-auction_date',
    'page[size]': '10000',
  });
  return `${ENDPOINT}?${q.toString()}`;
}

export interface UstAuction {
  /** YYYY-MM-DD */
  date: string;
  /** UST_TENORS id. */
  tenor: string;
  reopening: boolean;
  bidToCover: number;
  /** High yield in percent (bills: high investment rate). */
  highYieldPct?: number;
  offeringUsdBn?: number;
  acceptedUsdBn?: number;
  /** Indirect bidders' share of the competitive amount accepted, percent, when published. */
  indirectPct?: number;
}

export interface UstAuctionPull {
  pulledAt: string;
  /** Oldest first, held auctions only. */
  auctions: UstAuction[];
  /** Auctions announced but not yet held (no bid-to-cover yet), soonest first. */
  announced?: UstAnnouncedAuction[];
}

export interface UstAnnouncedAuction {
  /** YYYY-MM-DD */
  date: string;
  tenor: string;
  reopening: boolean;
  offeringUsdBn?: number;
}

/**
 * Auctions in a Fiscal Data reply that are announced but not held yet: a followed regular term,
 * dated today or later, with no bid-to-cover published. Soonest first; [] for another shape.
 */
export function parseAnnouncedUstAuctions(json: unknown, today: string = new Date().toISOString().slice(0, 10)): UstAnnouncedAuction[] {
  const rows = (json as { data?: unknown })?.data;
  if (!Array.isArray(rows)) return [];
  const byTerm = new Map(UST_TENORS.map((t) => [t.term.toLowerCase(), t]));
  const out: UstAnnouncedAuction[] = [];
  for (const raw of rows) {
    const r = raw as Record<string, unknown>;
    const date = String(r.auction_date ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today) continue;
    if (yes(r.inflation_index_security) || yes(r.floating_rate) || yes(r.cash_management_bill_cmb)) continue;
    const kind = String(r.security_type ?? '').trim().toLowerCase();
    const tenor = byTerm.get(String(r.original_security_term || r.security_term || '').trim().toLowerCase());
    if (!tenor || tenor.kind !== kind) continue;
    if (fdNumber(r.bid_to_cover_ratio) !== undefined) continue;
    const offering = fdNumber(r.offering_amt);
    out.push({ date, tenor: tenor.id, reopening: yes(r.reopening), ...(offering !== undefined ? { offeringUsdBn: r2(offering / 1e9) } : {}) });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.tenor.localeCompare(b.tenor));
}

/** A Fiscal Data text value as a number; "null", empty and non-numbers give undefined. */
export function fdNumber(v: unknown): number | undefined {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  if (!s || s.toLowerCase() === 'null') return undefined;
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

const yes = (v: unknown) => String(v ?? '').trim().toLowerCase() === 'yes';
const r2 = (v: number) => Math.round(v * 100) / 100;

/**
 * The auctions in a Fiscal Data reply, oldest first. Kept: regular bills, notes and bonds of a
 * followed term that have been held (bid-to-cover published). Null for a reply of another shape.
 */
export function parseUstAuctions(json: unknown): UstAuction[] | null {
  const rows = (json as { data?: unknown })?.data;
  if (!Array.isArray(rows)) return null;
  const byTerm = new Map(UST_TENORS.map((t) => [t.term.toLowerCase(), t]));
  const out: UstAuction[] = [];
  for (const raw of rows) {
    const r = raw as Record<string, unknown>;
    const date = String(r.auction_date ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    if (yes(r.inflation_index_security) || yes(r.floating_rate) || yes(r.cash_management_bill_cmb)) continue;
    const kind = String(r.security_type ?? '').trim().toLowerCase();
    if (kind !== 'bill' && kind !== 'note' && kind !== 'bond') continue;
    const tenor = byTerm.get(String(r.original_security_term || r.security_term || '').trim().toLowerCase());
    if (!tenor || tenor.kind !== kind) continue;
    const btc = fdNumber(r.bid_to_cover_ratio);
    if (btc === undefined || btc <= 0) continue;
    const y = kind === 'bill' ? fdNumber(r.high_investment_rate) ?? fdNumber(r.high_yield) : fdNumber(r.high_yield);
    const offering = fdNumber(r.offering_amt);
    const accepted = fdNumber(r.total_accepted);
    const comp = fdNumber(r.comp_accepted);
    const indirect = fdNumber(r.indirect_bidder_accepted);
    out.push({
      date,
      tenor: tenor.id,
      reopening: yes(r.reopening),
      bidToCover: r2(btc),
      ...(y !== undefined ? { highYieldPct: Math.round(y * 1000) / 1000 } : {}),
      ...(offering !== undefined ? { offeringUsdBn: r2(offering / 1e9) } : {}),
      ...(accepted !== undefined ? { acceptedUsdBn: r2(accepted / 1e9) } : {}),
      ...(indirect !== undefined && comp ? { indirectPct: Math.round((1000 * indirect) / comp) / 10 } : {}),
    });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.tenor.localeCompare(b.tenor));
}

/** The latest held auction of each followed term, in UST_TENORS order, with the average bid-to-cover of the ones before it. */
export interface UstAuctionLatest extends UstAuction {
  label: string;
  /** Average bid-to-cover of up to the previous six auctions of the same term. */
  priorAvgBidToCover?: number;
}

export function latestUstAuctions(pull: UstAuctionPull | null | undefined): UstAuctionLatest[] {
  if (!pull?.auctions?.length) return [];
  const out: UstAuctionLatest[] = [];
  for (const t of UST_TENORS) {
    const all = pull.auctions.filter((a) => a.tenor === t.id);
    const last = all[all.length - 1];
    if (!last) continue;
    const prior = all.slice(-7, -1);
    const avg = prior.length ? r2(prior.reduce((s, a) => s + a.bidToCover, 0) / prior.length) : undefined;
    out.push({ ...last, label: t.label, ...(avg !== undefined ? { priorAvgBidToCover: avg } : {}) });
  }
  return out;
}

/** What the watchlist carries for the United States: the latest auctions, with the pull date. */
export interface UstAuctionSummary {
  pulledAt: string;
  latest: UstAuctionLatest[];
}

export function ustAuctionSummary(pull: UstAuctionPull | null | undefined): UstAuctionSummary | undefined {
  const latest = latestUstAuctions(pull);
  return pull && latest.length ? { pulledAt: pull.pulledAt, latest } : undefined;
}

/** One line for an auction: bid-to-cover, high yield and, when published, the indirect share. */
export function ustAuctionValue(a: UstAuctionLatest): string {
  const parts = [`bid-to-cover ${a.bidToCover.toFixed(2)}`];
  if (a.highYieldPct !== undefined) parts.push(`high yield ${a.highYieldPct.toFixed(3)}%`);
  if (a.indirectPct !== undefined) parts.push(`indirect ${a.indirectPct.toFixed(1)}%`);
  return parts.join(', ');
}

/** A plain reading of the latest bid-to-cover against the previous auctions of the same term. */
export function ustDemandReading(a: UstAuctionLatest): string | undefined {
  if (a.priorAvgBidToCover === undefined) return undefined;
  const diff = a.bidToCover - a.priorAvgBidToCover;
  if (Math.abs(diff) < 0.1) return 'demand in line with recent auctions';
  return diff > 0 ? 'demand stronger than recent auctions' : 'demand weaker than recent auctions';
}

type Point = { date: string; value: number };
type SeriesOut = { id: string; label: string; unit: string; freq: 'weekly' | 'monthly'; source: string; pulledAt: string; points: Point[]; about: string };
type MissingOut = { id: string; label: string; reason: string };

/** Chartable series for the United States page: bid-to-cover and high yield for each followed term. */
export function ustAuctionSeries(iso3: string, pull: UstAuctionPull | null | undefined): Array<SeriesOut | MissingOut> {
  if (String(iso3 || '').toUpperCase() !== 'USA') return [];
  const out: Array<SeriesOut | MissingOut> = [];
  for (const t of UST_TENORS) {
    const btcId = `ust_auction_btc_${t.id}`;
    const yId = `ust_auction_high_yield_${t.id}`;
    const btcLabel = `Treasury auction bid-to-cover, ${t.label}`;
    const yLabel = `Treasury auction high yield, ${t.label}`;
    if (!pull) {
      out.push({ id: btcId, label: btcLabel, reason: 'US Treasury Fiscal Data has not answered yet' }, { id: yId, label: yLabel, reason: 'US Treasury Fiscal Data has not answered yet' });
      continue;
    }
    const all = pull.auctions.filter((a) => a.tenor === t.id);
    if (!all.length) {
      out.push({ id: btcId, label: btcLabel, reason: 'No held auction of this term in the reply' }, { id: yId, label: yLabel, reason: 'No held auction of this term in the reply' });
      continue;
    }
    // Bills are sold every week, notes and bonds about once a month (reopenings included).
    const freq = t.kind === 'bill' ? ('weekly' as const) : ('monthly' as const);
    const btc = all.map((a) => ({ date: a.date, value: a.bidToCover }));
    const y = all.filter((a) => a.highYieldPct !== undefined).map((a) => ({ date: a.date, value: a.highYieldPct! }));
    out.push({
      id: btcId,
      label: btcLabel,
      unit: 'x',
      freq,
      source: UST_AUCTION_SOURCE,
      pulledAt: pull.pulledAt,
      points: btc,
      about: 'One point per auction, reopenings included: dollars bid for each dollar sold. Higher means more demand.',
    });
    if (y.length)
      out.push({
        id: yId,
        label: yLabel,
        unit: '%',
        freq,
        source: UST_AUCTION_SOURCE,
        pulledAt: pull.pulledAt,
        points: y,
        about: t.kind === 'bill' ? 'One point per auction: the high investment rate (bond-equivalent yield) the bill sold at.' : 'One point per auction, reopenings included: the highest yield accepted, which every winning bidder receives.',
      });
    else out.push({ id: yId, label: yLabel, reason: 'No high yield published for this term' });
  }
  return out;
}
