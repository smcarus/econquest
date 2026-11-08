/**
 * Cited figures for the fiscal what-if (src/utils/fiscalWhatIf.ts), Sam 2026-11-08. Every number is
 * copied from the source named beside it, with the page; none is estimated by the app.
 *
 * Multiplier paths give the change in the LEVEL of real GDP (%) per 1 percentage point of GDP of
 * spending, by year after the change (year 1 = the year of the change). Years the source does not
 * state are filled only by the rule written beside each path (straight line between stated years;
 * the last stated level held), and the answer says so.
 */

export interface MultiplierPath {
  id: 'investment' | 'defence';
  label: string;
  /** Output level effect by year 1..5, low and high ends of the published range. */
  low: number[];
  high: number[];
  /** Central figures, where the source gives one. */
  central?: number[];
  source: string;
  quote: string;
  /** Which economies the estimate is for. */
  scope: string;
  fill: string;
}

/**
 * Abiad, Furceri and Topalova (2015), "The Macroeconomic Effects of Public Investment: Evidence from
 * Advanced Economies", IMF Working Paper WP/15/95 (the evidence behind WEO October 2014, Chapter 3).
 * p.10: a 1 pp of GDP rise in public investment raises output about 0.4% in the same year and 1.5%
 * after four years (medium-term multiplier about 1.4). p.13: high efficiency 0.8% then 2.6%; low
 * efficiency 0.2% then 0.7%. The range below is low to high efficiency; central is the baseline.
 */
export const PUBLIC_INVESTMENT: MultiplierPath = {
  id: 'investment',
  label: 'Public investment',
  low: [0.2, 0.37, 0.53, 0.7, 0.7],
  high: [0.8, 1.4, 2.0, 2.6, 2.6],
  central: [0.4, 0.77, 1.13, 1.5, 1.5],
  source: 'IMF WP/15/95 (Abiad, Furceri and Topalova 2015), pp.10 and 13',
  quote: 'output 0.4% higher in the same year and 1.5% after four years (multiplier about 1.4); 0.2% then 0.7% with low investment efficiency, 0.8% then 2.6% with high',
  scope: 'advanced economies',
  fill: 'years 2 and 3 on a straight line between year 1 and year 4; year 5 holds the year-4 level',
};

/**
 * Barro and Redlick (2011), "Macroeconomic Effects from Government Purchases and Taxes", Quarterly
 * Journal of Economics 126(1); NBER Working Paper 15369 abstract: "the estimated multiplier for
 * temporary defense spending is 0.4-0.5 contemporaneously and 0.6-0.7 over two years" (US annual
 * data including WWII).
 */
export const DEFENCE: MultiplierPath = {
  id: 'defence',
  label: 'Defence spending',
  low: [0.4, 0.6, 0.6, 0.6, 0.6],
  high: [0.5, 0.7, 0.7, 0.7, 0.7],
  source: 'Barro and Redlick (2011), QJE 126(1); NBER WP 15369 abstract',
  quote: 'multiplier for temporary defense spending is 0.4-0.5 contemporaneously and 0.6-0.7 over two years',
  scope: 'United States (annual data including WWII)',
  fill: 'years 3 to 5 hold the two-year level',
};

/**
 * Semi-elasticity of the budget balance to the output gap (change in the balance, % of GDP, for a
 * 1 point change in the output gap): Mourre, Poissonnier and Lausegger (2019), "The Semi-Elasticities
 * Underlying the Cyclically-Adjusted Budget Balance: An Update and Further Analysis", European
 * Commission DG ECFIN Discussion Paper 098, Table IV.3 (p.49), 2018 estimates. The 28 EU members of
 * 2018, including the United Kingdom. Other countries have none in the app until the OECD's own table
 * (Price, Dang and Botev 2015, OECD WP 1275) can be read; their what-ifs say so.
 */
export const BUDGET_SEMI_ELASTICITY_SOURCE = 'European Commission DG ECFIN Discussion Paper 098 (Mourre, Poissonnier and Lausegger 2019), Table IV.3, 2018';
export const BUDGET_SEMI_ELASTICITY: Record<string, number> = {
  BEL: 0.615, BGR: 0.298, CZE: 0.395, DNK: 0.589, DEU: 0.504, EST: 0.486, IRL: 0.522, GRC: 0.524,
  ESP: 0.597, FRA: 0.63, HRV: 0.443, ITA: 0.544, CYP: 0.504, LVA: 0.378, LTU: 0.399, LUX: 0.462,
  HUN: 0.453, MLT: 0.479, NLD: 0.605, AUT: 0.571, POL: 0.499, PRT: 0.538, ROU: 0.321, SVN: 0.468,
  SVK: 0.381, FIN: 0.582, SWE: 0.553, GBR: 0.55,
};

/** Words that say the freed money goes to public investment. */
export const INVESTMENT_WORDS = /\b(?:invest\w*|infrastructure|roads?|bridges?|railways?|rail\b|grids?|rebuild\w*|restructur\w*|capital spending|public works)\b/i;
