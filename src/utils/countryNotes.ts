import { netInterestPct } from './imfFiscal';
import { ucdpFigures, ucdpMissing } from './ucdpConflict';
import { HC_SPREAD_LABEL, hcSpreadMissing, hcSpreadWhen } from './hardCurrencySpread';
import type { CouncilAssessmentRun, WatchlistItem } from '../types/council';
import { EU_SURVEY_SOURCE, euSurveyGeo, euSurveyReading, euSurveyValue, NOT_A_PMI } from './euSurveys';
import { getSnapshotDataStatus, DATA_MODE_LABEL, formatAsOf, type SnapshotDataStatus } from './dataStatus';
import { describeOfficialYield, formatPeriod } from './officialYields';
import { nextOfficialEvent, releaseGap, upcomingOfficialEvents, type ReleaseCategory } from '../data/officialCalendar';
import { missingReason, type MissingReason } from './liveFigures';
import { distTaxFromSnapshot, giniValue, GINI_LOOKBACK_YEARS } from './distributionTaxes';
import { peopleFromSnapshot, povertyValue, POVERTY_FIELDS, POVERTY_LABEL } from './peopleLiving';
import { currencyValue, IDS_STRUCTURE_SOURCE, INVESTOR_BASE_US_HELP } from './debtStructure';
import { INVESTOR_BASE_SETUP_HELP, investorBaseSource, investorBaseValue } from './investorBase';
import { CONCENTRATION_SOURCE, ENERGY_SOURCE, EXPORT_FIELDS, IMPORT_FIELDS, TRADE_GROUPS_NOTE, TRADE_MIX_SOURCE, concentrationValue, netEnergyValue, shareSplitValue, topPartnersValue, tradeMixFromSnapshot } from './tradeMix';
import { comtradeMissing, HHI_MIN_COVERAGE_PCT } from './comtradeTrade';
import { PRIVATE_DEBT_NOT_COVERED_HELP, PRIVATE_DEBT_SETUP_HELP, PRIVATE_DEBT_SOURCE, SECTOR_RULE, SECTOR_SOURCE, SECTOR_YEARS_HELP, balanceValue, quarterText, sectorBalances } from './sectorBalances';
import { GOV_LEVELS_CENTRAL_ONLY_HELP, GOV_LEVELS_NOT_COVERED_HELP, GOV_LEVELS_SETUP_HELP, LEVEL_LABEL, LEVEL_TABLE_LABEL, LEVELS_NOTE, levelsValue } from './govLevels';
import { ACTIVITY_NOT_COVERED_HELP, ACTIVITY_NOT_IN_ANSWER_HELP, ACTIVITY_SETUP_HELP, activitySourceOf, INDICATOR_IDS, INDICATOR_LABEL, readingValue, SOURCE_NAME } from './monthlyIndicators';
import { HOUSE_PRICES_NOT_COVERED_HELP, HOUSE_PRICES_SETUP_HELP, HOUSE_PRICES_SOURCE, REAL_WAGES_SOURCE, WAGES_GROWTH_HELP, WAGES_NOT_COVERED_HELP, WAGES_SETUP_HELP, WAGES_SOURCE, housePriceValue, wageGrowthValue } from './wagesHousing';
import { CLIMATE_RISK_HELP, EMISSIONS_SOURCE, ENERGY_MIX_LEGACY_NOTE, ENERGY_MIX_NOT_COVERED_HELP, ENERGY_MIX_SETUP_HELP, ENERGY_MIX_SOURCE, ENERGY_MIX_TERMS_NOTE, RENEWABLE_SOURCE, climateFromSnapshot, energyMixValue } from './climateEnergy';

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
  /** No real source filled this figure: value reads Missing and source says why. */
  missing?: boolean;
  /** What to do about a missing figure. */
  help?: string;
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
  /** Set when figures are missing, so the reader is told up front. */
  sampleWarning?: string;
}

export interface NoteSection {
  id: string;
  heading: string;
  lines: string[];
}

export type SourceKind = 'imf' | 'worldbank' | 'market' | 'yield' | 'cds' | 'model' | 'sample';
type Kind = SourceKind;

/** Where a figure path comes from, for its source tag. */
function pathSource(status: SnapshotDataStatus, path: string, open?: CouncilAssessmentRun['openData']): string {
  if (path === 'market.sovereign10YBondYieldPct' && status.officialYield) return `official, ${describeOfficialYield(status.officialYield).when}`;
  if (path === 'market.cds5YSpreadBps' && status.ownCds) return `your ${status.ownCds.source} data, ${formatPeriod(status.ownCds.date)}`;
  if (path === 'market.hcBondSpreadBps' && open?.hcBondSpread) return `BCRP, J.P. Morgan EMBI Global, ${hcSpreadWhen(open.hcBondSpread.period)}; bond spread, not CDS`;
  const tag = open?.liveFields?.[path];
  if (path.startsWith('imf.')) {
    // The WEO year the figure is for, so a saved figure is read with its period ("IMF WEO, 2025").
    const year = open?.imfIndicators?.years?.[path];
    const base = tag || 'IMF WEO';
    return year && !base.includes(year) ? `${base}, ${year}` : base;
  }
  if (path.startsWith('wb.')) return tag || 'World Bank';
  if (path.startsWith('market.exchangeRate') || path.startsWith('market.fx')) {
    if (tag?.includes('kept from the')) return tag;
    const day = String(open?.fetchedAt || '').slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(day) ? `FX spot, ${formatPeriod(day)}` : 'FX spot';
  }
  return tag || 'live feed';
}

/**
 * Marks where an observation's plain "what it means" sentence starts (an invisible separator), so
 * the brief can hide it when help is off (src/utils/helpLevel.ts). Reports join the two.
 */
export const MEANS = '\u2063';
export function splitMeaning(j: string): { fact: string; meaning?: string } {
  const i = j.indexOf(MEANS);
  return i < 0 ? { fact: j } : { fact: j.slice(0, i), meaning: j.slice(i + 1) };
}
export const joinMeaning = (j: string): string => j.split(MEANS).join(' ');

/** Why a figure path is missing, and what would fill it. */
export function pathMissing(status: SnapshotDataStatus, path: string): MissingReason {
  if (path === 'market.sovereign10YBondYieldPct') return missingReason('yield', status.iso3);
  if (path === 'market.cds5YSpreadBps') return missingReason('cds', status.iso3);
  if (path === 'market.hcBondSpreadBps') return hcSpreadMissing(status.iso3);
  if (path === 'market.policyRatePct') return missingReason('policy', status.iso3);
  if (path.startsWith('imf.'))
    return status.isFeedLive('imf')
      ? { kind: 'unreachable', short: 'Not in IMF data', help: 'The International Monetary Fund answered, but has not published this figure for this country. This happens for some small economies, for countries in crisis or conflict, and for figures the IMF stopped estimating. The app leaves it Missing rather than fill the gap.' }
      : missingReason('debt', status.iso3);
  if (path.startsWith('wb.'))
    return status.isFeedLive('worldbank')
      ? { kind: 'unreachable', short: 'Not in World Bank data', help: 'The World Bank answered, but has no recent figure for this country. World Bank figures are yearly and arrive a year or more late, and some countries do not report them. The app leaves it Missing rather than fill the gap.' }
      : missingReason('reserves', status.iso3);
  if (path.startsWith('market.exchangeRate') || path.startsWith('market.fx'))
    return { kind: 'unreachable', short: 'FX feed did not answer', help: 'The exchange rate comes from a free daily exchange-rate service, which did not answer this time. This is usually temporary. Press Refresh now under Research > One country to try again.' };
  if (path.startsWith('gdelt.')) return { kind: 'unreachable', short: 'GDELT did not answer', help: 'News figures come from GDELT, a free project that reads news sites worldwide, which did not answer this time. It is often busy and asks callers to wait. Press Refresh now under Research > One country to try again.' };
  return { kind: 'setup', short: 'No source yet', help: 'No free live or official source for this figure is connected yet. The app shows Missing rather than an estimate or a sample number.' };
}

export function missingRow(label: string, reason: MissingReason): BriefRow {
  return { label, value: 'Missing', source: reason.short, verified: false, missing: true, help: reason.help };
}

/** A figure from one path: shown only when a real source filled it. */
export function liveRow(status: SnapshotDataStatus, label: string, path: string, fmt: (v: number) => string, open?: CouncilAssessmentRun['openData']): BriefRow {
  const v = status.live(path);
  return v === undefined ? missingRow(label, pathMissing(status, path)) : { label, value: fmt(v), source: pathSource(status, path, open), verified: true };
}

const PATH_NAME: Record<string, string> = {
  'market.policyRatePct': 'a policy rate',
  'market.sovereign10YBondYieldPct': 'an official 10Y yield',
  'market.cds5YSpreadBps': 'your CDS',
  'market.hcBondSpreadBps': 'a USD bond spread',
  'imf.cpiInflationPct': 'live inflation',
  'imf.debtToGdpPct': 'live debt/GDP',
  'imf.realGdpGrowthPct': 'live growth',
  'imf.primaryFiscalBalancePct': 'a live primary balance',
  'imf.overallBalancePct': 'a live overall balance',
  'imf.currentAccountImfPct': 'a live IMF current account',
};

const usdBn = (v: number) => `${v < 0 ? '-' : ''}US$${Math.abs(v).toFixed(1)} bn`;

/**
 * Net interest paid, % of GDP: primary balance minus overall balance, both IMF Fiscal Monitor for
 * the same year (src/utils/imfFiscal.ts). Missing when either is missing or the years differ.
 */
export function netInterestRow(status: SnapshotDataStatus, open?: CouncilAssessmentRun['openData']): BriefRow {
  const years = open?.imfIndicators?.years || {};
  const yPrimary = years['imf.primaryFiscalBalancePct'];
  const yOverall = years['imf.overallBalancePct'];
  const row = modelRow(status, 'Net interest paid', ['imf.primaryFiscalBalancePct', 'imf.overallBalancePct'], () => '', `primary minus overall balance, IMF Fiscal Monitor${yOverall ? ` ${yOverall}` : ''}`);
  if (row.missing) return row;
  const v = netInterestPct(status.live('imf.primaryFiscalBalancePct'), status.live('imf.overallBalancePct'), yPrimary, yOverall);
  return v === undefined
    ? missingRow('Net interest paid', { kind: 'unreachable', short: 'Balances are for different years', help: `Net interest is worked out as the primary balance minus the overall balance, so both must be for the same year. The IMF figures are for different years (primary balance ${yPrimary}, overall balance ${yOverall}), and mixing years would give a wrong answer.` })
    : { ...row, value: `${pct(v)} of GDP` };
}

/**
 * Why a survey figure (Gini, poverty) is Missing: "no survey" only when its own World Bank request
 * answered and held none in the look-back window; when that request failed, say so instead.
 */
export function surveyMissing(status: SnapshotDataStatus, open: CouncilAssessmentRun['openData'], field: string, help: string): MissingReason {
  const base = pathMissing(status, `wb.${field}`);
  if (!status.isFeedLive('worldbank')) return base;
  if (open?.worldBankIndicators?.answeredFields?.includes(field)) return { ...base, short: `No survey in the last ${GINI_LOOKBACK_YEARS} years`, help };
  return {
    kind: 'unreachable',
    short: 'World Bank did not answer for this figure',
    help: 'Other World Bank figures came in, but the request for this one failed or timed out, so the app cannot tell whether a survey exists. Press Refresh now under Research > One country to try again.',
  };
}

/** Help for a missing Gini: surveys are rare, and the app looks back only GINI_LOOKBACK_YEARS. */
export const GINI_MISSING_HELP = `The Gini index comes from household surveys, which many countries run only every few years and some have never published. The app looks back ${GINI_LOOKBACK_YEARS} years and leaves it Missing rather than show an older survey or an estimate.`;

/**
 * Distribution and taxes (G16, src/utils/distributionTaxes.ts): Gini with its survey year and kind,
 * central government tax revenue and its split, applied tariffs. Each row Missing with a reason.
 */
export function distTaxRows(status: SnapshotDataStatus, open: CouncilAssessmentRun['openData'], now: Date = new Date()): BriefRow[] {
  const giniLabel = 'Inequality (Gini index)';
  const g = distTaxFromSnapshot(open)?.gini;
  const gini: BriefRow = g
    ? { label: giniLabel, value: giniValue(g, now), source: pathSource(status, 'wb.giniIndex', open), verified: true }
    : missingRow(giniLabel, surveyMissing(status, open, 'giniIndex', GINI_MISSING_HELP));
  const share = (v: number) => `${pct(v)} of revenue`;
  return [
    gini,
    liveRow(status, 'Tax revenue, central government', 'wb.taxRevenuePctGdp', (v) => `${pct(v)} of GDP`, open),
    liveRow(status, 'Taxes on income and profits', 'wb.taxIncomePctRevenue', share, open),
    liveRow(status, 'Taxes on goods and services', 'wb.taxGoodsPctRevenue', share, open),
    liveRow(status, 'Taxes on trade', 'wb.taxTradePctRevenue', share, open),
    liveRow(status, 'Applied tariff, weighted mean', 'wb.tariffWeightedPct', (v) => pct(v, 2), open),
    liveRow(status, 'Applied tariff, simple mean', 'wb.tariffSimplePct', (v) => pct(v, 2), open),
  ];
}

/** Help for a missing poverty rate: surveys are rare, and the app looks back only GINI_LOOKBACK_YEARS. */
export const POVERTY_MISSING_HELP = `Poverty rates come from household surveys, which many countries run only every few years and some have never published. The app looks back ${GINI_LOOKBACK_YEARS} years and leaves it Missing rather than show an older survey or an estimate.`;

/**
 * People and living standards (G17, src/utils/peopleLiving.ts): poverty at the three international
 * lines with survey year and kind, remittances, labour force participation and youth unemployment
 * (ILO modelled estimates), age dependency. Each row Missing with a reason.
 */
export function peopleRows(status: SnapshotDataStatus, open: CouncilAssessmentRun['openData'], now: Date = new Date()): BriefRow[] {
  const pf = peopleFromSnapshot(open);
  const poverty = POVERTY_FIELDS.map((f): BriefRow => {
    const p = pf?.[f];
    const label = POVERTY_LABEL[f];
    return p
      ? { label, value: povertyValue(p, now), source: pathSource(status, `wb.${f}`, open), verified: true }
      : missingRow(label, surveyMissing(status, open, f, POVERTY_MISSING_HELP));
  });
  return [
    ...poverty,
    liveRow(status, 'Remittances received', 'wb.remittancesPctGdp', (v) => `${pct(v)} of GDP`, open),
    liveRow(status, 'Labour force participation', 'wb.labourParticipationPct', (v) => `${pct(v)} of people aged 15 and over`, open),
    liveRow(status, 'Youth unemployment', 'wb.youthUnemploymentPct', (v) => `${pct(v)} of workers aged 15-24`, open),
    liveRow(status, 'Age dependency ratio', 'wb.ageDependencyRatio', (v) => `${v.toFixed(0)} per 100 people aged 15-64`, open),
  ];
}

/** Missing reason for a part of World Bank IDS: not answered, or the country is not covered. */
function idsMissing(open: CouncilAssessmentRun['openData']): MissingReason {
  return open.debtStructure
    ? { kind: 'unreachable', short: 'Not in World Bank IDS', help: 'The World Bank International Debt Statistics answered but have no figure for this country. They cover low- and middle-income countries only, so richer countries are never in them. The app leaves it Missing rather than fill the gap.' }
    : { kind: 'unreachable', short: 'World Bank IDS did not answer', help: 'This comes from the World Bank International Debt Statistics, which are free. They did not answer this time. Press Refresh now under Research > One country to try again.' };
}

/** Who holds government debt: the IMF investor base workbook, or Missing with what to do. */
export function investorBaseRow(iso3: string, r: CouncilAssessmentRun['openData']['investorBase']): BriefRow {
  const hold = 'Who holds government debt';
  if (r?.state === 'found' && r.holders) return { label: hold, value: investorBaseValue(r.holders, r.lastYear ?? 0), source: investorBaseSource(r), verified: true };
  if (iso3 === 'USA') return missingRow(hold, { kind: 'setup', short: 'Only foreign holders (TIC) connected', help: INVESTOR_BASE_US_HELP });
  if (r?.state === 'notCovered')
    return missingRow(hold, { kind: 'unreachable', short: 'Not in the IMF investor base', help: 'The IMF Sovereign Debt Investor Base covers emerging markets and developing economies only, and this country is not among them. The app leaves it Missing rather than estimate it.' });
  if (r?.state === 'unreadable') return missingRow(hold, { kind: 'setup', short: 'IMF investor base file could not be read', help: `${INVESTOR_BASE_SETUP_HELP} The file there did not read: ${r.reason || 'unknown reason'}.` });
  return missingRow(hold, { kind: 'setup', short: 'IMF investor base file not downloaded', help: INVESTOR_BASE_SETUP_HELP });
}

/**
 * Debt structure (G19, src/utils/debtStructure.ts): interest as % of revenue, the currency mix and
 * new-loan maturity of public external debt, and who holds government debt (Missing until the IMF
 * investor base terms are checked). Rows for the Fiscal and debt group.
 */
export function debtStructureRows(status: SnapshotDataStatus, open: CouncilAssessmentRun['openData']): BriefRow[] {
  const ds = open.debtStructure;
  const cur = 'Public external debt by currency';
  const mat = 'Maturity of new public external loans';
  const hold = 'Who holds government debt';
  return [
    liveRow(status, 'Interest payments, central government', 'wb.interestPctRevenue', (v) => `${pct(v)} of revenue`, open),
    ds?.currency ? { label: cur, value: currencyValue(ds.currency), source: IDS_STRUCTURE_SOURCE, verified: true } : missingRow(cur, idsMissing(open)),
    ds?.newLoanMaturity
      ? { label: mat, value: `${ds.newLoanMaturity.years.toFixed(1)} years on average (${ds.newLoanMaturity.year})`, source: `${IDS_STRUCTURE_SOURCE}; loans committed that year, all lenders, not the debt already owed`, verified: true }
      : missingRow(mat, idsMissing(open)),
    investorBaseRow(status.iso3, open.investorBase),
  ];
}

/**
 * Trade and commodity exposure (G18, src/utils/tradeMix.ts): what the country sells and buys by
 * group, net energy imports, export concentration (the app's calculation) and the top five export
 * markets (UN Comtrade). Each row Missing with a reason.
 */
export function tradeRows(status: SnapshotDataStatus, open: CouncilAssessmentRun['openData'], now: Date = new Date()): BriefRow[] {
  const tm = tradeMixFromSnapshot(open);
  const ct = open.comtrade;
  const split = (label: string, fields: typeof EXPORT_FIELDS | typeof IMPORT_FIELDS): BriefRow => {
    const v = tm ? shareSplitValue(tm, fields) : undefined;
    return v ? { label, value: v, source: `${TRADE_MIX_SOURCE}; ${TRADE_GROUPS_NOTE}`, verified: true } : missingRow(label, pathMissing(status, `wb.${fields[0]}`));
  };
  const energy = 'Net energy imports';
  const conc = 'Export concentration (app calculation)';
  const top = 'Top five export markets';
  const ctMissing = comtradeMissing(status.iso3, false);
  const ctReason: MissingReason = { kind: 'unreachable', short: ctMissing.short, help: ctMissing.help };
  return [
    split('Goods exports by group', EXPORT_FIELDS),
    split('Goods imports by group', IMPORT_FIELDS),
    tm?.netEnergyImportsPct
      ? { label: energy, value: netEnergyValue(tm.netEnergyImportsPct, now), source: `${ENERGY_SOURCE}; energy use minus production, as % of use`, verified: true }
      : missingRow(energy, pathMissing(status, 'wb.netEnergyImportsPct')),
    ct?.exportHhi
      ? { label: conc, value: concentrationValue(ct.exportHhi, ct.productYear), source: CONCENTRATION_SOURCE, verified: false }
      : missingRow(
          conc,
          ct
            ? {
                kind: 'unreachable',
                short: 'Comtrade gave too few product groups',
                help: `UN Comtrade answered, but the product chapters it listed cover less than ${HHI_MIN_COVERAGE_PCT}% of exports, or it gave only the commodity chapters. The app works out the concentration only from (nearly) every chapter, so it leaves it Missing.`,
              }
            : ctReason
        ),
    ct?.topExportPartners?.length
      ? { label: top, value: topPartnersValue(ct), source: `official, UN Comtrade ${ct.year} (pulled ${ct.pulledAt.slice(0, 10)}); share of goods exports`, verified: true }
      : missingRow(top, ctReason),
  ];
}

/**
 * Climate and energy (G20, src/utils/climateEnergy.ts): greenhouse gas emissions per head and the
 * renewable share (World Bank), the energy mix (Our World in Data copy on this computer) and
 * physical climate risk (Missing until ND-GAIN states terms). Each row Missing with a reason.
 */
export function climateRows(status: SnapshotDataStatus, open: CouncilAssessmentRun['openData']): BriefRow[] {
  const cf = climateFromSnapshot(open);
  const em = open.energyMix;
  const ghg = 'Greenhouse gas emissions per person';
  const ren = 'Renewable share of energy use';
  const mix = 'Energy mix';
  return [
    cf?.ghgPerHeadT
      ? { label: ghg, value: `${cf.ghgPerHeadT.value.toFixed(1)} tonnes of CO2 equivalent (${cf.ghgPerHeadT.year})`, source: EMISSIONS_SOURCE, verified: true }
      : missingRow(ghg, pathMissing(status, 'wb.ghgPerHeadT')),
    cf?.renewableSharePct
      ? { label: ren, value: `${pct(cf.renewableSharePct.value)} of final energy use (${cf.renewableSharePct.year})`, source: RENEWABLE_SOURCE, verified: true }
      : missingRow(ren, pathMissing(status, 'wb.renewableSharePct')),
    em?.mix
      ? {
          label: mix,
          value: energyMixValue(em.mix),
          source: `${ENERGY_MIX_SOURCE}${em.file === 'legacy' ? `; ${ENERGY_MIX_LEGACY_NOTE}` : ''} (downloaded ${em.pulledAt.slice(0, 10)}); ${ENERGY_MIX_TERMS_NOTE}`,
          verified: true,
        }
      : em
        ? missingRow(mix, { kind: 'unreachable', short: 'Not in the Energy Institute figures', help: ENERGY_MIX_NOT_COVERED_HELP })
        : missingRow(mix, { kind: 'setup', short: 'Energy file not downloaded yet', help: ENERGY_MIX_SETUP_HELP }),
    missingRow('Physical climate risk (ND-GAIN)', { kind: 'setup', short: 'ND-GAIN states no licence', help: CLIMATE_RISK_HELP }),
  ];
}

/**
 * Wages and house prices (G22, src/utils/wagesHousing.ts), under Growth and inflation: nominal and
 * real wage growth (ILOSTAT, World Bank inflation), real and nominal house prices (BIS). Each with
 * its year or quarter, or Missing with a reason.
 */
export function wagesHousingRows(open: CouncilAssessmentRun['openData']): BriefRow[] {
  const w = open.wages;
  const h = open.housePrices;
  const wageMissing = (label: string) =>
    !w
      ? missingRow(label, { kind: 'setup', short: 'ILOSTAT not downloaded yet', help: WAGES_SETUP_HELP })
      : !w.reading
        ? missingRow(label, { kind: 'unreachable', short: 'Not in ILOSTAT', help: WAGES_NOT_COVERED_HELP })
        : missingRow(label, {
            kind: 'unreachable',
            short: w.reading.growthNote === 'break' ? 'Break in the series' : w.reading.growthNote === 'no_inflation' ? 'No inflation for that year' : 'No figure for the year before',
            help: WAGES_GROWTH_HELP[w.reading.growthNote || 'no_previous_year'],
          });
  const houseMissing = (label: string) =>
    !h
      ? missingRow(label, { kind: 'setup', short: 'BIS file not downloaded yet', help: HOUSE_PRICES_SETUP_HELP })
      : missingRow(label, { kind: 'unreachable', short: 'Not in the BIS series', help: HOUSE_PRICES_NOT_COVERED_HELP });
  const pulled = (at: string) => ` (pulled ${at.slice(0, 10)})`;
  const nominal = w?.reading && wageGrowthValue(w.reading, 'nominal');
  const real = w?.reading && wageGrowthValue(w.reading, 'real');
  const hReal = h?.reading && housePriceValue(h.reading, 'real');
  const hNom = h?.reading && housePriceValue(h.reading, 'nominal');
  return [
    nominal ? { label: 'Wage growth, nominal', value: nominal, source: `official, ${WAGES_SOURCE}${pulled(w!.pulledAt)}`, verified: true } : wageMissing('Wage growth, nominal'),
    real
      ? { label: 'Wage growth, real', value: `${real}; inflation ${w!.reading!.inflationPct!.toFixed(1)}%`, source: REAL_WAGES_SOURCE, verified: false }
      : wageMissing('Wage growth, real'),
    hReal ? { label: 'House prices, real', value: hReal, source: `official, ${HOUSE_PRICES_SOURCE}, after inflation${pulled(h!.pulledAt)}`, verified: true } : houseMissing('House prices, real'),
    hNom ? { label: 'House prices, nominal', value: hNom, source: `official, ${HOUSE_PRICES_SOURCE}${pulled(h!.pulledAt)}`, verified: true } : houseMissing('House prices, nominal'),
  ];
}

/**
 * Revenue and spending by level of government (G42 step 1, src/utils/govLevels.ts), under Fiscal
 * and debt: each level as % of GDP and the state and local share, or Missing with a reason.
 */
export function govLevelRows(open: CouncilAssessmentRun['openData']): BriefRow[] {
  const g = open.govLevels;
  return (['spending', 'revenue'] as const).map((m) => {
    const label = LEVEL_LABEL[m];
    const f = g?.reading?.[m];
    if (!g) return missingRow(label, { kind: 'setup', short: 'Eurostat and IMF files not downloaded yet', help: GOV_LEVELS_SETUP_HELP });
    if (!f) return missingRow(label, { kind: 'unreachable', short: 'Not in the Eurostat or IMF figures', help: GOV_LEVELS_NOT_COVERED_HELP });
    if (f.pct.state === undefined && f.pct.local === undefined) return missingRow(label, { kind: 'unreachable', short: 'No state or local figures published', help: GOV_LEVELS_CENTRAL_ONLY_HELP });
    return { label, value: levelsValue(f), source: `official, ${LEVEL_TABLE_LABEL[f.table]}; ${LEVELS_NOTE} (pulled ${g.pulledAt.slice(0, 10)})`, verified: true };
  });
}

/**
 * Monthly activity (G41, src/utils/monthlyIndicators.ts): industrial production, retail sales and
 * the monthly unemployment rate, latest month, or Missing with a reason.
 */
export function monthlyActivityRows(iso3: string, open: CouncilAssessmentRun['openData']): BriefRow[] {
  const src = activitySourceOf(iso3);
  const ma = open.monthlyActivity;
  return INDICATOR_IDS.map((id) => {
    const label = INDICATOR_LABEL[id];
    const r = ma?.[id];
    if (r) return { label, value: readingValue(id, r), source: `official, ${r.long} (pulled ${ma!.pulledAt.slice(0, 10)})`, verified: true };
    if (!src) return missingRow(label, { kind: 'setup', short: 'No monthly source for this country', help: ACTIVITY_NOT_COVERED_HELP });
    if (!ma) return missingRow(label, { kind: 'setup', short: `${SOURCE_NAME[src]} not downloaded yet`, help: ACTIVITY_SETUP_HELP });
    return missingRow(label, { kind: 'unreachable', short: `Not in the ${SOURCE_NAME[src]} answer`, help: ACTIVITY_NOT_IN_ANSWER_HELP });
  });
}

/**
 * Sector balances and private debt (G40, src/utils/sectorBalances.ts): government balance (IMF
 * Fiscal Monitor), private balance (the remainder) and foreign balance (minus the IMF current
 * account), for the same year; household and company debt (BIS total credit). Missing with a reason.
 */
export function sectorRows(status: SnapshotDataStatus, open: CouncilAssessmentRun['openData']): BriefRow[] {
  const years = open.imfIndicators?.years || {};
  const yGov = years['imf.overallBalancePct'];
  const yCa = years['imf.currentAccountImfPct'];
  const inputs = ['imf.overallBalancePct', 'imf.currentAccountImfPct'];
  const labels = ['Government balance', 'Private sector balance (remainder)', 'Foreign balance'] as const;
  const gap = inputs.find((p) => !status.isLive(p));
  const sb = gap ? undefined : sectorBalances(status.live('imf.overallBalancePct'), status.live('imf.currentAccountImfPct'), yGov, yCa);
  const balanceRows: BriefRow[] = gap
    ? labels.map((l) => missingRow(l, { ...pathMissing(status, gap), short: `Needs ${PATH_NAME[gap] || 'live inputs'}` }))
    : !sb
      ? labels.map((l) => missingRow(l, { kind: 'unreachable', short: 'IMF figures are for different years', help: `${SECTOR_YEARS_HELP} (government balance ${yGov || 'no year'}, current account ${yCa || 'no year'}).` }))
      : [
          { label: labels[0], value: balanceValue(sb.governmentPct, sb.year), source: `official, IMF Fiscal Monitor ${sb.year}; general government net lending`, verified: true },
          { label: labels[1], value: balanceValue(sb.privatePct, sb.year), source: `model: current account minus government balance, ${SECTOR_SOURCE} ${sb.year}; the remainder of the identity`, verified: false },
          { label: labels[2], value: balanceValue(sb.foreignPct, sb.year), source: `model: minus the IMF WEO current account ${sb.year}; ${SECTOR_RULE}`, verified: false },
        ];
  const d = open.privateDebt;
  const debtRow = (label: string, v: number | undefined) =>
    d?.reading && v !== undefined
      ? { label, value: `${v.toFixed(1)}% of GDP (${quarterText(d.reading.quarter)})`, source: `official, ${PRIVATE_DEBT_SOURCE}, all lenders (pulled ${d.pulledAt.slice(0, 10)})`, verified: true }
      : !d
        ? missingRow(label, { kind: 'setup', short: 'BIS file not downloaded yet', help: PRIVATE_DEBT_SETUP_HELP })
        : missingRow(label, { kind: 'unreachable', short: 'Not in the BIS total credit series', help: PRIVATE_DEBT_NOT_COVERED_HELP });
  return [...balanceRows, debtRow('Household debt', d?.reading?.householdPct), debtRow('Company debt', d?.reading?.corporatePct)];
}

/** A figure worked out here from other figures: shown only when every input is live. */
export function modelRow(status: SnapshotDataStatus, label: string, inputs: string[], value: () => string, how = 'model, from figures above'): BriefRow {
  const gap = inputs.find((p) => !status.isLive(p));
  return gap ? missingRow(label, { ...pathMissing(status, gap), short: `Needs ${PATH_NAME[gap] || 'live inputs'}` }) : { label, value: value(), source: how, verified: false };
}

/** A built-in figure with no connected source (debt maturity profile, rollover figures). */
export const noSourceRow = (label: string, help = 'No free live or official source for this figure is connected yet. The app shows Missing rather than an estimate or a sample number.'): BriefRow =>
  missingRow(label, { kind: 'setup', short: 'No source yet', help });

/** Old-style tag by kind. Built-in and AI-estimated figures are never tagged as data. */
export function sourceTag(status: SnapshotDataStatus, kind: Kind): { source: string; verified: boolean } {
  switch (kind) {
    case 'imf':
      return status.isFeedLive('imf') ? { source: 'IMF WEO', verified: true } : { source: 'missing', verified: false };
    case 'worldbank':
      return status.isFeedLive('worldbank') ? { source: 'World Bank', verified: true } : { source: 'missing', verified: false };
    case 'market':
      return { source: 'missing', verified: false };
    case 'yield':
      return status.officialYield ? { source: `official, ${describeOfficialYield(status.officialYield).when}`, verified: true } : { source: 'missing', verified: false };
    case 'cds':
      return status.ownCds ? { source: `your ${status.ownCds.source} data, ${formatPeriod(status.ownCds.date)}`, verified: true } : { source: 'missing', verified: false };
    case 'model':
      return { source: 'model, from figures above', verified: false };
    case 'sample':
      return { source: 'missing', verified: false };
  }
}

/** What fills a missing release date. */
export const RELEASE_HELP = "The date shows here once it has been read from the statistics office's own release calendar.";

export const when = (e: { date: string; daysUntil: number }) =>
  `${formatPeriod(e.date)}, ${e.daysUntil === 0 ? 'today' : e.daysUntil === 1 ? 'tomorrow' : `in ${e.daysUntil} days`}`;
export const pct = (v: number, d = 1) => `${v.toFixed(d)}%`;
export const pts = (v: number, d = 1) => `${v >= 0 ? '+' : ''}${v.toFixed(d)} pts`;

/** Count the missing figures in a brief and say so up front. */
export function missingNote(groups: BriefGroup[], countryName: string): string | undefined {
  const rows = groups.flatMap((g) => g.rows);
  const missing = rows.filter((r) => r.missing).length;
  if (!missing) return undefined;
  return `${missing} of ${rows.length} figures for ${countryName} are missing, because their source is not connected or did not answer. They read Missing, and no built-in or estimated value is shown in their place. Tap "Why missing?" on any of them for the reason and what would fill it.`;
}

/* ------------------------------------------------------------------------------------------
 * Economist: growth, inflation and policy, fiscal path, external position.
 * ------------------------------------------------------------------------------------------ */

/** Any watchlist row: only the country code and its surveys are read. */
export type SurveyPeer = Pick<WatchlistItem, 'iso3' | 'euSurveys'>;

/**
 * EU members only: the latest EU business and consumer surveys, carried on the country's
 * watchlist row from the daily download, or one Missing line saying the copy is not saved yet.
 */
export function euSurveyRows(iso3: string, peers: SurveyPeer[]): BriefRow[] {
  if (!euSurveyGeo(iso3)) return [];
  const s = peers.find((p) => p.iso3 === iso3)?.euSurveys;
  if (!s?.latest.length)
    return [
      missingRow(`Business and consumer surveys (${NOT_A_PMI})`, {
        kind: 'unreachable',
        short: 'EU business surveys not saved yet',
        help: 'The surveys come from the European Commission through Eurostat\'s free API and are saved by the daily download (Menu > Offline data > Download all country data, or npm run go -- daily). Nothing is shown until that copy exists.',
      }),
    ];
  return s.latest.map((a) => {
    const reading = euSurveyReading(a);
    return { label: `${a.label} (${a.id === 'prices' ? 'EU consumer survey' : NOT_A_PMI}), ${a.period}`, value: `${euSurveyValue(a)}${reading ? `; ${reading}` : ''}`, source: EU_SURVEY_SOURCE, verified: true };
  });
}

export function economistBrief(run: CouncilAssessmentRun, now: Date = new Date(), peers: SurveyPeer[] = []): CountryBrief {
  const open = run.openData;
  const status = getSnapshotDataStatus(open);
  const L = status.live;
  const g = L('imf.realGdpGrowthPct');
  const cpi = L('imf.cpiInflationPct');
  const policy = L('market.policyRatePct');
  const debt = L('imf.debtToGdpPct');
  const debt27 = L('imf.debtToGdpForecast2027Pct');
  const pb = L('imf.primaryFiscalBalancePct');
  const ca = L('wb.currentAccountPctGdp');
  const res = L('wb.fxReservesMonthsImport');
  const realRate = policy !== undefined && cpi !== undefined ? policy - cpi : undefined;
  const debtChange = debt !== undefined && debt27 !== undefined ? debt27 - debt : undefined;
  const nextMeeting = nextOfficialEvent(run.iso3, 'MPC_DECISION', now);
  // Next CPI and GDP releases (data plan G10): the date from the office's own calendar, or Missing
  // with the reason the calendar could not be read. Never estimated from a usual pattern.
  const releaseRow = (label: string, category: ReleaseCategory): BriefRow => {
    const next = nextOfficialEvent(run.iso3, category, now);
    if (next) return { label, value: when(next), source: next.sourceName, verified: true };
    return { label, value: 'Missing', source: releaseGap(run.iso3, category, now), verified: false, missing: true, help: RELEASE_HELP };
  };

  // Each observation only from live figures; none is written from a missing one. Each adds, in
  // plain words, what the reading usually means: standard economics, no new figures.
  const j: string[] = [];
  if (g !== undefined) {
    const meaning =
      g >= 4
        ? 'Fast growth usually brings more jobs and tax revenue.'
        : g >= 2
          ? 'That is a steady pace: enough to add jobs and income, but not a boom.'
          : g >= 0
            ? 'Slow growth adds few jobs and little tax revenue, so living standards and the budget improve slowly.'
            : 'The economy is shrinking, which usually means job losses and falling tax revenue.';
    j.push(`Growth is ${g >= 4 ? 'strong' : g >= 2 ? 'moderate' : g >= 0 ? 'weak' : 'negative'} at ${pct(g)} a year${cpi !== undefined ? `, with inflation at ${pct(cpi)}` : ''}.${MEANS}${meaning}`);
  } else if (cpi !== undefined) j.push(`Inflation is ${pct(cpi)}: prices are ${cpi < 0 ? 'falling' : 'rising'} by that much a year.`);
  if (realRate !== undefined)
    j.push(
      realRate > 2
        ? `Monetary policy is tight: the policy rate is ${pct(realRate)} above inflation.${MEANS}Borrowing is expensive once rising prices are allowed for, which slows lending and spending, usually brings inflation down and tends to support the currency.`
        : realRate >= 0
          ? `Monetary policy is mildly restrictive: the policy rate is ${pct(realRate)} above inflation.${MEANS}Borrowing costs a little more than prices rise, a gentle brake on spending.`
          : `Real interest rates are negative (${pct(realRate)}): policy is loose relative to inflation.${MEANS}Borrowing costs less than prices rise, which supports spending but leaves savers losing ground and can let inflation persist.`
    );
  if (debt !== undefined)
    j.push(
      `Government debt is ${pct(debt, 0)} of GDP${
        debtChange === undefined ? '' : ` and is forecast to ${Math.abs(debtChange) < 1 ? 'stay roughly flat' : debtChange > 0 ? `rise by ${debtChange.toFixed(0)} pts` : `fall by ${Math.abs(debtChange).toFixed(0)} pts`} by 2027`
      }.${MEANS}That is ${debt > 70 ? 'above' : 'below'} the 70% level at which the IMF looks more closely at emerging economies' debt; who holds the debt and at what interest rate matters as much as the level.`
    );
  if (pb !== undefined)
    j.push(
      `The primary balance is ${pct(pb)} of GDP.${MEANS}${
        pb >= 0
          ? 'Taxes and other revenue cover spending before interest, so the government is not adding to its debt except to pay interest.'
          : 'The government borrows even before paying interest on its debt, which adds to the debt each year.'
      }`
    );
  const ext: string[] = [];
  if (ca !== undefined && ca < -4) ext.push(`a current account deficit of ${pct(Math.abs(ca))} of GDP (the country spends more abroad than it earns, so it relies on foreign money continuing to arrive)`);
  if (res !== undefined && res < 3) ext.push('reserves below the usual three-month import floor (the central bank\'s foreign currency would pay for under three months of imports if other money stopped)');
  if (ca !== undefined || res !== undefined)
    j.push(
      ext.length
        ? `External weak points: ${ext.join(', ')}.`
        : `The external position looks comfortable on ${[res !== undefined ? 'reserves' : '', ca !== undefined ? 'the current account' : ''].filter(Boolean).join(' and ')}: ${[
            res !== undefined ? 'reserves cover at least three months of imports' : '',
            ca !== undefined ? 'any current account deficit is under 4% of GDP' : '',
          ]
            .filter(Boolean)
            .join(', and ')}.`
    );

  const parts = [
    g !== undefined ? (g >= 2 ? 'growing' : 'slow growth') : '',
    cpi !== undefined ? `inflation ${pct(cpi)}` : '',
    debt !== undefined ? `debt ${debtChange === undefined ? '' : debtChange > 1 ? 'rising ' : debtChange < -1 ? 'falling ' : 'stable '}at ${pct(debt, 0)} of GDP` : '',
  ].filter(Boolean);
  const headline = parts.length ? `${run.countryName}: ${parts.join(', ')}.` : `${run.countryName}: no live economic figures yet.`;

  const groups: BriefGroup[] = [
    {
      title: 'Growth and inflation',
      rows: [
        liveRow(status, 'Real GDP growth', 'imf.realGdpGrowthPct', (v) => pct(v), open),
        liveRow(status, 'CPI inflation', 'imf.cpiInflationPct', (v) => pct(v), open),
        liveRow(status, 'Unemployment rate', 'imf.unemploymentPct', (v) => pct(v), open),
        ...euSurveyRows(run.iso3, peers),
        ...wagesHousingRows(open),
      ],
    },
    {
      title: 'Monthly activity',
      rows: [...monthlyActivityRows(run.iso3, open), ...(activitySourceOf(run.iso3) ? [releaseRow('Next monthly activity release', 'ACTIVITY_RELEASE')] : [])],
    },
    {
      title: 'Monetary policy',
      rows: [
        liveRow(status, 'Policy rate', 'market.policyRatePct', (v) => pct(v, 2), open),
        modelRow(status, 'Real policy rate', ['market.policyRatePct', 'imf.cpiInflationPct'], () => pct(realRate as number)),
        {
          label: 'Next rate decision',
          value: nextMeeting ? when(nextMeeting) : 'not on file',
          source: nextMeeting ? nextMeeting.sourceName : 'no official schedule loaded',
          verified: Boolean(nextMeeting),
        },
        releaseRow('Next CPI release', 'CPI_RELEASE'),
        releaseRow('Next GDP release', 'GDP_RELEASE'),
      ],
    },
    {
      title: 'Fiscal and debt',
      rows: [
        liveRow(status, 'Debt / GDP', 'imf.debtToGdpPct', (v) => pct(v), open),
        liveRow(status, 'Debt / GDP, 2027 forecast', 'imf.debtToGdpForecast2027Pct', (v) => pct(v), open),
        liveRow(status, 'Primary balance', 'imf.primaryFiscalBalancePct', (v) => `${pct(v)} of GDP`, open),
        liveRow(status, 'Overall balance', 'imf.overallBalancePct', (v) => `${pct(v)} of GDP`, open),
        netInterestRow(status, open),
        liveRow(status, 'Revenue', 'imf.revenuePct', (v) => `${pct(v)} of GDP`, open),
        liveRow(status, 'Expenditure', 'imf.expenditurePct', (v) => `${pct(v)} of GDP`, open),
        ...govLevelRows(open),
        ...debtStructureRows(status, open),
        noSourceRow('Balance that keeps debt stable', 'Needs the average interest rate on government debt, which no connected source provides yet.'),
        liveRow(status, '10Y government yield', 'market.sovereign10YBondYieldPct', (v) => pct(v, 2), open),
      ],
    },
    {
      title: 'External position',
      rows: [
        liveRow(status, 'Current account', 'wb.currentAccountPctGdp', (v) => `${pct(v)} of GDP`, open),
        liveRow(status, 'Current account, US dollars', 'imf.currentAccountUsdBn', usdBn, open),
        liveRow(status, 'FX reserves', 'wb.fxReservesMonthsImport', (v) => `${v.toFixed(1)} months of imports`, open),
        liveRow(status, 'External debt', 'wb.externalDebtPctGni', (v) => `${pct(v, 0)} of GNI`, open),
      ],
    },
    { title: 'Distribution and taxes', rows: distTaxRows(status, open, now) },
    { title: 'People', rows: peopleRows(status, open, now) },
    { title: 'Trade', rows: tradeRows(status, open, now) },
    { title: 'Climate and energy', rows: climateRows(status, open) },
    { title: 'Sector balances and private debt', rows: sectorRows(status, open) },
  ];
  return { headline, judgements: j, sampleWarning: missingNote(groups, run.countryName), groups };
}

/**
 * Every figure the country pages lean on, with its source or why it is missing. Used by the Overview
 * tab so the user can see at a glance what is live and what needs setting up.
 */
export function countryDataSources(run: CouncilAssessmentRun): BriefGroup[] {
  const open = run.openData;
  const status = getSnapshotDataStatus(open);
  const r = (label: string, path: string, fmt: (v: number) => string) => liveRow(status, label, path, fmt, open);
  const ds = open.debtSchedule;
  return [
    {
      title: 'IMF (free, no key)',
      rows: [
        r('Real GDP growth', 'imf.realGdpGrowthPct', (v) => pct(v)),
        r('CPI inflation', 'imf.cpiInflationPct', (v) => pct(v)),
        r('Debt / GDP', 'imf.debtToGdpPct', (v) => pct(v)),
        r('Debt / GDP, 2027 forecast', 'imf.debtToGdpForecast2027Pct', (v) => pct(v)),
        r('Primary balance', 'imf.primaryFiscalBalancePct', (v) => `${pct(v)} of GDP`),
        r('Overall balance (Fiscal Monitor)', 'imf.overallBalancePct', (v) => `${pct(v)} of GDP`),
        r('Revenue (Fiscal Monitor)', 'imf.revenuePct', (v) => `${pct(v)} of GDP`),
        r('Expenditure (Fiscal Monitor)', 'imf.expenditurePct', (v) => `${pct(v)} of GDP`),
        r('Unemployment rate', 'imf.unemploymentPct', (v) => pct(v)),
        r('Current account, US dollars', 'imf.currentAccountUsdBn', usdBn),
        r('Current account (IMF WEO)', 'imf.currentAccountImfPct', (v) => `${pct(v)} of GDP`),
      ],
    },
    {
      title: 'World Bank (free, no key)',
      rows: [
        r('FX reserves', 'wb.fxReservesMonthsImport', (v) => `${v.toFixed(1)} months of imports`),
        r('Current account', 'wb.currentAccountPctGdp', (v) => `${pct(v)} of GDP`),
        r('External debt', 'wb.externalDebtPctGni', (v) => `${pct(v, 0)} of GNI`),
        r('Political stability (WGI)', 'wb.politicalStabilityPercentile', (v) => `${v.toFixed(0)}th percentile`),
        ...distTaxRows(status, open),
        ...peopleRows(status, open),
        ...tradeRows(status, open),
        ...climateRows(status, open),
        ...debtStructureRows(status, open),
        ds?.qeds
          ? { label: 'External debt due, next 12 months (QEDS)', value: `$${ds.qeds.next12mUsdBn.toFixed(1)} bn`, source: 'QEDS (World Bank/IMF)', verified: true }
          : missingRow('External debt due, next 12 months (QEDS)', { kind: 'unreachable', short: 'QEDS did not answer', help: 'This comes from QEDS, the World Bank and IMF\'s free quarterly statistics on debt owed abroad. It did not answer, or this country does not report to it. Press Refresh now under Research > One country to try again.' }),
      ],
    },
    {
      title: 'Markets',
      rows: [
        r('10Y government yield', 'market.sovereign10YBondYieldPct', (v) => pct(v, 2)),
        r(`${HC_SPREAD_LABEL} over Treasuries (not CDS)`, 'market.hcBondSpreadBps', (v) => `${Math.round(v)} bps`),
        r('Policy rate', 'market.policyRatePct', (v) => pct(v, 2)),
        r(`Spot FX (${open.currencyCode} per USD)`, 'market.exchangeRatePerUsd', (v) => (v >= 100 ? v.toFixed(0) : v.toFixed(v >= 10 ? 2 : 4))),
        noSourceRow('Credit rating', 'Credit ratings (grades such as BBB or B from S&P, Moody\'s and Fitch) are licensed data with no free feed. The app does not guess them or ask an AI model for them.'),
      ],
    },
    {
      title: 'News',
      rows: [r('News tone (GDELT)', 'gdelt.averageTone', (v) => v.toFixed(1))],
    },
    ucdpGroup(open),
  ];
}

/** Conflict figures from the UCDP files in data/local/ucdp/, or Missing with the reason. */
function ucdpGroup(open: CouncilAssessmentRun['openData']): BriefGroup {
  const title = 'Conflict (UCDP downloaded files)';
  const u = open.ucdp;
  if (!u?.latest) {
    const why = ucdpMissing(null, open.iso3);
    return { title, rows: [missingRow('Armed conflict and conflict deaths (UCDP)', { kind: 'setup', short: why.short, help: why.help })] };
  }
  const { figures, missing } = ucdpFigures(u);
  return {
    title,
    rows: [
      ...figures.map((f) => ({ label: f.label, value: f.value, source: f.tag === 'model' ? f.source : `${f.source} (CC BY 4.0, cite UCDP)`, verified: f.tag !== 'model' })),
      ...missing.map((m) => missingRow(m.split(' not added')[0], { kind: 'setup', short: 'file not added', help: m })),
    ],
  };
}

/* ------------------------------------------------------------------------------------------
 * Report sections.
 * ------------------------------------------------------------------------------------------ */

const clean = (t: string) => t.replace(/\s*\(Ref:[^)]*\)/g, '').trim();

export function groupLines(g: BriefGroup): string[] {
  return g.rows.map((r) => `- ${r.label}: ${r.value} (${r.source})`);
}

export function sourcesSection(run: CouncilAssessmentRun, purpose: string): NoteSection {
  const status = getSnapshotDataStatus(run.openData);
  return {
    id: 'sources',
    heading: 'Data and sources',
    lines: [
      `Data status: ${DATA_MODE_LABEL[status.mode]}${status.asOf ? `, as of ${formatAsOf(status.asOf)}` : ''}. Each figure above names its source. "Missing" means no live or official source filled it, and no built-in value is used instead; "model" means calculated here from live figures.`,
      status.liveFeeds.length ? `Feeds that answered: ${status.liveFeeds.join('; ')}.` : 'No live feeds answered on the last sync.',
      purpose,
    ],
  };
}

export function calendarSection(run: CouncilAssessmentRun, heading: string, now: Date): NoteSection {
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
  activity: 'Monthly activity',
  policy: 'Monetary policy',
  fiscal: 'Fiscal and debt',
  external: 'External position',
  distribution: 'Distribution and taxes',
  people: 'People',
  trade: 'Trade',
  climate: 'Climate and energy',
  sectors: 'Sector balances and private debt',
  risks: 'Risks to the outlook',
  calendar: 'Coming up',
  sources: 'Data and sources',
};

export function buildEconomistSections(run: CouncilAssessmentRun, include: (id: string) => boolean, now: Date = new Date(), peers: SurveyPeer[] = []): NoteSection[] {
  const b = economistBrief(run, now, peers);
  const byTitle = (t: string) => b.groups.find((g) => g.title === t)!;
  const out: NoteSection[] = [];
  if (include('summary')) {
    out.push({ id: 'summary', heading: ECONOMIST_SECTIONS.summary, lines: [b.headline, ...(b.sampleWarning ? [`**Note:** ${b.sampleWarning}`] : []), ...b.judgements.map((x) => `- ${joinMeaning(x)}`)] });
  }
  const groups: Array<[string, string]> = [
    ['growth', 'Growth and inflation'],
    ['activity', 'Monthly activity'],
    ['policy', 'Monetary policy'],
    ['fiscal', 'Fiscal and debt'],
    ['external', 'External position'],
    ['distribution', 'Distribution and taxes'],
    ['people', 'People'],
    ['trade', 'Trade'],
    ['climate', 'Climate and energy'],
    ['sectors', 'Sector balances and private debt'],
  ];
  for (const [id, title] of groups) if (include(id)) out.push({ id, heading: ECONOMIST_SECTIONS[id], lines: groupLines(byTitle(title)) });
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
