import type { CouncilAssessmentRun, WatchlistItem } from '../types/council';
import { getSnapshotDataStatus } from './dataStatus';
import { formatPeriod } from './officialYields';
import { yieldSourceNote } from './watchlistYield';
import { upcomingOfficialEvents } from '../data/officialCalendar';
import {
  calendarSection,
  groupLines,
  pct,
  pts,
  row,
  sampleWarning,
  sourceTag,
  sourcesSection,
  when,
  type CountryBrief,
  type NoteSection,
} from './countryNotes';

/**
 * Banker's view of a sovereign issuer: can it issue, how much does it need, when to go,
 * and how it prices against peers. Same source-tag rules as the economist brief.
 * The debt maturity profile is a built-in sample for every country (no free feed), and is
 * labelled so.
 */

/** CDS bands used for the market-access reading. */
export function accessBand(cdsBps: number): { label: string; open: boolean } {
  if (cdsBps < 200) return { label: 'open, priced like a strong credit', open: true };
  if (cdsBps < 400) return { label: 'open at high-yield spreads', open: true };
  if (cdsBps < 1000) return { label: 'stressed: issuance possible but expensive', open: true };
  return { label: 'distressed: market access is likely closed', open: false };
}

const EVENT_SHORT: Record<string, string> = {
  MPC_DECISION: 'rate decision',
  CPI_RELEASE: 'CPI',
  INFLATION_REPORT: 'inflation report',
};

export function bankerBrief(run: CouncilAssessmentRun, peers: WatchlistItem[], now: Date = new Date()): CountryBrief {
  const open = run.openData;
  const imf = open.imfIndicators;
  const wb = open.worldBankIndicators;
  const mkt = open.monetaryAndMarket;
  const roll = open.debtRollover;
  const dsa = open.dsaAnalytics;
  const status = getSnapshotDataStatus(open);
  const band = accessBand(mkt.cds5YSpreadBps);
  const next12m = roll.buckets.slice(0, 4).reduce((a, b) => a + b.totalUsdBn, 0);
  const peak = roll.buckets.reduce((a, b) => (b.totalUsdBn > a.totalUsdBn ? b : a), roll.buckets[0]);
  const events = upcomingOfficialEvents([run.iso3], 60, now);

  // Distress signals, each a simple stated threshold.
  const signals: string[] = [];
  if (mkt.cds5YSpreadBps >= 1000) signals.push('5Y CDS above 1,000 bps');
  if (roll.greenspanGuidottiRatioPct < 100) signals.push('reserves below short-term external debt');
  if (wb.fxReservesMonthsImport < 3) signals.push('reserves under three months of imports');
  if (imf.debtToGdpPct > 90 && imf.debtToGdpForecast2027Pct > imf.debtToGdpPct) signals.push('debt above 90% of GDP and rising');
  if (dsa.fiscalConsolidationGapPct > 3) signals.push('a fiscal gap of more than 3 pts of GDP to stabilise debt');

  // Watchlist peers, highest 10Y yield first, with this issuer placed among them.
  const others = peers.filter((p) => p.iso3 !== run.iso3);
  const cheaperThan = others.filter((p) => p.yield10YPct < mkt.sovereign10YBondYieldPct).length;
  const mixedSources = new Set([...others.map((p) => p.yield10YSource || 'sample'), status.yieldSource]).size > 1;
  const self = { self: true, name: `${run.countryName} (this issuer)`, y: mkt.sovereign10YBondYieldPct, ...sourceTag(status, 'yield') };
  const peerRows = [
    self,
    ...others.map((p) => ({
      self: false,
      name: p.countryName,
      y: p.yield10YPct,
      source: yieldSourceNote(p).replace(/^Official/, 'official').replace(/^Sample$/, 'sample'),
      verified: p.yield10YSource === 'official',
    })),
  ].sort((a, b) => b.y - a.y);

  const j: string[] = [];
  j.push(`Market access is ${band.label} (5Y CDS ${Math.round(mkt.cds5YSpreadBps)} bps, 10Y yield ${pct(mkt.sovereign10YBondYieldPct, 2)}).`);
  j.push(
    `About $${next12m.toFixed(0)} bn falls due in the next 12 months against $${roll.liquidFxReservesUsdBn.toFixed(0)} bn of liquid reserves. The heaviest period is ${peak.periodLabel} ($${peak.totalUsdBn.toFixed(0)} bn).`
  );
  j.push(
    events.length
      ? `Avoid pricing around ${events
          .slice(0, 3)
          .map((e) => `${formatPeriod(e.date)} (${EVENT_SHORT[e.category] || e.title})`)
          .join(', ')}.`
      : 'No official rate decisions or data releases on file in the next 60 days.'
  );
  if (others.length) {
    j.push(
      `It pays more than ${cheaperThan} of ${others.length} watchlist peers on the 10-year${
        mixedSources ? ', though the yields compared mix official, estimated and sample values' : ''
      }.`
    );
  }
  j.push(
    signals.length
      ? `Signs of distress: ${signals.join('; ')}.`
      : 'No signs of distress on the simple tests (CDS, reserves, debt path, fiscal gap).'
  );

  return {
    headline: `${run.countryName}: market access ${band.open ? 'open' : 'likely closed'}, about $${next12m.toFixed(0)} bn due in 12 months, ${
      signals.length ? `${signals.length} sign${signals.length > 1 ? 's' : ''} of distress` : 'no signs of distress'
    }.`,
    judgements: j,
    sampleWarning: sampleWarning(status, run.countryName),
    groups: [
      {
        title: 'Market access',
        rows: [
          row(status, '10Y government yield', pct(mkt.sovereign10YBondYieldPct, 2), 'yield'),
          row(status, '5Y CDS', `${Math.round(mkt.cds5YSpreadBps)} bps`, 'market'),
          row(status, '2s10s curve slope', `${Math.round(open.yieldCurve.slope2s10sBps)} bps`, 'sample'),
          open.liveCreditRating
            ? { label: 'Credit rating', value: open.liveCreditRating, source: 'AI estimate', verified: false }
            : { label: 'Credit rating', value: 'not available', source: 'needs an AI key or a ratings feed', verified: false },
          row(status, 'Policy rate', pct(mkt.policyRatePct, 2), 'market'),
        ],
      },
      {
        title: 'Financing need',
        rows: [
          row(status, 'Due in next 12 months', `$${next12m.toFixed(1)} bn`, 'sample'),
          row(status, 'Heaviest period', `${peak.periodLabel}, $${peak.totalUsdBn.toFixed(1)} bn`, 'sample'),
          row(status, 'Average maturity', `${roll.weightedAvgMaturityYears.toFixed(1)} years`, 'sample'),
          row(status, 'Floating-rate share', pct(roll.floatingRateDebtSharePct, 0), 'sample'),
          row(status, 'Foreign holders', pct(roll.foreignHoldingsSharePct, 0), 'sample'),
          row(status, 'Liquid FX reserves', `$${roll.liquidFxReservesUsdBn.toFixed(0)} bn`, 'sample'),
          row(status, 'Debt / GDP', pct(imf.debtToGdpPct), 'imf'),
        ],
      },
      {
        title: 'Execution window, next 60 days',
        rows: events.length
          ? events.map((e) => ({ label: e.title, value: when(e), source: e.sourceName, verified: true }))
          : [{ label: 'Official events', value: 'none on file', source: 'official calendar', verified: false }],
      },
      {
        title: 'Peers by 10Y yield',
        rows: peerRows.map((p) => ({ label: p.name, value: pct(p.y, 2), source: p.source, verified: p.verified })),
      },
    ],
  };
}

/** Section ids and headings for the banker's issuer note, in order. */
export const BANKER_SECTIONS: Record<string, string> = {
  summary: 'Summary',
  access: 'Market access',
  need: 'Financing need',
  window: 'Execution window',
  peers: 'Pricing against peers',
  restructuring: 'Restructuring watch',
  calendar: 'Coming up',
  sources: 'Data and sources',
};

export function buildBankerSections(
  run: CouncilAssessmentRun,
  peers: WatchlistItem[],
  include: (id: string) => boolean,
  now: Date = new Date()
): NoteSection[] {
  const b = bankerBrief(run, peers, now);
  const byTitle = (t: string) => b.groups.find((g) => g.title.startsWith(t))!;
  const out: NoteSection[] = [];
  if (include('summary')) {
    out.push({
      id: 'summary',
      heading: BANKER_SECTIONS.summary,
      lines: [b.headline, ...(b.sampleWarning ? [`**Note:** ${b.sampleWarning}`] : []), ...b.judgements.map((x) => `- ${x}`)],
    });
  }
  const groups: Array<[string, string]> = [
    ['access', 'Market access'],
    ['need', 'Financing need'],
    ['window', 'Execution window'],
    ['peers', 'Peers by 10Y yield'],
  ];
  for (const [id, title] of groups) if (include(id)) out.push({ id, heading: BANKER_SECTIONS[id], lines: groupLines(byTitle(title)) });
  if (include('restructuring')) {
    const dsa = run.openData.dsaAnalytics;
    out.push({
      id: 'restructuring',
      heading: BANKER_SECTIONS.restructuring,
      lines: [
        b.judgements[b.judgements.length - 1],
        `- Interest rate minus growth: ${pts(dsa.rMinusGDifferentialPct)} (model, from figures above)`,
        `- Fiscal gap to stabilise debt: ${dsa.fiscalConsolidationGapPct.toFixed(1)} pts of GDP (model, from figures above)`,
        ...(run.openData.monetaryAndMarket.cds5YSpreadBps >= 400
          ? ['The Restructuring tab on the Country page has the NPV and collective action clause tools for this credit.']
          : []),
      ],
    });
  }
  if (include('calendar')) out.push(calendarSection(run, BANKER_SECTIONS.calendar, now));
  if (include('sources')) {
    out.push(sourcesSection(run, 'For discussion with the issuer or the deal team. Not an offer, a commitment to underwrite, or investment advice.'));
  }
  return out;
}
