/**
 * The credit cycle from the BIS (Bank for International Settlements) SDMX API, free and with no key
 * (gap analysis D3, 2026-11-07). Three dataflows, each read as CSV with its full quarterly history:
 *
 * 1. WS_CREDIT_GAP: credit to the private non-financial sector from all lenders (TC_BORROWERS P,
 *    TC_LENDERS A) as % of GDP. CG_DTYPE A is the ratio, B its long-run trend, C the gap (A minus
 *    B). The codes were read from a live answer on 2026-11-07: Brazil 2025-Q4 A 93.03, B 91.25,
 *    C 1.78, so C = A - B.
 * 2. WS_DSR: debt service ratio of the private non-financial sector (DSR_BORROWERS P), % of income.
 * 3. WS_SPP: selected residential property prices; VALUE R real / N nominal, UNIT_MEASURE 628 index
 *    (2010 = 100) / 771 year-on-year change in per cent. Real and nominal y/y changes are used.
 *
 * 4. WS_CBTA (Group B, PB3, 2026-11-14): central bank total assets; UNIT_MEASURE XDF_R_B1GQ is % of
 *    GDP (sum of the last four quarters of GDP), USD is US dollars (UNIT_MULT 9 = billions);
 *    TRANSFORMATION B is adjusted for breaks, N is not, and B is used when the BIS gives both. Read
 *    from a live answer on 2026-11-14: United States 2026-Q2 21.24% of GDP, US$ 6735.6 bn.
 *
 * 5. WS_GLI (PB4, 2026-11-14): global liquidity; key Q.USD.{country}.N.A.I.B is US dollar credit (bank
 *    loans and debt securities) to non-banks in the country, UNIT_MEASURE USD (UNIT_MULT 6 = millions)
 *    and 771 (change on a year earlier, %). Read from a live answer: Brazil 2026-Q2 US$ 199,599.546
 *    million, 6.906%.
 *
 * Header names and codes were checked against live answers on 2026-11-07. The BIS host does not
 * answer from this project's cloud session, so the parsers are tested on rows copied from those
 * answers. A country the BIS does not cover, or a quarter it did not publish, has no point.
 *
 * Browser-safe, pure.
 */
import { BIS_API, parseBisCsv } from './bisDebtSecurities';
import { quarterKey } from './debtSchedule';
import type { Series, SeriesMissing, SeriesPoint } from './seriesHistory';

export interface BisCreditCycle {
  fetchedAt: string;
  /** Quarter (YYYYQn) -> value, for each series the BIS answered. */
  creditGap?: Record<string, number>;
  creditToGdp?: Record<string, number>;
  dsr?: Record<string, number>;
  realHousePricesYoy?: Record<string, number>;
  nominalHousePricesYoy?: Record<string, number>;
  /** G40 (src/utils/sectorBalances.ts): household and company debt, % of GDP (BIS total credit). */
  householdDebt?: Record<string, number>;
  corporateDebt?: Record<string, number>;
  /** PB3: central bank total assets, % of GDP and US$ bn (BIS WS_CBTA). */
  cbAssetsGdp?: Record<string, number>;
  cbAssetsUsd?: Record<string, number>;
  /** PB4: US dollar credit to non-banks in the country, US$ bn and % y/y (BIS WS_GLI). */
  usdCredit?: Record<string, number>;
  usdCreditYoy?: Record<string, number>;
}

export function bisCreditGapUrl(iso2: string): string {
  return `${BIS_API}/WS_CREDIT_GAP/Q.${iso2}.P.A./all?format=csv`;
}
export function bisDsrUrl(iso2: string): string {
  return `${BIS_API}/WS_DSR/Q.${iso2}../all?format=csv`;
}
export function bisPropertyUrl(iso2: string): string {
  return `${BIS_API}/WS_SPP/Q.${iso2}../all?format=csv`;
}
export function bisCbAssetsUrl(iso2: string): string {
  return `${BIS_API}/WS_CBTA/Q.${iso2}/all?format=csv`;
}
export function bisUsdCreditUrl(iso2: string): string {
  return `${BIS_API}/WS_GLI/Q.USD.${iso2}.N.A.I.B./all?format=csv`;
}
export const BIS_USD_CREDIT_SAMPLE_URL = `${BIS_API}/WS_GLI/Q.USD.BR.N.A.I.B./all?format=csv&lastNObservations=4`;
/** Short answer for Data health (Brazil, last four quarters). */
export const BIS_CB_ASSETS_SAMPLE_URL = `${BIS_API}/WS_CBTA/Q.BR/all?format=csv&lastNObservations=4`;

/** Quarter -> value for the rows `pick` keeps; unreadable rows are skipped. */
function quarters(rows: Array<Record<string, string>>, pick: (r: Record<string, string>) => boolean): Record<string, number> | undefined {
  const out: Record<string, number> = {};
  for (const r of rows) {
    if (!pick(r) || r.OBS_VALUE === '' || r.OBS_VALUE === 'NaN') continue;
    const q = quarterKey(r.TIME_PERIOD);
    const v = Number(r.OBS_VALUE);
    if (q && Number.isFinite(v)) out[q] = Number(v.toFixed(4));
  }
  return Object.keys(out).length ? out : undefined;
}

export function parseBisCreditGap(text: unknown): Pick<BisCreditCycle, 'creditGap' | 'creditToGdp'> {
  const rows = parseBisCsv(text).filter((r) => r.TC_BORROWERS === 'P' && r.TC_LENDERS === 'A');
  const creditGap = quarters(rows, (r) => r.CG_DTYPE === 'C');
  const creditToGdp = quarters(rows, (r) => r.CG_DTYPE === 'A');
  return { ...(creditGap ? { creditGap } : {}), ...(creditToGdp ? { creditToGdp } : {}) };
}

export function parseBisDsr(text: unknown): Pick<BisCreditCycle, 'dsr'> {
  const dsr = quarters(parseBisCsv(text), (r) => r.DSR_BORROWERS === 'P');
  return dsr ? { dsr } : {};
}

export function parseBisProperty(text: unknown): Pick<BisCreditCycle, 'realHousePricesYoy' | 'nominalHousePricesYoy'> {
  const rows = parseBisCsv(text);
  const realHousePricesYoy = quarters(rows, (r) => r.VALUE === 'R' && r.UNIT_MEASURE === '771');
  const nominalHousePricesYoy = quarters(rows, (r) => r.VALUE === 'N' && r.UNIT_MEASURE === '771');
  return { ...(realHousePricesYoy ? { realHousePricesYoy } : {}), ...(nominalHousePricesYoy ? { nominalHousePricesYoy } : {}) };
}

/**
 * Central bank total assets: % of GDP and US$ bn. Break-adjusted rows (TRANSFORMATION B) win over
 * unadjusted ones (N) quarter by quarter; dollar values are scaled to billions with UNIT_MULT.
 */
export function parseBisCbAssets(text: unknown): Pick<BisCreditCycle, 'cbAssetsGdp' | 'cbAssetsUsd'> {
  const pick: Record<'gdp' | 'usd', Record<string, { v: number; adjusted: boolean }>> = { gdp: {}, usd: {} };
  for (const r of parseBisCsv(text)) {
    const which = r.UNIT_MEASURE === 'XDF_R_B1GQ' ? 'gdp' : r.UNIT_MEASURE === 'USD' ? 'usd' : null;
    if (!which || r.OBS_VALUE === '' || r.OBS_VALUE === 'NaN') continue;
    const adjusted = r.TRANSFORMATION === 'B';
    if (r.TRANSFORMATION && !adjusted && r.TRANSFORMATION !== 'N') continue;
    const q = quarterKey(r.TIME_PERIOD);
    let v = Number(r.OBS_VALUE);
    if (which === 'usd') {
      const mult = r.UNIT_MULT === '' || r.UNIT_MULT === undefined ? 9 : Number(r.UNIT_MULT);
      if (!Number.isInteger(mult)) continue;
      v = v * 10 ** (mult - 9);
    }
    if (!q || !Number.isFinite(v)) continue;
    const had = pick[which][q];
    if (had && had.adjusted && !adjusted) continue;
    pick[which][q] = { v: Number(v.toFixed(4)), adjusted };
  }
  const flat = (m: Record<string, { v: number }>) => (Object.keys(m).length ? Object.fromEntries(Object.entries(m).map(([q, x]) => [q, x.v])) : undefined);
  const cbAssetsGdp = flat(pick.gdp);
  const cbAssetsUsd = flat(pick.usd);
  return { ...(cbAssetsGdp ? { cbAssetsGdp } : {}), ...(cbAssetsUsd ? { cbAssetsUsd } : {}) };
}

/** US dollar credit to non-banks: US$ bn (UNIT_MULT scaled) and the BIS's own y/y change. */
export function parseBisUsdCredit(text: unknown): Pick<BisCreditCycle, 'usdCredit' | 'usdCreditYoy'> {
  const rows = parseBisCsv(text).filter((r) => r.CURR_DENOM === 'USD' && r.BORROWERS_SECTOR === 'N' && r.LENDERS_SECTOR === 'A' && r.L_POS_TYPE === 'I' && r.L_INSTR === 'B');
  const usd: Record<string, number> = {};
  for (const r of rows) {
    if (r.UNIT_MEASURE !== 'USD' || r.OBS_VALUE === '' || r.OBS_VALUE === 'NaN') continue;
    const mult = r.UNIT_MULT === '' || r.UNIT_MULT === undefined ? 6 : Number(r.UNIT_MULT);
    const q = quarterKey(r.TIME_PERIOD);
    const v = Number(r.OBS_VALUE) * 10 ** (mult - 9);
    if (q && Number.isInteger(mult) && Number.isFinite(v)) usd[q] = Number(v.toFixed(4));
  }
  const usdCredit = Object.keys(usd).length ? usd : undefined;
  const usdCreditYoy = quarters(rows, (r) => r.UNIT_MEASURE === '771');
  return { ...(usdCredit ? { usdCredit } : {}), ...(usdCreditYoy ? { usdCreditYoy } : {}) };
}

export const BIS_CREDIT_DEFS = [
  {
    id: 'credit_gap',
    key: 'creditGap',
    label: 'Credit-to-GDP gap',
    unit: 'pp of GDP',
    source: 'BIS credit-to-GDP gaps',
    about:
      'Credit to the private non-financial sector from all lenders, as % of GDP, minus its long-run trend, as the BIS computes it. Basel III guidance starts a countercyclical capital buffer when the gap is above 2 points and sets the maximum at 10 points.',
  },
  {
    id: 'credit_gdp',
    key: 'creditToGdp',
    label: 'Private credit',
    unit: '% of GDP',
    source: 'BIS credit-to-GDP gaps',
    about: 'Credit to the private non-financial sector (households and firms) from all lenders, as % of GDP.',
  },
  {
    id: 'debt_service_ratio',
    key: 'dsr',
    label: 'Debt service ratio, private sector',
    unit: '% of income',
    source: 'BIS debt service ratios',
    about: 'Interest and principal paid by households and non-financial firms, as % of their income.',
  },
  {
    id: 'house_prices_real_yoy',
    key: 'realHousePricesYoy',
    label: 'Real house prices (y/y)',
    unit: '%',
    source: 'BIS selected residential property prices',
    about: 'Residential property prices after inflation, change on the same quarter a year earlier.',
  },
  {
    id: 'house_prices_nominal_yoy',
    key: 'nominalHousePricesYoy',
    label: 'Nominal house prices (y/y)',
    unit: '%',
    source: 'BIS selected residential property prices',
    about: 'Residential property prices in local currency, before taking out inflation, change on the same quarter a year earlier.',
  },
  {
    id: 'cb_assets_gdp',
    key: 'cbAssetsGdp',
    label: 'Central bank assets',
    unit: '% of GDP',
    source: 'BIS central bank total assets',
    about:
      'Everything the central bank owns (reserves, bonds, loans to banks), as % of a year of GDP. A fast rise usually means asset purchases (quantitative easing) or emergency lending; a fall means the bank is shrinking its balance sheet.',
  },
  {
    id: 'cb_assets_usd',
    key: 'cbAssetsUsd',
    label: 'Central bank assets in dollars',
    unit: 'US$ bn',
    source: 'BIS central bank total assets',
    about: 'Total assets of the central bank, converted to US dollars by the BIS, in billions. Moves in the exchange rate change this figure even when the balance sheet does not change.',
  },
  {
    id: 'usd_credit',
    key: 'usdCredit',
    label: 'Dollar credit to non-banks',
    unit: 'US$ bn',
    source: 'BIS global liquidity indicators',
    about:
      'Bank loans and bonds in US dollars owed by companies, governments and households in the country (everyone except banks), in billions. Borrowers who earn in local currency find these debts harder to pay when the dollar rises or dollar funding dries up.',
  },
  {
    id: 'usd_credit_yoy',
    key: 'usdCreditYoy',
    label: 'Dollar credit to non-banks (y/y)',
    unit: '%',
    source: 'BIS global liquidity indicators',
    about: 'Change in US dollar loans and bonds owed by non-banks in the country on the same quarter a year earlier, as the BIS computes it. Fast growth builds dollar debt; a sharp fall can mean lenders are pulling back.',
  },
] as const;

/** One series per definition; Missing with the reason when the BIS has not answered or has none. */
export function bisCreditSeries(cycle: BisCreditCycle | null | undefined, covered: boolean): Array<Series | SeriesMissing> {
  return BIS_CREDIT_DEFS.map((d) => {
    if (!covered) return { id: d.id, label: d.label, reason: 'Not a BIS reporting country in the catalogue' };
    if (!cycle) return { id: d.id, label: d.label, reason: 'The BIS has not answered yet' };
    const rates = cycle[d.key];
    const points: SeriesPoint[] = Object.entries(rates || {})
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    if (!points.length) return { id: d.id, label: d.label, reason: `The BIS publishes no ${d.label.toLowerCase()} series for this country` };
    return { id: d.id, label: d.label, unit: d.unit, freq: 'quarterly' as const, source: d.source, pulledAt: cycle.fetchedAt, points, about: d.about };
  });
}
