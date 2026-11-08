/**
 * All the Spanish, in one file the app loads only when someone picks Spanish (ensureLang in
 * ../lang.ts). Add each new area's Spanish here under the same area name as its English file.
 */
import { SHELL_ES } from './shell';
import { COUNCIL_ES } from './council';
import { OWN_DATA_ES } from './ownData';
import { WORKSPACE_ES } from './workspace';
import { WATCHLIST_ES } from './watchlist';
import { MISSING_ES } from './missing';
import { BRIEF_TEXT_ES } from './briefText';
import { PANEL_TEXT_ES } from './panelText';
import { RESEARCH_ES } from './research';
import { BRIEF_ES } from './brief';
import { PANELS_ES } from './panels';
import { COMMON_ES } from './common';

export const ES: Record<string, Record<string, string>> = {
  shell: SHELL_ES,
  council: COUNCIL_ES,
  ownData: OWN_DATA_ES,
  workspace: WORKSPACE_ES,
  watchlist: WATCHLIST_ES,
  research: RESEARCH_ES,
  brief: BRIEF_ES,
  panels: PANELS_ES,
  common: COMMON_ES,
};

/** Sentences built in English elsewhere and swapped at display time (translateText in ../lang.ts). */
export const ES_TEXT: Record<string, string> = { ...MISSING_ES, ...BRIEF_TEXT_ES, ...PANEL_TEXT_ES };
