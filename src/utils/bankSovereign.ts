/**
 * Bank and government links (G28): how tied the country's banks and its government are to each other.
 * If the government gets into trouble, banks that hold much of its debt lose; if banks get into
 * trouble, the government may have to rescue them. Each figure with its source and year:
 *
 * - Bank assets, % of GDP (World Bank GFDD.DI.02): how big banks are against the economy.
 * - Bank claims on central government, % of GDP (World Bank FS.AST.CGOV.GD.ZS, from IMF monetary
 *   statistics), and as a share of bank assets (same year; the two series define banks slightly
 *   differently, so the share is approximate).
 * - Domestic banks' share of general government debt (IMF Sovereign Debt Investor Base, from the
 *   workbook you put in data/local/imf-investor-base/), and that share times government debt to GDP.
 * - Bank capital to assets and non-performing loans (World Bank, from IMF Financial Soundness
 *   Indicators): how much loss banks can take, and how much they already carry.
 *
 * Two parts of the plan have no source the app may use, so they read Missing with the reason: the
 * share of bank assets in state-owned banks, and the government's contingent liabilities (IMF fiscal
 * risks data, terms not confirmed). Description only, no score. Browser-safe, pure.
 */
import type { InvestorBaseReading } from './investorBase';

export const STATE_BANKS_MISSING = 'State-owned banks\' share of bank assets: no free cross-country series is read by the app (the World Bank Bank Regulation and Supervision Survey is a periodic survey file, not downloaded)';
export const CONTINGENT_MISSING = 'Contingent liabilities (guarantees, public-private partnerships, state firms): the IMF fiscal risks data have no confirmed reuse terms and are not read, so no figure is shown';
export const BS_METHOD =
  'Each figure is the latest year the source publishes. Claims on government as a share of bank assets = claims on central government ÷ bank assets, both % of GDP in the same year (approximate: the first covers all deposit takers, the second deposit money banks). Banks\' holdings as % of GDP = domestic banks\' share of general government debt (IMF investor base) × government debt to GDP (IMF WEO) in the same year.';

export interface YearValue {
  year: number;
  value: number;
}

export type BsRowId = 'bankAssets' | 'claimsGov' | 'claimsShare' | 'banksShareDebt' | 'banksDebtGdp' | 'capital' | 'npl';

export interface BsRow {
  id: BsRowId;
  value: number;
  year: number;
  source: string;
}

export interface BankSovereign {
  ok: true;
  rows: BsRow[];
  missing: string[];
  method: string;
  sources: string[];
}

export type BankSovereignOutcome = BankSovereign | { ok: false; reason: string };

export interface BsInputs {
  bankAssetsGdp?: YearValue[];
  claimsGovGdp?: YearValue[];
  capitalAssets?: YearValue[];
  npl?: YearValue[];
  govDebtGdp?: YearValue[];
  investorBase?: InvestorBaseReading | null;
  /** Years at or after this are IMF projections and not used. */
  firstProjectionYear?: number;
}

const r1 = (v: number) => Math.round(v * 10) / 10 + 0;
const lastOf = (s?: YearValue[]) => (s?.length ? [...s].filter((p) => Number.isFinite(p.value)).sort((a, b) => a.year - b.year).pop() : undefined);
const at = (s: YearValue[] | undefined, y: number) => s?.find((p) => p.year === y)?.value;

const WB_ASSETS = 'World Bank GFDD.DI.02';
const WB_CLAIMS = 'World Bank FS.AST.CGOV.GD.ZS (IMF monetary statistics)';
const WB_CAPITAL = 'World Bank FB.BNK.CAPA.ZS (IMF Financial Soundness Indicators)';
const WB_NPL = 'World Bank FB.AST.NPER.ZS (IMF Financial Soundness Indicators)';
const IB = 'IMF Sovereign Debt Investor Base (Arslanalp and Tsuda)';

export function bankSovereign(inp: BsInputs): BankSovereignOutcome {
  const rows: BsRow[] = [];
  const missing: string[] = [];
  const a = lastOf(inp.bankAssetsGdp);
  const c = lastOf(inp.claimsGovGdp);
  const k = lastOf(inp.capitalAssets);
  const n = lastOf(inp.npl);
  if (a) rows.push({ id: 'bankAssets', value: r1(a.value), year: a.year, source: WB_ASSETS });
  else missing.push('Bank assets: the World Bank publishes none for this country, or they are not saved yet');
  if (c) rows.push({ id: 'claimsGov', value: r1(c.value), year: c.year, source: WB_CLAIMS });
  else missing.push('Bank claims on central government: the World Bank publishes none for this country, or they are not saved yet');
  if (c) {
    const sameA = at(inp.bankAssetsGdp, c.year);
    if (sameA && sameA > 0) rows.push({ id: 'claimsShare', value: r1((c.value / sameA) * 100), year: c.year, source: `${WB_CLAIMS} ÷ ${WB_ASSETS}` });
  }

  const ib = inp.investorBase;
  if (ib?.state === 'found' && ib.holders) {
    const y = Number(ib.holders.year);
    const share = ib.holders.pct.domesticBanks;
    if (Number.isFinite(share) && Number.isInteger(y)) {
      rows.push({ id: 'banksShareDebt', value: r1(share), year: y, source: IB });
      const d = at(inp.govDebtGdp, y);
      const proj = inp.firstProjectionYear !== undefined && y >= inp.firstProjectionYear;
      if (d !== undefined && !proj) rows.push({ id: 'banksDebtGdp', value: r1((share / 100) * d), year: y, source: `${IB} × IMF WEO government debt` });
    }
  } else if (ib?.state === 'notCovered') missing.push('Domestic banks\' share of government debt: the IMF investor base covers emerging and developing economies only, not this country');
  else if (ib?.state === 'unreadable') missing.push(`Domestic banks' share of government debt: the investor base workbook did not read (${ib.reason || 'unknown layout'})`);
  else missing.push('Domestic banks\' share of government debt: put the IMF investor base workbook (wp1439.zip) in data/local/imf-investor-base/');

  if (k) rows.push({ id: 'capital', value: r1(k.value), year: k.year, source: WB_CAPITAL });
  else missing.push('Bank capital to assets: the World Bank publishes none for this country, or it is not saved yet');
  if (n) rows.push({ id: 'npl', value: r1(n.value), year: n.year, source: WB_NPL });
  else missing.push('Non-performing loans: the World Bank publishes none for this country, or they are not saved yet');

  if (!rows.length) return { ok: false, reason: 'No bank figures are saved for this country yet (Menu > Offline data, or open History & data while online)' };
  missing.push(STATE_BANKS_MISSING, CONTINGENT_MISSING);
  const sources = [...new Set(rows.map((r) => r.source).flatMap((s) => s.split(/ ÷ | × /)))];
  return { ok: true, rows, missing, method: BS_METHOD, sources };
}

export function bsSentence(r: BankSovereign, name: string): string {
  const g = (id: BsRowId) => r.rows.find((x) => x.id === id);
  const parts: string[] = [];
  const a = g('bankAssets');
  const c = g('claimsGov');
  const b = g('banksShareDebt');
  if (a) parts.push(`bank assets were ${a.value}% of GDP in ${a.year}`);
  if (c) parts.push(`banks' claims on the central government ${c.value}% of GDP in ${c.year}`);
  if (b) parts.push(`domestic banks held ${b.value}% of government debt in ${b.year}`);
  let s = parts.length ? `${name}: ${parts.join('; ')}.` : `${name}: only bank soundness figures are saved.`;
  const k = g('capital');
  const n = g('npl');
  if (k || n) s += ` Bank capital ${k ? `was ${k.value}% of assets (${k.year})` : 'is not published'}; non-performing loans ${n ? `${n.value}% of loans (${n.year})` : 'are not published'}.`;
  return s;
}
