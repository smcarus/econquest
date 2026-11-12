/**
 * The brief panels (src/components/CountryBriefPanel.tsx): one country's Summary and the figure
 * tables that Markets & signals, Sources and My holdings also use. The headline, observations,
 * figure names, values and sources are built from the data and stay in English for now, because
 * notes and the council read the same text.
 */
import { defineMessages } from '../lang';

export const BRIEF = defineMessages('brief', {
  view_economist: 'Economy',
  title_economist: 'Economist brief',
  note_economist: 'Growth, inflation and policy, the fiscal path and the external position.',
  cta_economist: 'Write the country note',
  view_banker: 'Issuer',
  title_banker: 'Issuer brief',
  note_banker: 'Market access, financing need, when to go to market, and pricing against peers.',
  cta_banker: 'Write the issuer note',
  view_official: 'Sustainability',
  title_official: 'Debt sustainability brief',
  note_official: 'Debt path, a five-year projection with standard shocks, the adjustment that would stabilise debt, and the external position.',
  cta_official: 'Write the assessment',
  viewAria: 'Brief view',
  whatItMeans: 'What it means: ',
  rulesNote: 'These observations are simple rules applied to the live figures below, not a forecast and not advice. Missing figures are left out of them.',
  rulesGuides: ' "What is this?" explains a figure in plain words, and "Why missing?" says why a figure is absent and what would fill it. The help button at the top sets how much is explained.',
  rulesHover: ' Hover a missing figure for the reason.',
  whyMissing: 'Why missing?',
  whatIsThis: 'What is this?',
  howToRead: 'How to read it: ',
  explain: 'Explain',
  explainPanelTitle: 'Ask the council what this panel shows and what it means',
  explainRowTitle: 'Ask the council what this figure means and why it is where it is',
  // Markets & signals (src/components/MarketsMacroPanel.tsx).
  marketEdgeNote: 'What the economy is doing, what markets are pricing, and where the two disagree.',
  sec_economy: 'Economy and policy',
  sec_markets: 'Markets and positioning',
  sec_risks: 'Risks and links',
  emptyOne: 'Not available yet: 1 panel has no figures for {country}',
  emptyMany: 'Not available yet: {n} panels have no figures for {country}',
  emptyOpen: '{list}. Open for what each needs.',
  compareLine: '{country} against the rest of your watchlist and the benchmark markets is under Research › Compare countries.',
  openCompare: 'Open Compare',
});
