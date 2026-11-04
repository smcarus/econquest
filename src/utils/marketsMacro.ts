/**
 * MarketEdge (Country tab and Today screen): what the economy is doing, what markets are pricing, and where the two
 * disagree. Every figure keeps its source tag; the readings in the agent groups (Central Bank Watcher Agent, Relative Value Agent) are simple, stated rules
 * on those figures (tagged model), never data.
 */
import type { CouncilAssessmentRun, WatchlistItem } from '../types/council';
import { getSnapshotDataStatus } from './dataStatus';
import { formatPeriod } from './officialYields';
import { pct, pts, row, sampleWarning, type BriefRow, type CountryBrief } from './countryNotes';
import { cdsSourceNote, yieldSourceNote } from './watchlistYield';
import { carryToVol, reerLabel } from './fxValuation';
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
export const EDGE_AGENTS = { cb: 'Central Bank Watcher', rv: 'Relative Value', spill: 'Global Spillover' } as const;

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
export function fitCdsOnRisk(items: Pick<WatchlistItem, 'cds5YBps' | 'compositeRisk'>[]): PeerFit | null {
  const pts = items.filter((i) => i.cds5YBps > 0 && Number.isFinite(i.compositeRisk));
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
  yield10YPct: number;
  yieldNote: string;
  spreadBps?: number;
  cdsBps: number;
  cdsNote: string;
  risk: number;
  rv?: { gapPct: number; label: RvLabel };
}

export function peerScreen(peers: WatchlistItem[], us10YPct?: number): { rows: PeerScreenRow[]; fit: PeerFit | null } {
  const fit = fitCdsOnRisk(peers);
  const rows = peers.map((p) => ({
    iso3: p.iso3,
    countryName: p.countryName,
    yield10YPct: p.yield10YPct,
    yieldNote: yieldSourceNote(p),
    spreadBps: us10YPct !== undefined ? Math.round((p.yield10YPct - us10YPct) * 100) : undefined,
    cdsBps: p.cds5YBps,
    cdsNote: cdsSourceNote(p),
    risk: p.compositeRisk,
    rv: fit ? (({ gapPct, label }) => ({ gapPct, label }))(cdsVsPeers(p.cds5YBps, p.compositeRisk, fit)) : undefined,
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

export function marketsMacroBrief(run: CouncilAssessmentRun, peers: WatchlistItem[]): CountryBrief & { screen: ReturnType<typeof peerScreen> } {
  const open = run.openData;
  const imf = open.imfIndicators;
  const wb = open.worldBankIndicators;
  const mkt = open.monetaryAndMarket;
  const status = getSnapshotDataStatus(open);
  const target = INFLATION_TARGETS[run.iso3];
  const gap = target ? imf.cpiInflationPct - target.pct : undefined;
  const realPolicy = mkt.policyRatePct - imf.cpiInflationPct;
  const real10Y = mkt.sovereign10YBondYieldPct - imf.cpiInflationPct;
  const us = open.us10YYield;
  const spreadBps = us ? Math.round((mkt.sovereign10YBondYieldPct - us.valuePct) * 100) : undefined;
  const screen = peerScreen(peers, us?.valuePct);
  const self = peers.find((p) => p.iso3 === run.iso3);
  const rv = screen.fit && self ? cdsVsPeers(mkt.cds5YSpreadBps, self.compositeRisk, screen.fit) : undefined;
  const cv = self?.fxVol3mPct !== undefined && self.usFedFundsPct !== undefined ? carryToVol(mkt.policyRatePct, self.usFedFundsPct, self.fxVol3mPct) : null;
  const model = (label: string, value: string, how = 'model, from figures above'): BriefRow => ({ label, value, source: how, verified: false });

  const j: string[] = [];
  j.push(
    `Inflation is ${pct(imf.cpiInflationPct)}${
      target && gap !== undefined ? `, ${Math.abs(gap).toFixed(1)} pts ${gap >= 0 ? 'above' : 'below'} the ${pct(target.pct)} target` : ' (no inflation target on file)'
    }; with the policy rate at ${pct(mkt.policyRatePct, 2)}, the real rate is ${pct(realPolicy)}, so policy looks ${policyStance(realPolicy, gap)}.`
  );
  j.push(
    `The 10-year yields ${pct(mkt.sovereign10YBondYieldPct, 2)}, ${pct(real10Y)} after inflation${
      us && spreadBps !== undefined ? `, and ${spreadBps} bps over US Treasuries (US 10Y ${pct(us.valuePct, 2)}, ${formatPeriod(us.period)})` : ''
    }.`
  );
  if (rv && screen.fit) {
    j.push(
      `At ${Math.round(mkt.cds5YSpreadBps)} bps, 5-year CDS ${RV_TEXT[rv.label]} (${rv.gapPct >= 0 ? '+' : ''}${rv.gapPct.toFixed(0)}% against about ${Math.round(rv.fittedBps)} bps for its risk score, ${screen.fit.n} countries in the MarketEdge screen).`
    );
  }
  j.push(`Growth is ${pct(imf.realGdpGrowthPct)}; the current account is ${pct(wb.currentAccountPctGdp)} of GDP and reserves cover ${wb.fxReservesMonthsImport.toFixed(1)} months of imports.`);

  return {
    headline: `${run.countryName}: inflation ${pct(imf.cpiInflationPct)}${target ? ` against a ${pct(target.pct)} target` : ''}, real policy rate ${pct(realPolicy)}, 10Y ${pct(mkt.sovereign10YBondYieldPct, 2)}${
      rv ? `, CDS ${rv.label} against peers` : ''
    }.`,
    judgements: j,
    sampleWarning: sampleWarning(status, run.countryName),
    screen,
    groups: [
      {
        title: 'Macro now',
        rows: [
          row(status, 'Real GDP growth', pct(imf.realGdpGrowthPct), 'imf'),
          row(status, 'CPI inflation', pct(imf.cpiInflationPct), 'imf'),
          target
            ? { label: 'Inflation target', value: `${pct(target.pct)}${target.bandPts ? ` ± ${target.bandPts}` : ''}`, source: targetSource(target), verified: target.checked }
            : { label: 'Inflation target', value: 'not on file', source: 'central bank page not reachable', verified: false },
          row(status, 'Policy rate', pct(mkt.policyRatePct, 2), 'market'),
          row(status, 'Primary balance', `${pct(imf.primaryFiscalBalancePct)} of GDP`, 'imf'),
          row(status, 'Debt / GDP', pct(imf.debtToGdpPct), 'imf'),
          row(status, 'Current account', `${pct(wb.currentAccountPctGdp)} of GDP`, 'worldbank'),
          row(status, 'FX reserves', `${wb.fxReservesMonthsImport.toFixed(1)} months of imports`, 'worldbank'),
        ],
      },
      {
        title: 'Market pricing',
        rows: [
          row(status, '10Y government yield', pct(mkt.sovereign10YBondYieldPct, 2), 'yield'),
          us
            ? { label: 'US 10Y Treasury', value: pct(us.valuePct, 2), source: `official, OECD via FRED, ${formatPeriod(us.period)} avg`, verified: true }
            : { label: 'US 10Y Treasury', value: 'not available', source: 'FRED did not answer', verified: false },
          ...(spreadBps !== undefined ? [model('Spread over US 10Y', `${spreadBps} bps`, 'from the two yields above')] : []),
          row(status, '5Y CDS', `${Math.round(mkt.cds5YSpreadBps)} bps`, 'cds'),
          {
            label: `Spot FX (${run.openData.currencyCode} per USD)`,
            value: mkt.exchangeRatePerUsd >= 100 ? mkt.exchangeRatePerUsd.toFixed(0) : mkt.exchangeRatePerUsd.toFixed(mkt.exchangeRatePerUsd >= 10 ? 2 : 4),
            ...(status.isFeedLive('fx') ? { source: 'live FX feed', verified: true } : { source: 'sample', verified: false }),
          },
          row(status, '2s10s curve slope', `${Math.round(open.yieldCurve.slope2s10sBps)} bps`, 'sample'),
          self?.reerGapPct !== undefined
            ? {
                label: 'Real exchange rate vs 10-year average',
                value: `${self.reerGapPct >= 0 ? '+' : ''}${self.reerGapPct.toFixed(1)}% (${reerLabel(self.reerGapPct)})`,
                source: `official, BIS${self.reerPeriod ? `, ${formatPeriod(self.reerPeriod)}` : ''}`,
                verified: true,
              }
            : { label: 'Real exchange rate vs 10-year average', value: 'not available', source: 'BIS did not answer', verified: false },
          self?.fxVol3mPct !== undefined
            ? { label: 'FX volatility against USD, 3 months', value: pct(self.fxVol3mPct), source: 'ECB reference rates, live', verified: true }
            : { label: 'FX volatility against USD, 3 months', value: 'not available', source: 'no ECB rate for this currency, or no answer', verified: false },
        ],
      },
      // The edge: readings by stated rules on the figures above, grouped by the desk role that owns them.
      {
        title: `${EDGE_AGENTS.cb} Agent`,
        rows: [
          ...(gap !== undefined ? [model('Inflation against target', pts(gap))] : []),
          model('Real policy rate', pct(realPolicy)),
          model('Real 10Y yield', pct(real10Y)),
        ],
      },
      {
        title: `${EDGE_AGENTS.rv} Agent`,
        rows: [
          ...(cv && self?.usFedFundsPct !== undefined
            ? [model('Carry over US per unit of FX volatility', `${cv.ratio.toFixed(2)} (${cv.carryPts.toFixed(1)} pts over fed funds ${pct(self.usFedFundsPct, 2)})`, 'model: policy rate minus US fed funds, over 3-month volatility')]
            : []),
          rv && screen.fit
            ? model('5Y CDS against risk peers', `${rv.gapPct >= 0 ? '+' : ''}${rv.gapPct.toFixed(0)}% (${rv.label})`, `model: CDS on risk score across ${screen.fit.n} countries`)
            : model('5Y CDS against risk peers', 'needs 4 or more countries with a CDS figure', 'model'),
        ],
      },
      {
        title: `${EDGE_AGENTS.spill} Agent`,
        rows: SCENARIOS.map((sc) => {
          const imp = self?.trade ? scenarioImpact(sc.id, self.trade) : null;
          return imp
            ? model(sc.name, `${imp.pctGdp > 0 ? '+' : ''}${imp.pctGdp.toFixed(1)}% of GDP`, `model: ${sc.shock} Basis: ${imp.basis}`)
            : model(sc.name, 'not available', 'World Bank or WITS trade figures did not answer');
        }),
      },
    ],
  };
}
