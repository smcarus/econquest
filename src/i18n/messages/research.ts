/**
 * Research's frame: the scope bar (one country, compare, my holdings), the four section names, the
 * header cards, the live-data badge, the Sources grid, and one country's header and Sources tab.
 * The panels inside each section keep their own words for now. Country names, figures, source
 * names and dates stay as they are.
 */
import { defineMessages } from '../lang';

export const RESEARCH = defineMessages('research', {
  // Scope bar.
  research: 'Research',
  scopeGroup: 'What to look at',
  scopeCountry: 'One country: {name}',
  scopeCompare: 'Compare countries',
  scopeHoldings: 'My holdings',
  scopeHoldingsN: 'My holdings ({n})',
  shortCompare: 'Compare',
  shortHoldings: 'Holdings',
  backCompare: 'Back to Compare countries',
  backHoldings: 'Back to My holdings',
  // The four sections, the same on every scope.
  sec_summary: 'Summary',
  sec_markets: 'Markets & signals',
  sec_history: 'History & data',
  sec_sources: 'Sources',
  sectionsAria: 'Research sections',
  countrySectionsAria: 'Country sections',
  // Live-data badge.
  badgeTitleOffline: 'The feeds cannot be reached from this computer. A country counts when at least one public data feed answered on its last saved pull.',
  badgeTitle: 'A country counts as live when at least one public data feed answered on its last pull.',
  badgeNone: 'No countries yet',
  badgeNoLive: 'No live data yet: figures read Missing until a source answers',
  badgeOffline: 'Offline: saved data for {live} of {total} countries',
  badgeLive: 'Live data for {live} of {total} countries',
  // Sources grid (Compare and My holdings).
  gridNote: 'Live means a feed, an official series or your own file filled it. Anything else reads Missing with the reason; no built-in values are shown. Open a country for every figure and its source.',
  country: 'Country',
  liveCount: '{n} of {total} live',
  live: 'Live',
  missing: 'Missing',
  // Compare countries.
  compareSubOne: '1 country side by side. Click a country to open it on its own.',
  compareSubMany: '{n} countries side by side. Click a country to open it on its own.',
  compareSourcesTitle: 'What is live across {name}',
  compareSourcesEmpty: 'No countries on this watchlist yet. Add some from the watchlist in the corner.',
  // My holdings.
  holdingsSub: '{positions} in {countries}, from the holdings you imported. Click a country to open it on its own.',
  positionOne: '1 position',
  positionMany: '{n} positions',
  countryOne: '1 country',
  countryMany: '{n} countries',
  holdingsNone: 'No holdings imported yet, so this shows your watchlist, {name}, at equal weight. Import holdings under History & data.',
  holdingsSourcesHeld: 'What is live for the countries you hold',
  holdingsSourcesWatch: 'What is live across your watchlist (no holdings imported)',
  noCountries: 'No countries yet.',
  // One country: header.
  addCountry: '+ Add a country…',
  refresh: 'Refresh now',
  refreshingShort: 'Refreshing',
  refreshing: 'Refreshing…',
  refreshTitleShort: 'Pull every data feed for this country again now',
  refreshTitle: 'Pull every data feed for this country again now (normally once a week, or within the hour after a failed pull)',
  clickHistory: 'Click for its history.',
  fig_debt: 'Debt / GDP',
  fig_spread: 'USD bond spread',
  fig_yield: '10Y yield',
  fig_policy: 'Policy rate',
  fig_reserves: 'Reserves',
  // One country: Sources tab.
  liveFor: 'What is live for {name}',
  savedFor: 'What is saved for {name}',
  sourcesNote: 'Every figure the country pages use, with its source, or why it is missing and what would fill it. No built-in values are shown.',
  sourcesOffline: ' The feeds cannot be reached from this computer, so these are the figures from the last pull, each with its own date.',
  downloadCsv: 'Download these figures (CSV)',
  excel: 'Excel',
  licences: 'Data licences',
  termsNote: "Before sharing these figures, check each source's terms: some need a credit, a few need the provider's permission for client or commercial use.",
  addAnother: 'Add another country',
  comingUp: 'Coming up',
  comingUpNote: 'Official schedule, next 120 days',
  nothingScheduled: 'Nothing scheduled in the next 120 days.',
  noSchedule: 'No official schedule on file for {name}.',
  lawDate: ' · latest date in law',
  today: 'today',
  inDays: 'in {n}d',
  olderThan: 'Older than usual ({stale} of {total} dated figures)',
  freshness: 'Freshness',
  staleNote: 'These figures are older than their source normally runs (how often it comes out plus its usual delay). Read them with their date.',
  allFresh: 'All {n} dated figures are within their usual age.',
  fresher: 'Fresher source: {source}.',
});
