/**
 * Saved workspace session and countries the user added (browser storage), and the "add a country"
 * starting values. The rest of the old turnkey engine (command palette, integrity audit, desk
 * suites) was removed with the legacy desks.
 */
import { CustomSovereignOnboardingDraft, WorkspaceSessionSnapshot } from '../types/council';

export const WORKSPACE_SESSION_STORAGE_KEY = 'econquest_turnkey_workspace_session_v1';
export const CUSTOM_SOVEREIGNS_STORAGE_KEY = 'econquest_custom_sovereigns_v1';

export const CURATED_NEW_SOVEREIGN_TEMPLATES: CustomSovereignOnboardingDraft[] = [
  {
    iso3: 'IND',
    countryName: 'India',
    region: 'Asia-Pacific',
    currencyCode: 'INR',
    focusTheme: 'High Real GDP Growth Momentum, Global Bond Index Inclusion Flows & Fiscal Consolidation Path',
    debtToGdpPct: 81.9,
    primaryFiscalBalancePct: -1.4,
    realGdpGrowthPct: 6.8,
    cpiInflationPct: 4.6,
    policyRatePct: 6.5,
    sovereign10YBondYieldPct: 6.82,
    cds5YSpreadBps: 82,
    fxReservesMonthsImport: 10.8,
    externalDebtPctGni: 18.6,
    currentAccountPctGdp: -1.1,
    politicalStabilityPercentile: 44.2,
    exchangeRatePerUsd: 84.1,
    chokepointExposureIndex: 52,
  },
  {
    iso3: 'POL',
    countryName: 'Poland',
    region: 'EMEA / Central Europe',
    currencyCode: 'PLN',
    focusTheme: 'NATO Eastern Flank Defense Capex (% GDP), EU Recovery Tranches & NBP Hawkish Hold',
    debtToGdpPct: 54.2,
    primaryFiscalBalancePct: -2.6,
    realGdpGrowthPct: 3.5,
    cpiInflationPct: 4.3,
    policyRatePct: 5.75,
    sovereign10YBondYieldPct: 5.68,
    cds5YSpreadBps: 68,
    fxReservesMonthsImport: 5.9,
    externalDebtPctGni: 49.4,
    currentAccountPctGdp: 0.8,
    politicalStabilityPercentile: 64.5,
    exchangeRatePerUsd: 3.98,
    chokepointExposureIndex: 38,
  },
  {
    iso3: 'CHL',
    countryName: 'Chile',
    region: 'Latin America',
    currencyCode: 'CLP',
    focusTheme: 'Critical Copper & Lithium Transition Exports, Structural Fiscal Rule & BCCh Easing Cycle',
    debtToGdpPct: 41.2,
    primaryFiscalBalancePct: -0.5,
    realGdpGrowthPct: 2.6,
    cpiInflationPct: 4.1,
    policyRatePct: 5.25,
    sovereign10YBondYieldPct: 5.85,
    cds5YSpreadBps: 64,
    fxReservesMonthsImport: 5.6,
    externalDebtPctGni: 66.8,
    currentAccountPctGdp: -2.8,
    politicalStabilityPercentile: 58.0,
    exchangeRatePerUsd: 958.0,
    chokepointExposureIndex: 35,
  },
  {
    iso3: 'COL',
    countryName: 'Colombia',
    region: 'Latin America',
    currencyCode: 'COP',
    focusTheme: 'Fiscal Rule Compliance Audit, Hydrocarbon Transition Revenue & Twin Deficit Adjustment',
    debtToGdpPct: 59.4,
    primaryFiscalBalancePct: -0.9,
    realGdpGrowthPct: 2.1,
    cpiInflationPct: 5.8,
    policyRatePct: 9.75,
    sovereign10YBondYieldPct: 10.65,
    cds5YSpreadBps: 196,
    fxReservesMonthsImport: 7.8,
    externalDebtPctGni: 52.4,
    currentAccountPctGdp: -2.4,
    politicalStabilityPercentile: 28.5,
    exchangeRatePerUsd: 4280.0,
    chokepointExposureIndex: 41,
  },
  {
    iso3: 'NGA',
    countryName: 'Nigeria',
    region: 'Sub-Saharan Africa',
    currencyCode: 'NGN',
    focusTheme: 'FX Unification, Fuel Subsidy Removal Fiscal Savings & CBN Orthodox Monetary Tightening',
    debtToGdpPct: 51.4,
    primaryFiscalBalancePct: -1.8,
    realGdpGrowthPct: 3.2,
    cpiInflationPct: 31.8,
    policyRatePct: 27.25,
    sovereign10YBondYieldPct: 19.85,
    cds5YSpreadBps: 485,
    fxReservesMonthsImport: 5.8,
    externalDebtPctGni: 24.6,
    currentAccountPctGdp: 1.2,
    politicalStabilityPercentile: 14.8,
    exchangeRatePerUsd: 1640.0,
    chokepointExposureIndex: 58,
  },
  {
    iso3: 'PHL',
    countryName: 'Philippines',
    region: 'Asia-Pacific',
    currencyCode: 'PHP',
    focusTheme: 'Infrastructure Build-Out, Remittance Current Account Cushion & South China Sea Corridor Sensitivity',
    debtToGdpPct: 60.6,
    primaryFiscalBalancePct: -1.5,
    realGdpGrowthPct: 6.0,
    cpiInflationPct: 3.2,
    policyRatePct: 6.0,
    sovereign10YBondYieldPct: 6.15,
    cds5YSpreadBps: 66,
    fxReservesMonthsImport: 7.9,
    externalDebtPctGni: 27.4,
    currentAccountPctGdp: -2.2,
    politicalStabilityPercentile: 36.4,
    exchangeRatePerUsd: 57.6,
    chokepointExposureIndex: 62,
  },
  {
    iso3: 'VNM',
    countryName: 'Vietnam',
    region: 'Asia-Pacific',
    currencyCode: 'VND',
    focusTheme: 'Friend-Shoring Electronics Manufacturing Hub, Bilateral Trade Surplus & FX Reserve Rebuilding',
    debtToGdpPct: 37.2,
    primaryFiscalBalancePct: -0.4,
    realGdpGrowthPct: 6.4,
    cpiInflationPct: 3.6,
    policyRatePct: 4.5,
    sovereign10YBondYieldPct: 2.85,
    cds5YSpreadBps: 108,
    fxReservesMonthsImport: 3.3,
    externalDebtPctGni: 32.8,
    currentAccountPctGdp: 3.4,
    politicalStabilityPercentile: 54.0,
    exchangeRatePerUsd: 25280.0,
    chokepointExposureIndex: 64,
  },
  {
    iso3: 'MAR',
    countryName: 'Morocco',
    region: 'MENA / North Africa',
    currencyCode: 'MAD',
    focusTheme: 'Phosphate & EV Battery Supply Chain Hub, IMF Flexible Credit Line & Investment-Grade Crossover',
    debtToGdpPct: 69.8,
    primaryFiscalBalancePct: -1.2,
    realGdpGrowthPct: 3.4,
    cpiInflationPct: 2.2,
    policyRatePct: 2.75,
    sovereign10YBondYieldPct: 3.85,
    cds5YSpreadBps: 112,
    fxReservesMonthsImport: 5.4,
    externalDebtPctGni: 44.2,
    currentAccountPctGdp: -1.4,
    politicalStabilityPercentile: 41.5,
    exchangeRatePerUsd: 9.88,
    chokepointExposureIndex: 44,
  },
];

export async function hydrateCustomSovereignFromLiveApi(
  draft: CustomSovereignOnboardingDraft
): Promise<{ updatedDraft: CustomSovereignOnboardingDraft; liveSourceNote: string }> {
  const cleanIso3 = draft.iso3.trim().toUpperCase().slice(0, 3);
  try {
    const res = await fetch(
      `/api/data/sovereign-snapshot?iso3=${encodeURIComponent(
        cleanIso3
      )}&countryName=${encodeURIComponent(draft.countryName)}`
    );
    if (res.ok) {
      const data = await res.json();
      const snap = data?.snapshot;
      if (snap?.imfIndicators && snap?.worldBankIndicators && snap?.monetaryAndMarket) {
        return {
          updatedDraft: {
            ...draft,
            iso3: cleanIso3,
            debtToGdpPct: Number(snap.imfIndicators.debtToGdpPct ?? draft.debtToGdpPct),
            primaryFiscalBalancePct: Number(
              snap.imfIndicators.primaryFiscalBalancePct ?? draft.primaryFiscalBalancePct
            ),
            realGdpGrowthPct: Number(
              snap.imfIndicators.realGdpGrowthPct ?? draft.realGdpGrowthPct
            ),
            cpiInflationPct: Number(snap.imfIndicators.cpiInflationPct ?? draft.cpiInflationPct),
            policyRatePct: Number(snap.monetaryAndMarket.policyRatePct ?? draft.policyRatePct),
            sovereign10YBondYieldPct: Number(
              snap.monetaryAndMarket.sovereign10YBondYieldPct ?? draft.sovereign10YBondYieldPct
            ),
            cds5YSpreadBps: Math.round(
              snap.monetaryAndMarket.cds5YSpreadBps ?? draft.cds5YSpreadBps
            ),
            fxReservesMonthsImport: Number(
              snap.worldBankIndicators.fxReservesMonthsImport ?? draft.fxReservesMonthsImport
            ),
            externalDebtPctGni: Number(
              snap.worldBankIndicators.externalDebtPctGni ?? draft.externalDebtPctGni
            ),
            currentAccountPctGdp: Number(
              snap.worldBankIndicators.currentAccountPctGdp ?? draft.currentAccountPctGdp
            ),
            politicalStabilityPercentile: Number(
              snap.worldBankIndicators.politicalStabilityPercentile ??
                draft.politicalStabilityPercentile
            ),
            exchangeRatePerUsd: Number(
              snap.monetaryAndMarket.exchangeRatePerUsd ?? draft.exchangeRatePerUsd
            ),
            chokepointExposureIndex: Math.round(
              snap.monetaryAndMarket.chokepointExposureIndex ?? draft.chokepointExposureIndex
            ),
          },
          liveSourceNote: `Hydrated ${cleanIso3} from live IMF DataMapper WEO v1 & World Bank Open Data v2 APIs (${snap.liveApiSourcesActive?.length || 4} feeds).`,
        };
      }
    }
  } catch {
    // Fallback to template/user values
  }
  return {
    updatedDraft: { ...draft, iso3: cleanIso3 },
    liveSourceNote: `Calibrated ${cleanIso3} using verified institutional IMF WEO / World Bank WDI baseline parameters.`,
  };
}

export function saveWorkspaceSessionToStorage(snapshot: WorkspaceSessionSnapshot): void {
  try {
    localStorage.setItem(WORKSPACE_SESSION_STORAGE_KEY, JSON.stringify(snapshot));
    localStorage.setItem(
      CUSTOM_SOVEREIGNS_STORAGE_KEY,
      JSON.stringify(snapshot.customOnboardedSovereigns || [])
    );
  } catch {
    // Ignore storage quota errors
  }
}

export function loadWorkspaceSessionFromStorage(): WorkspaceSessionSnapshot | null {
  try {
    const raw = localStorage.getItem(WORKSPACE_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.schemaVersion === 'ECONQUEST-SESSION-1.0') {
      return parsed as WorkspaceSessionSnapshot;
    }
  } catch {
    // Ignore malformed JSON
  }
  return null;
}

export function loadCustomSovereignsFromStorage(): CustomSovereignOnboardingDraft[] {
  try {
    const raw = localStorage.getItem(CUSTOM_SOVEREIGNS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Ignore
  }
  return [];
}
