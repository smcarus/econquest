# Recorded feed replies anyone may use

Real replies from free official feeds, recorded on 2026-11-05 with `npm run record:feeds` and
kept unchanged (gzipped), from the sources whose terms allow passing their data on. `npm test`
replays them through the server (tests/recordedPublic.test.ts), so you can check a change against
real data without a key or a connection. Built by `npm run record:public`; edit
tests/helpers/publicFeeds.mjs to change which sources are included, never the files here.

Sources left out (their terms do not allow passing data on, or were not confirmed; see
docs/DATA_LICENCES.md) read as not connected in this replay; that is expected.

These files are not covered by the repository's Apache-2.0 licence: each stays under its
provider's terms, below.

| Source | Replies | Terms | Credit |
| --- | --- | --- | --- |
| World Bank indicators and debt statistics | 84 | CC BY 4.0 | The World Bank: World Development Indicators; International Debt Statistics. |
| IMF DataMapper (World Economic Outlook, Fiscal Monitor) | 60 | IMF terms: users may publish and distribute IMF data with attribution; commercial use needs permission | Source: International Monetary Fund, World Economic Outlook and Fiscal Monitor (DataMapper), https://www.imf.org/external/datamapper. |
| BIS statistics | 33 | BIS terms: free to use with the BIS cited, at no extra charge | Source: BIS (Bank for International Settlements) statistics. |
| ECB euro reference rates (through Frankfurter) | 11 | ECB terms: reuse allowed free of charge with the source quoted and the figures unmodified | Source: ECB statistics (via Frankfurter). |
| New York Fed markets data | 3 | New York Fed terms of use: use allowed with its notice | © 2026 Federal Reserve Bank of New York. Content from the New York Fed subject to the Terms of Use at newyorkfed.org. The SOFR and the EFFR are subject to the Terms of Use posted at newyorkfed.org; the New York Fed is not responsible for their publication here, does not sanction or endorse any particular republication, and has no liability for your use. |
| Eurostat HICP | 2 | Eurostat copyright notice: reuse allowed with Eurostat named | Source: Eurostat (prc_hicp_minr). |
| CFTC Commitments of Traders | 2 | US government work, public domain | Source: CFTC Commitments of Traders. |
| GDELT | 2 | GDELT terms: free use in any form with a citation and link | Source: The GDELT Project (https://www.gdeltproject.org/). |
| Brazil Treasury, Tesouro Direto price history | 1 | Open Database License (ODbL) | Fonte: Tesouro Transparente, Taxas dos Títulos Ofertados pelo Tesouro Direto (ODbL). |
