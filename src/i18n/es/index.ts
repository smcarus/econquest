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
import { RESEARCH_ES } from './research';
import { BRIEF_ES } from './brief';

export const ES: Record<string, Record<string, string>> = {
  shell: SHELL_ES,
  council: COUNCIL_ES,
  ownData: OWN_DATA_ES,
  workspace: WORKSPACE_ES,
  watchlist: WATCHLIST_ES,
  research: RESEARCH_ES,
  brief: BRIEF_ES,
};

/** Sentences built in English elsewhere and swapped at display time (translateText in ../lang.ts). */
export const ES_TEXT: Record<string, string> = { ...MISSING_ES };
