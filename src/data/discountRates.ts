/**
 * Official social discount rates the policy council cost-benefit (PK2) offers, each with the
 * document, edition and passage it comes from (all read on 14 November 2026). Real rates, % a year.
 * A schedule step `from` is the year counted from the first year (0); the first year is not
 * discounted. The user can also enter an own rate.
 *
 * When a source changes its rate, update the entry and its `checked` date; saved reviews keep the
 * rate ids they used, so a change shows as a new result, not a silent edit.
 */
import type { RateStep } from '../utils/policyCouncil';

export interface DiscountRate {
  id: string;
  label: string;
  steps: RateStep[];
  appliesTo: string;
  citation: string;
  link: string;
  /** The passage the rate is taken from, quoted. */
  quote: string;
  checked: string;
}

export const DISCOUNT_RATES: DiscountRate[] = [
  {
    id: 'uk_green_book_2026',
    label: 'UK Green Book (3.00%, then 2.50% after year 30)',
    steps: [
      { from: 0, rate: 3.0 },
      { from: 31, rate: 2.5 },
      { from: 76, rate: 2.25 },
    ],
    appliesTo: 'UK central government appraisal',
    citation: 'HM Treasury (2026). Green Book supplementary guidance: discounting, October 2026, paras 2.1 and 3.8.',
    link: 'https://www.gov.uk/government/publications/green-book-supplementary-guidance-discounting',
    quote: 'The STPR is currently set at 3.00% in real terms for the first 30 years of a proposal. 3.00% for years 1 to 30; 2.50% for years 31 to 75; 2.25% for years 76 to 125.',
    checked: '2026-11-14',
  },
  {
    id: 'us_a4_3',
    label: 'US OMB Circular A-4, 3%',
    steps: [{ from: 0, rate: 3 }],
    appliesTo: 'US federal regulatory analysis (lower of the two required rates)',
    citation: 'Office of Management and Budget (2003). Circular A-4, Regulatory Analysis, section D.2 (the 2003 version, in force again since 2025).',
    link: 'https://www.whitehouse.gov/omb/information-resources/guidance/circulars',
    quote: 'For regulatory analysis, you should provide estimates of net benefits using both 3 percent and 7 percent.',
    checked: '2026-11-14',
  },
  {
    id: 'us_a4_7',
    label: 'US OMB Circular A-4, 7%',
    steps: [{ from: 0, rate: 7 }],
    appliesTo: 'US federal regulatory analysis (base case)',
    citation: 'Office of Management and Budget (2003). Circular A-4, Regulatory Analysis, section D.2 (the 2003 version, in force again since 2025).',
    link: 'https://www.whitehouse.gov/omb/information-resources/guidance/circulars',
    quote: 'As a default position, OMB Circular A-94 states that a real discount rate of 7 percent should be used as a base-case for regulatory analysis.',
    checked: '2026-11-14',
  },
  {
    id: 'eu_vademecum_3',
    label: 'European Commission, 3%',
    steps: [{ from: 0, rate: 3 }],
    appliesTo: 'EU-funded projects 2021-2027 where there is no national rate',
    citation: 'European Commission, DG REGIO (2021). Economic Appraisal Vademecum 2021-2027: General Principles and Sector Applications, section 2.3.',
    link: 'https://ec.europa.eu/regional_policy/en/information/publications/guides/2021/economic-appraisal-vademecum-2021-2027-general-principles-and-sector-applications',
    quote: 'in the absence of national values, 3 % SDR can be taken as a reference point for EU-funded projects in 2021–2027.',
    checked: '2026-11-14',
  },
  {
    id: 'adb_9',
    label: 'Asian Development Bank, 9%',
    steps: [{ from: 0, rate: 9 }],
    appliesTo: 'ADB projects in general (minimum required economic return)',
    citation: 'Asian Development Bank (2017). Guidelines for the Economic Analysis of Projects, para. 16.',
    link: 'https://www.adb.org/documents/guidelines-economic-analysis-projects',
    quote: "ADB's newly adopted minimum required EIRR is 9%.",
    checked: '2026-11-14',
  },
  {
    id: 'adb_6',
    label: 'Asian Development Bank, 6%',
    steps: [{ from: 0, rate: 6 }],
    appliesTo: 'ADB social-sector, selected poverty-targeting and mainly environmental projects',
    citation: 'Asian Development Bank (2017). Guidelines for the Economic Analysis of Projects, para. 16.',
    link: 'https://www.adb.org/documents/guidelines-economic-analysis-projects',
    quote: 'the minimum required EIRR can be lowered to 6%',
    checked: '2026-11-14',
  },
];

export const discountRateById = (id: string): DiscountRate | undefined => DISCOUNT_RATES.find((r) => r.id === id);
