import { OpenDataSnapshot } from '../types/council';
import { buildBaselineOpenData } from '../data/presetsAndBaselines';

export interface LiveMacroIndicatorDelta {
  indicatorCode: string;
  label: string;
  unit: string;
  baselineValue: number;
  liveValue: number;
  delta: number;
  observationYear: string;
  source: string;
  isLiveApi: boolean;
}

export interface LiveMacroSyncResult {
  iso3: string;
  countryName: string;
  syncedAt: string;
  syncStatus: 'LIVE_WORLD_BANK_AND_TREASURY' | 'HYBRID_PARTIAL_LIVE' | 'DETERMINISTIC_FALLBACK';
  us10YTreasuryBenchmarkPct: number;
  updatedSnapshot: OpenDataSnapshot;
  deltas: LiveMacroIndicatorDelta[];
  summaryHeadline: string;
}

interface WorldBankObservation {
  date?: string;
  value?: number | null;
}

/**
 * Queries the public CORS-enabled World Bank Indicator v2 API for a single country and indicator.
 * Returns the most recent non-null observation within the last 8 years.
 */
async function fetchWorldBankIndicatorLatest(
  iso3: string,
  indicatorCode: string
): Promise<{ value: number; year: string } | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    const url = `https://api.worldbank.org/v2/country/${encodeURIComponent(
      iso3
    )}/indicator/${encodeURIComponent(indicatorCode)}?format=json&per_page=8`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const json = await res.json();
    if (!Array.isArray(json) || !Array.isArray(json[1])) return null;
    const rows = json[1] as WorldBankObservation[];
    for (const row of rows) {
      if (typeof row?.value === 'number' && Number.isFinite(row.value)) {
        return {
          value: Number(row.value.toFixed(2)),
          year: String(row.date || 'Latest'),
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Queries the US Treasury Fiscal Data API for latest average 10Y Treasury Note rate or Exchange Rate.
 */
async function fetchUsTreasuryBenchmarkRate(): Promise<number | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3800);
    const url =
      'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/avg_interest_rates?filter=security_desc:eq:Treasury%20Notes&sort=-record_date&page[size]=1';
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const json = await res.json();
    const rateStr = json?.data?.[0]?.avg_interest_rate_amt;
    const parsed = parseFloat(rateStr);
    if (Number.isFinite(parsed) && parsed > 0.5 && parsed < 12) {
      return Number((parsed + 0.85).toFixed(2));
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Synchronizes a sovereign's OpenDataSnapshot against live World Bank v2 and US Treasury Fiscal Data APIs
 * with zero-latency deterministic fallback if offline or rate-limited.
 */
export async function syncLiveWorldBankAndTreasuryData(
  currentSnapshot: OpenDataSnapshot
): Promise<LiveMacroSyncResult> {
  const iso3 = currentSnapshot.iso3;
  const baseline = buildBaselineOpenData(iso3);

  const [gdpGrowthRes, cpiRes, cabRes, reservesRes, debtRes, usTreasury10Y] = await Promise.all([
    fetchWorldBankIndicatorLatest(iso3, 'NY.GDP.MKTP.KD.ZG'), // Real GDP growth (annual %)
    fetchWorldBankIndicatorLatest(iso3, 'FP.CPI.TOTL.ZG'), // Inflation, consumer prices (annual %)
    fetchWorldBankIndicatorLatest(iso3, 'BN.CAB.XOKA.GD.ZS'), // Current account balance (% of GDP)
    fetchWorldBankIndicatorLatest(iso3, 'FI.RES.TOTL.MO'), // Total reserves in months of imports
    fetchWorldBankIndicatorLatest(iso3, 'GC.DOD.TOTL.GD.ZS'), // Central govt debt, total (% of GDP)
    fetchUsTreasuryBenchmarkRate(),
  ]);

  let liveHitCount = 0;
  if (gdpGrowthRes) liveHitCount++;
  if (cpiRes) liveHitCount++;
  if (cabRes) liveHitCount++;
  if (reservesRes) liveHitCount++;
  if (debtRes) liveHitCount++;
  if (usTreasury10Y) liveHitCount++;

  const us10YBenchmark = usTreasury10Y ?? 4.35;

  const liveGdp = gdpGrowthRes?.value ?? baseline.imfIndicators.realGdpGrowthPct;
  const liveCpi = cpiRes?.value ?? baseline.imfIndicators.cpiInflationPct;
  const liveCab = cabRes?.value ?? baseline.worldBankIndicators.currentAccountPctGdp;
  const liveReserves = reservesRes?.value ?? baseline.worldBankIndicators.fxReservesMonthsImport;
  const liveDebt =
    debtRes && debtRes.value > 10 && debtRes.value < 320
      ? debtRes.value
      : baseline.imfIndicators.debtToGdpPct;

  const deltas: LiveMacroIndicatorDelta[] = [
    {
      indicatorCode: 'GC.DOD.TOTL.GD.ZS',
      label: 'Gross Government Debt / GDP',
      unit: '% GDP',
      baselineValue: baseline.imfIndicators.debtToGdpPct,
      liveValue: liveDebt,
      delta: Number((liveDebt - baseline.imfIndicators.debtToGdpPct).toFixed(2)),
      observationYear: debtRes?.year || '2025/26 WEO',
      source: debtRes ? 'World Bank WDI v2 Live' : 'IMF WEO Baseline',
      isLiveApi: Boolean(debtRes),
    },
    {
      indicatorCode: 'NY.GDP.MKTP.KD.ZG',
      label: 'Real GDP Growth Rate',
      unit: '% YoY',
      baselineValue: baseline.imfIndicators.realGdpGrowthPct,
      liveValue: liveGdp,
      delta: Number((liveGdp - baseline.imfIndicators.realGdpGrowthPct).toFixed(2)),
      observationYear: gdpGrowthRes?.year || '2025/26 WEO',
      source: gdpGrowthRes ? 'World Bank WDI v2 Live' : 'IMF WEO Baseline',
      isLiveApi: Boolean(gdpGrowthRes),
    },
    {
      indicatorCode: 'FP.CPI.TOTL.ZG',
      label: 'Headline CPI Inflation',
      unit: '% YoY',
      baselineValue: baseline.imfIndicators.cpiInflationPct,
      liveValue: liveCpi,
      delta: Number((liveCpi - baseline.imfIndicators.cpiInflationPct).toFixed(2)),
      observationYear: cpiRes?.year || '2025/26 WEO',
      source: cpiRes ? 'World Bank WDI v2 Live' : 'IMF WEO Baseline',
      isLiveApi: Boolean(cpiRes),
    },
    {
      indicatorCode: 'BN.CAB.XOKA.GD.ZS',
      label: 'Current Account Balance',
      unit: '% GDP',
      baselineValue: baseline.worldBankIndicators.currentAccountPctGdp,
      liveValue: liveCab,
      delta: Number((liveCab - baseline.worldBankIndicators.currentAccountPctGdp).toFixed(2)),
      observationYear: cabRes?.year || '2025/26 WEO',
      source: cabRes ? 'World Bank WDI v2 Live' : 'World Bank Baseline',
      isLiveApi: Boolean(cabRes),
    },
    {
      indicatorCode: 'FI.RES.TOTL.MO',
      label: 'FX Reserves Import Cover',
      unit: 'Months',
      baselineValue: baseline.worldBankIndicators.fxReservesMonthsImport,
      liveValue: liveReserves,
      delta: Number((liveReserves - baseline.worldBankIndicators.fxReservesMonthsImport).toFixed(2)),
      observationYear: reservesRes?.year || '2025/26 WEO',
      source: reservesRes ? 'World Bank WDI v2 Live' : 'World Bank Baseline',
      isLiveApi: Boolean(reservesRes),
    },
  ];

  // Recompute DSA (r - g) and pb* under live indicators
  const rEff = Number(
    Math.max(
      1.2,
      currentSnapshot.monetaryAndMarket.sovereign10YBondYieldPct - liveCpi * 0.72
    ).toFixed(2)
  );
  const rMinusG = Number((rEff - liveGdp).toFixed(2));
  const pbStar = Number((((rEff - liveGdp) / (100 + liveGdp)) * liveDebt).toFixed(2));
  const fiscalGap = Number((pbStar - currentSnapshot.imfIndicators.primaryFiscalBalancePct).toFixed(2));

  const realPolRate = Number(
    (currentSnapshot.monetaryAndMarket.policyRatePct - liveCpi).toFixed(2)
  );

  const syncedFeeds: string[] = [];
  const worldBankHits = liveHitCount - (usTreasury10Y ? 1 : 0);
  if (worldBankHits > 0) syncedFeeds.push('World Bank Open Data v2 (browser sync)');
  if (usTreasury10Y) syncedFeeds.push('US Treasury Fiscal Data (browser sync)');
  const previousVerified = currentSnapshot.dataStatus?.verifiedLiveSources || [];
  const verifiedLiveSources = Array.from(new Set([...previousVerified, ...syncedFeeds]));
  const syncedAt = new Date().toISOString();

  const updatedSnapshot: OpenDataSnapshot = {
    ...currentSnapshot,
    fetchedAt: syncedAt,
    liveApiSourcesActive: Array.from(
      new Set([...(currentSnapshot.liveApiSourcesActive || []), ...syncedFeeds])
    ),
    dataStatus: (currentSnapshot.dataStatus || syncedFeeds.length > 0)
      ? { verifiedLiveSources, checkedAt: syncedAt }
      : currentSnapshot.dataStatus,
    imfIndicators: {
      ...currentSnapshot.imfIndicators,
      debtToGdpPct: liveDebt,
      realGdpGrowthPct: liveGdp,
      cpiInflationPct: liveCpi,
    },
    worldBankIndicators: {
      ...currentSnapshot.worldBankIndicators,
      fxReservesMonthsImport: liveReserves,
      currentAccountPctGdp: liveCab,
    },
    monetaryAndMarket: {
      ...currentSnapshot.monetaryAndMarket,
      realPolicyRatePct: realPolRate,
    },
    dsaAnalytics: {
      ...currentSnapshot.dsaAnalytics,
      effectiveRealInterestRatePct: rEff,
      realGdpGrowthRatePct: liveGdp,
      rMinusGDifferentialPct: rMinusG,
      debtStabilizingPrimaryBalancePct: pbStar,
      fiscalConsolidationGapPct: fiscalGap,
    },
  };

  const syncStatus: LiveMacroSyncResult['syncStatus'] =
    liveHitCount >= 4
      ? 'LIVE_WORLD_BANK_AND_TREASURY'
      : liveHitCount >= 1
      ? 'HYBRID_PARTIAL_LIVE'
      : 'DETERMINISTIC_FALLBACK';

  const summaryHeadline =
    syncStatus === 'DETERMINISTIC_FALLBACK'
      ? `Could not reach World Bank or US Treasury for ${currentSnapshot.countryName} (${iso3}); figures remain built-in sample values, not live data.`
      : `Updated ${liveHitCount} series for ${currentSnapshot.countryName} from World Bank and US Treasury${
          syncStatus === 'HYBRID_PARTIAL_LIVE' ? ' (some series did not answer and keep their previous values)' : ''
        }. The primary balance needed to stabilise debt is now ${pbStar >= 0 ? '+' : ''}${pbStar.toFixed(1)}% of GDP.`;

  return {
    iso3,
    countryName: currentSnapshot.countryName,
    syncedAt: new Date().toISOString(),
    syncStatus,
    us10YTreasuryBenchmarkPct: us10YBenchmark,
    updatedSnapshot,
    deltas,
    summaryHeadline,
  };
}
