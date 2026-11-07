/**
 * Which recorded feed replies may be passed on, so tests/fixtures/recorded-public/ can ship in the
 * public repository while tests/fixtures/recorded/ (every source) stays private
 * (scripts/public-exclude.txt). Each rule names the terms it rests on, as summarised in
 * docs/DATA_LICENCES.md; a source whose terms do not allow passing data on, or were not confirmed,
 * is left out. Kept narrow on purpose: when in doubt, a source stays out.
 */

/** Hosts (and, where a host serves more than one thing, a path prefix) whose replies may be shared. */
export const PUBLIC_FEEDS = [
  { host: 'api.worldbank.org', source: 'World Bank indicators and debt statistics', terms: 'CC BY 4.0', credit: 'The World Bank: World Development Indicators; International Debt Statistics.' },
  { host: 'www.imf.org', path: '/external/datamapper/api/', source: 'IMF DataMapper (World Economic Outlook, Fiscal Monitor)', terms: 'IMF terms: users may publish and distribute IMF data with attribution; commercial use needs permission', credit: 'Source: International Monetary Fund, World Economic Outlook and Fiscal Monitor (DataMapper), https://www.imf.org/external/datamapper.' },
  { host: 'stats.bis.org', source: 'BIS statistics', terms: 'BIS terms: free to use with the BIS cited, at no extra charge', credit: 'Source: BIS (Bank for International Settlements) statistics.' },
  { host: 'api.frankfurter.dev', source: 'ECB euro reference rates (through Frankfurter)', terms: 'ECB terms: reuse allowed free of charge with the source quoted and the figures unmodified', credit: 'Source: ECB statistics (via Frankfurter).' },
  { host: 'markets.newyorkfed.org', source: 'New York Fed markets data', terms: 'New York Fed terms of use: use allowed with its notice', credit: '© 2026 Federal Reserve Bank of New York. Content from the New York Fed subject to the Terms of Use at newyorkfed.org. The SOFR and the EFFR are subject to the Terms of Use posted at newyorkfed.org; the New York Fed is not responsible for their publication here, does not sanction or endorse any particular republication, and has no liability for your use.' },
  { host: 'ec.europa.eu', path: '/eurostat/', source: 'Eurostat HICP', terms: 'Eurostat copyright notice: reuse allowed with Eurostat named', credit: 'Source: Eurostat (prc_hicp_minr).' },
  { host: 'publicreporting.cftc.gov', source: 'CFTC Commitments of Traders', terms: 'US government work, public domain', credit: 'Source: CFTC Commitments of Traders.' },
  { host: 'api.gdeltproject.org', source: 'GDELT', terms: 'GDELT terms: free use in any form with a citation and link', credit: 'Source: The GDELT Project (https://www.gdeltproject.org/).' },
  { host: 'www.tesourotransparente.gov.br', source: 'Brazil Treasury, Tesouro Direto price history', terms: 'Open Database License (ODbL)', credit: 'Fonte: Tesouro Transparente, Taxas dos Títulos Ofertados pelo Tesouro Direto (ODbL).' },
];

/** The rule a recorded URL falls under, or undefined when its reply must not be passed on. */
export function publicFeedFor(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return undefined;
  }
  return PUBLIC_FEEDS.find((r) => r.host === u.hostname && (!r.path || u.pathname.startsWith(r.path)));
}
