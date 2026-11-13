/**
 * Financial inclusion (parked idea PA5, pulled forward by Sam on 13 November 2026): who has an
 * account, the gaps between women and men and between poorer and richer households, how many bank
 * branches and cash machines there are, and how much credit banks and other lenders give households
 * and firms. Together they say how far money and interest-rate policy can reach households.
 *
 * - World Bank Global Findex (survey years, about every three years): FX.OWN.TOTL.ZS adults,
 *   FX.OWN.TOTL.FE.ZS women, FX.OWN.TOTL.MA.ZS men, FX.OWN.TOTL.40.ZS poorest 40% of households,
 *   FX.OWN.TOTL.60.ZS richest 60%. An account at a bank or other financial institution, or with a
 *   mobile money service.
 * - IMF Financial Access Survey through the World Bank: FB.CBK.BRCH.P5 bank branches and
 *   FB.ATM.TOTL.P5 cash machines per 100,000 adults.
 * - FS.AST.PRVT.GD.ZS credit to the private sector from domestic financial institutions, % of GDP.
 *
 * All World Bank (CC BY 4.0), read from the official history the app saves per country. Gaps are
 * computed only within one survey year. Browser-safe, pure.
 */
import type { YearValue } from './fiscalRules';

export const FI_IDS = ['account_all', 'account_women', 'account_men', 'account_poorest40', 'account_richest60', 'bank_branches', 'atms', 'private_credit_wb'] as const;
export type FiId = (typeof FI_IDS)[number];

export const FI_SOURCES = 'World Bank Global Findex and World Development Indicators (IMF Financial Access Survey, IMF International Financial Statistics), CC BY 4.0';

export const FI_METHOD =
  'Latest Global Findex survey year before this year: adults with an account, and the gap in points between men and women and between the richest 60% and poorest 40% of households in that same survey; the change since the previous survey. Branches, cash machines and private credit: latest year published. A description, not a score.';

export interface YearFig {
  year: number;
  value: number;
}

export interface FinancialInclusion {
  account?: YearFig & { previous?: YearFig };
  accountMissing?: string;
  /** Men minus women, points, same survey year as `account`. */
  genderGap?: { year: number; women: number; men: number; gap: number };
  /** Richest 60% minus poorest 40%, points, same survey year. */
  incomeGap?: { year: number; poorest40: number; richest60: number; gap: number };
  branches?: YearFig;
  atms?: YearFig;
  privateCredit?: YearFig;
  sources: string;
  method: string;
}

const r1 = (v: number) => Math.round(v * 10) / 10;

function latest(points: YearValue[] | undefined, beforeYear: number, nth = 0): YearFig | undefined {
  const pts = (points ?? []).filter((p) => p.year < beforeYear && Number.isFinite(p.value)).sort((a, b) => b.year - a.year);
  const p = pts[nth];
  return p ? { year: p.year, value: r1(p.value) } : undefined;
}

const at = (points: YearValue[] | undefined, year: number) => {
  const p = (points ?? []).find((x) => x.year === year && Number.isFinite(x.value));
  return p ? r1(p.value) : undefined;
};

export function financialInclusion(series: Partial<Record<FiId, YearValue[]>>, beforeYear: number, historySaved = true): FinancialInclusion {
  const out: FinancialInclusion = { sources: FI_SOURCES, method: FI_METHOD };
  const acc = latest(series.account_all, beforeYear);
  if (acc) {
    const prev = latest(series.account_all, beforeYear, 1);
    out.account = { ...acc, ...(prev ? { previous: prev } : {}) };
    const w = at(series.account_women, acc.year);
    const m = at(series.account_men, acc.year);
    if (w !== undefined && m !== undefined) out.genderGap = { year: acc.year, women: w, men: m, gap: r1(m - w) };
    const p40 = at(series.account_poorest40, acc.year);
    const r60 = at(series.account_richest60, acc.year);
    if (p40 !== undefined && r60 !== undefined) out.incomeGap = { year: acc.year, poorest40: p40, richest60: r60, gap: r1(r60 - p40) };
  } else {
    out.accountMissing = historySaved ? 'The Global Findex survey has not covered this country' : 'No saved World Bank history for this country yet (Data health > World Bank)';
  }
  const b = latest(series.bank_branches, beforeYear);
  if (b) out.branches = b;
  const a = latest(series.atms, beforeYear);
  if (a) out.atms = a;
  const c = latest(series.private_credit_wb, beforeYear);
  if (c) out.privateCredit = c;
  return out;
}

/** One English sentence for Explain in chat. */
export function fiSentence(f: FinancialInclusion, country: string): string {
  if (!f.account) return `${country}: account ownership Missing (${f.accountMissing}).`;
  const parts = [`In ${country}, ${f.account.value}% of adults had an account in ${f.account.year}${f.account.previous ? ` (${f.account.previous.value}% in ${f.account.previous.year})` : ''}`];
  if (f.genderGap) parts.push(`women ${f.genderGap.women}%, men ${f.genderGap.men}%`);
  if (f.incomeGap) parts.push(`poorest 40% of households ${f.incomeGap.poorest40}%, richest 60% ${f.incomeGap.richest60}%`);
  let s = `${parts.join('; ')}.`;
  if (f.privateCredit) s += ` Credit to households and firms from domestic lenders was ${f.privateCredit.value}% of GDP in ${f.privateCredit.year}.`;
  return s;
}
