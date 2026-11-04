import type { WatchlistItem } from '../types/council';
import type { StagedTradeTicketSpec } from './nssYieldCurveAndCatalystEngine';
import { summariseBook, type Holding } from './holdings';
import { cdsSourceNote, yieldSourceNote } from './watchlistYield';
import { upcomingOfficialEvents } from '../data/officialCalendar';
import { when, type BriefGroup, type BriefRow, type CountryBrief, type NoteSection } from './countryNotes';

/**
 * Book-level briefs and reports for the portfolio manager (internal) and the private wealth
 * adviser (plain language for a client). They work on imported holdings, or on the watchlist
 * at equal weight when nothing is imported, and say which.
 *
 * Every judgement is a stated rule on the figures shown. Risk scores are the app's model;
 * CDS levels are sample values or AI estimates; 10Y yields carry their own source.
 */

export interface BookLine {
  iso3: string;
  countryName: string;
  item?: WatchlistItem;
  /** Share of the book, 0..1 (gross notional, or equal weight). */
  weight: number;
  /** Share of weight x risk score, 0..1. */
  riskShare: number;
  grossUsdMm?: number;
  netCreditUsdMm?: number;
  dv01UsdK?: number;
}

export interface BookView {
  fromHoldings: boolean;
  lines: BookLine[];
  grossUsdMm?: number;
  netCreditUsdMm?: number;
  dv01UsdK?: number;
  missingDuration?: number;
  /** Held countries the app has no risk data for. */
  uncovered: string[];
}

export function bookView(holdings: Holding[], riskLookup: WatchlistItem[], watchlist: WatchlistItem[]): BookView {
  if (holdings.length) {
    const b = summariseBook(holdings, riskLookup);
    return {
      fromHoldings: true,
      lines: b.rows,
      grossUsdMm: b.grossUsdMm,
      netCreditUsdMm: b.netCreditUsdMm,
      dv01UsdK: b.dv01UsdK,
      missingDuration: b.missingDuration,
      uncovered: b.uncovered,
    };
  }
  const n = watchlist.length || 1;
  const riskTotal = watchlist.reduce((a, i) => a + i.compositeRisk, 0) || 1;
  return {
    fromHoldings: false,
    lines: watchlist
      .map((i) => ({ iso3: i.iso3, countryName: i.countryName, item: i, weight: 1 / n, riskShare: i.compositeRisk / riskTotal }))
      .sort((a, b) => b.riskShare - a.riskShare),
    uncovered: [],
  };
}

/** Effective number of countries: 1 / sum of squared weights (equal weights give the count). */
export function effectiveNames(lines: BookLine[]): number {
  const s = lines.reduce((a, l) => a + l.weight * l.weight, 0);
  return s > 0 ? 1 / s : 0;
}

/** 5Y CDS bands used across the app (see bankerNote accessBand). */
export function cdsBand(cds: number): 'investment grade-like' | 'high yield' | 'stressed' | 'distressed' {
  return cds < 200 ? 'investment grade-like' : cds < 400 ? 'high yield' : cds < 1000 ? 'stressed' : 'distressed';
}

const pct0 = (v: number) => `${(v * 100).toFixed(0)}%`;
const usd = (v: number) => `$${v.toLocaleString(undefined, { maximumFractionDigits: v >= 100 ? 0 : 1 })}mm`;
const signedUsd = (v: number) => (v < 0 ? `−${usd(-v)}` : usd(v));
const CDS_SOURCE = 'sample or AI estimate';
const cdsNote = (i: WatchlistItem) => (i.cds5YSource === 'own' ? cdsSourceNote(i).replace(/^Your/, 'your') : CDS_SOURCE);
const MODEL = 'model';

interface BookFacts {
  covered: BookLine[];
  wCovered: number;
  avg: (f: (i: WatchlistItem) => number) => number;
  top: BookLine | undefined;
  top3Weight: number;
  eff: number;
  overweightRisk: BookLine[];
  stressedWeight: number;
  officialYieldWeight: number;
  ownCdsWeight: number;
  events: Array<{ date: string; daysUntil: number; title: string; iso3: string; sourceName: string; weight: number }>;
}

function facts(v: BookView, now: Date): BookFacts {
  const covered = v.lines.filter((l) => l.item);
  const wCovered = covered.reduce((a, l) => a + l.weight, 0) || 1;
  const avg = (f: (i: WatchlistItem) => number) => covered.reduce((a, l) => a + f(l.item!) * (l.weight / wCovered), 0);
  const byWeight = [...v.lines].sort((a, b) => b.weight - a.weight);
  const weightOf = new Map(v.lines.map((l) => [l.iso3, l.weight]));
  return {
    covered,
    wCovered,
    avg,
    top: byWeight[0],
    top3Weight: byWeight.slice(0, 3).reduce((a, l) => a + l.weight, 0),
    eff: effectiveNames(v.lines),
    // A country carries much more of the risk than of the money.
    overweightRisk: covered.filter((l) => l.riskShare > l.weight * 1.3 && l.riskShare >= 0.1),
    stressedWeight: covered.filter((l) => l.item!.cds5YBps >= 400).reduce((a, l) => a + l.weight, 0),
    officialYieldWeight: covered.filter((l) => l.item!.yield10YSource === 'official').reduce((a, l) => a + l.weight, 0),
    ownCdsWeight: covered.filter((l) => l.item!.cds5YSource === 'own').reduce((a, l) => a + l.weight, 0),
    events: upcomingOfficialEvents(
      v.lines.map((l) => l.iso3),
      30,
      now
    ).map((e) => ({ ...e, weight: weightOf.get(e.iso3) ?? 0 })),
  };
}

const basisNote = (v: BookView) =>
  v.fromHoldings ? 'Weights are your imported holdings by gross notional.' : 'No holdings imported: this is your watchlist at equal weight.';

/* ------------------------------------------------------------------------------------------
 * Portfolio manager: the book as a whole.
 * ------------------------------------------------------------------------------------------ */

export function pmBookBrief(v: BookView, tickets: StagedTradeTicketSpec[], now: Date = new Date()): CountryBrief {
  if (!v.lines.length) return { headline: 'No holdings and an empty watchlist.', judgements: [], groups: [] };
  const f = facts(v, now);
  const top3 = v.lines.slice(0, 3).map((l) => `${l.countryName} ${pct0(l.riskShare)}`);
  const j: string[] = [];

  j.push(
    f.top && f.top.weight > 0.25
      ? `Concentrated: ${f.top.countryName} is ${pct0(f.top.weight)} of the book, and the three largest positions are ${pct0(f.top3Weight)}.`
      : `Spread out: the weights are equivalent to about ${f.eff.toFixed(1)} equal positions, and the largest is ${f.top ? `${f.top.countryName} at ${pct0(f.top.weight)}` : 'none'}.`
  );
  if (f.overweightRisk.length)
    j.push(
      `Risk is heavier than money in ${f.overweightRisk
        .map((l) => `${l.countryName} (${pct0(l.weight)} of the book, ${pct0(l.riskShare)} of the risk)`)
        .join(', ')}.`
    );
  j.push(
    f.stressedWeight > 0
      ? `${pct0(f.stressedWeight / f.wCovered)} of the book is in countries with 5Y CDS at 400 bps or wider (stressed or distressed).`
      : 'No position is in a country with 5Y CDS at 400 bps or wider.'
  );
  if (f.events.length) {
    const soon = f.events.filter((e) => e.daysUntil <= 14);
    const affected = new Set(soon.map((e) => e.iso3));
    const w = v.lines.filter((l) => affected.has(l.iso3)).reduce((a, l) => a + l.weight, 0);
    j.push(
      soon.length
        ? `${soon.length} official ${soon.length === 1 ? 'event' : 'events'} in the next 14 days affect countries making up ${pct0(w)} of the book; the first is ${soon[0].title} (${when(soon[0])}).`
        : `No official events in the next 14 days; the next is ${f.events[0].title} (${when(f.events[0])}).`
    );
  }
  if (v.fromHoldings && v.dv01UsdK !== undefined)
    j.push(`A 10 bp widening in all spreads would cost about ${usd(Math.abs(v.dv01UsdK * 10) / 1000)} on the credit positions with a duration.`);
  if (tickets.length) {
    const names = [...new Set(tickets.map((t) => t.countryName))];
    j.push(`${tickets.length} staged trade ${tickets.length === 1 ? 'idea' : 'ideas'}, in ${names.join(', ')}; they are not in the weights above until booked.`);
  }
  if (v.uncovered.length) j.push(`No risk data for ${v.uncovered.join(', ')}: these count in notional but not in the risk shares.`);

  const book: BriefRow[] = [
    { label: 'Basis', value: v.fromHoldings ? 'Your holdings' : 'Watchlist, equal weight', source: basisNote(v), verified: false },
    ...(v.fromHoldings
      ? [
          { label: 'Gross notional', value: usd(v.grossUsdMm ?? 0), source: 'your holdings', verified: false },
          { label: 'Net credit exposure', value: signedUsd(v.netCreditUsdMm ?? 0), source: 'your holdings', verified: false },
          {
            label: 'Credit DV01',
            value: `${(v.dv01UsdK ?? 0) < 0 ? '−' : ''}$${Math.abs(v.dv01UsdK ?? 0).toFixed(1)}k per bp`,
            source: v.missingDuration ? `your holdings; ${v.missingDuration} without duration left out` : 'your holdings',
            verified: false,
          },
        ]
      : []),
    { label: 'Effective number of countries', value: f.eff.toFixed(1), source: 'from the weights', verified: false },
    { label: 'Three largest positions', value: pct0(f.top3Weight), source: 'share of the book', verified: false },
    {
      label: 'Weighted 5Y CDS',
      value: `${f.avg((i) => i.cds5YBps).toFixed(0)} bps`,
      source: f.ownCdsWeight > 0 ? `${pct0(f.ownCdsWeight / f.wCovered)} of weight on your own CDS data, rest ${CDS_SOURCE}` : CDS_SOURCE,
      verified: false,
    },
    { label: 'Weighted 10Y yield', value: `${f.avg((i) => i.yield10YPct).toFixed(2)}%`, source: `${pct0(f.officialYieldWeight / f.wCovered)} of weight on official yields`, verified: false },
    { label: 'Weighted risk score', value: f.avg((i) => i.compositeRisk).toFixed(2), source: MODEL, verified: false },
  ];

  // The Portfolio page already lists each country's weight, risk share and the staged ideas,
  // so the brief shows the book-level figures and the calendar; the review covers the rest.
  const groups: BriefGroup[] = [
    { title: 'The book', rows: book },
    {
      title: 'Next 30 days',
      rows: f.events.length
        ? f.events.slice(0, 6).map((e) => ({ label: e.title, value: when(e), source: `${pct0(e.weight)} of book · ${e.sourceName}`, verified: true }))
        : [{ label: 'Official events', value: 'None on file', source: 'official calendar', verified: false }],
    },
  ];

  const sampleShare = f.covered.filter((l) => !l.item!.dataMode || l.item!.dataMode === 'sample' || l.item!.dataMode === 'unverified').reduce((a, l) => a + l.weight, 0) / f.wCovered;
  return {
    headline: `${v.fromHoldings ? 'Your book' : 'Your watchlist'}: ${v.lines.length} ${v.lines.length === 1 ? 'country' : 'countries'}. Largest shares of risk: ${top3.join('; ')}.`,
    judgements: j,
    groups,
    sampleWarning:
      sampleShare > 0.5
        ? `Risk figures for ${pct0(sampleShare)} of the book are sample values, not live data. Sync the watchlist before relying on them.`
        : undefined,
  };
}

export const BOOK_SECTIONS: Record<string, string> = {
  summary: 'Summary',
  concentration: 'Concentration',
  risk: 'Where the risk sits',
  events: 'Next 30 days',
  trades: 'Staged trade ideas',
  method: 'Method and sources',
};

export function buildBookSections(
  v: BookView,
  tickets: StagedTradeTicketSpec[],
  include: (id: string) => boolean,
  now: Date = new Date()
): NoteSection[] {
  const brief = pmBookBrief(v, tickets, now);
  const f = facts(v, now);
  const out: NoteSection[] = [];
  const add = (id: string, lines: string[]) => include(id) && out.push({ id, heading: BOOK_SECTIONS[id], lines });

  add('summary', [brief.headline, ...(brief.sampleWarning ? [brief.sampleWarning] : []), ...brief.judgements.map((x) => `- ${x}`)]);
  add('concentration', [
    basisNote(v),
    `- Largest position: ${f.top ? `${f.top.countryName}, ${pct0(f.top.weight)}` : 'none'}.`,
    `- Three largest positions: ${pct0(f.top3Weight)} of the book.`,
    `- Effective number of countries: ${f.eff.toFixed(1)} (1 / sum of squared weights).`,
    ...(v.fromHoldings
      ? [`- Gross ${usd(v.grossUsdMm ?? 0)}, net credit ${signedUsd(v.netCreditUsdMm ?? 0)}, credit DV01 $${(v.dv01UsdK ?? 0).toFixed(1)}k per bp.`]
      : []),
  ]);
  add(
    'risk',
    v.lines.map((l) =>
      l.item
        ? `- ${l.countryName}: ${pct0(l.weight)} of the book, ${pct0(l.riskShare)} of the risk. Risk score ${l.item.compositeRisk.toFixed(2)} (model), 5Y CDS ${Math.round(l.item.cds5YBps)} bps (${cdsNote(l.item)}, ${cdsBand(l.item.cds5YBps)}), 10Y ${l.item.yield10YPct.toFixed(2)}% (${yieldSourceNote(l.item)}).`
        : `- ${l.countryName}: ${pct0(l.weight)} of the book, no risk data.`
    )
  );
  add(
    'events',
    f.events.length
      ? f.events.map((e) => `- ${e.date}: ${e.title} (${pct0(e.weight)} of the book; source: ${e.sourceName})`)
      : ['No official events on file for these countries in the next 30 days.']
  );
  add(
    'trades',
    tickets.length
      ? tickets.map((t) => `- **${t.strategyTitle}** (${t.countryName}). Entry ${t.entrySpreadOrYieldBps} bps, target ${t.targetSpreadOrYieldBps}, stop ${t.stopLossSpreadOrYieldBps}; conviction ${t.convictionScore0To100}/100.`)
      : ['No staged trade tickets.']
  );
  add('method', [
    'Share of risk = weight × the country’s composite risk score, as a share of the book total. The risk score is the app’s model, not a rating.',
    'CDS bands: under 200 bps investment grade-like, 200 to 400 high yield, 400 to 1,000 stressed, 1,000 and over distressed.',
    'CDS levels are sample values or AI estimates; each 10Y yield names its source. Official dates come from the central bank and statistics calendars on file.',
    'Model output for discussion. Not investment advice, and not validated for client use.',
  ]);
  return out;
}

/* ------------------------------------------------------------------------------------------
 * Private wealth: the client's portfolio in plain language. No trade levels, scores or DV01.
 * ------------------------------------------------------------------------------------------ */

const plainRisk = (i: WatchlistItem) =>
  i.alertStatus === 'CRITICAL' ? 'higher risk' : i.alertStatus === 'ELEVATED' ? 'moderate risk' : 'lower risk';

export function clientBrief(v: BookView, now: Date = new Date()): CountryBrief {
  if (!v.lines.length) return { headline: 'No holdings to describe yet.', judgements: [], groups: [] };
  const f = facts(v, now);
  const higher = f.covered.filter((l) => l.item!.alertStatus === 'CRITICAL');
  const higherW = higher.reduce((a, l) => a + l.weight, 0);
  const j: string[] = [];
  j.push(
    f.top && f.top.weight > 0.25
      ? `A large part of the portfolio, about ${pct0(f.top.weight)}, is linked to one country, ${f.top.countryName}. Spreading this more widely would reduce the effect of bad news there.`
      : `The portfolio is spread across ${v.lines.length} countries; the largest, ${f.top?.countryName}, is about ${pct0(f.top?.weight ?? 0)}.`
  );
  j.push(
    higher.length
      ? `About ${pct0(higherW)} is in ${higher.map((l) => l.countryName).join(', ')}, which we currently rate as higher risk.`
      : 'None of the holdings is in a country we currently rate as higher risk.'
  );
  if (f.stressedWeight > 0)
    j.push(`Markets charge ${f.covered.filter((l) => l.item!.cds5YBps >= 400).map((l) => l.countryName).join(', ')} a lot more to borrow than most governments, which is a sign of strain.`);
  const soon = f.events.filter((e) => e.daysUntil <= 30);
  if (soon.length) j.push(`There ${soon.length === 1 ? 'is one official date' : `are ${soon.length} official dates`} in the next month that could move prices; the first is ${soon[0].title} (${when(soon[0])}).`);

  return {
    headline: `${v.fromHoldings ? 'The client’s portfolio' : 'The watchlist (no client holdings imported)'}: ${v.lines.length} ${v.lines.length === 1 ? 'country' : 'countries'}, ${pct0(higherW)} in higher-risk countries.`,
    judgements: j,
    groups: [
      {
        title: 'Holdings in plain terms',
        rows: [...v.lines]
          .sort((a, b) => b.weight - a.weight)
          .slice(0, 8)
          .map((l) => ({
            label: l.countryName,
            value: `${pct0(l.weight)} of the portfolio`,
            source: l.item ? `${plainRisk(l.item)} (model)` : 'no risk data',
            verified: false,
          })),
      },
      {
        title: 'Dates to watch',
        rows: soon.length
          ? soon.slice(0, 6).map((e) => ({ label: e.title, value: when(e), source: e.sourceName, verified: true }))
          : [{ label: 'Official dates', value: 'None in the next month', source: 'official calendar', verified: false }],
      },
    ],
    sampleWarning: f.covered.some((l) => !l.item!.dataMode || l.item!.dataMode === 'sample')
      ? 'Some risk figures are sample values, not live data. Check them before sharing anything with a client.'
      : undefined,
  };
}

export const CLIENT_REVIEW_SECTIONS: Record<string, string> = {
  summary: 'Summary',
  holdings: 'What you hold',
  risks: 'What could go wrong',
  dates: 'Dates to watch',
  important: 'Important information',
};

export function buildClientReviewSections(v: BookView, include: (id: string) => boolean, now: Date = new Date()): NoteSection[] {
  const brief = clientBrief(v, now);
  const f = facts(v, now);
  const out: NoteSection[] = [];
  const add = (id: string, lines: string[]) => include(id) && out.push({ id, heading: CLIENT_REVIEW_SECTIONS[id], lines });

  add('summary', [...brief.judgements]);
  add('holdings', [
    ...[...v.lines]
      .sort((a, b) => b.weight - a.weight)
      .map((l) => `- ${l.countryName}: about ${pct0(l.weight)} of your emerging market holdings${l.item ? `, ${plainRisk(l.item)}` : ''}.`),
    ...(v.fromHoldings ? [] : ['(Draft based on the adviser’s watchlist; import the client’s holdings for their real weights.)']),
  ]);
  const higher = f.covered.filter((l) => l.item!.alertStatus !== 'STABLE').sort((a, b) => b.riskShare - a.riskShare);
  add(
    'risks',
    higher.length
      ? [
          'Bond prices fall when investors worry about a government’s finances or when interest rates rise. Emerging market bonds can also be hard to sell quickly in a stressed market, and currency moves can add to losses.',
          ...higher.slice(0, 4).map((l) => `- ${l.countryName}: ${plainRisk(l.item!)}.${l.item!.cds5YBps >= 400 ? ' Markets already price a real chance of difficulty here.' : ''}`),
        ]
      : ['All holdings are currently rated lower risk. Bond prices can still fall when interest rates rise or when markets are stressed.']
  );
  add(
    'dates',
    f.events.length ? f.events.slice(0, 6).map((e) => `- ${when(e)}: ${e.title}`) : ['No scheduled official dates for these countries in the next month.']
  );
  add('important', [
    'Risk levels are our own model, not credit ratings. Some figures are sample or estimated values.',
    'This note is for discussion with your adviser. It is not a personal recommendation to buy or sell, and the value of investments can go down as well as up.',
  ]);
  return out;
}
