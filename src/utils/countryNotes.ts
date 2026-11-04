import type { CouncilAssessmentRun } from '../types/council';
import { getSnapshotDataStatus, DATA_MODE_LABEL, formatAsOf, type SnapshotDataStatus } from './dataStatus';
import { describeOfficialYield, formatPeriod } from './officialYields';
import { nextOfficialEvent, upcomingOfficialEvents } from '../data/officialCalendar';

/**
 * Role briefs and report templates built from the current country snapshot.
 * Every figure carries a short source tag ("IMF WEO", "World Bank", "official, Sep 2026 avg",
 * "AI estimate", "sample", "model") so a reader can tell a published number from a placeholder.
 * The plain-language judgements are simple, stated rules on those figures, not model output.
 */

export interface BriefRow {
  label: string;
  value: string;
  source: string;
  /** True when the figure is a published official or live-feed value (shown in green). */
  verified: boolean;
}

export interface BriefGroup {
  title: string;
  rows: BriefRow[];
}

export interface CountryBrief {
  /** One-sentence summary. */
  headline: string;
  /** Short plain-language observations, each tied to the figures shown. */
  judgements: string[];
  groups: BriefGroup[];
  /** Set when most figures are sample values, so the reader is warned up front. */
  sampleWarning?: string;
}

export interface NoteSection {
  id: string;
  heading: string;
  lines: string[];
}

type Kind = 'imf' | 'worldbank' | 'market' | 'yield' | 'model';

export function sourceTag(status: SnapshotDataStatus, kind: Kind): { source: string; verified: boolean } {
  switch (kind) {
    case 'imf':
      return status.isFeedLive('imf') ? { source: 'IMF WEO', verified: true } : { source: 'sample', verified: false };
    case 'worldbank':
      return status.isFeedLive('worldbank') ? { source: 'World Bank', verified: true } : { source: 'sample', verified: false };
    case 'market':
      return { source: status.marketSource === 'ai_estimate' ? 'AI estimate' : 'sample', verified: false };
    case 'yield':
      return status.officialYield
        ? { source: `official, ${describeOfficialYield(status.officialYield).when}`, verified: true }
        : sourceTag(status, 'market');
    case 'model':
      return { source: 'model, from figures above', verified: false };
  }
}

const when = (e: { date: string; daysUntil: number }) =>
  `${formatPeriod(e.date)}, ${e.daysUntil === 0 ? 'today' : e.daysUntil === 1 ? 'tomorrow' : `in ${e.daysUntil} days`}`;
const pct = (v: number, d = 1) => `${v.toFixed(d)}%`;
const pts = (v: number, d = 1) => `${v >= 0 ? '+' : ''}${v.toFixed(d)} pts`;

function row(status: SnapshotDataStatus, label: string, value: string, kind: Kind): BriefRow {
  return { label, value, ...sourceTag(status, kind) };
}

function sampleWarning(status: SnapshotDataStatus, countryName: string): string | undefined {
  if (status.mode === 'live') return undefined;
  const which = status.mode === 'partial' ? 'Some' : 'Most';
  return `${which} figures for ${countryName} are sample values, not published data. Check the source next to each figure, or sync the country, before relying on them.`;
}

/* ------------------------------------------------------------------------------------------
 * Economist: growth, inflation and policy, fiscal path, external position.
 * ------------------------------------------------------------------------------------------ */

export function economistBrief(run: CouncilAssessmentRun, now: Date = new Date()): CountryBrief {
  const open = run.openData;
  const imf = open.imfIndicators;
  const wb = open.worldBankIndicators;
  const mkt = open.monetaryAndMarket;
  const dsa = open.dsaAnalytics;
  const roll = open.debtRollover;
  const status = getSnapshotDataStatus(open);
  const realRate = mkt.policyRatePct - imf.cpiInflationPct;
  const debtChange = imf.debtToGdpForecast2027Pct - imf.debtToGdpPct;
  const nextMeeting = nextOfficialEvent(run.iso3, 'MPC_DECISION', now);
  const nextCpi = nextOfficialEvent(run.iso3, 'CPI_RELEASE', now);

  const j: string[] = [];
  const g = imf.realGdpGrowthPct;
  j.push(
    `Growth is ${g >= 4 ? 'strong' : g >= 2 ? 'moderate' : g >= 0 ? 'weak' : 'negative'} at ${pct(g)} a year, with inflation at ${pct(imf.cpiInflationPct)}.`
  );
  j.push(
    realRate > 2
      ? `Monetary policy is tight: the policy rate is ${pct(realRate)} above inflation.`
      : realRate >= 0
        ? `Monetary policy is mildly restrictive: the policy rate is ${pct(realRate)} above inflation.`
        : `Real interest rates are negative (${pct(realRate)}): policy is loose relative to inflation.`
  );
  j.push(
    `Government debt is ${pct(imf.debtToGdpPct, 0)} of GDP and is forecast to ${
      Math.abs(debtChange) < 1 ? 'stay roughly flat' : debtChange > 0 ? `rise by ${debtChange.toFixed(0)} pts` : `fall by ${Math.abs(debtChange).toFixed(0)} pts`
    } by 2027.`
  );
  if (dsa.fiscalConsolidationGapPct > 0.25) {
    j.push(
      `The primary balance is ${dsa.fiscalConsolidationGapPct.toFixed(1)} pts of GDP short of the level that would keep debt stable (interest rate minus growth: ${pts(dsa.rMinusGDifferentialPct)}).`
    );
  } else {
    j.push(`The primary balance is at or above the level that keeps debt stable (interest rate minus growth: ${pts(dsa.rMinusGDifferentialPct)}).`);
  }
  const ext: string[] = [];
  if (wb.currentAccountPctGdp < -4) ext.push(`a current account deficit of ${pct(Math.abs(wb.currentAccountPctGdp))} of GDP`);
  if (wb.fxReservesMonthsImport < 3) ext.push(`reserves below the usual three-month import floor`);
  if (roll.greenspanGuidottiRatioPct < 100) ext.push(`reserves that do not fully cover short-term external debt`);
  j.push(ext.length ? `External weak points: ${ext.join(', ')}.` : 'The external position looks comfortable on reserves and the current account.');

  const headline = `${run.countryName}: ${g >= 2 ? 'growing' : 'slow growth'}, inflation ${pct(imf.cpiInflationPct)}, debt ${
    debtChange > 1 ? 'rising' : debtChange < -1 ? 'falling' : 'stable'
  } at ${pct(imf.debtToGdpPct, 0)} of GDP.`;

  return {
    headline,
    judgements: j,
    sampleWarning: sampleWarning(status, run.countryName),
    groups: [
      {
        title: 'Growth and inflation',
        rows: [
          row(status, 'Real GDP growth', pct(g), 'imf'),
          row(status, 'CPI inflation', pct(imf.cpiInflationPct), 'imf'),
        ],
      },
      {
        title: 'Monetary policy',
        rows: [
          row(status, 'Policy rate', pct(mkt.policyRatePct, 2), 'market'),
          row(status, 'Real policy rate', pct(realRate), 'model'),
          {
            label: 'Next rate decision',
            value: nextMeeting ? when(nextMeeting) : 'not on file',
            source: nextMeeting ? nextMeeting.sourceName : 'no official schedule loaded',
            verified: Boolean(nextMeeting),
          },
          ...(nextCpi
            ? [{ label: 'Next CPI release', value: when(nextCpi), source: nextCpi.sourceName, verified: true }]
            : []),
        ],
      },
      {
        title: 'Fiscal and debt',
        rows: [
          row(status, 'Debt / GDP', pct(imf.debtToGdpPct), 'imf'),
          row(status, 'Debt / GDP, 2027 forecast', pct(imf.debtToGdpForecast2027Pct), 'imf'),
          row(status, 'Primary balance', `${pct(imf.primaryFiscalBalancePct)} of GDP`, 'imf'),
          row(status, 'Balance that keeps debt stable', `${pct(dsa.debtStabilizingPrimaryBalancePct)} of GDP`, 'model'),
          row(status, 'Interest rate minus growth', pts(dsa.rMinusGDifferentialPct), 'model'),
          row(status, '10Y government yield', pct(mkt.sovereign10YBondYieldPct, 2), 'yield'),
        ],
      },
      {
        title: 'External position',
        rows: [
          row(status, 'Current account', `${pct(wb.currentAccountPctGdp)} of GDP`, 'worldbank'),
          row(status, 'FX reserves', `${wb.fxReservesMonthsImport.toFixed(1)} months of imports`, 'worldbank'),
          row(status, 'External debt', `${pct(wb.externalDebtPctGni, 0)} of GNI`, 'worldbank'),
          row(status, 'Reserves / short-term external debt', pct(roll.greenspanGuidottiRatioPct, 0), 'model'),
        ],
      },
    ],
  };
}

/* ------------------------------------------------------------------------------------------
 * Report sections.
 * ------------------------------------------------------------------------------------------ */

const clean = (t: string) => t.replace(/\s*\(Ref:[^)]*\)/g, '').trim();

function groupLines(g: BriefGroup): string[] {
  return g.rows.map((r) => `- ${r.label}: ${r.value} (${r.source})`);
}

function sourcesSection(run: CouncilAssessmentRun, purpose: string): NoteSection {
  const status = getSnapshotDataStatus(run.openData);
  return {
    id: 'sources',
    heading: 'Data and sources',
    lines: [
      `Data status: ${DATA_MODE_LABEL[status.mode]}${status.asOf ? `, as of ${formatAsOf(status.asOf)}` : ''}. Each figure above names its source; "sample" means a built-in placeholder, not published data, and "model" means calculated here from the other figures.`,
      status.liveFeeds.length ? `Feeds that answered: ${status.liveFeeds.join('; ')}.` : 'No live feeds answered on the last sync.',
      purpose,
    ],
  };
}

function calendarSection(run: CouncilAssessmentRun, heading: string, now: Date): NoteSection {
  const events = upcomingOfficialEvents([run.iso3], 90, now);
  return {
    id: 'calendar',
    heading,
    lines: events.length
      ? events.map((e) => `- ${e.date}: ${e.title} (source: ${e.sourceName})`)
      : [`No official dates on file for ${run.countryName} in the next 90 days.`],
  };
}

/** Section ids and headings for the economist's country note, in order. */
export const ECONOMIST_SECTIONS: Record<string, string> = {
  summary: 'Summary',
  growth: 'Growth and inflation',
  policy: 'Monetary policy',
  fiscal: 'Fiscal and debt',
  external: 'External position',
  risks: 'Risks to the outlook',
  calendar: 'Coming up',
  sources: 'Data and sources',
};

export function buildEconomistSections(run: CouncilAssessmentRun, include: (id: string) => boolean, now: Date = new Date()): NoteSection[] {
  const b = economistBrief(run, now);
  const byTitle = (t: string) => b.groups.find((g) => g.title === t)!;
  const out: NoteSection[] = [];
  if (include('summary')) {
    out.push({ id: 'summary', heading: ECONOMIST_SECTIONS.summary, lines: [b.headline, ...(b.sampleWarning ? [`**Note:** ${b.sampleWarning}`] : []), ...b.judgements.map((x) => `- ${x}`)] });
  }
  const groups: Array<[string, string]> = [
    ['growth', 'Growth and inflation'],
    ['policy', 'Monetary policy'],
    ['fiscal', 'Fiscal and debt'],
    ['external', 'External position'],
  ];
  for (const [id, title] of groups) if (include(id)) out.push({ id, heading: ECONOMIST_SECTIONS[id], lines: groupLines(byTitle(title)) });
  if (include('fiscal') && run.openData.dsaAnalytics.dsaInterpretation) {
    out.find((s) => s.id === 'fiscal')!.lines.push(clean(run.openData.dsaAnalytics.dsaInterpretation));
  }
  if (include('risks')) {
    const vul = run.supremeCouncil?.policyResearcherReport.structuralVulnerabilities || [];
    out.push({
      id: 'risks',
      heading: ECONOMIST_SECTIONS.risks,
      lines: vul.length ? vul.slice(0, 5).map((v) => `- ${clean(v)}`) : ['Write the main risks to the outlook here. Running the council adds a draft list.'],
    });
  }
  if (include('calendar')) out.push(calendarSection(run, ECONOMIST_SECTIONS.calendar, now));
  if (include('sources')) out.push(sourcesSection(run, 'Analysis for discussion. Not a forecast endorsed by any official body.'));
  return out;
}
