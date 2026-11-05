/**
 * The main navigation. One layout for everyone: the role picker was removed at Sam's request
 * (2026-11-04). The app opens on Workspace; each page opens on its general-purpose tab and has
 * its own switch for the economist, banker or official-sector view.
 */
export type WorkflowArea = 'today' | 'country' | 'compare' | 'portfolio' | 'reports' | 'desks';
/** Which report template opens first on Reports > Memos and notes. */
export type ReportTemplate = 'ic' | 'client' | 'economist' | 'banker' | 'official' | 'book' | 'client_review' | 'council';

export const NAV: WorkflowArea[] = ['today', 'country', 'compare', 'portfolio', 'reports', 'desks'];

export const NAV_LABEL: Record<WorkflowArea, string> = {
  today: 'Workspace',
  country: 'Country Research',
  compare: 'Compare',
  portfolio: 'Portfolio',
  reports: 'Reports',
  desks: 'Tools',
};

/** The council brief: what Ask the council on Workspace produces. */
export const DEFAULT_REPORT: ReportTemplate = 'council';
/** Country Research opens on the Brief (economist view; banker and official views one click away). */
export const DEFAULT_COUNTRY_TAB_ID = 'brief';
