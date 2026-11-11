# Data licences

<!-- Generated from src/data/dataLicences.ts by `npm run docs:licences`. Edit that file, not this one. -->

What each outside source's own terms say about showing its figures to other people (clients, colleagues, a
published note) and about commercial use, with the credit it asks for. Each quote was read on the source's
terms page on the date shown. Where a page could not be read or does not answer the question, the row says
"Terms not confirmed" rather than guessing. This is a research note, not legal advice: a question that
matters for a client or a sale should go to the provider in writing.

Each row's terms are read again at least once a year; the app marks a row "Licence check due" when its
date is more than 12 months old (docs/MAINTENANCE.md).

The same register is in the app under **Menu > About & data licences**. Every export (council briefs and
documents, policy memos, reports, notebooks, chart CSVs, Excel downloads, backups) ends with the line
"Research, not validated advice." and points here (src/utils/disclaimer.ts).

| Status | Meaning |
| --- | --- |
| Open with attribution | The terms allow redistribution and commercial use as long as the source is credited. |
| Allowed with conditions | Display to others is allowed, but the terms add conditions beyond a credit (a notice, no extra charge, no changes). |
| Permission needed for client or commercial use | Your own research use is fine; showing the figures to clients, publishing them or using them commercially needs the provider's written permission (or a paid licence). |
| Terms not confirmed | The terms page could not be read or does not answer the question. Treat as personal research use only until confirmed. |

## Summary

| Source | Status | Free non-commercial sharing | Show to others | Commercial use | Credit |
| --- | --- | --- | --- | --- | --- |
| World Bank indicators and debt statistics (IDS, QEDS) | Open with attribution | Free sharing allowed | Allowed: the data may be shared with third parties under CC BY 4.0. | Allowed (CC BY 4.0 sets no commercial limit). | The World Bank: <dataset name>: <data source>, e.g. "The World Bank: World Development Indicators". |
| World Bank Pink Sheet (commodity prices) | Terms not confirmed | Sharing unclear | Likely covered by the World Bank dataset terms (CC BY 4.0), but the Pink Sheet's own catalog entry could not be read. | Not confirmed. | The World Bank: Commodity Price Data (The Pink Sheet). |
| IMF (World Economic Outlook, Fiscal Monitor, International Liquidity, Balance of Payments, COFER, Consumer Price Index) | Permission needed for client or commercial use | Free sharing allowed | Allowed with attribution: the IMF lets users publish and distribute its Data. | Needs permission: email copyright@imf.org. Systematic or bulk automated download also needs permission. | Source: International Monetary Fund, <database name>, <link to the dataset>. |
| UN Comtrade | Permission needed for client or commercial use | Free sharing allowed | Internal use only. Free, not-for-profit visualisation is exempt; a paid report or dashboard is exempt only below 100,000 original records. | Paid, subscription or otherwise monetised use counts as commercial; commercial APIs need a premium subscription. | Source: UN Comtrade. |
| WITS (World Integrated Trade Solution) | Permission needed for client or commercial use | Do not pass on | The trade shares come from UN Comtrade data, which WITS says is for internal use only. | Needs UNSD's written permission (see UN Comtrade). | Source: UN Comtrade via WITS (World Bank). |
| BIS statistics (policy rates, real exchange rates, debt securities, credit cycle) | Allowed with conditions | Free sharing allowed | Allowed if the BIS is cited as the source. | Allowed, provided including the statistics adds no extra charge for subscribers or users. | Source: BIS (Bank for International Settlements), <dataset>, e.g. "Source: BIS central bank policy rates". |
| ECB statistics: euro reference rates (through Frankfurter), Survey of Professional Forecasters | Open with attribution | Free sharing allowed | Allowed, free of charge, if the source is quoted and the statistics are not modified. | Allowed ("irrespective of any subsequent commercial or non-commercial use"). | Source: ECB statistics (via Frankfurter). Volatility and year-to-date moves are the app's own calculations from them. |
| ExchangeRate-API open access (open.er-api.com) | Permission needed for client or commercial use | Do not pass on | Not allowed to redistribute; rates may be used for your own end purposes with a credit link on the page. | Allowed for your own currency conversion, not in a product that passes rates on to others. | Rates By Exchange Rate API (linked to https://www.exchangerate-api.com) on every page that uses the rates. |
| New York Fed markets data | Allowed with conditions | Free sharing allowed | Allowed for personal or business purposes; reference rates (SOFR, EFFR and others) must carry the New York Fed's notice. | Allowed for business purposes; no general ban on data. | "© <year> Federal Reserve Bank of New York. Content from the New York Fed subject to the Terms of Use at newyorkfed.org." For SOFR and EFFR also: "The <rate> is subject to the Terms of Use posted at newyorkfed.org. The New York Fed is not responsible for publication of the <rate> by <publisher>, does not sanction or endorse any particular republication, and has no liability for your use." |
| FRED (St. Louis Fed): 10Y government yields from the OECD; St. Louis Fed and Chicago Fed stress indices; US inflation expectations | Permission needed for client or commercial use | Sharing unclear | The series are labelled "Copyrighted: Citation Required" (owner: OECD). FRED's terms say to contact the data owner before any use beyond personal use, and that FRED cannot give that permission. | Unclear in FRED's own terms (one section allows reports to clients with attribution for citation-required series; others require the owner's permission). | OECD (year), Main Economic Indicators, long-term interest rates, retrieved from FRED, Federal Reserve Bank of St. Louis. With the FRED API key: "This product uses the FRED® API but is not endorsed or certified by the Federal Reserve Bank of St. Louis." |
| OECD leading indicators and consumer prices (via DBnomics) | Terms not confirmed | Sharing unclear | DBnomics passes on the OECD's own licence. The OECD terms page could not be read past its navigation, so the OECD data licence is not confirmed here. | Not confirmed. | OECD (year), <dataset name>, <data source>, via DBnomics (citation form quoted on FRED's OECD series notes). |
| Eurostat HICP, government expenditure by function (COFOG) and EU business and consumer surveys | Open with attribution | Free sharing allowed | Allowed without a licence if Eurostat is named and any change to the data is stated. | Allowed for EU, EFTA and candidate countries (the app reads EU and EFTA members only). | Source: Eurostat (prc_hicp_minr, gov_10a_exp, ei_bssi_m_r2, ei_bsee_m_r2); surveys by the European Commission (DG ECFIN). |
| CFTC Commitments of Traders | Open with attribution | Free sharing allowed | Public domain. | Allowed. | Source: CFTC Commitments of Traders (acknowledgement requested). |
| US Treasury TIC (major foreign holders) | Terms not confirmed | Sharing unclear | No terms, licence or copyright statement was found on the TIC or Treasury site-policy pages. | Not stated. | Source: US Treasury, Treasury International Capital (TIC) system. |
| US Treasury Fiscal Data (Treasury Securities Auctions Data) | Open with attribution | Free sharing allowed | Allowed: Fiscal Data says its data are free, without restriction, to copy, adapt and redistribute. | Allowed ("for non-commercial or commercial purposes"). | Source: U.S. Department of the Treasury, Fiscal Data, Treasury Securities Auctions Data. |
| US EIA open data | Open with attribution | Free sharing allowed | Public domain. | No restriction stated. | Source: U.S. Energy Information Administration (<publication date>). |
| GDELT (DOC API, raw GDELT 2.0 files and GDELT 1.0 event files) | Open with attribution | Free sharing allowed | Allowed in any form, with a citation and link. | Allowed, without fee. | Source: The GDELT Project (https://www.gdeltproject.org/). |
| UCDP (Uppsala Conflict Data Program) downloaded files | Open with attribution | Free sharing allowed | Allowed: free to use and redistribute under CC BY 4.0, citing the publications listed with each dataset. | Allowed (CC BY 4.0 sets no commercial limit). | UCDP, Uppsala University (ucdp.uu.se), CC BY 4.0; cite the dataset publications, e.g. Davies, Pettersson & Öberg (2026), Journal of Peace Research, and Gleditsch et al. (2002), Journal of Peace Research 39(5). |
| OFAC sanctions lists (US Treasury) | Terms not confirmed | Sharing unclear | Not confirmed: the terms page could not be read from where this register was written. | Not confirmed. | Office of Foreign Assets Control, US Department of the Treasury. |
| UN Security Council Consolidated List | Terms not confirmed | Sharing unclear | Not confirmed: the terms page could not be read from where this register was written. | Not confirmed. | United Nations Security Council Consolidated List. |
| Caldara-Iacoviello Geopolitical Risk index | Terms not confirmed | Sharing unclear | Not confirmed: the data page could not be read from where this register was written. | Not confirmed. | Caldara, Dario and Matteo Iacoviello (2022), "Measuring Geopolitical Risk", American Economic Review 112(4), 1194-1225. |
| Polymarket | Permission needed for client or commercial use | Sharing unclear | Personal, limited licence only. Redistribution to capital-markets firms or data distributors needs written agreement. | Professional capital-markets users (including investment managers and financial technology companies) may not access the data through an API without written agreement. | None stated. |
| Kalshi | Permission needed for client or commercial use | Do not pass on | Not allowed without Kalshi's written authorization. | Not allowed: personal, non-commercial use only; API use is limited to a member's own trading. | None stated. |
| Central Reserve Bank of Peru (BCRPData): J.P. Morgan EMBI spreads; interbank PEN rate | Terms not confirmed | Sharing unclear | The BCRP allows reproduction without permission if it is cited, but the spreads are J.P. Morgan's index and the BCRP says responsibility for outside data rests with the original provider. J.P. Morgan's own terms were not read. | Not stated by the BCRP; J.P. Morgan index terms not confirmed. | Fuente: BCRP (BCRPData), from J.P. Morgan EMBI Global. |
| Colombia TRM (Superintendencia Financiera) on datos.gov.co | Terms not confirmed | Sharing unclear | The dataset's licence was not read. | Not confirmed. | Fuente: Superintendencia Financiera de Colombia, TRM (datos.gov.co). |
| Banco Central de la República Argentina (Cotizaciones API) | Terms not confirmed | Sharing unclear | The API terms were not read. | Not confirmed. | Fuente: Banco Central de la República Argentina. |
| Banco Central do Brasil (SGS 13522, IPCA 12 months; Focus market expectations) | Terms not confirmed | Sharing unclear | The open data portal names no licence and its footer reads "Todos os direitos reservados" (all rights reserved). The copyright page needs JavaScript and was not read. | Not stated. | Fonte: Banco Central do Brasil, SGS série 13522. |
| Banco de México (SIE API, INPC), with your token | Terms not confirmed | Sharing unclear | Not confirmed. The terms are shown on the token page, which could not be read from the build machine. | Not stated here. | Fuente: Banco de México, SIE (serie SP30578). |
| Brazil Treasury (Tesouro Direto price history) | Open with attribution | Free sharing allowed | Allowed under the Open Database License (ODbL). | Allowed under ODbL (attribution; a shared derived database stays under ODbL). | Fonte: Tesouro Transparente, Taxas dos Títulos Ofertados pelo Tesouro Direto (ODbL). |
| Central Bank of Turkey (EVDS), with your key | Permission needed for client or commercial use | Free sharing allowed | May be published with the source cited. | Needs the TCMB's written permission. | Kaynak: TCMB EVDS (Central Bank of the Republic of Türkiye). |
| ACLED (Armed Conflict Location & Event Data), with your account or your downloaded files | Allowed with conditions | Do not pass on | Free for non-commercial use, including internal research. Anything published must be transformative and must not let the underlying data be rebuilt; ACLED must be named as the source. | Not allowed without a corporate licence from ACLED; governments and multilateral bodies need a public-sector licence. | ACLED (Armed Conflict Location & Event Data), accessed [date], www.acleddata.com; filters and any changes stated. |
| Bank of Canada and Bank of England Sovereign Default Database (BoC-BoE) | Allowed with conditions | Free sharing allowed | Allowed: the Bank lets anyone use, copy and distribute its website content, crediting the Bank and saying if anything was changed, without suggesting the Bank endorses the use. | Not limited by the terms for the Bank's own content; a paid product that includes it must tell buyers the content is free on the Bank's website. | Source: Bank of Canada and Bank of England, BoC-BoE Sovereign Default Database (<edition>), Bank of Canada Valet API; figures as published, US$ millions. |
| IMF PortWatch (daily chokepoint transits and port activity, ArcGIS feature layers) | Terms not confirmed | Sharing unclear | The PortWatch terms page did not give its text to an automated reader, and the layers carry no licence or copyright text. | Not confirmed. | Source: IMF PortWatch (portwatch.imf.org), daily port and chokepoint data and preliminary trade volume estimates. |
| Your own paid data (CDS file, LSEG account) | Terms not confirmed | Do not pass on | Set by your own licence with the vendor. Market data licences usually limit display to licensed users. | Set by your own licence. | As your vendor contract requires. |
| AidData Global Chinese Development Finance Dataset, version 3.0 | Open with attribution | Free sharing allowed | Allowed: the AidData dataset is under the Open Data Commons Attribution License (ODC-By). | ODC-By sets no commercial limit; the pages read do not mention commercial use. | AidData. 2023. Global Chinese Development Finance Dataset, Version 3.0. |
| IMF list of low-income country debt sustainability analyses | Terms not confirmed | Sharing unclear | Not stated: the one-page list has no terms of use. The ratings are shown as facts with the source, the list date and the day it was read. | Not stated. | Source: International Monetary Fund, List of IMF/WBG LIC DSAs for PRGT-Eligible Countries, as of September 30, 2026. |
| Our World in Data energy file (Energy Institute Statistical Review of World Energy) | Permission needed for client or commercial use | Do not pass on | Not allowed without the Energy Institute's permission: its terms allow private, non-commercial use only. Our World in Data's CC BY covers its own work, not the Energy Institute's figures. | Not allowed without the Energy Institute's permission. | Energy Institute - Statistical Review of World Energy (year); Our World in Data energy dataset. |
| IMF Sovereign Debt Investor Base for Emerging Markets and Developing Economies (Arslanalp and Tsuda) | Permission needed for client or commercial use | Free sharing allowed | Allowed with credit under the IMF data terms; the workbook itself states no terms. | Needs permission: email copyright@imf.org. | Source: International Monetary Fund, Sovereign Debt Investor Base for Emerging Markets and Developing Economies; Arslanalp and Tsuda (2014), IMF Working Paper WP/14/39. |
| DSSI and Common Framework status (World Bank, Paris Club) | Terms not confirmed | Sharing unclear | Not stated on either page. | Not stated. | World Bank, COVID-19 Debt Service Suspension Initiative; Paris Club, Common Framework. |

## Sources

### World Bank indicators and debt statistics (IDS, QEDS)

- **Used for:** Reserves, current account, external debt, political stability, trade shares, military spending (SIPRI, MS.MIL.XPND.GD.ZS); inequality (Gini, SI.POV.GINI), central government tax revenue and its split (GC.TAX.*), applied tariffs (TM.TAX.MRCH.*, WITS/TRAINS); poverty rates (SI.POV.DDAY, SI.POV.LMIC, SI.POV.UMIC), remittances (BX.TRF.PWKR.DT.GD.ZS), labour force participation and youth unemployment (ILO modelled estimates), age dependency (SP.POP.DPND); interest as % of revenue (GC.XPN.INTP.RV.ZS); goods exports and imports by group (TX.VAL.*, TM.VAL.*), net energy imports (EG.IMP.CONS.ZS); greenhouse gas emissions per person (EN.GHG.ALL.PC.CE.AR5, from EU EDGAR), renewable share of energy use (EG.FEC.RNEW.ZS); currency mix and maturity of new loans of public external debt (IDS DT.CUR.*, DT.MAT.DPPG); external debt falling due; who holds public external debt and terms of new loans (IDS)
- **Status:** Open with attribution
- **Free non-commercial sharing:** Free sharing allowed. CC BY 4.0 allows sharing with credit.
- **Terms read:** [Terms of Use for Datasets](https://www.worldbank.org/ext/en/legal/terms-conditions/datasets) (checked 2026-11-06)
- **Show to others:** Allowed: the data may be shared with third parties under CC BY 4.0.
- **Commercial use:** Allowed (CC BY 4.0 sets no commercial limit).
- **Credit:** The World Bank: <dataset name>: <data source>, e.g. "The World Bank: World Development Indicators".
- **Open question:** Third-party indicators inside World Bank datasets can carry their own terms (stated in each indicator's metadata); the per-dataset licence for IDS and QEDS in the Data Catalog was not read. Military spending is SIPRI's data republished by the World Bank; SIPRI's own terms were not read.

From the terms:

> Unless specifically labeled otherwise, these Datasets are provided to you under a Creative Commons Attribution 4.0 International License (CC BY 4.0), with the additional terms below.
>
> You may extract, download, and make copies of the data contained in the Datasets, and you may share that data with third parties according to these terms of use.
>
> Some datasets and indicators are provided by third parties, and may not be redistributed or reused without the consent of the original data provider

### World Bank Pink Sheet (commodity prices)

- **Used for:** Monthly commodity prices: oil, gas, metals, farm goods
- **Status:** Terms not confirmed
- **Free non-commercial sharing:** Sharing unclear. Catalog licence not read.
- **Terms read:** [Terms of Use for Datasets](https://www.worldbank.org/ext/en/legal/terms-conditions/datasets); [Data Catalog](https://datacatalog.worldbank.org) (checked 2026-11-06)
- **Show to others:** Likely covered by the World Bank dataset terms (CC BY 4.0), but the Pink Sheet's own catalog entry could not be read.
- **Commercial use:** Not confirmed.
- **Credit:** The World Bank: Commodity Price Data (The Pink Sheet).
- **Open question:** Read the Pink Sheet licence field in the World Bank Data Catalog before showing commodity prices to clients. Some prices in it come from third parties.

### IMF (World Economic Outlook, Fiscal Monitor, International Liquidity, Balance of Payments, COFER, Consumer Price Index)

- **Used for:** Debt/GDP, inflation, growth, primary balance, output gap, reserves, current account, imports, COFER shares, monthly consumer prices (CPI dataset), government spending by function (GFS COFOG, read through DBnomics)
- **Status:** Permission needed for client or commercial use
- **Free non-commercial sharing:** Free sharing allowed. IMF Data may be published and distributed with attribution; only commercial reuse needs permission.
- **Terms read:** [Copyright and Usage (Special Terms for Statistical Data)](https://www.imf.org/en/About/copyright-and-terms) (checked 2026-11-06)
- **Show to others:** Allowed with attribution: the IMF lets users publish and distribute its Data.
- **Commercial use:** Needs permission: email copyright@imf.org. Systematic or bulk automated download also needs permission.
- **Credit:** Source: International Monetary Fund, <database name>, <link to the dataset>.
- **Open question:** Commercial reuse (for example a paid service or client deliverables) needs the IMF's permission. Whether the app's "Download all country data" counts as bulk automated download is not addressed by the terms. COFER and Fiscal Monitor are not named, but fall under "statistical data ... that explicitly identify the International Monetary Fund as the source".

From the terms:

> Users may download, extract, copy, create derivative works, publish, distribute, and use Data obtained from IMF Sites subject to these conditions:
>
> Distributed or reproduced Data must appear accurately with attribution to the IMF as the source, e.g. "Source: International Monetary Fund, Database Name, <<link to the dataset>>."
>
> For any potential commercial reuse of IMF Data, email copyright@imf.org to request permission.
>
> The IMF prohibits bulk download of information by automated technology without explicit permission

### UN Comtrade

- **Used for:** Goods trade by partner and export mix by HS chapter; top five export markets and export concentration (the app's Herfindahl calculation)
- **Status:** Permission needed for client or commercial use
- **Free non-commercial sharing:** Free sharing allowed. The FAQ exempts free, not-for-profit visualisation and analytics applications.
- **Terms read:** [Policy on Comtrade data use](https://uncomtrade.org/docs/policy-on-comtrade-data-use/); [Re-dissemination of data (FAQ)](https://uncomtrade.org/docs/re-dissemination-of-data/) (checked 2026-11-06)
- **Show to others:** Internal use only. Free, not-for-profit visualisation is exempt; a paid report or dashboard is exempt only below 100,000 original records.
- **Commercial use:** Paid, subscription or otherwise monetised use counts as commercial; commercial APIs need a premium subscription.
- **Credit:** Source: UN Comtrade.
- **Open question:** The policy page and the FAQ read differently (blanket "internal use only" against the FAQ's exemptions). The app stores a few hundred rows per country, well under 100,000, but confirm with comtrade@un.org before a paid product.

From the terms:

> UN Comtrade data are provided for internal use only and may not be re-disseminated in any form without UNSD's permission.
>
> Internal use explicitly excludes data dissemination to any entity outside the institutional unit.
>
> Free visualization and analytics applications are exempt.
>
> A paid report or chargeable dashboard is exempt when the database used for re-dissemination contains fewer than 100,000 original UN Comtrade records.
>
> Use "Source: UN Comtrade."

### WITS (World Integrated Trade Solution)

- **Used for:** Export and import shares with China and Russia
- **Status:** Permission needed for client or commercial use
- **Free non-commercial sharing:** Do not pass on. WITS states its Comtrade-derived data is for internal use only.
- **Terms read:** [WITS FAQ, Databases (usage conditions)](https://wits.worldbank.org/faqs.html) (checked 2026-11-06)
- **Show to others:** The trade shares come from UN Comtrade data, which WITS says is for internal use only.
- **Commercial use:** Needs UNSD's written permission (see UN Comtrade).
- **Credit:** Source: UN Comtrade via WITS (World Bank).
- **Open question:** Same position as UN Comtrade. Where Comtrade has the shares the app already uses Comtrade instead.

From the terms:

> These data are copyrighted by the United Nations. They are made available for internal use only and may not be re-disseminated in any form without written permission of the United Nations Statistics Division (UNSD).

### BIS statistics (policy rates, real exchange rates, debt securities, credit cycle)

- **Used for:** Central bank policy rates and their history, real exchange rates, government debt securities, credit-to-GDP gaps, debt service ratios and residential property prices
- **Status:** Allowed with conditions
- **Free non-commercial sharing:** Free sharing allowed. Use is unrestricted with the BIS cited.
- **Terms read:** [Terms of permitted use of BIS statistics](https://data.bis.org/help/legal); [BIS terms and conditions](https://www.bis.org/terms_conditions.htm) (checked 2026-11-06)
- **Show to others:** Allowed if the BIS is cited as the source.
- **Commercial use:** Allowed, provided including the statistics adds no extra charge for subscribers or users.
- **Credit:** Source: BIS (Bank for International Settlements), <dataset>, e.g. "Source: BIS central bank policy rates".
- **Open question:** In a paid product the BIS figures must not be what is charged for. The general bis.org terms allow redistribution "for non-commercial purposes", which the statistics terms override for statistics.

From the terms:

> The use of the statistics is unrestricted, provided that:
>
> if the statistics are reproduced, the BIS must be cited in your publication or product as the source of the statistics;
>
> if the statistics will be used in a commercial publication or product, their inclusion in the publication or product will not result in any additional charge to subscribers or other users;

### ECB statistics: euro reference rates (through Frankfurter), Survey of Professional Forecasters

- **Used for:** Daily exchange rate history per US dollar since 1999; FX volatility; last year's closing rate for the year-to-date move; Survey of Professional Forecasters inflation expectations (ECB Data Portal, dataset SPF, quarterly world series)
- **Status:** Open with attribution
- **Free non-commercial sharing:** Free sharing allowed. Free reuse with the source quoted and the figures unmodified.
- **Terms read:** [ECB statistics reuse policy](https://www.ecb.europa.eu/stats/ecb_statistics/governance_and_quality_framework/html/usage_policy.en.html); [Frankfurter licence](https://frankfurter.dev/license/) (checked 2026-11-06)
- **Show to others:** Allowed, free of charge, if the source is quoted and the statistics are not modified.
- **Commercial use:** Allowed ("irrespective of any subsequent commercial or non-commercial use").
- **Credit:** Source: ECB statistics (via Frankfurter). Volatility and year-to-date moves are the app's own calculations from them.
- **Open question:** Derived figures (volatility, year-to-date change) should be labelled as the app's calculation so they are not presented as ECB statistics.

From the terms:

> All publicly available ESCB statistics may be reused free of charge on the condition that the source is quoted (e.g. "Source: ECB statistics.")
>
> Frankfurter doesn't own the rates, so it can't give you rights the provider doesn't. If a provider publishes terms of use, they apply.

### ExchangeRate-API open access (open.er-api.com)

- **Used for:** Spot exchange rates against the dollar
- **Status:** Permission needed for client or commercial use
- **Free non-commercial sharing:** Do not pass on. The terms forbid redistributing the rates.
- **Terms read:** [Free / open access docs](https://www.exchangerate-api.com/docs/free); [Terms of use](https://www.exchangerate-api.com/terms) (checked 2026-11-06)
- **Show to others:** Not allowed to redistribute; rates may be used for your own end purposes with a credit link on the page.
- **Commercial use:** Allowed for your own currency conversion, not in a product that passes rates on to others.
- **Credit:** Rates By Exchange Rate API (linked to https://www.exchangerate-api.com) on every page that uses the rates.
- **Open question:** Spot rates shown to clients or in exports would be redistribution. Options: switch spot FX to the ECB rates (Frankfurter, already the backup) for anything shared, or ask ExchangeRate-API in writing.

From the terms:

> You're welcome to cache the data we respond with and to use it for either personal or commercial currency conversion purposes. You are, however, not allowed to re-distribute it.
>
> ExchangeRate-API data may only be used for your end purposes and not in any product or service that offers programmatic or automatic access to exchange rate data.
>
> Use of the exchange rates we provide for actual transactions or as financial data is explicitly not recommended.

### New York Fed markets data

- **Used for:** Fed funds, SOFR, reverse repo; Global Supply Chain Pressure Index (GSCPI, a factor in the global shock scenarios and a world series; built by the New York Fed from transport and manufacturing data)
- **Status:** Allowed with conditions
- **Free non-commercial sharing:** Free sharing allowed. The licence covers use, copying and distribution, with the notice for reference rates.
- **Terms read:** [Terms of Use](https://www.newyorkfed.org/privacy/termsofuse) (checked 2026-11-06)
- **Show to others:** Allowed for personal or business purposes; reference rates (SOFR, EFFR and others) must carry the New York Fed's notice.
- **Commercial use:** Allowed for business purposes; no general ban on data.
- **Credit:** "© <year> Federal Reserve Bank of New York. Content from the New York Fed subject to the Terms of Use at newyorkfed.org." For SOFR and EFFR also: "The <rate> is subject to the Terms of Use posted at newyorkfed.org. The New York Fed is not responsible for publication of the <rate> by <publisher>, does not sanction or endorse any particular republication, and has no liability for your use."
- **Open question:** Exports that include SOFR or the fed funds rate should carry the reference-rate notice above.

From the terms:

> The New York Fed grants you a non-exclusive license, subject to the Terms, to use, copy, and distribute Content for your personal or business purposes.
>
> None of the Content is investment advice.

### FRED (St. Louis Fed): 10Y government yields from the OECD; St. Louis Fed and Chicago Fed stress indices; US inflation expectations

- **Used for:** US data as first published and as known on a past day (ALFRED vintages of GDPC1 real GDP, CPIAUCSL CPI and UNRATE unemployment, with your FRED API key; government statistics from BEA and BLS); US inflation expectations: 5- and 10-year breakevens and the 5y5y forward (T5YIE, T10YIE, T5YIFR, computed by the St. Louis Fed from US Treasury yields, labelled "Copyrighted: Citation Required") and the Cleveland Fed 1- and 10-year expected inflation (EXPINF1YR, EXPINF10YR, labelled "Public Domain: Citation Requested"); St. Louis Fed Financial Stress Index (STLFSI4, the default stress factor in the global shock scenarios; owned by the St. Louis Fed itself, labelled "Copyrighted: Citation Required"); Chicago Fed NFCI and adjusted NFCI (NFCI, ANFCI, alternative stress factors and world series; owned by the Federal Reserve Bank of Chicago, labelled "Copyrighted: Citation Required"); 10Y yields for the US, Mexico, South Africa, Japan, UK, Poland, Chile, India, Korea, Israel, Canada, Australia, New Zealand, Switzerland, the Nordics, Czechia, Hungary, Slovakia and 11 euro-area countries (all OECD series on FRED)
- **Status:** Permission needed for client or commercial use
- **Free non-commercial sharing:** Sharing unclear. The OECD owns the series; FRED says to ask the owner before any use beyond personal use.
- **Terms read:** [FRED legal](https://fred.stlouisfed.org/legal/); [FRED API terms](https://fred.stlouisfed.org/docs/api/terms_of_use.html); [Example series: Mexico 10Y](https://fred.stlouisfed.org/series/IRLTLT01MXM156N) (checked 2026-11-06)
- **Show to others:** The series are labelled "Copyrighted: Citation Required" (owner: OECD). FRED's terms say to contact the data owner before any use beyond personal use, and that FRED cannot give that permission.
- **Commercial use:** Unclear in FRED's own terms (one section allows reports to clients with attribution for citation-required series; others require the owner's permission).
- **Credit:** OECD (year), Main Economic Indicators, long-term interest rates, retrieved from FRED, Federal Reserve Bank of St. Louis. With the FRED API key: "This product uses the FRED® API but is not endorsed or certified by the Federal Reserve Bank of St. Louis."
- **Open question:** The yields belong to the OECD; FRED's terms conflict on client display. Settle it through the OECD's own licence (see the OECD row, not yet confirmed).

From the terms:

> BEFORE USING DATA SERIES OWNED BY THIRD PARTIES FOR ANYTHING OTHER THAN YOUR OWN PERSONAL USE, YOU MUST CONTACT THE DATA OWNER TO OBTAIN PERMISSION.
>
> Data in this graph are copyrighted. Please review the copyright information in the series notes before sharing.
>
> This product uses the FRED® API but is not endorsed or certified by the Federal Reserve Bank of St. Louis.

### OECD leading indicators and consumer prices (via DBnomics)

- **Used for:** Composite leading indicator; headline CPI inflation
- **Status:** Terms not confirmed
- **Free non-commercial sharing:** Sharing unclear. The OECD data licence was not confirmed.
- **Terms read:** [OECD terms and conditions](https://www.oecd.org/en/about/terms-conditions.html); [DBnomics legal terms](https://docs.db.nomics.world/legal-terms/) (checked 2026-11-06)
- **Show to others:** DBnomics passes on the OECD's own licence. The OECD terms page could not be read past its navigation, so the OECD data licence is not confirmed here.
- **Commercial use:** Not confirmed.
- **Credit:** OECD (year), <dataset name>, <data source>, via DBnomics (citation form quoted on FRED's OECD series notes).
- **Open question:** Read the OECD data licence on oecd.org in a browser (the page needs JavaScript) and update this row; the FRED yields depend on it too.

From the terms:

> Data distributed by DBnomics is subject to the same license and terms of use as its original source provider.
>
> All OECD data should be cited as follows: OECD (year), (dataset name), (data source) DOI or https://data-explorer.oecd.org/. (accessed on (date)).

### Eurostat HICP, government expenditure by function (COFOG) and EU business and consumer surveys

- **Used for:** Monthly inflation for EU members (Poland on the defaults); government spending by function, % of GDP (gov_10a_exp); the European Commission's business and consumer surveys as Eurostat republishes them (ei_bssi_m_r2, ei_bsee_m_r2)
- **Status:** Open with attribution
- **Free non-commercial sharing:** Free sharing allowed. Free reuse with Eurostat named.
- **Terms read:** [Eurostat copyright and reuse](https://ec.europa.eu/eurostat/about-us/policies/copyright) (checked 2026-11-06)
- **Show to others:** Allowed without a licence if Eurostat is named and any change to the data is stated.
- **Commercial use:** Allowed for EU, EFTA and candidate countries (the app reads EU and EFTA members only).
- **Credit:** Source: Eurostat (prc_hicp_minr, gov_10a_exp, ei_bssi_m_r2, ei_bsee_m_r2); surveys by the European Commission (DG ECFIN).

From the terms:

> Eurostat has a policy of encouraging free re-use of its data, both for non-commercial and commercial purposes.
>
> when re-use involves modifications to the data or text, this must be stated clearly to the end user of the information.

### CFTC Commitments of Traders

- **Used for:** Weekly currency futures positioning
- **Status:** Open with attribution
- **Free non-commercial sharing:** Free sharing allowed. Public domain.
- **Terms read:** [CFTC web policy](https://www.cftc.gov/webpolicy/index.htm) (checked 2026-11-06)
- **Show to others:** Public domain.
- **Commercial use:** Allowed.
- **Credit:** Source: CFTC Commitments of Traders (acknowledgement requested).

From the terms:

> Government information at the CFTC website is in the public domain. Public domain information may be freely distributed and copied, but it is requested that in any subsequent use the CFTC be given appropriate acknowledgement.

### US Treasury TIC (major foreign holders)

- **Used for:** Holdings of US Treasuries by country
- **Status:** Terms not confirmed
- **Free non-commercial sharing:** Sharing unclear. No terms found.
- **Terms read:** [TIC system page](https://home.treasury.gov/data/treasury-international-capital-tic-system); [Treasury site policies](https://home.treasury.gov/subfooter/site-policies-and-notices) (checked 2026-11-06)
- **Show to others:** No terms, licence or copyright statement was found on the TIC or Treasury site-policy pages.
- **Commercial use:** Not stated.
- **Credit:** Source: US Treasury, Treasury International Capital (TIC) system.
- **Open question:** Treasury does not state a licence for TIC. Its Fiscal Data site says its data is "free, without restriction" for commercial use, but that page does not cover TIC.

### US Treasury Fiscal Data (Treasury Securities Auctions Data)

- **Used for:** Bid-to-cover, high yield, amounts offered and accepted, and the indirect bidders' share at each auction of US bills, notes and bonds
- **Status:** Open with attribution
- **Free non-commercial sharing:** Free sharing allowed. Free, without restriction.
- **Terms read:** [Fiscal Data about and terms](https://fiscaldata.treasury.gov/about-us/); [Treasury Securities Auctions Data](https://fiscaldata.treasury.gov/datasets/treasury-securities-auctions-data/) (checked 2026-11-08)
- **Show to others:** Allowed: Fiscal Data says its data are free, without restriction, to copy, adapt and redistribute.
- **Commercial use:** Allowed ("for non-commercial or commercial purposes").
- **Credit:** Source: U.S. Department of the Treasury, Fiscal Data, Treasury Securities Auctions Data.

From the terms:

> free, without restriction, and available to copy, adapt, redistribute, or otherwise use for non-commercial or commercial purposes.

### US EIA open data

- **Used for:** Daily Brent and WTI spot prices (with your free key)
- **Status:** Open with attribution
- **Free non-commercial sharing:** Free sharing allowed. Public domain.
- **Terms read:** [EIA copyrights and reuse](https://www.eia.gov/about/copyrights_reuse.php) (checked 2026-11-06)
- **Show to others:** Public domain.
- **Commercial use:** No restriction stated.
- **Credit:** Source: U.S. Energy Information Administration (<publication date>).

From the terms:

> U.S. government publications are in the public domain and are not subject to copyright protection. You may use and/or distribute any of our data, files, databases, reports, graphs, charts, and other information products

### GDELT (DOC API, raw GDELT 2.0 files and GDELT 1.0 event files)

- **Used for:** Headlines and news tone; weekly event counts and news themes per country; monthly event history back to 1979
- **Status:** Open with attribution
- **Free non-commercial sharing:** Free sharing allowed. Any redistribution allowed with a citation and link.
- **Terms read:** [GDELT terms of use](https://www.gdeltproject.org/about.html#termsofuse) (checked 2026-11-06)
- **Show to others:** Allowed in any form, with a citation and link.
- **Commercial use:** Allowed, without fee.
- **Credit:** Source: The GDELT Project (https://www.gdeltproject.org/).
- **Open question:** Headlines link to news articles owned by their publishers; GDELT's terms cover GDELT's data, not the articles.

From the terms:

> You may redistribute, rehost, republish, and mirror any of the GDELT datasets in any form. However, any use or redistribution of the data must include a citation to the GDELT Project and a link to this website (https://www.gdeltproject.org/).
>
> available for unlimited and unrestricted use for any academic, commercial, or governmental use of any kind without fee.

### UCDP (Uppsala Conflict Data Program) downloaded files

- **Used for:** Armed conflicts, battle deaths, non-state and one-sided violence per country and year; preliminary monthly Candidate events since the yearly release (release shipped in datasets/ucdp/; newer files fetched into data/local/ucdp/ by the daily start-up run or npm run ucdp:pull, or put there by you)
- **Status:** Open with attribution
- **Free non-commercial sharing:** Free sharing allowed. CC BY 4.0 allows sharing with a citation of the dataset publications.
- **Terms read:** [UCDP downloads (licence and citations)](https://ucdp.uu.se/downloads/) (checked 2026-11-06)
- **Show to others:** Allowed: free to use and redistribute under CC BY 4.0, citing the publications listed with each dataset.
- **Commercial use:** Allowed (CC BY 4.0 sets no commercial limit).
- **Credit:** UCDP, Uppsala University (ucdp.uu.se), CC BY 4.0; cite the dataset publications, e.g. Davies, Pettersson & Öberg (2026), Journal of Peace Research, and Gleditsch et al. (2002), Journal of Peace Research 39(5).

From the terms:

> All datasets are free of charge and licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/) — you are free to use and redistribute them provided you cite the relevant publications listed with each dataset.

### OFAC sanctions lists (US Treasury)

- **Used for:** SDN and non-SDN sanctions list entries by country and programme (files you put in data/local/sanctions/)
- **Status:** Terms not confirmed
- **Free non-commercial sharing:** Sharing unclear. Terms not read.
- **Terms read:** [OFAC Sanctions List Service](https://ofac.treasury.gov/sanctions-list-service) (checked 2026-11-06)
- **Show to others:** Not confirmed: the terms page could not be read from where this register was written.
- **Commercial use:** Not confirmed.
- **Credit:** Office of Foreign Assets Control, US Department of the Treasury.
- **Open question:** Read the terms on the OFAC Sanctions List Service page and update this row before showing list counts to others.

### UN Security Council Consolidated List

- **Used for:** UN sanctions list entries by country, regime and year listed (consolidated.xml in data/local/sanctions/)
- **Status:** Terms not confirmed
- **Free non-commercial sharing:** Sharing unclear. Terms not read.
- **Terms read:** [UN Security Council Consolidated List](https://main.un.org/securitycouncil/en/content/un-sc-consolidated-list) (checked 2026-11-06)
- **Show to others:** Not confirmed: the terms page could not be read from where this register was written.
- **Commercial use:** Not confirmed.
- **Credit:** United Nations Security Council Consolidated List.
- **Open question:** Read the UN terms of use for the consolidated list and update this row before showing list counts to others.

### Caldara-Iacoviello Geopolitical Risk index

- **Used for:** Monthly geopolitical risk index, world and 44 countries (file fetched into data/local/gpr/ by the daily start-up run or npm run gpr:pull, or saved there by you), in the country risk scorecard
- **Status:** Terms not confirmed
- **Free non-commercial sharing:** Sharing unclear. Terms not read.
- **Terms read:** [Geopolitical Risk Index page](https://www.matteoiacoviello.com/gpr.htm) (checked 2026-11-06)
- **Show to others:** Not confirmed: the data page could not be read from where this register was written.
- **Commercial use:** Not confirmed.
- **Credit:** Caldara, Dario and Matteo Iacoviello (2022), "Measuring Geopolitical Risk", American Economic Review 112(4), 1194-1225.
- **Open question:** Read the terms and citation request on the GPR data page and update this row before showing the index to others.

### Polymarket

- **Used for:** Prediction-market odds
- **Status:** Permission needed for client or commercial use
- **Free non-commercial sharing:** Sharing unclear. A personal licence; redistribution is barred only to capital-markets firms and data distributors, and sharing with others is not addressed.
- **Terms read:** [Terms of Use (effective 11 Aug 2026)](https://polymarket.com/tos) (checked 2026-11-06)
- **Show to others:** Personal, limited licence only. Redistribution to capital-markets firms or data distributors needs written agreement.
- **Commercial use:** Professional capital-markets users (including investment managers and financial technology companies) may not access the data through an API without written agreement.
- **Credit:** None stated.
- **Open question:** A desk, fund or fintech using the app professionally falls inside the restriction. Keep Polymarket odds to personal research, or agree terms with Polymarket.

From the terms:

> Access or use any data, content, or information contained on our Site, any Interface or Features directly or through an API ... if you are (i) a non-retail, professional entity that engages in capital markets activities
>
> Sell, resell, sublicense, redistribute, or otherwise commercially exploit the Data to any Capital Market Client or market data distributor, unless otherwise agreed to in writing by us;

### Kalshi

- **Used for:** Prediction-market odds
- **Status:** Permission needed for client or commercial use
- **Free non-commercial sharing:** Do not pass on. Sharing with third parties needs Kalshi's written authorization.
- **Terms read:** [Developer Agreement v1.1](https://assets.kalshi.com/Kalshi-Developer-Agreement.pdf); [Data Terms of Use](https://kalshi-public-docs.s3.amazonaws.com/kalshi-data-terms-of-service.pdf) (checked 2026-11-06)
- **Show to others:** Not allowed without Kalshi's written authorization.
- **Commercial use:** Not allowed: personal, non-commercial use only; API use is limited to a member's own trading.
- **Credit:** None stated.
- **Open question:** The strictest terms in the app. Showing Kalshi odds to anyone else, or using them in a professional setting, needs Kalshi's written authorization.

From the terms:

> Use of Kalshi APIs is expressly limited to facilitating a members own trading on the Exchange; all other usages are disallowed
>
> You may not share such data or content with third parties in any manner without prior written authorization from Kalshi.
>
> You may access content only for your personal use for non-commercial purposes.

### Central Reserve Bank of Peru (BCRPData): J.P. Morgan EMBI spreads; interbank PEN rate

- **Used for:** USD bond spread over Treasuries for Argentina, Brazil, Chile, Colombia, Ecuador, Mexico, Peru, Venezuela (the free stand-in for CDS); daily soles per US dollar (PD04638PD), the BCRP's own series
- **Status:** Terms not confirmed
- **Free non-commercial sharing:** Sharing unclear. The BCRP allows reproduction with citation, but J.P. Morgan's terms for the EMBI levels were not read.
- **Terms read:** [BCRPData Condiciones de Uso](https://estadisticas.bcrp.gob.pe/estadisticas/series/ayuda/condiciones-de-uso); [Example series: EMBIG Peru](https://estadisticas.bcrp.gob.pe/estadisticas/series/diarias/resultados/PD04709XD/html) (checked 2026-11-06)
- **Show to others:** The BCRP allows reproduction without permission if it is cited, but the spreads are J.P. Morgan's index and the BCRP says responsibility for outside data rests with the original provider. J.P. Morgan's own terms were not read.
- **Commercial use:** Not stated by the BCRP; J.P. Morgan index terms not confirmed.
- **Credit:** Fuente: BCRP (BCRPData), from J.P. Morgan EMBI Global.
- **Open question:** EMBI is a J.P. Morgan index, usually licensed. Keep the spreads to your own research until J.P. Morgan's terms for republished EMBI levels are confirmed.

From the terms:

> Puede reproducirse total o parcialmente, sin autorización expresa, siempre y cuando se cite la fuente.
>
> La responsabilidad sobre las estadísticas cuya fuente es externa al Banco recae en la entidad que provee el dato original.

### Colombia TRM (Superintendencia Financiera) on datos.gov.co

- **Used for:** Daily pesos per US dollar (Tasa Representativa del Mercado), dataset 32sa-8pi3
- **Status:** Terms not confirmed
- **Free non-commercial sharing:** Sharing unclear. Licence not read yet.
- **Terms read:** [Dataset 32sa-8pi3 on datos.gov.co](https://www.datos.gov.co/d/32sa-8pi3) (checked 2026-11-07)
- **Show to others:** The dataset's licence was not read.
- **Commercial use:** Not confirmed.
- **Credit:** Fuente: Superintendencia Financiera de Colombia, TRM (datos.gov.co).
- **Open question:** Read the licence shown on the datos.gov.co dataset page for 32sa-8pi3 and update this row.

### Banco Central de la República Argentina (Cotizaciones API)

- **Used for:** Daily pesos per US dollar, the BCRA official quote
- **Status:** Terms not confirmed
- **Free non-commercial sharing:** Sharing unclear. Terms not read yet.
- **Terms read:** [BCRA website (API terms still to find)](https://www.bcra.gob.ar/) (checked 2026-11-07)
- **Show to others:** The API terms were not read.
- **Commercial use:** Not confirmed.
- **Credit:** Fuente: Banco Central de la República Argentina.
- **Open question:** Find and read the terms for the BCRA public APIs (api.bcra.gob.ar) and update this row.

### Banco Central do Brasil (SGS 13522, IPCA 12 months; Focus market expectations)

- **Used for:** Brazil's IPCA inflation over 12 months; Focus survey median IPCA expected over the next 12 months (Olinda OData, Expectativas)
- **Status:** Terms not confirmed
- **Free non-commercial sharing:** Sharing unclear. No licence stated; the footer reads all rights reserved.
- **Terms read:** [Open data portal: about](https://dadosabertos.bcb.gov.br/pages/sobre-o-portal); [Focus dataset page (licence: ODbL)](https://dadosabertos.bcb.gov.br/dataset/expectativas-mercado) (checked 2026-11-06)
- **Show to others:** The open data portal names no licence and its footer reads "Todos os direitos reservados" (all rights reserved). The copyright page needs JavaScript and was not read.
- **Commercial use:** Not stated.
- **Credit:** Fonte: Banco Central do Brasil, SGS série 13522.
- **Open question:** The Focus dataset page names the Open Data Commons Open Database License (ODbL), read 2026-11-07, while the site footer reads all rights reserved. Read https://www.bcb.gov.br/acessoinformacao/direitosautorais in a browser and update this row.

From the terms:

> © Banco Central do Brasil - Todos os direitos reservados

### Banco de México (SIE API, INPC), with your token

- **Used for:** Mexico's INPC inflation over 12 months (only when you add your own Banxico token)
- **Status:** Terms not confirmed
- **Free non-commercial sharing:** Sharing unclear. Terms not read yet; treated as unclear until they are.
- **Terms read:** [SIE API page (terms shown when you request a token)](https://www.banxico.org.mx/SieAPIRest/service/v1/?locale=en) (checked 2026-11-06)
- **Show to others:** Not confirmed. The terms are shown on the token page, which could not be read from the build machine.
- **Commercial use:** Not stated here.
- **Credit:** Fuente: Banco de México, SIE (serie SP30578).
- **Open question:** Read the terms on the token page when you request the token and update this row.

### Brazil Treasury (Tesouro Direto price history)

- **Used for:** Brazil 10Y yield (NTN-F)
- **Status:** Open with attribution
- **Free non-commercial sharing:** Free sharing allowed. Open Database License (ODbL), with credit.
- **Terms read:** [Dataset page (licence)](https://www.tesourotransparente.gov.br/ckan/dataset/taxas-dos-titulos-ofertados-pelo-tesouro-direto) (checked 2026-11-06)
- **Show to others:** Allowed under the Open Database License (ODbL).
- **Commercial use:** Allowed under ODbL (attribution; a shared derived database stays under ODbL).
- **Credit:** Fonte: Tesouro Transparente, Taxas dos Títulos Ofertados pelo Tesouro Direto (ODbL).

From the terms:

> Licença Aberta para Bases de Dados (ODbL) do Open Data Commons

### Central Bank of Turkey (EVDS), with your key

- **Used for:** Turkey monthly CPI inflation and 10Y yield
- **Status:** Permission needed for client or commercial use
- **Free non-commercial sharing:** Free sharing allowed. May be published with the source cited; only commercial use needs permission.
- **Terms read:** [TCMB terms of use (Kullanım Şartları)](https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Bottom+Menu/Diger/Kullanim+Sartlari) (checked 2026-11-06)
- **Show to others:** May be published with the source cited.
- **Commercial use:** Needs the TCMB's written permission.
- **Credit:** Kaynak: TCMB EVDS (Central Bank of the Republic of Türkiye).
- **Open question:** These are the TCMB website terms; they do not name EVDS, whose own pages need JavaScript and were not read.

From the terms:

> Sitede yer alan bilgiler, kaynak gösterilmek suretiyle yayımlanabilir; ancak bu bilgilerin ticari amaçlarla kullanımı TCMB'nin yazılı iznine tabidir.

### ACLED (Armed Conflict Location & Event Data), with your account or your downloaded files

- **Used for:** Conflict events per country over twelve months (only when you add your own ACLED account, or put an aggregated file you downloaded from myACLED in data/local/acled/)
- **Status:** Allowed with conditions
- **Free non-commercial sharing:** Do not pass on. Non-commercial research use only; publishing needs transformative work that cannot be reversed into the data.
- **Terms read:** [ACLED End User License Agreement (1 Nov 2026)](https://acleddata.com/eula/); [ACLED Attribution Policy (5 Nov 2026)](https://acleddata.com/attributionpolicy); [myACLED access levels (FAQ)](https://acleddata.com/myacled-faqs) (checked 2026-11-06)
- **Show to others:** Free for non-commercial use, including internal research. Anything published must be transformative and must not let the underlying data be rebuilt; ACLED must be named as the source.
- **Commercial use:** Not allowed without a corporate licence from ACLED; governments and multilateral bodies need a public-sector licence.
- **Credit:** ACLED (Armed Conflict Location & Event Data), accessed [date], www.acleddata.com; filters and any changes stated.
- **Open question:** Monthly counts per country may count as "reorganized" data, which the EULA says is not enough to publish. Keep ACLED figures to your own research and leave them out of anything shared until ACLED confirms. API access needs the Research level; Open accounts get aggregated downloads only, which the app reads from data/local/acled/. The same EULA covers the downloaded files: they stay on your computer and are never shipped with the app.

From the terms:

> a royalty-free, non-exclusive, non-transferable, non-sublicensable license ... for non-commercial purposes, which may include internal use
>
> Commercial entities may not access or use the Content and/or Platforms without first obtaining a corporate license from the Licensor.
>
> The Licensee may only publish or distribute materials incorporating ACLED's Data where such materials are transformative in nature and do not allow reverse engineering of the underlying dataset.
>
> ACLED as the source of the data must be clearly and prominently acknowledged. This applies to uses of the original ACLED data as well as any manipulation of or additions to the data.

### Bank of Canada and Bank of England Sovereign Default Database (BoC-BoE)

- **Used for:** Government debt in default each year since 1960, by creditor (IMF, Paris Club, China, foreign-currency bonds and bank loans, local-currency debt)
- **Status:** Allowed with conditions
- **Free non-commercial sharing:** Free sharing allowed. The Bank's terms allow free use and distribution with credit; the third-party caveat is noted above.
- **Terms read:** [Bank of Canada Terms of Use, Disclosures and Disclaimers](https://www.bankofcanada.ca/terms/); [BoC-BoE Sovereign Default Database: What's new in 2026? (Staff Analytical Paper 2026-48)](https://www.bankofcanada.ca/2026/10/staff-analytical-paper-2026-48/) (checked 2026-11-07)
- **Show to others:** Allowed: the Bank lets anyone use, copy and distribute its website content, crediting the Bank and saying if anything was changed, without suggesting the Bank endorses the use.
- **Commercial use:** Not limited by the terms for the Bank's own content; a paid product that includes it must tell buyers the content is free on the Bank's website.
- **Credit:** Source: Bank of Canada and Bank of England, BoC-BoE Sovereign Default Database (<edition>), Bank of Canada Valet API; figures as published, US$ millions.
- **Open question:** The database is compiled from published sources (IMF, World Bank, Paris Club and others); the Bank's terms withhold permission for third-party content unless stated, and no database-specific licence was found. The Valet API must not be queried around its request limits: the app reads the file at most once a day.

From the terms:

> You must attribute the Bank of Canada as the source of the content, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests that the Bank endorses you or your use of the content.
>
> You must exercise due diligence in ensuring the accuracy of any content you reproduce.
>
> The Bank does not grant You permission to re-use such third-party content unless it expressly indicates that You may do so.

### IMF PortWatch (daily chokepoint transits and port activity, ArcGIS feature layers)

- **Used for:** Ships through eight chokepoints and estimated volume (world series); each country's port calls and estimated seaborne imports and exports, monthly averages of daily data
- **Status:** Terms not confirmed
- **Free non-commercial sharing:** Sharing unclear. Terms not read yet.
- **Terms read:** [PortWatch terms of use (page could not be read)](https://portwatch.imf.org/pages/terms); [PortWatch data and methodology](https://portwatch.imf.org/pages/data-and-methodology) (checked 2026-11-08)
- **Show to others:** The PortWatch terms page did not give its text to an automated reader, and the layers carry no licence or copyright text.
- **Commercial use:** Not confirmed.
- **Credit:** Source: IMF PortWatch (portwatch.imf.org), daily port and chokepoint data and preliminary trade volume estimates.
- **Open question:** Read the PortWatch terms in a browser (portwatch.imf.org/pages/terms) and update this row. PortWatch is an IMF site, so the IMF Copyright and Usage terms may apply, but the AIS ship data come from partners and may carry their own terms.

### Your own paid data (CDS file, LSEG account)

- **Used for:** 5Y sovereign CDS (hidden for now)
- **Status:** Terms not confirmed
- **Free non-commercial sharing:** Do not pass on. Set by your vendor contract; treated as restricted unless it says otherwise.
- **Terms read:** [Your own contract with the vendor](https://developers.lseg.com) (checked 2026-11-06)
- **Show to others:** Set by your own licence with the vendor. Market data licences usually limit display to licensed users.
- **Commercial use:** Set by your own licence.
- **Credit:** As your vendor contract requires.
- **Open question:** Check your vendor contract before CDS figures go into anything shared. The app never ships paid data and never stores the password in exports, backups or the audit log.

### AidData Global Chinese Development Finance Dataset, version 3.0

- **Used for:** Official loan commitments from China by borrowing country, 2000-2021: per-country sums of version 3.0 shipped in datasets/aiddata/, or a newer file the user puts in data/local/aiddata/ (issuer brief, Fiscal & Debt Agent)
- **Status:** Open with attribution
- **Free non-commercial sharing:** Free sharing allowed. ODC-By allows sharing with credit to AidData.
- **Terms read:** [gcdf-geospatial-data README and LICENSE (AidData, GitHub)](https://github.com/aiddata/gcdf-geospatial-data); [Dataset page (citation)](https://www.aiddata.org/data/aiddatas-global-chinese-development-finance-dataset-version-3-0) (checked 2026-11-11)
- **Show to others:** Allowed: the AidData dataset is under the Open Data Commons Attribution License (ODC-By).
- **Commercial use:** ODC-By sets no commercial limit; the pages read do not mention commercial use.
- **Credit:** AidData. 2023. Global Chinese Development Finance Dataset, Version 3.0.
- **Open question:** The licence is stated in AidData's GitHub repository for the geospatial edition; the dataset page itself states none and aiddata.org/terms did not load. Use the project-level table only (ODC-By), not the OpenStreetMap shapes (ODbL, share-alike).

From the terms:

> The original dataset produced by AidData is licensed using the Open Data Commons Attribution License (ODC-By).
>
> Any use of the dataset and its content must include appropriate attribution to AidData
>
> uses incorporating the geospatial features from OSM must also attribute OSM and be made available using ODbL.

### IMF list of low-income country debt sustainability analyses

- **Used for:** Risk of external debt distress for each low-income country, with the date of its latest DSA (issuer brief, Fiscal & Debt Agent), typed by hand from the list as of 30 September 2026
- **Status:** Terms not confirmed
- **Free non-commercial sharing:** Sharing unclear. No terms stated on the list; facts quoted with source and date.
- **Terms read:** [LIC DSA list (PDF)](https://www.imf.org/external/Pubs/ft/dsa/DSAlist.pdf) (checked 2026-11-11)
- **Show to others:** Not stated: the one-page list has no terms of use. The ratings are shown as facts with the source, the list date and the day it was read.
- **Commercial use:** Not stated.
- **Credit:** Source: International Monetary Fund, List of IMF/WBG LIC DSAs for PRGT-Eligible Countries, as of September 30, 2026.
- **Open question:** The list itself states no terms (copy read 2026-11-11, given by the maintainer). The general IMF copyright and usage page did not load from the build computer; the question is in the email to copyright@imf.org.

### Our World in Data energy file (Energy Institute Statistical Review of World Energy)

- **Used for:** Energy mix: shares of coal, oil, gas, nuclear and renewables in primary energy (country brief, Global Spillover Agent), downloaded weekly to this computer by the daily run
- **Status:** Permission needed for client or commercial use
- **Free non-commercial sharing:** Do not pass on. Private, non-commercial use only; not shipped with the app.
- **Terms read:** [Our World in Data energy data (README)](https://github.com/owid/energy-data); [Energy Institute terms](https://www.energyinst.org/terms); [Energy Institute Statistical Review](https://www.energyinst.org/statistical-review) (checked 2026-11-11)
- **Show to others:** Not allowed without the Energy Institute's permission: its terms allow private, non-commercial use only. Our World in Data's CC BY covers its own work, not the Energy Institute's figures.
- **Commercial use:** Not allowed without the Energy Institute's permission.
- **Credit:** Energy Institute - Statistical Review of World Energy (year); Our World in Data energy dataset.
- **Open question:** The energy mix shares come from the Energy Institute, whose website terms allow private, non-commercial use only. The maintainer chose (2026-11-11, personal non-commercial use) to have each computer download the file itself and never ship it. Do not show these figures to others or use them commercially without the Energy Institute's permission; ask the Energy Institute before any wider use.

From the terms:

> You may only print (or download to disk) the Contents for the purpose of private and personal non-commercial use
>
> is subject to the license terms from the original third-party authors

### IMF Sovereign Debt Investor Base for Emerging Markets and Developing Economies (Arslanalp and Tsuda)

- **Used for:** Who holds government debt: foreign official, foreign banks, foreign other investors, domestic central bank, domestic banks, domestic other investors (country brief, Fiscal & Debt Agent), from the workbook you put in data/local/imf-investor-base/
- **Status:** Permission needed for client or commercial use
- **Free non-commercial sharing:** Free sharing allowed. IMF Data may be published and distributed with credit; commercial reuse needs permission. The workbook is not shipped.
- **Terms read:** [IMF Copyright and Usage (Special Terms for Statistical Data)](https://www.imf.org/en/About/copyright-and-terms); [Workbook (wp1439.zip)](https://www.imf.org/-/media/websites/imf/imported-datasets/external/pubs/ft/wp/2014/data/wp1439.zip) (checked 2026-11-11)
- **Show to others:** Allowed with credit under the IMF data terms; the workbook itself states no terms.
- **Commercial use:** Needs permission: email copyright@imf.org.
- **Credit:** Source: International Monetary Fund, Sovereign Debt Investor Base for Emerging Markets and Developing Economies; Arslanalp and Tsuda (2014), IMF Working Paper WP/14/39.
- **Open question:** The workbook (version of 6 November 2026, read 2026-11-11, given by the maintainer) and the working paper state no terms; the paper PDF is marked "Not for Redistribution", so neither is shipped with the app. The general IMF statistical data terms are taken to apply (publish with credit; commercial reuse needs permission). Confirm with copyright@imf.org with the other IMF questions.

From the terms:

> The dataset can be quoted as "Sovereign investor base estimates by Arslanalp and Tsuda (2014)".

### DSSI and Common Framework status (World Bank, Paris Club)

- **Used for:** Which countries applied to the Common Framework (and, once typed, which took part in the Debt Service Suspension Initiative), typed by hand with source and date (issuer brief, Fiscal & Debt Agent)
- **Status:** Terms not confirmed
- **Free non-commercial sharing:** Sharing unclear. No terms stated.
- **Terms read:** [World Bank DSSI brief](https://www.worldbank.org/en/brief/2022/03/10/covid-19-debt-service-suspension-initiative); [Paris Club, Common Framework](https://clubdeparis.org/en/communications/page/common-framework) (checked 2026-11-11)
- **Show to others:** Not stated on either page.
- **Commercial use:** Not stated.
- **Credit:** World Bank, COVID-19 Debt Service Suspension Initiative; Paris Club, Common Framework.
- **Open question:** Neither page states terms. The rows would be facts typed by hand with a link and date, like the official calendar; the World Bank country table did not load and needs reading in a browser.

From the terms:

> Forty-eight out of 73 eligible countries participated.
>
> As of 2024, four countries have applied to the Common Framework for a debt treatment: Tchad, Zambia, Ethiopia and Ghana.

## Sources planned, not read by the app yet

Read in the licence sweep of 11 November 2026, before the steps that need them are built. Each row moves into the register above when its step is built. UN Comtrade (G18) and the IMF datasets already read are covered by the rows above.

| Source | Planned for | Status | Free non-commercial sharing | Credit |
| --- | --- | --- | --- | --- |
| Penn World Table (Groningen Growth and Development Centre) | G27 Growth accounting | Open with attribution | Free sharing allowed | Feenstra, Robert C., Robert Inklaar and Marcel P. Timmer (2015), "The Next Generation of the Penn World Table", American Economic Review, 105(10), 3150-3182. |
| IMF Government Finance Statistics and Financial Soundness Indicators | G28 Bank-sovereign links; G42 Sub-national revenue | Permission needed for client or commercial use | Free sharing allowed | Source: International Monetary Fund, <database name>, <link to the dataset>. |
| IMF Monitoring of Fund Arrangements (MONA) | G34 Precedent finder | Terms not confirmed | Sharing unclear | Source: International Monetary Fund, Monitoring of Fund Arrangements (MONA) database. |
| IMF Fiscal Rules Dataset, 1985-2024 | G35 Fiscal rules check | Terms not confirmed | Sharing unclear | "Fiscal Rules Dataset: 1985-2024", International Monetary Fund, Washington, DC (2025), with the authors listed on the page. |
| IMF External Balance Assessment (EBA) | G24 External sustainability | Terms not confirmed | Sharing unclear | Source: International Monetary Fund, External Balance Assessment. |
| Laeven and Valencia, Systemic Banking Crises database (2018 update) | G23 Crisis early-warning; G34 Precedent finder | Terms not confirmed | Sharing unclear | Laeven, Luc and Fabian Valencia (2018), "Systemic Banking Crises Revisited", IMF Working Paper 18/206. |
| Database of Political Institutions 2020 (Inter-American Development Bank) | G36 Political feasibility | Terms not confirmed | Sharing unclear | Database of Political Institutions 2020 (DPI2020), Inter-American Development Bank; take the full citation from the download page when it is found. |
| ND-GAIN Country Index (University of Notre Dame) | G20 Climate and energy | Terms not confirmed | Sharing unclear | Notre Dame Global Adaptation Initiative Country Index (ND-GAIN). (Year). University of Notre Dame. |
| ILOSTAT (International Labour Organization) | G22 Wages and house prices; G17 People | Terms not confirmed | Sharing unclear | Source: ILOSTAT, International Labour Organization. |

### Penn World Table (Groningen Growth and Development Centre)

- **Planned for:** G27 Growth accounting
- **Will be used for:** Capital stock, hours, human capital and productivity for growth accounting
- **Status:** Open with attribution
- **Free non-commercial sharing:** Free sharing allowed. CC BY 4.0 allows sharing with credit.
- **Terms read:** [Penn World Table page (PWT 11.0, October 2025)](https://www.rug.nl/ggdc/productivity/pwt/) (checked 2026-11-11)
- **Show to others:** Allowed under CC BY 4.0.
- **Commercial use:** Allowed (CC BY 4.0 sets no commercial limit).
- **Credit:** Feenstra, Robert C., Robert Inklaar and Marcel P. Timmer (2015), "The Next Generation of the Penn World Table", American Economic Review, 105(10), 3150-3182.

From the terms:

> is licensed under a Creative Commons Attribution 4.0 International License
>
> When using these data (for whatever purpose), please make the following reference:

### IMF Government Finance Statistics and Financial Soundness Indicators

- **Planned for:** G28 Bank-sovereign links; G42 Sub-national revenue
- **Will be used for:** Revenue and spending by level of government; bank capital, asset quality and holdings of government debt
- **Status:** Permission needed for client or commercial use
- **Free non-commercial sharing:** Free sharing allowed. IMF Data may be published and distributed with attribution.
- **Terms read:** [IMF Copyright and Usage (Special Terms for Statistical Data)](https://www.imf.org/en/About/copyright-and-terms) (checked 2026-11-11)
- **Show to others:** Allowed with attribution: GFS is named in the IMF's statistical data terms.
- **Commercial use:** Needs permission: email copyright@imf.org. Bulk automated download also needs permission.
- **Credit:** Source: International Monetary Fund, <database name>, <link to the dataset>.
- **Before building:** FSI is not named in the terms; it falls under "statistical data ... that explicitly identify the International Monetary Fund as the source". Same commercial and bulk-download limits as the main IMF row.

From the terms:

> Users may download, extract, copy, create derivative works, publish, distribute, and use Data obtained from IMF Sites subject to these conditions:
>
> For any potential commercial reuse of IMF Data, email copyright@imf.org to request permission.
>
> The IMF prohibits bulk download of information by automated technology without explicit permission

### IMF Monitoring of Fund Arrangements (MONA)

- **Planned for:** G34 Precedent finder
- **Will be used for:** IMF programmes by country: type, dates, size and conditions
- **Status:** Terms not confirmed
- **Free non-commercial sharing:** Sharing unclear. No terms on the dataset page.
- **Terms read:** [MONA database page](https://www.imf.org/external/np/pdr/mona/index.aspx) (checked 2026-11-11)
- **Show to others:** Not stated on the MONA page.
- **Commercial use:** Not stated on the MONA page.
- **Credit:** Source: International Monetary Fund, Monitoring of Fund Arrangements (MONA) database.
- **Before building:** The MONA page has no terms. It is probably covered by the general IMF statistical data terms (publish with attribution, commercial use needs permission), but the page does not say so. Ask copyright@imf.org or treat as the main IMF row only after confirming.

### IMF Fiscal Rules Dataset, 1985-2024

- **Planned for:** G35 Fiscal rules check
- **Will be used for:** National and supranational fiscal rules by country and year (123 economies)
- **Status:** Terms not confirmed
- **Free non-commercial sharing:** Sharing unclear. No terms on the dataset page.
- **Terms read:** [Fiscal Rules Dataset page (version 1.0 update, 25 September 2025)](https://www.imf.org/en/topics/fiscal-policies/fiscal-rules-dataset) (checked 2026-11-11)
- **Show to others:** Not stated on the dataset page.
- **Commercial use:** Not stated on the dataset page.
- **Credit:** "Fiscal Rules Dataset: 1985-2024", International Monetary Fund, Washington, DC (2025), with the authors listed on the page.
- **Before building:** The page gives a citation but no terms. Probably under the general IMF statistical data terms; confirm before building G35.

### IMF External Balance Assessment (EBA)

- **Planned for:** G24 External sustainability
- **Will be used for:** Published current account norm coefficients
- **Status:** Terms not confirmed
- **Free non-commercial sharing:** Sharing unclear. No terms on the page.
- **Terms read:** [EBA page](https://www.imf.org/external/np/res/eba/) (checked 2026-11-11)
- **Show to others:** Not stated on the EBA page.
- **Commercial use:** Not stated on the EBA page.
- **Credit:** Source: International Monetary Fund, External Balance Assessment.
- **Before building:** The page says data and estimates are online but does not say whether the coefficients are included or under what terms. Read the methodology paper and data files before G24; if reuse is not allowed, the norm shows "Missing".

From the terms:

> Data and estimates from the EBA exercise are available online.

### Laeven and Valencia, Systemic Banking Crises database (2018 update)

- **Planned for:** G23 Crisis early-warning; G34 Precedent finder
- **Will be used for:** Start and end years of systemic banking, currency and sovereign debt crises
- **Status:** Terms not confirmed
- **Free non-commercial sharing:** Sharing unclear. No terms found.
- **Terms read:** [IMF Working Paper 18/206](https://www.imf.org/en/Publications/WP/Issues/2018/09/14/Systemic-Banking-Crises-Revisited-46232); [IMF Copyright and Usage](https://www.imf.org/en/About/copyright-and-terms) (checked 2026-11-11)
- **Show to others:** Not stated: the paper has no licence or data statement.
- **Commercial use:** Not stated.
- **Credit:** Laeven, Luc and Fabian Valencia (2018), "Systemic Banking Crises Revisited", IMF Working Paper 18/206.
- **Before building:** No data file or terms found on the IMF page. Whether the IMF statistical data terms cover a working paper's crisis dates is not stated. The crisis dates could be typed from the paper's tables with citation; confirm with the IMF before G23 runs.

### Database of Political Institutions 2020 (Inter-American Development Bank)

- **Planned for:** G36 Political feasibility
- **Will be used for:** Checks and balances, government fractionalisation, election timing
- **Status:** Terms not confirmed
- **Free non-commercial sharing:** Sharing unclear. No licence found.
- **Terms read:** [DPI 2020 publication page (IDB)](https://publications.iadb.org/en/database-political-institutions-2020-dpi2020) (checked 2026-11-11)
- **Show to others:** Not stated on the publication page.
- **Commercial use:** Not stated.
- **Credit:** Database of Political Institutions 2020 (DPI2020), Inter-American Development Bank; take the full citation from the download page when it is found.
- **Before building:** The IDB page has no licence or data link, and the DPI was not found on data.iadb.org. Find the download page in a browser and read its licence before G36.

### ND-GAIN Country Index (University of Notre Dame)

- **Planned for:** G20 Climate and energy
- **Will be used for:** Climate vulnerability and readiness scores
- **Status:** Terms not confirmed
- **Free non-commercial sharing:** Sharing unclear. "Free and open-access" is not a licence.
- **Terms read:** [ND-GAIN download page](https://gain.nd.edu/our-work/country-index/download-data/); [University of Notre Dame copyright page](https://www.nd.edu/copyright/) (checked 2026-11-11)
- **Show to others:** Not stated: the page calls the index "free and open-access" but gives no licence.
- **Commercial use:** Not stated.
- **Credit:** Notre Dame Global Adaptation Initiative Country Index (ND-GAIN). (Year). University of Notre Dame.
- **Before building:** No licence stated. Ask ND-GAIN in writing whether the scores may be redistributed inside an open-source app before G20 uses them.

From the terms:

> As a free and open-access tool, ND-GAIN appreciates understanding how the Country Index is used.

### ILOSTAT (International Labour Organization)

- **Planned for:** G22 Wages and house prices; G17 People
- **Will be used for:** Nominal and real wage growth; labour force figures not in World Bank data
- **Status:** Terms not confirmed
- **Free non-commercial sharing:** Sharing unclear. Not read yet.
- **Terms read:** [ILOSTAT home page](https://ilostat.ilo.org/) (checked 2026-11-11)
- **Show to others:** Not read: the terms page and the ILO copyright page did not load; the home page states no licence.
- **Commercial use:** Not read.
- **Credit:** Source: ILOSTAT, International Labour Organization.
- **Before building:** Read the ILOSTAT terms of use in a browser on the Mac and update this row before G22.

## Open questions

1. **World Bank Pink Sheet (commodity prices)** (Terms not confirmed): Read the Pink Sheet licence field in the World Bank Data Catalog before showing commodity prices to clients. Some prices in it come from third parties.
2. **IMF (World Economic Outlook, Fiscal Monitor, International Liquidity, Balance of Payments, COFER, Consumer Price Index)** (Permission needed for client or commercial use): Commercial reuse (for example a paid service or client deliverables) needs the IMF's permission. Whether the app's "Download all country data" counts as bulk automated download is not addressed by the terms. COFER and Fiscal Monitor are not named, but fall under "statistical data ... that explicitly identify the International Monetary Fund as the source".
3. **UN Comtrade** (Permission needed for client or commercial use): The policy page and the FAQ read differently (blanket "internal use only" against the FAQ's exemptions). The app stores a few hundred rows per country, well under 100,000, but confirm with comtrade@un.org before a paid product.
4. **WITS (World Integrated Trade Solution)** (Permission needed for client or commercial use): Same position as UN Comtrade. Where Comtrade has the shares the app already uses Comtrade instead.
5. **BIS statistics (policy rates, real exchange rates, debt securities, credit cycle)** (Allowed with conditions): In a paid product the BIS figures must not be what is charged for. The general bis.org terms allow redistribution "for non-commercial purposes", which the statistics terms override for statistics.
6. **ExchangeRate-API open access (open.er-api.com)** (Permission needed for client or commercial use): Spot rates shown to clients or in exports would be redistribution. Options: switch spot FX to the ECB rates (Frankfurter, already the backup) for anything shared, or ask ExchangeRate-API in writing.
7. **New York Fed markets data** (Allowed with conditions): Exports that include SOFR or the fed funds rate should carry the reference-rate notice above.
8. **FRED (St. Louis Fed): 10Y government yields from the OECD; St. Louis Fed and Chicago Fed stress indices; US inflation expectations** (Permission needed for client or commercial use): The yields belong to the OECD; FRED's terms conflict on client display. Settle it through the OECD's own licence (see the OECD row, not yet confirmed).
9. **OECD leading indicators and consumer prices (via DBnomics)** (Terms not confirmed): Read the OECD data licence on oecd.org in a browser (the page needs JavaScript) and update this row; the FRED yields depend on it too.
10. **US Treasury TIC (major foreign holders)** (Terms not confirmed): Treasury does not state a licence for TIC. Its Fiscal Data site says its data is "free, without restriction" for commercial use, but that page does not cover TIC.
11. **OFAC sanctions lists (US Treasury)** (Terms not confirmed): Read the terms on the OFAC Sanctions List Service page and update this row before showing list counts to others.
12. **UN Security Council Consolidated List** (Terms not confirmed): Read the UN terms of use for the consolidated list and update this row before showing list counts to others.
13. **Caldara-Iacoviello Geopolitical Risk index** (Terms not confirmed): Read the terms and citation request on the GPR data page and update this row before showing the index to others.
14. **Polymarket** (Permission needed for client or commercial use): A desk, fund or fintech using the app professionally falls inside the restriction. Keep Polymarket odds to personal research, or agree terms with Polymarket.
15. **Kalshi** (Permission needed for client or commercial use): The strictest terms in the app. Showing Kalshi odds to anyone else, or using them in a professional setting, needs Kalshi's written authorization.
16. **Central Reserve Bank of Peru (BCRPData): J.P. Morgan EMBI spreads; interbank PEN rate** (Terms not confirmed): EMBI is a J.P. Morgan index, usually licensed. Keep the spreads to your own research until J.P. Morgan's terms for republished EMBI levels are confirmed.
17. **Colombia TRM (Superintendencia Financiera) on datos.gov.co** (Terms not confirmed): Read the licence shown on the datos.gov.co dataset page for 32sa-8pi3 and update this row.
18. **Banco Central de la República Argentina (Cotizaciones API)** (Terms not confirmed): Find and read the terms for the BCRA public APIs (api.bcra.gob.ar) and update this row.
19. **Banco Central do Brasil (SGS 13522, IPCA 12 months; Focus market expectations)** (Terms not confirmed): The Focus dataset page names the Open Data Commons Open Database License (ODbL), read 2026-11-07, while the site footer reads all rights reserved. Read https://www.bcb.gov.br/acessoinformacao/direitosautorais in a browser and update this row.
20. **Banco de México (SIE API, INPC), with your token** (Terms not confirmed): Read the terms on the token page when you request the token and update this row.
21. **Central Bank of Turkey (EVDS), with your key** (Permission needed for client or commercial use): These are the TCMB website terms; they do not name EVDS, whose own pages need JavaScript and were not read.
22. **ACLED (Armed Conflict Location & Event Data), with your account or your downloaded files** (Allowed with conditions): Monthly counts per country may count as "reorganized" data, which the EULA says is not enough to publish. Keep ACLED figures to your own research and leave them out of anything shared until ACLED confirms. API access needs the Research level; Open accounts get aggregated downloads only, which the app reads from data/local/acled/. The same EULA covers the downloaded files: they stay on your computer and are never shipped with the app.
23. **Bank of Canada and Bank of England Sovereign Default Database (BoC-BoE)** (Allowed with conditions): The database is compiled from published sources (IMF, World Bank, Paris Club and others); the Bank's terms withhold permission for third-party content unless stated, and no database-specific licence was found. The Valet API must not be queried around its request limits: the app reads the file at most once a day.
24. **IMF PortWatch (daily chokepoint transits and port activity, ArcGIS feature layers)** (Terms not confirmed): Read the PortWatch terms in a browser (portwatch.imf.org/pages/terms) and update this row. PortWatch is an IMF site, so the IMF Copyright and Usage terms may apply, but the AIS ship data come from partners and may carry their own terms.
25. **Your own paid data (CDS file, LSEG account)** (Terms not confirmed): Check your vendor contract before CDS figures go into anything shared. The app never ships paid data and never stores the password in exports, backups or the audit log.
26. **IMF list of low-income country debt sustainability analyses** (Terms not confirmed): The list itself states no terms (copy read 2026-11-11, given by the maintainer). The general IMF copyright and usage page did not load from the build computer; the question is in the email to copyright@imf.org.
27. **Our World in Data energy file (Energy Institute Statistical Review of World Energy)** (Permission needed for client or commercial use): The energy mix shares come from the Energy Institute, whose website terms allow private, non-commercial use only. The maintainer chose (2026-11-11, personal non-commercial use) to have each computer download the file itself and never ship it. Do not show these figures to others or use them commercially without the Energy Institute's permission; ask the Energy Institute before any wider use.
28. **IMF Sovereign Debt Investor Base for Emerging Markets and Developing Economies (Arslanalp and Tsuda)** (Permission needed for client or commercial use): The workbook (version of 6 November 2026, read 2026-11-11, given by the maintainer) and the working paper state no terms; the paper PDF is marked "Not for Redistribution", so neither is shipped with the app. The general IMF statistical data terms are taken to apply (publish with credit; commercial reuse needs permission). Confirm with copyright@imf.org with the other IMF questions.
29. **DSSI and Common Framework status (World Bank, Paris Club)** (Terms not confirmed): Neither page states terms. The rows would be facts typed by hand with a link and date, like the official calendar; the World Bank country table did not load and needs reading in a browser.
