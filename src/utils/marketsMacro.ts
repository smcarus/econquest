/**
 * MarketEdge (Country tab and Today screen): what the economy is doing, what markets are pricing, and where the two
 * disagree. Every figure keeps its source tag; the readings in the agent groups (Central Bank Watcher Agent, Relative Value Agent) are simple, stated rules
 * on those figures (tagged model), never data.
 */
import type { CouncilAssessmentRun, LiveWatchlistItem, OpenDataSnapshot, WatchlistItem } from '../types/council';
import { missingReason } from './liveFigures';
import { getSnapshotDataStatus } from './dataStatus';
import { formatPeriod } from './officialYields';
import { liveRow, missingNote, missingRow, noSourceRow, pct, pts, type BriefRow, type CountryBrief } from './countryNotes';
import { cdsSourceNote, yieldSourceNote } from './watchlistYield';
import { carryToVol, reerLabel } from './fxValuation';
import { formatMonth, ticMissing, ticTrend } from './ticHoldings';
import { cliMissing } from './oecdCli';
import { cpiMissing, cpiSource } from './oecdInflation';
import { cftcMissing, CFTC_CURRENCY_CODES, ordinal, positioningLabel } from './cftcPositioning';
import { SCENARIOS, scenarioImpact } from './scenarioExposure';

/**
 * Central bank inflation targets. "checked" = read on the central bank's own page on 2026-11-04.
 * Brazil and Mexico could not be re-read that day (pages blocked or script-only), so they carry
 * the long-standing published targets and say so. Egypt's page refused the request: not on file.
 */
export interface InflationTarget {
  pct: number;
  /** Tolerance either side, in points, when the bank states one. */
  bandPts?: number;
  bank: string;
  url: string;
  checked: boolean;
}

export const INFLATION_TARGETS: Record<string, InflationTarget> = {
  ZAF: { pct: 3, bandPts: 1, bank: 'SARB', url: 'https://www.resbank.co.za/en/home/what-we-do/monetary-policy', checked: true },
  TUR: { pct: 5, bandPts: 2, bank: 'CBRT (2026 year-end target)', url: 'https://www.tcmb.gov.tr/wps/wcm/connect/EN/TCMB+EN/Main+Menu/Core+Functions/Monetary+Policy/PRICE+STABILITY+AND+INFLATION/Inflation+Targets', checked: true },
  IDN: { pct: 2.5, bandPts: 1, bank: 'Bank Indonesia', url: 'https://www.bi.go.id/en/fungsi-utama/moneter/inflasi/default.aspx', checked: true },
  POL: { pct: 2.5, bandPts: 1, bank: 'NBP', url: 'https://nbp.pl/en/monetary-policy/', checked: true },
  CHL: { pct: 3, bank: 'Banco Central de Chile', url: 'https://www.bcentral.cl/en/web/banco-central/areas/monetary-policy', checked: true },
  GBR: { pct: 2, bandPts: 1, bank: 'Bank of England', url: 'https://www.bankofengland.co.uk/monetary-policy/inflation', checked: true },
  JPN: { pct: 2, bank: 'Bank of Japan', url: 'https://www.boj.or.jp/en/mopo/outline/qqe.htm', checked: true },
  BRA: { pct: 3, bandPts: 1.5, bank: 'BCB', url: 'https://www.bcb.gov.br/en/monetarypolicy/inflationtargeting', checked: false },
  MEX: { pct: 3, bandPts: 1, bank: 'Banxico', url: 'https://www.banxico.org.mx/monetary-policy/inflation-target.html', checked: false },
};

/**
 * Desk roles that own the MarketEdge readings. Central Bank Watcher matches the council's
 * agent of that name; Relative Value is the desk that compares a country's pricing with its peers.
 * The readings are stated rules on sourced figures (tagged "model"), not AI output.
 */
export const EDGE_AGENTS = { cb: 'Central Bank Watcher', rv: 'Relative Value', fx: 'FX Valuation', spill: 'Global Spillover' } as const;

export function targetSource(t: InflationTarget): string {
  return t.checked ? `${t.bank} stated target` : `${t.bank} published target, not re-checked`;
}

/* ------------------------------------------------------------------------------------------
 * Relative value against watchlist peers: CDS against the app's risk score.
 * ------------------------------------------------------------------------------------------ */

export interface PeerFit {
  /** log(CDS) = a + b * risk score, fitted on the peers. */
  a: number;
  b: number;
  n: number;
}

/** Least squares of log(CDS) on the risk score. Needs four peers and some spread in risk. */
export function fitCdsOnRisk(items: Partial<Pick<WatchlistItem, 'cds5YBps' | 'compositeRisk'>>[]): PeerFit | null {
  // Only rows where both figures exist; a missing figure is never filled in.
  const pts = items.filter((i): i is Pick<WatchlistItem, 'cds5YBps' | 'compositeRisk'> => (i.cds5YBps ?? 0) > 0 && Number.isFinite(i.compositeRisk));
  if (pts.length < 4) return null;
  const xs = pts.map((p) => p.compositeRisk);
  const ys = pts.map((p) => Math.log(p.cds5YBps));
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  const sxx = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
  if (sxx < 1e-6) return null;
  const b = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / sxx;
  return { a: my - b * mx, b, n: pts.length };
}

export type RvLabel = 'cheap' | 'rich' | 'in line';

/** CDS against what peers with the same risk score pay. Above +15% = cheap (pays more), below -15% = rich. */
export function cdsVsPeers(cds: number, risk: number, fit: PeerFit): { gapPct: number; label: RvLabel; fittedBps: number } {
  const fittedBps = Math.exp(fit.a + fit.b * risk);
  const gapPct = (cds / fittedBps - 1) * 100;
  return { gapPct, fittedBps, label: gapPct > 15 ? 'cheap' : gapPct < -15 ? 'rich' : 'in line' };
}

const RV_TEXT: Record<RvLabel, string> = {
  cheap: 'pays more than peers with similar risk',
  rich: 'pays less than peers with similar risk',
  'in line': 'in line with peers of similar risk',
};

export interface PeerScreenRow {
  iso3: string;
  countryName: string;
  /** Missing when no real source filled it; never a built-in value. */
  yield10YPct?: number;
  yieldNote: string;
  spreadBps?: number;
  cdsBps?: number;
  cdsNote: string;
  risk?: number;
  rv?: { gapPct: number; label: RvLabel };
}

export function peerScreen(peers: LiveWatchlistItem[], us10YPct?: number): { rows: PeerScreenRow[]; fit: PeerFit | null } {
  const fit = fitCdsOnRisk(peers);
  const rows = peers.map((p) => ({
    iso3: p.iso3,
    countryName: p.countryName,
    yield10YPct: p.yield10YPct,
    yieldNote: p.yield10YPct === undefined ? `Missing: ${missingReason('yield', p.iso3).short}` : yieldSourceNote(p),
    spreadBps: us10YPct !== undefined && p.yield10YPct !== undefined ? Math.round((p.yield10YPct - us10YPct) * 100) : undefined,
    cdsBps: p.cds5YBps,
    cdsNote: p.cds5YBps === undefined ? `Missing: ${missingReason('cds', p.iso3).short}` : cdsSourceNote(p),
    risk: p.compositeRisk,
    rv:
      fit && p.cds5YBps !== undefined && p.compositeRisk !== undefined
        ? (({ gapPct, label }) => ({ gapPct, label }))(cdsVsPeers(p.cds5YBps, p.compositeRisk, fit))
        : undefined,
  }));
  return { rows: rows.sort((a, b) => (b.rv?.gapPct ?? -1e9) - (a.rv?.gapPct ?? -1e9)), fit };
}

/* ------------------------------------------------------------------------------------------
 * The brief for one country.
 * ------------------------------------------------------------------------------------------ */

export function policyStance(realRatePct: number, inflationGapPts: number | undefined): string {
  if (inflationGapPts === undefined) {
    return realRatePct > 3 ? 'a high real rate' : realRatePct < 0 ? 'a negative real rate' : 'a moderate real rate';
  }
  if (realRatePct > 3 && inflationGapPts <= 1) return 'tight for where inflation is, which leaves room to cut';
  if (realRatePct > 3) return 'tight, with inflation still above target';
  if (realRatePct < 0 && inflationGapPts > 0) return 'loose with inflation above target';
  if (inflationGapPts > 1) return 'not very tight with inflation above target';
  return 'close to neutral with inflation near target';
}

/** The BIS history behind the policy rate: change over 12 months and the last move. Shown only with a BIS figure. */
export function policyHistoryRows(b: OpenDataSnapshot['bisPolicyRate']): BriefRow[] {
  if (!b) return [];
  const rows: BriefRow[] = [];
  if (b.change12mPts !== undefined)
    rows.push({ label: 'Policy rate change over 12 months', value: `${b.change12mPts >= 0 ? '+' : ''}${b.change12mPts.toFixed(2)} pts`, source: 'official, BIS month-end figures', verified: true });
  if (b.lastMove)
    rows.push({ label: 'Last policy rate move', value: `${pct(b.lastMove.fromPct, 2)} to ${pct(b.lastMove.toPct, 2)} in ${formatPeriod(b.lastMove.period)}`, source: 'official, BIS', verified: true });
  return rows;
}

export function marketsMacroBrief(run: CouncilAssessmentRun, peers: LiveWatchlistItem[]): CountryBrief & { screen: ReturnType<typeof peerScreen> } {
  const open = run.openData;
  const status = getSnapshotDataStatus(open);
  const L = status.live;
  const self = peers.find((p) => p.iso3 === run.iso3);
  // The OECD's monthly figure, where it has one, is fresher than the IMF's annual one.
  const oecdCpi = self?.oecdCpi;
  const cpi = oecdCpi?.yoyPct ?? L('imf.cpiInflationPct');
  const policy = L('market.policyRatePct');
  const y10 = L('market.sovereign10YBondYieldPct');
  const cds = L('market.cds5YSpreadBps');
  const growth = L('imf.realGdpGrowthPct');
  const ca = L('wb.currentAccountPctGdp');
  const res = L('wb.fxReservesMonthsImport');
  const target = INFLATION_TARGETS[run.iso3];
  const gap = target && cpi !== undefined ? cpi - target.pct : undefined;
  const realPolicy = policy !== undefined && cpi !== undefined ? policy - cpi : undefined;
  const real10Y = y10 !== undefined && cpi !== undefined ? y10 - cpi : undefined;
  const us = open.us10YYield;
  const spreadBps = us && y10 !== undefined ? Math.round((y10 - us.valuePct) * 100) : undefined;
  const screen = peerScreen(peers, us?.valuePct);
  const rv = screen.fit && self?.compositeRisk !== undefined && cds !== undefined ? cdsVsPeers(cds, self.compositeRisk, screen.fit) : undefined;
  const cv = policy !== undefined && self?.fxVol3mPct !== undefined && self.usFedFundsPct !== undefined ? carryToVol(policy, self.usFedFundsPct, self.fxVol3mPct) : null;
  const model = (label: string, value: string, how = 'model, from figures above'): BriefRow => ({ label, value, source: how, verified: false });
  const needs = (label: string, what: string) => missingRow(label, { kind: 'setup', short: `Needs ${what}`, help: `Worked out from ${what}, which is missing.` });

  const j: string[] = [];
  if (cpi !== undefined)
    j.push(
      `Inflation is ${pct(cpi)}${oecdCpi ? ` (${cpiSource(oecdCpi)})` : ''}${target && gap !== undefined ? `, ${Math.abs(gap).toFixed(1)} pts ${gap >= 0 ? 'above' : 'below'} the ${pct(target.pct)} target` : ' (no inflation target on file)'}${
        realPolicy !== undefined && policy !== undefined ? `; with the policy rate at ${pct(policy, 2)}, the real rate is ${pct(realPolicy)}, so policy looks ${policyStance(realPolicy, gap)}` : ''
      }.`
    );
  if (y10 !== undefined)
    j.push(
      `The 10-year yields ${pct(y10, 2)}${real10Y !== undefined ? `, ${pct(real10Y)} after inflation` : ''}${
        us && spreadBps !== undefined ? `, and ${spreadBps} bps over US Treasuries (US 10Y ${pct(us.valuePct, 2)}, ${formatPeriod(us.period)})` : ''
      }.`
    );
  if (rv && screen.fit && cds !== undefined)
    j.push(`At ${Math.round(cds)} bps, 5-year CDS ${RV_TEXT[rv.label]} (${rv.gapPct >= 0 ? '+' : ''}${rv.gapPct.toFixed(0)}% against about ${Math.round(rv.fittedBps)} bps for its risk score, ${screen.fit.n} countries in the MarketEdge screen).`);
  const macro = [growth !== undefined ? `growth is ${pct(growth)}` : '', ca !== undefined ? `the current account is ${pct(ca)} of GDP` : '', res !== undefined ? `reserves cover ${res.toFixed(1)} months of imports` : ''].filter(Boolean);
  if (macro.length) j.push(`${macro.join('; ').replace(/^./, (c) => c.toUpperCase())}.`);

  const head = [cpi !== undefined ? `inflation ${pct(cpi)}${target ? ` against a ${pct(target.pct)} target` : ''}` : '', realPolicy !== undefined ? `real policy rate ${pct(realPolicy)}` : '', y10 !== undefined ? `10Y ${pct(y10, 2)}` : '', rv ? `CDS ${rv.label} against peers` : ''].filter(Boolean);
  const fx = L('market.exchangeRatePerUsd');
  const groups = [
    {
      title: 'Macro now',
      rows: [
        liveRow(status, 'Real GDP growth', 'imf.realGdpGrowthPct', (v) => pct(v), open),
        liveRow(status, 'CPI inflation', 'imf.cpiInflationPct', (v) => pct(v), open),
        target
          ? { label: 'Inflation target', value: `${pct(target.pct)}${target.bandPts ? ` ± ${target.bandPts}` : ''}`, source: targetSource(target), verified: target.checked }
          : noSourceRow('Inflation target', 'No official inflation target on file for this country.'),
        liveRow(status, 'Policy rate', 'market.policyRatePct', (v) => pct(v, 2), open),
        ...policyHistoryRows(policy !== undefined ? open.bisPolicyRate : undefined),
        liveRow(status, 'Primary balance', 'imf.primaryFiscalBalancePct', (v) => `${pct(v)} of GDP`, open),
        liveRow(status, 'Debt / GDP', 'imf.debtToGdpPct', (v) => pct(v), open),
        liveRow(status, 'Current account', 'wb.currentAccountPctGdp', (v) => `${pct(v)} of GDP`, open),
        liveRow(status, 'FX reserves', 'wb.fxReservesMonthsImport', (v) => `${v.toFixed(1)} months of imports`, open),
      ],
    },
    {
      title: 'Market pricing',
      rows: [
        liveRow(status, '10Y government yield', 'market.sovereign10YBondYieldPct', (v) => pct(v, 2), open),
        us
          ? { label: 'US 10Y Treasury', value: pct(us.valuePct, 2), source: `official, OECD via FRED, ${formatPeriod(us.period)} avg`, verified: true }
          : missingRow('US 10Y Treasury', { kind: 'unreachable', short: 'FRED did not answer', help: 'The free FRED feed did not answer. Press Sync, or set FRED_API_KEY in .env.' }),
        ...(spreadBps !== undefined ? [model('Spread over US 10Y', `${spreadBps} bps`, 'from the two yields above')] : []),
        liveRow(status, '5Y CDS', 'market.cds5YSpreadBps', (v) => `${Math.round(v)} bps`, open),
        fx !== undefined
          ? { label: `Spot FX (${open.currencyCode} per USD)`, value: fx >= 100 ? fx.toFixed(0) : fx.toFixed(fx >= 10 ? 2 : 4), source: 'live FX feed', verified: true }
          : liveRow(status, `Spot FX (${open.currencyCode} per USD)`, 'market.exchangeRatePerUsd', (v) => String(v), open),
        noSourceRow('2s10s curve slope', 'Needs official 2-year and 10-year yields, which are not connected yet.'),
        self?.reerGapPct !== undefined
          ? {
              label: 'Real exchange rate vs 10-year average',
              value: `${self.reerGapPct >= 0 ? '+' : ''}${self.reerGapPct.toFixed(1)}% (${reerLabel(self.reerGapPct)})`,
              source: `official, BIS${self.reerPeriod ? `, ${formatPeriod(self.reerPeriod)}` : ''}`,
              verified: true,
            }
          : missingRow('Real exchange rate vs 10-year average', { kind: 'unreachable', short: 'BIS did not answer', help: 'The free BIS feed did not answer, or does not cover this currency. Press Sync.' }),
        self?.fxVol3mPct !== undefined
          ? { label: 'FX volatility against USD, 3 months', value: pct(self.fxVol3mPct), source: 'ECB reference rates, live', verified: true }
          : missingRow('FX volatility against USD, 3 months', { kind: 'unreachable', short: 'No ECB rate', help: 'The ECB publishes no reference rate for this currency, or the feed did not answer.' }),
      ],
    },
    // The edge: readings by stated rules on the figures above, grouped by the desk role that owns them.
    {
      title: `${EDGE_AGENTS.cb} Agent`,
      rows: [
        gap !== undefined ? model('Inflation against target', pts(gap)) : needs('Inflation against target', cpi === undefined ? 'live inflation' : 'an inflation target'),
        realPolicy !== undefined ? model('Real policy rate', pct(realPolicy)) : needs('Real policy rate', policy === undefined ? 'a policy rate' : 'live inflation'),
        real10Y !== undefined ? model('Real 10Y yield', pct(real10Y)) : needs('Real 10Y yield', y10 === undefined ? 'an official 10Y yield' : 'live inflation'),
      ],
    },
    {
      title: `${EDGE_AGENTS.rv} Agent`,
      rows: [
        cv && self?.usFedFundsPct !== undefined
          ? model('Carry over US per unit of FX volatility', `${cv.ratio.toFixed(2)} (${cv.carryPts.toFixed(1)} pts over fed funds ${pct(self.usFedFundsPct, 2)})`, 'model: policy rate minus US fed funds, over 3-month volatility')
          : needs('Carry over US per unit of FX volatility', policy === undefined ? 'a policy rate' : 'FX volatility and fed funds'),
        rv && screen.fit
          ? model('5Y CDS against risk peers', `${rv.gapPct >= 0 ? '+' : ''}${rv.gapPct.toFixed(0)}% (${rv.label})`, `model: CDS on risk score across ${screen.fit.n} countries`)
          : needs('5Y CDS against risk peers', '4 or more countries with your CDS and a live risk score'),
      ],
    },
    {
      title: 'OECD inflation (monthly)',
      rows: oecdCpiRows(self),
    },
    {
      title: 'OECD leading indicator (monthly)',
      rows: cliRows(self),
    },
    {
      title: 'Futures positioning (CFTC, weekly)',
      rows: positioningRows(self, run.iso3),
    },
    {
      title: 'US Treasury holdings (TIC, monthly)',
      rows: ticRows(self, run.iso3),
    },
    {
      title: `${EDGE_AGENTS.fx} Agent`,
      rows: [
        self?.cftc?.percentile !== undefined
          ? model(
              'Leveraged funds against their last 3 years',
              `${ordinal(self.cftc.percentile)} percentile (${positioningLabel(self.cftc.percentile)})`,
              `model: ${self.cftc.weeks} weekly CFTC reports; 90th or above = crowded long, 10th or below = crowded short`
            )
          : needs('Leveraged funds against their last 3 years', CFTC_CURRENCY_CODES[run.iso3] ? 'a year or more of CFTC reports' : 'a CFTC-reported currency future'),
        self?.tic?.change12mPct !== undefined
          ? model('US Treasury holdings trend', ticTrend(self.tic.change12mPct), 'model: 12-month TIC change; -10% or less = selling, +10% or more = buying')
          : needs('US Treasury holdings trend', '13 months of TIC holdings for this country'),
      ],
    },
    {
      title: `${EDGE_AGENTS.spill} Agent`,
      rows: [
        self?.oecdCli?.phase
          ? model('Growth cycle phase', self.oecdCli.phase, 'model: OECD rule on the leading indicator; above 100 and rising = expansion, above and falling = downturn, below and falling = slowdown, below and rising = recovery')
          : needs('Growth cycle phase', 'two months of the OECD leading indicator'),
        ...SCENARIOS.map((sc) => {
        const imp = self?.trade ? scenarioImpact(sc.id, self.trade) : null;
        return imp
          ? model(sc.name, `${imp.pctGdp > 0 ? '+' : ''}${imp.pctGdp.toFixed(1)}% of GDP`, `model: ${sc.shock} Basis: ${imp.basis}`)
          : missingRow(sc.name, { kind: 'unreachable', short: 'Trade figures did not answer', help: 'The free World Bank or WITS trade feed did not answer. Press Sync.' });
        }),
      ],
    },
  ];
  return {
    headline: head.length ? `${run.countryName}: ${head.join(', ')}.` : `${run.countryName}: no live market or macro figures yet.`,
    judgements: j,
    sampleWarning: missingNote(groups, run.countryName),
    screen,
    groups,
  };
}

/** CFTC rows for the Country tab: official figures with the report date and the date the app pulled them. */
export function positioningRows(self: LiveWatchlistItem | undefined, iso3: string): BriefRow[] {
  const c = self?.cftc;
  const why = cftcMissing(iso3);
  const miss = (label: string) => (CFTC_CURRENCY_CODES[iso3] ? missingRow(label, { kind: 'unreachable', short: why.short, help: why.help }) : noSourceRow(label, why.help));
  if (!c) return [miss('Leveraged funds net, share of open interest'), miss('Asset managers net, share of open interest')];
  const src = `official, CFTC as of ${c.reportDate} (pulled ${c.pulledAt.slice(0, 10)})`;
  const sg = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
  return [
    { label: `Leveraged funds net ${c.ccy}, share of open interest`, value: sg(c.levNetPctOi), source: src, verified: true },
    { label: `Asset managers net ${c.ccy}, share of open interest`, value: sg(c.assetMgrNetPctOi), source: src, verified: true },
    ...(c.levNetWeekChange !== undefined
      ? [{ label: 'Leveraged funds, change on the week', value: `${c.levNetWeekChange >= 0 ? '+' : ''}${c.levNetWeekChange.toLocaleString('en-US')} contracts`, source: src, verified: true }]
      : []),
  ];
}

/** TIC rows for the Country tab: official figures with the month-end and the date the app pulled them. */
export function ticRows(self: LiveWatchlistItem | undefined, iso3: string): BriefRow[] {
  const t = self?.tic;
  if (!t) return [noSourceRow('Holdings of US Treasuries', ticMissing(iso3).help)];
  const src = `official, US Treasury TIC, ${formatMonth(t.month)} (pulled ${t.pulledAt.slice(0, 10)})`;
  const sg = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}`;
  return [
    { label: 'Holdings of US Treasuries', value: `$${t.holdingsUsdBn.toFixed(1)}bn`, source: src, verified: true },
    ...(t.change1mUsdBn !== undefined ? [{ label: 'Change on the month', value: `${sg(t.change1mUsdBn)}bn`, source: src, verified: true }] : []),
    ...(t.change12mUsdBn !== undefined && t.change12mPct !== undefined
      ? [{ label: 'Change over 12 months', value: `${sg(t.change12mUsdBn)}bn (${sg(t.change12mPct)}%)`, source: src, verified: true }]
      : []),
    ...(t.shareOfForeignPct !== undefined ? [{ label: 'Share of all foreign holdings', value: `${t.shareOfForeignPct.toFixed(1)}%`, source: src, verified: true }] : []),
  ];
}

/** OECD leading indicator rows for the Country tab, with the month and the date the app pulled it. */
export function cliRows(self: LiveWatchlistItem | undefined): BriefRow[] {
  const c = self?.oecdCli;
  const label = 'Leading indicator (100 = long-term average)';
  if (!c) {
    const why = cliMissing(!!self?.oecdCliPulledAt);
    return [self?.oecdCliPulledAt ? noSourceRow(label, why.help) : missingRow(label, { kind: 'unreachable', short: why.short, help: why.help })];
  }
  const src = `official, OECD CLI amplitude adjusted, ${formatMonth(c.month)} (pulled ${c.pulledAt.slice(0, 10)})`;
  const sg = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}`;
  return [
    { label, value: c.level.toFixed(2), source: src, verified: true },
    ...(c.change1m !== undefined ? [{ label: 'Change on the month', value: sg(c.change1m), source: src, verified: true }] : []),
    ...(c.change6m !== undefined ? [{ label: 'Change over 6 months', value: sg(c.change6m), source: src, verified: true }] : []),
  ];
}

/** OECD monthly CPI rows for the Country tab, with the month and the date the app pulled it. */
export function oecdCpiRows(self: LiveWatchlistItem | undefined): BriefRow[] {
  const c = self?.oecdCpi;
  const label = 'CPI inflation, y/y (latest month)';
  if (!c) {
    const why = cpiMissing(!!self?.oecdCpiPulledAt);
    return [self?.oecdCpiPulledAt ? noSourceRow(label, why.help) : missingRow(label, { kind: 'unreachable', short: why.short, help: why.help })];
  }
  const src = `official, ${cpiSource(c)} (pulled ${c.pulledAt.slice(0, 10)})`;
  const sg = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}`;
  return [
    { label, value: pct(c.yoyPct), source: src, verified: true },
    ...(c.change3mPts !== undefined && c.trend
      ? [
          { label: 'Change over 3 months', value: `${sg(c.change3mPts)} pts`, source: src, verified: true },
          { label: 'Inflation trend', value: c.trend, source: 'model: 3-month change; +0.5 pts or more = rising, -0.5 pts or more down = easing', verified: false },
        ]
      : []),
  ];
}
