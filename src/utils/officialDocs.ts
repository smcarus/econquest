/**
 * Official documents feed (platform comparison gap CG17): the newest documents about one country
 * from two free, keyless sources, each with its date, type and a link to the publisher's own page.
 *
 *   World Bank Documents & Reports API (search.worldbank.org/api/v3/wds), by country. Routine
 *   project paperwork (status reports, procurement plans, safeguard filings) is left out so economic
 *   reports, policy notes and programme documents stay visible; the count left out is shown.
 *   BIS central bankers' speeches (www.bis.org/doclist/cbspeeches.rss), matched to the country
 *   by the speaker's institution named in the description.
 *
 * Titles are the publishers' own words; nothing is summarised or rewritten. Browser-safe, pure.
 */

export type DocSource = 'worldbank' | 'bis';

export interface OfficialDoc {
  source: DocSource;
  /** YYYY-MM-DD */
  date: string;
  title: string;
  type: string;
  url: string;
  pdfUrl?: string;
  /** Speech: who gave it and where (the publisher's description). */
  note?: string;
}

export const DOC_SOURCE_LABEL: Record<DocSource, string> = {
  worldbank: 'World Bank Documents & Reports',
  bis: "BIS central bankers' speeches",
};

export const wdsUrl = (iso2: string, rows = 60) =>
  `https://search.worldbank.org/api/v3/wds?format=json&rows=${rows}&countrycode_exact=${encodeURIComponent(iso2)}&fl=docdt,docty,display_title,url,pdfurl&sort=docdt&order=desc`;
export const BIS_SPEECHES_RSS = 'https://www.bis.org/doclist/cbspeeches.rss';

/** Document types that are project paperwork rather than economic analysis or policy. */
export const ROUTINE_WB_TYPES = [
  'implementation status and results report',
  'procurement plan',
  'environmental and social',
  'environmental assessment',
  'environmental and social commitment plan',
  'stakeholder engagement plan',
  'resettlement plan',
  'indigenous peoples plan',
  'labor management procedure',
  'integrated safeguards data sheet',
  'project information document',
  'project information and integrated safeguards data sheet',
  'disbursement letter',
  'financial monitoring report',
  'audited financial statement',
  'letter',
  'minutes',
  'agreement',
  'loan agreement',
  'financing agreement',
  'grant agreement',
  'amendment',
  'restructuring paper',
  'climate co-benefits assessment',
  'procurement',
];

export function isRoutineWbType(type: string): boolean {
  const t = type.toLowerCase();
  return ROUTINE_WB_TYPES.some((r) => t === r || t.startsWith(`${r} `) || (r.length > 12 && t.includes(r)));
}

const clean = (s: unknown) => String(s ?? '').replace(/\s+/g, ' ').trim();
const https = (u: string) => u.replace(/^http:\/\//, 'https://');

export function parseWdsDocs(j: any): { docs: OfficialDoc[]; routine: number } {
  const docs: OfficialDoc[] = [];
  let routine = 0;
  const all = j?.documents && typeof j.documents === 'object' ? Object.values(j.documents) : [];
  for (const d of all as any[]) {
    if (!d || typeof d !== 'object' || !d.display_title || !d.url) continue;
    const type = clean(d.docty) || 'Document';
    if (isRoutineWbType(type)) {
      routine++;
      continue;
    }
    const date = String(d.docdt || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    docs.push({ source: 'worldbank', date, title: clean(d.display_title), type, url: https(String(d.url)), ...(d.pdfurl ? { pdfUrl: https(String(d.pdfurl)) } : {}) });
  }
  docs.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return { docs, routine };
}

const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&');

function tag(block: string, name: string): string {
  const m = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`).exec(block);
  return m ? clean(decode(m[1])) : '';
}

/** Every speech in the BIS feed (RSS 1.0), newest first. */
export function parseBisSpeeches(xml: string): OfficialDoc[] {
  const out: OfficialDoc[] = [];
  for (const m of xml.matchAll(/<item\b[\s\S]*?<\/item>/g)) {
    const b = m[0];
    const title = tag(b, 'title');
    const url = tag(b, 'link');
    const date = (tag(b, 'dc:date') || '').slice(0, 10);
    if (!title || !/^https:\/\/www\.bis\.org\//.test(url) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const pdf = /<cb:link>([^<]+\.pdf)<\/cb:link>/.exec(b)?.[1];
    out.push({ source: 'bis', date, title, type: 'Speech', url, note: tag(b, 'description'), ...(pdf ? { pdfUrl: pdf } : {}) });
  }
  return out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/**
 * Central bank names that do not contain the country's name, for matching speeches. Others are
 * matched on the country name itself ("Bank of Japan", "Central Bank of Kenya").
 */
export const BANK_NAMES: Record<string, string[]> = {
  DNK: ['Danmarks Nationalbank'],
  DEU: ['Deutsche Bundesbank'],
  NLD: ['De Nederlandsche Bank'],
  USA: ['Federal Reserve', 'Board of Governors of the Federal Reserve'],
  SWE: ['Sveriges Riksbank'],
  NOR: ['Norges Bank'],
  CHE: ['Swiss National Bank'],
  ITA: ["Bank of Italy", "Banca d'Italia"],
  FRA: ['Bank of France', 'Banque de France'],
  ESP: ['Bank of Spain', 'Banco de España'],
  PRT: ['Banco de Portugal', 'Bank of Portugal'],
  GBR: ['Bank of England'],
  BRA: ['Central Bank of Brazil', 'Banco Central do Brasil'],
  MEX: ['Bank of Mexico', 'Banco de México'],
  ZAF: ['South African Reserve Bank'],
  IND: ['Reserve Bank of India'],
  AUS: ['Reserve Bank of Australia'],
  NZL: ['Reserve Bank of New Zealand'],
  TUR: ['Central Bank of the Republic of Türkiye', 'Central Bank of the Republic of Turkey'],
  RUS: ['Bank of Russia'],
  KOR: ['Bank of Korea'],
  CHN: ["People's Bank of China"],
  IDN: ['Bank Indonesia'],
  MYS: ['Bank Negara Malaysia'],
  THA: ['Bank of Thailand'],
  PHL: ['Bangko Sentral ng Pilipinas'],
  PAK: ['State Bank of Pakistan'],
  BGD: ['Bangladesh Bank'],
  SAU: ['Saudi Central Bank'],
  ARE: ['Central Bank of the UAE', 'Central Bank of the United Arab Emirates'],
  CZE: ['Czech National Bank'],
  POL: ['National Bank of Poland', 'Narodowy Bank Polski'],
  HUN: ['Central Bank of Hungary', 'Magyar Nemzeti Bank'],
  ROU: ['National Bank of Romania'],
  ISR: ['Bank of Israel'],
  CHL: ['Central Bank of Chile'],
  COL: ['Bank of the Republic', 'Banco de la República'],
  PER: ['Central Reserve Bank of Peru'],
};

/** Speeches whose description names the country or its central bank. */
export function speechesFor(all: OfficialDoc[], iso3: string, countryName: string): OfficialDoc[] {
  const names = [countryName, ...(BANK_NAMES[iso3] || [])].filter((n) => n && n.length >= 4);
  const res = names.map((n) => new RegExp(`(^|[^\\p{L}])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}])`, 'iu'));
  return all.filter((d) => res.some((re) => re.test(d.note || '')));
}
