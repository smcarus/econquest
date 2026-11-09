/**
 * Plain-words guides for the charts (Sam, 2026-11-07: the default help level "focuses on
 * translating the charts and important things, and what the policy means for real life").
 * Each says how to read the chart and what it means for people and firms. No figures here: the
 * chart itself carries them, with their sources.
 */

export type ChartGuideId =
  | 'history'
  | 'forecast'
  | 'regime'
  | 'debt'
  | 'output_gap'
  | 'local_projections'
  | 'beer'
  | 'event_study'
  | 'event_history'
  | 'council_chart';

export interface ChartGuide {
  /** How to read it: axes, lines, bands, what up and down mean. */
  read: string;
  /** What it means for people, firms and the government, as a reading of the chart, not a measured effect. */
  life: string;
}

export const CHART_GUIDES: Record<ChartGuideId, ChartGuide> = {
  history: {
    read: 'Time runs left to right; the line is the figure you picked, one point per published value, drawn exactly as it came out, with no gaps filled in. A break in the line means no figure was published for that period.',
    life: 'A long view shows whether today\'s level is unusual for this country. A figure far from its own past usually signals a change people feel, such as dearer loans, faster price rises or a weaker currency.',
  },
  forecast: {
    read: 'The solid line is what has been published. Past the last published point, the middle line is the app\'s estimate, and the shaded bands show how uncertain it is: the narrow band should hold the outcome about half the time, the widest about nine times in ten. Where the IMF publishes its own projection it is drawn beside it.',
    life: 'Wide bands mean the outlook is unclear. Plans that depend on growth or inflation (wages, budgets, loan payments) should allow for the whole band, not just the middle line. These are the app\'s estimates, not advice.',
  },
  regime: {
    read: 'Each dot is a country. Further right means the economy is picking up (its OECD leading indicator, an early-warning gauge of activity, has risen over six months); further up means inflation has been rising over three months. The four corners are four different situations.',
    life: 'Top right (picking up, prices rising): central banks tend to keep rates high or raise them, so loans stay dear. Bottom left (slowing, prices easing): rate cuts become more likely. Top left (slowing but prices rising) is the hardest case for policy and for households, whose incomes are squeezed.',
  },
  debt: {
    read: 'Each line is government debt as a share of the economy, year by year: the IMF\'s own path, a baseline built on today\'s figures, and stated shocks (lower growth, higher interest rates, a weaker budget, all together). Lines that climb show debt growing faster than the economy.',
    life: 'Debt that keeps rising means more of each year\'s taxes go on interest instead of schools, health or investment, and the government has less room in a crisis. A big gap between the baseline and the shocks means the path is fragile. This is a "what if" exercise, not a forecast.',
  },
  output_gap: {
    read: 'Above the zero line, the economy is producing more than its trend (running hot); below it, less (spare capacity). The line is the middle of three standard estimates and the band shows their spread. Dashed years are based on IMF projections, not outturns.',
    life: 'When the economy runs hot, jobs are easier to find but prices tend to rise faster and the central bank may raise rates. When there is spare capacity, unemployment tends to be higher and inflation lower, which leaves room for rate cuts. The gap cannot be measured directly, so treat it as a rough guide.',
  },
  local_projections: {
    read: 'The line shows how inflation has moved, on average, in the months after the policy rate went up by one percentage point, in this country\'s own history; the shaded band is where the true average could lie (90% band). Month zero is the rate change.',
    life: 'It gives a sense of how long it has taken here for higher interest rates to coincide with slower price rises in shops. It shows what tended to happen alongside rate changes, not proof that the rate change caused it.',
  },
  beer: {
    read: 'One line is the currency\'s real value against its trading partners (after allowing for inflation); the other is the level its economic fundamentals (terms of trade, productivity, foreign assets) have usually gone with. When the first is above the second the currency looks dear; below, cheap.',
    life: 'A dear currency makes imports and foreign holidays cheaper but makes it harder for local firms to sell abroad. A cheap one helps exporters but raises the price of imported food, fuel and goods. A currency can stay far from this yardstick for years.',
  },
  event_study: {
    read: 'The line shows the currency\'s average move against the US dollar over the days around rate changes, with day zero the decision. Up means the local currency got weaker. One line is the average after rate rises, the other after cuts; the buttons above switch between this country\'s central bank and the US Federal Reserve.',
    life: 'A weaker currency raises the local price of imports within weeks, from fuel to phones. If the currency has often fallen after US rate rises, households and firms with dollar debts or dollar costs are exposed to Fed decisions. Many decisions were expected, so moves can be small.',
  },
  event_history: {
    read: 'Time runs left to right, one point a month. The two lines show protests and violence as a share of all events reported about the country in the news that month, so changes in how much news there is overall do not move it. Months listed as spikes stand well above the country\'s own last two years.',
    life: 'A rising share of unrest can come before strikes, disruption to business, policy U-turns or, rarely, wider conflict. It counts news reports, not verified events, so read it alongside other figures.',
  },
  council_chart: {
    read: 'The lines are the figures your question named, each from its source and dated. The tests listed under the chart say, in words, whether the lines have moved together or one has tended to lead the other, and how sure that reading is.',
    life: 'Two lines moving together does not mean one causes the other. Use the chart to see the pattern, and the tests to see whether it is more than chance.',
  },
};

export function chartGuide(id: ChartGuideId): ChartGuide {
  return CHART_GUIDES[id];
}
