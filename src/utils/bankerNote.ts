import type { CouncilAssessmentRun, LiveWatchlistItem } from '../types/council';
import {
  chinaSource,
  chinaValue,
  COMMON_FRAMEWORK_AS_OF,
  COMMON_FRAMEWORK_SOURCE,
  DSA_NOT_READ,
  dsaSource,
  dsaValue,
  DSSI_NOT_READ,
  DSSI_SOURCE,
  licDebtReading,
  type LicDebtReading,
} from './lowIncomeDebt';
import { toLive } from './liveFigures';
import { getSnapshotDataStatus } from './dataStatus';
import { formatPeriod } from './officialYields';
import { yieldSourceNote } from './watchlistYield';
import { upcomingOfficialEvents } from '../data/officialCalendar';
import { quarterLabel } from './debtSchedule';
import { UST_AUCTION_SOURCE, ustAuctionValue, ustDemandReading } from './treasuryAuctions';
import {
  calendarSection,
  joinMeaning,
  MEANS,
  groupLines,
  pct,
  pts,
  liveRow,
  missingNote,
  noSourceRow,
  missingRow,
  type BriefRow,
  sourcesSection,
  when,
  type CountryBrief,
  type NoteSection,
} from './countryNotes';

/**
 * Banker's view of a sovereign issuer: can it issue, how much does it need, when to go,
 * and how it prices against peers. Same source-tag rules as the economist brief.
 * Government external debt falling due comes from QEDS (quarterly schedule) and IDS (yearly
 * projections) when those answered, and government debt securities outstanding from the BIS
 * (international markets, with what falls due within a year, and all markets); the full maturity profile, domestic debt included, is a
 * built-in sample for every country and is labelled so.
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
  GDP_RELEASE: 'GDP',
  INFLATION_REPORT: 'inflation report',
};

export function bankerBrief(run: CouncilAssessmentRun, peersIn: LiveWatchlistItem[], now: Date = new Date()): CountryBrief {
  const peers = peersIn.map(toLive);
  const open = run.openData;
  const status = getSnapshotDataStatus(open);
  const L = status.live;
  const cds = L('market.cds5YSpreadBps');
  const y10 = L('market.sovereign10YBondYieldPct');
  const res = L('wb.fxReservesMonthsImport');
  const debt = L('imf.debtToGdpPct');
  const debt27 = L('imf.debtToGdpForecast2027Pct');
  const band = cds !== undefined ? accessBand(cds) : undefined;
  const events = upcomingOfficialEvents([run.iso3], 60, now);
  const ds = open.debtSchedule;
  // United States only: the latest Treasury auctions, carried on its watchlist row from the daily download.
  const ustAuctions = peersIn.find((p) => p.iso3 === run.iso3)?.ustAuctions;
  const qeds = ds?.qeds;
  const qedsPeak = qeds ? qeds.buckets.reduce((a, b) => (b.usdBn > a.usdBn ? b : a), qeds.buckets[0]) : undefined;
  const thisYear = now.getUTCFullYear();
  const idsYear =
    ds?.ids?.years.find((y) => y.year > thisYear && y.debtServiceUsdBn !== undefined) ||
    ds?.ids?.years.find((y) => y.debtServiceUsdBn !== undefined);
  const QEDS_SRC = qeds ? `QEDS (World Bank/IMF), as of end of ${quarterLabel(qeds.asOf)}` : '';
  const IDS_SRC = 'World Bank IDS projection';
  const bis = ds?.bis;
  const bisSrc = (q: string) => `BIS debt securities, end of ${quarterLabel(q)}`;
  const bn = (v: number) => (v >= 100 ? `$${Math.round(v).toLocaleString('en-US')} bn` : `$${v.toFixed(1)} bn`);
  const fxShare =
    bis?.intl?.foreignCcyUsdBn !== undefined && bis.intl.outstandingUsdBn > 0
      ? Math.round((bis.intl.foreignCcyUsdBn / bis.intl.outstandingUsdBn) * 100)
      : undefined;
  const bisRows = [
    ...(bis?.intl?.dueWithin1yUsdBn !== undefined
      ? [{ label: 'Government bonds due within a year, international markets', value: bn(bis.intl.dueWithin1yUsdBn), source: bisSrc(bis.intl.asOf), verified: true }]
      : []),
    ...(bis?.intl
      ? [
          {
            label: 'Government bonds outstanding, international markets',
            value: `${bn(bis.intl.outstandingUsdBn)}${fxShare !== undefined ? ` (${fxShare}% foreign currency)` : ''}`,
            source: bisSrc(bis.intl.asOf),
            verified: true,
          },
        ]
      : []),
    ...(bis?.all
      ? [
          {
            label: 'Government debt securities, all markets incl. domestic',
            value: `${bn(bis.all.outstandingUsdBn)} (${bis.all.valuation} value)`,
            source: bisSrc(bis.all.asOf),
            verified: true,
          },
        ]
      : []),
  ];

  // Distress signals, each a simple stated threshold.
  // Only tests whose figures are live are run; the rest are named as not checked.
  const signals: string[] = [];
  const unchecked: string[] = [];
  if (cds !== undefined) { if (cds >= 1000) signals.push('5Y CDS above 1,000 bps'); } else unchecked.push('CDS');
  if (res !== undefined) { if (res < 3) signals.push('reserves under three months of imports'); } else unchecked.push('reserves');
  if (debt !== undefined && debt27 !== undefined) { if (debt > 90 && debt27 > debt) signals.push('debt above 90% of GDP and rising'); } else unchecked.push('debt path');

  // Watchlist peers, highest 10Y yield first, with this issuer placed among them.
  // Only peers with a real 10Y yield are compared.
  const others = peers.filter((p): p is LiveWatchlistItem & { yield10YPct: number } => p.iso3 !== run.iso3 && p.yield10YPct !== undefined);
  const cheaperThan = y10 !== undefined ? others.filter((p) => p.yield10YPct < y10).length : 0;
  const peerRows = [
    ...(y10 !== undefined && status.officialYield
      ? [{ name: `${run.countryName} (this issuer)`, y: y10, source: `official, ${formatPeriod(status.officialYield.period)}`, verified: true }]
      : []),
    ...others.map((p) => ({ name: p.countryName, y: p.yield10YPct, source: yieldSourceNote(p).replace(/^Official/, 'official'), verified: true })),
  ].sort((a, b) => b.y - a.y);

  const j: string[] = [];
  if (band && cds !== undefined)
    j.push(
      `Market access is ${band.label} (5Y CDS ${Math.round(cds)} bps${y10 !== undefined ? `, 10Y yield ${pct(y10, 2)}` : ''}).${MEANS}CDS is what markets charge to insure against this government not paying; ${
        band.open ? 'at this level it can usually still sell new bonds, at a cost that rises with the CDS price.' : 'at this level markets are pricing a real chance of default, and new bonds are hard to sell at any bearable price.'
      }`
    );
  else if (y10 !== undefined) j.push(`The 10Y yield is ${pct(y10, 2)}. Market access is not judged without a CDS figure (the market price of insuring against default).`);
  if (qeds && qedsPeak) {
    j.push(
      `Government external debt due in the 12 months from the end of ${quarterLabel(qeds.asOf)} is $${qeds.next12mUsdBn.toFixed(1)} bn (QEDS); the heaviest quarter is ${
        qedsPeak.label === 'Next 3 months' ? 'the first three months' : `${qedsPeak.label} ahead`
      } ($${qedsPeak.usdBn.toFixed(1)} bn).${MEANS}This is what must be repaid to foreign lenders, or borrowed again, over the year.`
    );
  }
  if (idsYear?.debtServiceUsdBn !== undefined)
    j.push(
      `The World Bank projects $${idsYear.debtServiceUsdBn.toFixed(1)} bn of public external debt service in ${idsYear.year}${
        idsYear.principalUsdBn !== undefined ? `, of which $${idsYear.principalUsdBn.toFixed(1)} bn is principal` : ''
      }.`
    );
  if (bis?.intl) {
    const parts = [
      bis.intl.dueWithin1yUsdBn !== undefined ? `${bn(bis.intl.dueWithin1yUsdBn)} of it due within a year` : '',
      fxShare !== undefined ? `${fxShare}% in foreign currency` : '',
    ].filter(Boolean);
    j.push(
      `The BIS counts ${bn(bis.intl.outstandingUsdBn)} of government bonds in international markets at the end of ${quarterLabel(bis.intl.asOf)}${
        parts.length ? `, ${parts.join(' and ')}` : ''
      }${bis.all ? `; all government debt securities, domestic included, come to ${bn(bis.all.outstandingUsdBn)}` : ''}.${
        fxShare !== undefined && fxShare > 0 ? `${MEANS}Bonds in foreign currency get heavier to repay if the local currency falls.` : ''
      }`
    );
  } else if (bis?.all) {
    j.push(`The BIS counts ${bn(bis.all.outstandingUsdBn)} of government debt securities in all markets at the end of ${quarterLabel(bis.all.asOf)}.`);
  }
  j.push(
    events.length
      ? `Avoid pricing around ${events
          .slice(0, 3)
          .map((e) => `${formatPeriod(e.date)} (${EVENT_SHORT[e.category] || e.title})`)
          .join(', ')}: announcements on those days can move bond prices, so new bonds are usually not sold just before them.`
      : 'No official rate decisions or data releases on file in the next 60 days.'
  );
  if (others.length && y10 !== undefined) j.push(`It pays more than ${cheaperThan} of ${others.length} watchlist peers with an official 10-year yield.${MEANS}Paying more than similar governments usually means markets see more risk, or expect higher inflation, in this country.`);
  j.push(
    signals.length
      ? `Signs of distress: ${signals.join('; ')}.${unchecked.length ? ` Not checked, figures missing: ${unchecked.join(', ')}.` : ''}`
      : unchecked.length === 3
        ? 'Distress tests not run: CDS, reserves and debt path are all missing.'
        : `No signs of distress on the tests that could be run.${unchecked.length ? ` Not checked, figures missing: ${unchecked.join(', ')}.` : ''}`
  );

  const brief: CountryBrief = {
    headline: `${run.countryName}: ${[
      band ? `market access ${band.open ? 'open' : 'likely closed'}` : '',
      qeds ? `$${qeds.next12mUsdBn.toFixed(1)} bn of government external debt due in 12 months` : '',
      signals.length ? `${signals.length} sign${signals.length > 1 ? 's' : ''} of distress` : '',
    ]
      .filter(Boolean)
      .join(', ') || 'not enough live figures for an issuer reading yet'}.`,
    judgements: j,
    groups: [
      {
        title: 'Market access',
        rows: [
          liveRow(status, '10Y government yield', 'market.sovereign10YBondYieldPct', (v) => pct(v, 2), open),
          liveRow(status, '5Y CDS', 'market.cds5YSpreadBps', (v) => `${Math.round(v)} bps`, open),
          noSourceRow('2s10s curve slope', 'Needs official 2-year and 10-year yields, which are not connected yet.'),
          noSourceRow('Credit rating', 'Needs a ratings feed (licensed); AI estimates are not used.'),
          liveRow(status, 'Policy rate', 'market.policyRatePct', (v) => pct(v, 2), open),
        ],
      },
      ...(run.iso3 === 'USA'
        ? [
            {
              title: 'Recent US Treasury auctions',
              rows: ustAuctions?.latest.length
                ? ustAuctions.latest.map((a) => {
                    const reading = ustDemandReading(a);
                    return {
                      label: `${a.label} auction${a.reopening ? ' (reopening)' : ''}, ${a.date}`,
                      value: `${ustAuctionValue(a)}${reading ? `; ${reading}` : ''}`,
                      source: UST_AUCTION_SOURCE,
                      verified: true,
                    };
                  })
                : [
                    missingRow('Treasury auctions', {
                      kind: 'unreachable',
                      short: 'US Treasury Fiscal Data not saved yet',
                      help: 'The auctions come from the free US Treasury Fiscal Data API and are saved by the daily download (Menu > Offline data > Download all country data, or npm run go -- daily). Nothing is shown until that copy exists.',
                    }),
                  ],
            },
          ]
        : []),
      {
        title: 'Financing need',
        rows: [
          ...(qeds
            ? [
                { label: 'Government external debt due, next 12 months', value: `$${qeds.next12mUsdBn.toFixed(1)} bn`, source: QEDS_SRC, verified: true },
                ...qeds.buckets.map((b) => ({ label: `Of which ${b.label.toLowerCase()}`, value: `$${b.usdBn.toFixed(1)} bn`, source: QEDS_SRC, verified: true })),
              ]
            : []),
          ...(idsYear?.debtServiceUsdBn !== undefined
            ? [
                {
                  label: `Public external debt service, ${idsYear.year}`,
                  value: `$${idsYear.debtServiceUsdBn.toFixed(1)} bn${
                    idsYear.principalUsdBn !== undefined ? ` (principal $${idsYear.principalUsdBn.toFixed(1)} bn)` : ''
                  }`,
                  source: IDS_SRC,
                  verified: true,
                },
              ]
            : []),
          ...bisRows,
          ...(qeds
            ? []
            : [missingRow('Government external debt due, next 12 months', { kind: 'unreachable', short: 'QEDS did not answer', help: 'The free World Bank QEDS feed did not answer, or does not cover this country. Press Refresh now under Research > One country.' })]),
          noSourceRow('Full maturity profile, incl. domestic debt', 'Needs a debt management office feed or your own file; not connected yet.'),
          liveRow(status, 'Debt / GDP', 'imf.debtToGdpPct', (v) => pct(v), open),
        ],
      },
      { title: 'Debt relief and lending from China', rows: licDebtRows(open.licDebt ?? licDebtReading(run.iso3, null)) },
      {
        title: 'Execution window, next 60 days',
        rows: events.length
          ? events.map((e) => ({ label: e.title, value: when(e), source: e.sourceName, verified: true }))
          : [{ label: 'Official events', value: 'none on file', source: 'official calendar', verified: false }],
      },
      {
        title: 'Peers by 10Y yield',
        rows: peerRows.length
          ? peerRows.map((p) => ({ label: p.name, value: pct(p.y, 2), source: p.source, verified: p.verified }))
          : [noSourceRow('Peers', 'No watchlist country has an official 10Y yield yet.')],
      },
    ],
  };
  brief.sampleWarning = missingNote(brief.groups, run.countryName);
  return brief;
}

/**
 * Low-income country debt (U1, src/utils/lowIncomeDebt.ts): the debt-distress rating, DSSI, the
 * Common Framework and lending from China, each with its source and date, or Missing with the reason.
 */
export function licDebtRows(r: LicDebtReading): BriefRow[] {
  const read = (f: { source: string; read: string }) => `${f.source}${f.read ? `, read ${f.read}` : ''}`;
  const dsaLabel = 'Risk of debt distress (IMF/World Bank)';
  const dssiLabel = 'Debt Service Suspension Initiative (2020-21)';
  const china = 'Official lending from China';
  return [
    r.dsa
      ? { label: dsaLabel, value: dsaValue(r.dsa), source: dsaSource(), verified: true }
      : r.dsaNone
        ? missingRow(dsaLabel, { kind: 'unreachable', short: 'No published DSA', help: 'The country is on the IMF\'s list of low-income countries but has never published a debt sustainability analysis, so there is no rating.' })
      : r.dsaListRead
        ? { label: dsaLabel, value: 'Not on the IMF low-income list', source: dsaSource(), verified: true }
        : missingRow(dsaLabel, { kind: 'setup', short: 'IMF list not read yet', help: DSA_NOT_READ }),
    r.dssi !== undefined
      ? { label: dssiLabel, value: r.dssi ? 'Took part' : 'Did not take part', source: read(DSSI_SOURCE), verified: true }
      : missingRow(dssiLabel, { kind: 'setup', short: 'Country table not typed yet', help: DSSI_NOT_READ }),
    {
      label: 'Common Framework',
      value: r.commonFramework ? `Applied for a debt treatment (as of ${COMMON_FRAMEWORK_AS_OF})` : `Not among the four countries that applied (as of ${COMMON_FRAMEWORK_AS_OF})`,
      source: read(COMMON_FRAMEWORK_SOURCE),
      verified: true,
    },
    r.china
      ? { label: china, value: chinaValue(r.china), source: chinaSource(r.china), verified: true }
      : r.chinaMissing?.short.startsWith('No loans')
        ? { label: china, value: 'None recorded', source: `AidData file; ${r.chinaMissing.short.toLowerCase()}`, verified: true, help: r.chinaMissing.help }
        : missingRow(china, { kind: 'setup', short: r.chinaMissing?.short || 'AidData file not downloaded', help: r.chinaMissing?.help || '' }),
  ];
}

/** Section ids and headings for the banker's issuer note, in order. */
export const BANKER_SECTIONS: Record<string, string> = {
  summary: 'Summary',
  access: 'Market access',
  need: 'Financing need',
  relief: 'Debt relief and lending from China',
  window: 'Execution window',
  peers: 'Pricing against peers',
  restructuring: 'Restructuring watch',
  calendar: 'Coming up',
  sources: 'Data and sources',
};

export function buildBankerSections(
  run: CouncilAssessmentRun,
  peers: LiveWatchlistItem[],
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
      lines: [b.headline, ...(b.sampleWarning ? [`**Note:** ${b.sampleWarning}`] : []), ...b.judgements.map((x) => `- ${joinMeaning(x)}`)],
    });
  }
  const groups: Array<[string, string]> = [
    ['access', 'Market access'],
    ['need', 'Financing need'],
    ['relief', 'Debt relief and lending from China'],
    ['window', 'Execution window'],
    ['peers', 'Peers by 10Y yield'],
  ];
  for (const [id, title] of groups) if (include(id)) out.push({ id, heading: BANKER_SECTIONS[id], lines: groupLines(byTitle(title)) });
  if (include('restructuring')) {
    // The debt sustainability view on IMF history (src/utils/debtSustainability.ts), when it has run.
    const dsa = peers.find((p) => p.iso3 === run.iso3)?.debtSustainability;
    const gap = dsa?.stabilisingPb !== undefined && dsa.projectedPb !== undefined ? dsa.stabilisingPb - dsa.projectedPb : undefined;
    out.push({
      id: 'restructuring',
      heading: BANKER_SECTIONS.restructuring,
      lines: [
        b.judgements[b.judgements.length - 1],
        dsa?.rMinusG !== undefined
          ? `- Interest rate minus growth: ${pts(dsa.rMinusG)} (debt sustainability view on IMF figures, ${dsa.year})`
          : '- Interest rate minus growth: Missing (the debt sustainability view needs the saved IMF history: Menu > Offline data > Download all)',
        gap !== undefined
          ? `- Primary balance gap to hold debt steady: ${gap.toFixed(1)} pts of GDP (needed ${dsa!.stabilisingPb!.toFixed(1)}, IMF projection ${dsa!.projectedPb!.toFixed(1)})`
          : '- Primary balance gap to hold debt steady: Missing (needs the debt sustainability view)',
        ...(run.openData.monetaryAndMarket.cds5YSpreadBps >= 400
          ? ['The restructuring calculator under Model sandboxes on the country page values a deal on terms you enter.']
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
