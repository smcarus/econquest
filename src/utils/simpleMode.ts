/**
 * Core view: the app opens stripped down to the few things each role needs, while the best
 * workflows and screens are worked out. Everything else is still built and still works; it is
 * hidden behind one switch, "Show all tools", in Menu. The switch is saved in this browser only.
 *
 * Core set
 * - Top bar: Today, Countries, Portfolio, Reports, Menu.
 * - Today: watchlist, MarketEdge screen and the official calendar.
 * - Country: Brief, MarketEdge, and Overview.
 * - Portfolio: holdings import, book brief and summary (no desk tabs).
 * - Reports: the note builder with the brief-based templates.
 */
import type { ReportTemplate, WorkflowArea } from '../data/roles';

export const SHOW_ALL_TOOLS_KEY = 'econquest.showAllTools.v1';

export function loadShowAllTools(): boolean {
  try {
    return localStorage.getItem(SHOW_ALL_TOOLS_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveShowAllTools(on: boolean): void {
  try {
    localStorage.setItem(SHOW_ALL_TOOLS_KEY, on ? '1' : '0');
  } catch {
    // private window or blocked storage: the switch just won't be remembered
  }
}

export const CORE_COUNTRY_TABS = ['brief', 'macro', 'overview'] as const;

/** Report templates in the core view: the ones built on the role briefs. */
export const CORE_REPORTS: ReportTemplate[] = ['economist', 'banker', 'official', 'book', 'client_review', 'council'];

export function visibleNav(nav: WorkflowArea[], showAll: boolean): WorkflowArea[] {
  return showAll ? nav : nav.filter((a) => a !== 'desks');
}

export function isCoreCountryTab(tab: string): boolean {
  return (CORE_COUNTRY_TABS as readonly string[]).includes(tab);
}

/** The template to open: the requested one if it is shown, else its nearest core template. */
export function visibleReport(report: ReportTemplate, showAll: boolean): ReportTemplate {
  if (showAll || CORE_REPORTS.includes(report)) return report;
  if (report === 'ic') return 'book';
  if (report === 'client') return 'client_review';
  return 'economist';
}
