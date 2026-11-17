/**
 * Published research for the Scenario Agent (WI4, Sam 2026-11-17): what peer-reviewed studies found
 * for each kind of shock, so a what-if answer can set the app's own numbers beside the literature.
 *
 * Every entry was checked on 2026-11-17 against the paper itself (the page named in `checked`):
 * authors, year, title, journal, volume, pages and DOI as published, and each number copied from the
 * sentence quoted in `quote`, with its page. No number is estimated or rounded by the app. A study
 * reports an average over the countries and years it covers; it is not an estimate for any one
 * country, and the answer says so.
 *
 * Only studies whose figures were read in full text are listed. Cerra and Saxena (2008) are listed
 * for their finding in words only, as the sizes were not read from the paper.
 *
 * Browser-safe.
 */
import type { ShockKind } from '../utils/scenarioQuestion';

export interface StudyFinding {
  /** Which economies the number is for. */
  group: 'advanced' | 'emerging' | 'all';
  /** The finding in plain words, with the number as the paper gives it. */
  text: string;
  /** The paper's own words, under 125 characters, with the page. */
  quote: string;
}

export interface Study {
  id: string;
  kinds: ShockKind[];
  /** Direction of the shock the findings describe; null = either. */
  direction: 1 | -1 | null;
  citation: string;
  doi?: string;
  url: string;
  /** What the study looks at, in plain words. */
  about: string;
  findings: StudyFinding[];
  /** Where the text was read for the check. */
  checked: string;
}

export const SHOCK_RESEARCH: Study[] = [
  {
    id: 'iacoviello_navarro_2019',
    kinds: ['us_rate'],
    direction: 1,
    citation: 'Iacoviello, M. and Navarro, G. (2019), "Foreign effects of higher U.S. interest rates", Journal of International Money and Finance 95, 232-250',
    doi: '10.1016/j.jimonfin.2018.06.012',
    url: 'https://doi.org/10.1016/j.jimonfin.2018.06.012',
    about: 'How a rise in US interest rates spills over to GDP in 50 advanced and emerging economies, and how it depends on the exchange rate regime, trade openness and vulnerability.',
    findings: [
      { group: 'advanced', text: 'A 100 basis point rise in US rates driven by monetary policy lowers GDP in advanced economies by 0.5% after three years.', quote: '"A monetary policy-induced rise in U.S. rates of 100 basis points reduces GDP in advanced economies" ... "by 0.5%" (p. 233)' },
      { group: 'emerging', text: 'The same rise lowers GDP in emerging economies by 0.8% after three years; in emerging economies the size depends on how vulnerable the economy is.', quote: '"and in emerging economies by 0.5% and 0.8%, respectively, after three years" (p. 233)' },
    ],
    checked: 'Author copy, https://www.matteoiacoviello.com/research_files/IACNAV.pdf, p. 233; journal record on RePEc',
  },
  {
    id: 'ha_stocker_yilmazkuday_2020',
    kinds: ['currency'],
    direction: null,
    citation: 'Ha, J., Stocker, M. and Yilmazkuday, H. (2020), "Inflation and exchange rate pass-through", Journal of International Money and Finance 105, 102187 (World Bank Policy Research Working Paper 8780, 2019)',
    doi: '10.1016/j.jimonfin.2020.102187',
    url: 'https://doi.org/10.1016/j.jimonfin.2020.102187',
    about: 'How much of a currency move reaches consumer prices within a year in 47 countries, and how it depends on the shock behind the move and on the country (flexible exchange rate, credible inflation target, central bank independence).',
    findings: [
      { group: 'advanced', text: 'In advanced economies the median pass-through of a currency move to consumer prices after one year was +0.08 since 1970 and close to zero over 1998-2017.', quote: '"The median estimate for advanced economies averaged +0.08 since 1970 but was close to zero over 1998-2017." (p. 12)' },
      { group: 'emerging', text: 'In emerging and developing economies the median was +0.15 since 1970 and +0.08 over 1998-2017 (consumer price change after one year per unit of currency move).', quote: '"For EMDEs, the median value averaged +0.15 since 1970, but declined to +0.08 over 1998-2017." (p. 12)' },
      { group: 'all', text: 'Large falls pass through more: after falls of over 20%, about +0.4 within a quarter in both groups.', quote: '"around +0.4 in both groups" (p. 4, depreciations over 20%, one quarter)' },
    ],
    checked: 'World Bank working paper, https://documents1.worldbank.org/curated/ar/880231552490402888/pdf/WPS8780.pdf, pp. 4, 8, 12; journal record on FIU Discovery',
  },
  {
    id: 'kilian_2009',
    kinds: ['oil'],
    direction: null,
    citation: 'Kilian, L. (2009), "Not All Oil Price Shocks Are Alike: Disentangling Demand and Supply Shocks in the Crude Oil Market", American Economic Review 99(3), 1053-1069',
    doi: '10.1257/aer.99.3.1053',
    url: 'https://doi.org/10.1257/aer.99.3.1053',
    about: 'Separates oil price rises caused by supply cuts, by strong world demand for commodities, and by demand for oil itself, and shows they have different effects on the economy.',
    findings: [
      { group: 'all', text: 'What an oil price rise does depends on why prices rose: supply cuts, strong world demand and oil-specific demand affect the economy differently, so the same price move can mean different things. The paper finds that the oil price surge of the years before it was written was driven mainly by world demand, which helps explain why it did not cause a major US recession.', quote: 'Abstract, American Economic Review 99(3), p. 1053' },
    ],
    checked: 'Abstract on RePEc (aea:aecrev:v:99:y:2009:i:3:p:1053-69)',
  },
  {
    id: 'reinhart_rogoff_2009',
    kinds: ['fin_stress'],
    direction: 1,
    citation: 'Reinhart, C. M. and Rogoff, K. S. (2009), "The Aftermath of Financial Crises", NBER Working Paper 14656; published in American Economic Review 99(2), 466-472',
    doi: '10.3386/w14656',
    url: 'https://www.nber.org/papers/w14656',
    about: 'What followed severe banking crises in advanced and emerging economies: house and share prices, unemployment, output and government debt.',
    findings: [
      { group: 'all', text: 'After severe banking crises, output fell on average over 9% from peak to trough, over roughly two years.', quote: '"Output falls (from peak to trough) an average of over 9 percent" (p. 3)' },
      { group: 'all', text: 'Unemployment rose on average 7 percentage points over a down phase lasting on average over four years.', quote: '"The unemployment rate rises an average of 7 percentage points over the down phase of the cycle" (p. 3)' },
      { group: 'all', text: 'The real value of government debt rose on average 86% in the three years after the crisis, in the major post-war episodes.', quote: '"rising an average of 86 percent in the major post–World War II episodes" (p. 3)' },
    ],
    checked: 'NBER working paper, https://www.nber.org/system/files/working_papers/w14656/w14656.pdf, pp. 3, 8, 10',
  },
  {
    id: 'cerra_saxena_2008',
    kinds: ['fin_stress', 'growth'],
    direction: -1,
    citation: 'Cerra, V. and Saxena, S. C. (2008), "Growth Dynamics: The Myth of Economic Recovery", American Economic Review 98(1), 439-457',
    doi: '10.1257/aer.98.1.439',
    url: 'https://doi.org/10.1257/aer.98.1.439',
    about: 'Whether output recovers after financial and political crises, in a panel of high-income, emerging, developing and transition countries.',
    findings: [
      { group: 'all', text: 'The output lost in financial crises is highly persistent: on average there is no significant rebound to the earlier path.', quote: 'Abstract, American Economic Review 98(1), p. 439' },
    ],
    checked: 'Abstract on RePEc (aea:aecrev:v:98:y:2008:i:1:p:439-57); sizes not read, so none given',
  },
];

export const RESEARCH_NOTE = 'Published study, an average over the countries and years it covers; not an estimate for this country';

/** The studies for a shock, in list order. */
export function studiesFor(kind: ShockKind, direction: 1 | -1 | null): Study[] {
  return SHOCK_RESEARCH.filter((s) => s.kinds.includes(kind) && (s.direction === null || direction === null || s.direction === direction));
}
