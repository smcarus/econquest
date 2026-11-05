/**
 * No built-in figures (Sam, 2026-11-04): a figure is shown only when a live feed, an official
 * series or your own data filled it. AI web-search estimates do not count either (Sam, 23:27Z). Everything else is left out, and the
 * screen says which source is missing and whether it needs setting up or just did not answer.
 */
import type { LiveWatchlistItem, WatchlistItem } from '../types/council';
import { FRED_10Y_SERIES } from './officialYields';
import { CBPOL_AREA, CBPOL_NOT_COVERED } from './bisPolicyRates';

export type FigureKey = 'risk' | 'cds' | 'yield' | 'debt' | 'reserves' | 'cpi' | 'policy';

export interface MissingReason {
  /** 'setup': a key, file or account is needed. 'unreachable': a free feed did not answer. */
  kind: 'setup' | 'unreachable';
  /** A few words for under the dash. */
  short: string;
  /** What to do, in a sentence. */
  help: string;
}

export const FIGURE_LABEL: Record<FigureKey, string> = {
  risk: 'Risk score',
  cds: '5Y CDS',
  yield: '10Y yield',
  debt: 'Debt/GDP',
  reserves: 'Reserves',
  cpi: 'Inflation',
  policy: 'Policy rate',
};

/** Countries with a free official 10Y series wired in (Turkey needs its own EVDS key). */
export function hasFreeOfficialYield(iso3: string): boolean {
  return iso3 === 'BRA' || Boolean(FRED_10Y_SERIES[iso3]);
}

export function missingReason(key: FigureKey, iso3: string): MissingReason {
  switch (key) {
    case 'risk':
      return {
        kind: 'unreachable',
        short: 'Needs live inputs',
        help: 'The risk score is shown only when its IMF, World Bank and GDELT inputs are live. Press Sync, or check the connection.',
      };
    case 'cds':
      return {
        kind: 'setup',
        short: 'Needs setup',
        help: 'No free CDS source exists. Connect your own licensed CDS in .env: CDS_FEED=csv with CDS_CSV_PATH, or CDS_FEED=lseg.',
      };
    case 'yield':
      if (iso3 === 'TUR')
        return { kind: 'setup', short: 'Needs EVDS key', help: 'Set EVDS_API_KEY (free from the central bank of Turkey) in .env.' };
      if (hasFreeOfficialYield(iso3))
        return { kind: 'unreachable', short: 'Feed did not answer', help: 'The official yield feed did not answer. Press Sync, or set FRED_API_KEY in .env for a steadier connection.' };
      return { kind: 'setup', short: 'No source yet', help: 'No free official 10Y series is wired in for this country. Upload a yields file with its official figures.' };
    case 'debt':
      return { kind: 'unreachable', short: 'IMF did not answer', help: 'The IMF feed (free, no key) did not answer. Press Sync, or check the connection.' };
    case 'cpi':
      return { kind: 'unreachable', short: 'IMF did not answer', help: 'The IMF feed (free, no key) did not answer. Press Sync, or check the connection.' };
    case 'reserves':
      return { kind: 'unreachable', short: 'World Bank did not answer', help: 'The World Bank feed (free, no key) did not answer. Press Sync, or check the connection.' };
    case 'policy':
      if (!CBPOL_AREA[iso3] || CBPOL_NOT_COVERED.has(iso3))
        return { kind: 'setup', short: 'Not in BIS policy rates', help: 'The BIS central bank policy rates dataset has no series for this country. Add your own figure through a data connector to fill it.' };
      return { kind: 'unreachable', short: 'BIS did not answer', help: 'The BIS policy rates feed (free, no key) did not answer. Press Sync, or check the connection under Tools > Data connections.' };
  }
}

/** Whether each figure on a row came from a real source. */
export function hasFigure(it: WatchlistItem | LiveWatchlistItem, key: FigureKey): boolean {
  switch (key) {
    case 'risk':
      return it.riskSource === 'live';
    case 'cds':
      return it.cds5YSource === 'own';
    case 'yield':
      return it.yield10YSource === 'official' || it.yield10YSource === 'uploaded';
    case 'debt':
      return it.debtSource === 'live';
    case 'reserves':
      return it.reservesSource === 'live';
    case 'cpi':
      return it.cpiSource === 'live' || it.cpiSource === 'oecd';
    case 'policy':
      // Only the BIS feed counts; an AI estimate or the sample does not.
      return it.policyRateSource === 'bis';
  }
}

/** The row with every built-in figure removed. Rows saved before sources were recorded lose all of them. */
export function toLive(it: WatchlistItem | LiveWatchlistItem): LiveWatchlistItem {
  const out: LiveWatchlistItem = { ...it };
  if (!hasFigure(it, 'risk')) {
    delete out.compositeRisk;
    delete out.geopoliticalRisk;
    delete out.sovereignRisk;
    delete out.macroRisk;
    delete out.alertStatus;
  }
  if (!hasFigure(it, 'cds')) {
    delete out.cds5YBps;
    delete out.cds5YDate;
    delete out.cds5YProvider;
  }
  if (!hasFigure(it, 'yield')) {
    delete out.yield10YPct;
    delete out.yield10YPeriod;
    delete out.yield10YFrequency;
  }
  if (!hasFigure(it, 'debt')) delete out.debtToGdpPct;
  if (!hasFigure(it, 'reserves')) delete out.fxReservesMonths;
  if (!hasFigure(it, 'cpi')) delete out.cpiInflationPct;
  if (!hasFigure(it, 'policy')) {
    delete out.policyRatePct;
    delete out.policyRateDate;
    delete out.policyRateBank;
    delete out.policyRateStale;
    delete out.policyRateChange12mPts;
    delete out.policyRateLastMove;
  }
  return out;
}

export const MISSING_KEYS: FigureKey[] = ['risk', 'cds', 'yield', 'debt', 'reserves', 'cpi', 'policy'];

/** For a summary line: which figures are missing on how many rows, and the most useful fix. */
export function missingSummary(items: Array<WatchlistItem | LiveWatchlistItem>): Array<{ key: FigureKey; count: number; reason: MissingReason }> {
  return MISSING_KEYS.map((key) => {
    const rows = items.filter((it) => !hasFigure(it, key));
    // Every row has this figure (a feed filled it for all of them): nothing to explain.
    if (!rows.length) return null;
    // Prefer the setup reason when any row needs setup: that is the one the user can act on.
    const reasons = rows.map((it) => ({ it, r: missingReason(key, it.iso3) }));
    const first = (reasons.find((x) => x.r.kind === 'setup') || reasons[0]).r;
    // Different countries can need different fixes (Turkey's EVDS key, Egypt's missing series).
    const helps = [...new Set(reasons.map((x) => x.r.help))];
    const help =
      helps.length > 1
        ? helps.map((h) => `${reasons.filter((x) => x.r.help === h).map((x) => x.it.countryName).join(', ')}: ${h}`).join(' ')
        : first.help;
    return { key, count: rows.length, reason: { ...first, help } };
  }).filter((r): r is { key: FigureKey; count: number; reason: MissingReason } => r !== null);
}
