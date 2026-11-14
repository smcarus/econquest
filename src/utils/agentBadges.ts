/**
 * Agent badges (Sam, 2026-11-08): each council agent shows a round icon badge that matches its
 * specialty, instead of a plain text box. This file holds the plain-words side (which icon,
 * what the agent does for a lay reader, what it reads); src/components/AgentBadge.tsx draws it.
 *
 * Icons are from lucide-react (ISC licence, already a dependency; only the icons used are bundled).
 * The hover text follows the help setting: Help off gives the name only, Key help adds one plain
 * sentence, Full help adds what the agent reads. Browser-safe and React-free so it can be tested.
 */
import type { HelpLevel } from './helpLevel';

export type AgentIconKey =
  | 'bank'
  | 'coins'
  | 'vote'
  | 'scale'
  | 'banknote'
  | 'globe'
  | 'calendar'
  | 'hourglass'
  | 'file'
  | 'chart'
  | 'trend'
  | 'check'
  | 'route'
  | 'pen'
  | 'database'
  | 'shield'
  | 'building'
  | 'pulse'
  | 'search'
  | 'cascade'
  | 'user'
  | 'gavel'
  | 'crowd'
  | 'agent';

export interface AgentBadgeInfo {
  icon: AgentIconKey;
  /** What the agent does, in one sentence for someone new to economics. */
  plain: string;
  /** What it reads, shown at Full help. */
  reads?: string;
}

/** Keyed by the agent or step id used in the council (src/utils/askCouncil.ts, councilNetwork.ts). */
export const AGENT_BADGES: Record<string, AgentBadgeInfo> = {
  // Council chat desk agents.
  cb: {
    icon: 'bank',
    plain: 'Watches the central bank: is inflation above the target, are interest rates high enough to bring it down, and does the country hold enough foreign money to pay for its imports.',
    reads: 'Inflation, the policy interest rate, real rates, official reserves and the current account (OECD, IMF).',
  },
  fiscal: {
    icon: 'coins',
    plain: 'Looks at the government’s books: how much it owes, whether its borrowing is growing or shrinking, and how much debt falls due soon.',
    reads: 'Government debt and its IMF projection, the primary balance, external debt due within a year (IMF, World Bank, BIS).',
  },
  politics: {
    icon: 'vote',
    plain: 'Follows politics and the news: elections, protests, sanctions and how stable the government is, because these can move markets and policy.',
    reads: 'News tone and events (GDELT), the World Bank political stability rank, prediction-market odds (Polymarket).',
  },
  rv: {
    icon: 'scale',
    plain: 'Compares the country’s borrowing costs with similar countries to judge whether its bonds look cheap or expensive for the risk.',
    reads: 'Bond spreads over US Treasuries, real 10-year yields against peers, carry over the US rate.',
  },
  fx: {
    icon: 'banknote',
    plain: 'Checks the currency: is it cheap or dear compared with its own history, how jumpy it is, and whether many traders are betting the same way.',
    reads: 'Real exchange rate against its 10-year average, FX volatility, CFTC positioning, TIC and IMF COFER.',
  },
  spill: {
    icon: 'globe',
    plain: 'Asks how trouble elsewhere in the world (an oil shock, a conflict, a slowdown in big economies) would reach this country through trade.',
    reads: 'Trade links for the Hormuz, Taiwan Strait and Russia scenarios, the OECD leading indicator.',
  },
  calendar: {
    icon: 'calendar',
    plain: 'Lists the dates coming up that could change the picture, such as rate decisions, inflation releases, elections and budget deadlines.',
    reads: 'Official central bank, statistics office and IMF calendars.',
  },
  timing: {
    icon: 'hourglass',
    plain: 'Estimates when a trend or shock might actually play out, from dated events, turns in the economic cycle and crowded bets starting to unwind.',
    reads: 'Dated catalysts, cycle turns, CFTC positioning, news tone shifts, Treasury flows and 3-month yield moves.',
  },
  behaviour: {
    icon: 'crowd',
    plain: 'Looks for herding and mood swings: whether many traders bet the same way, how sure the crowd is, and how far confidence is from normal.',
    reads: 'CFTC futures positioning, Polymarket crowd odds, EU consumer confidence, sentiment and households’ expected prices, the Timing Agent’s reading.',
  },
  doc: {
    icon: 'file',
    plain: 'Reads the policy documents you attached and pulls out the passages that bear on your question.',
    reads: 'Only the documents you added; nothing is fetched from the web.',
  },
  chart: {
    icon: 'chart',
    plain: 'Draws the chart you asked for and runs simple statistical tests on it, so you can see the pattern and how strong it is.',
    reads: 'The app’s own historical series and any data you uploaded.',
  },
  forecast: {
    icon: 'trend',
    plain: 'Gives a best guess of where growth or inflation is now and where it may head, with a range to show how unsure that guess is.',
    reads: 'Recent official releases and published forecasts.',
  },
  claim: {
    icon: 'check',
    plain: 'Checks a number or ranking stated in your question against the app’s own figures and says whether it holds up.',
    reads: 'The same live and official figures the other agents use.',
  },
  planner: {
    icon: 'route',
    plain: 'Decides which agents should answer your question.',
    reads: 'Your question and the list of agents with what each covers.',
  },
  synthesis: {
    icon: 'pen',
    plain: 'Writes the short brief from the agents’ figures only; a number check removes any sentence with a figure the agents did not give.',
  },
  // Full council steps.
  data: { icon: 'database', plain: 'Refreshes the figures every agent works from.', reads: 'IMF, World Bank, market and news feeds.' },
  geo: { icon: 'shield', plain: 'Three analysts argue about conflicts, sanctions and how shocks travel between countries.' },
  sov: { icon: 'building', plain: 'Three analysts argue about whether the government can keep paying its debts.' },
  macro: { icon: 'pulse', plain: 'Three analysts argue about growth, inflation, interest rates and effects from abroad.' },
  search: { icon: 'search', plain: 'Looks up recent news on the web and keeps the source links.' },
  cascade: { icon: 'cascade', plain: 'Feeds each desk’s shocks into the others to show knock-on effects.' },
  review: { icon: 'user', plain: 'You check and approve or change the assumptions before the final report is written.' },
  supreme: { icon: 'gavel', plain: 'Weighs every desk’s view and writes the final verdict.' },
};

const FALLBACK: AgentBadgeInfo = { icon: 'agent', plain: 'One of the council’s agents.' };

export function agentBadge(id: string): AgentBadgeInfo {
  return AGENT_BADGES[id] ?? FALLBACK;
}

/** Hover and screen-reader text for a badge at the reader's help level. */
export function agentBadgeTip(id: string, name: string, level: HelpLevel, tx: (s: string) => string = (s) => s): string {
  const b = agentBadge(id);
  if (level === 0 || level === 3) return tx(name);
  if (level === 1 || !b.reads) return `${tx(name)}: ${tx(b.plain)}`;
  return `${tx(name)}: ${tx(b.plain)} ${tx('Reads:')} ${tx(b.reads)}`;
}
