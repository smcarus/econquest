/**
 * All the French, in one file the app loads only when someone picks French (ensureLang in
 * ../lang.ts), separate from the Spanish so neither language downloads the other. Add each area's
 * French here under the same area name as its English file; an area not here yet shows in English.
 * French uses the formal "vous" throughout (Sam, 2026-11-08).
 */
import { SHELL_FR } from './shell';
import { COMMON_FR } from './common';
import { WORKSPACE_FR } from './workspace';
import { COUNCIL_FR } from './council';
import { CHAT_FR } from './chat';
import { MISSING_FR } from './missing';
import { CHAT_TEXT_FR } from './chatText';
import { RESEARCH_FR } from './research';
import { BRIEF_FR } from './brief';
import { BRIEF_TEXT_FR } from './briefText';
import { PANELS_FR } from './panels';
import { PANEL_TEXT_FR } from './panelText';
import { WATCHLIST_FR } from './watchlist';
import { OWN_DATA_FR } from './ownData';
import { GAP_MODEL_FR } from './gapModel';
import { YOUR_TESTS_FR } from './yourTests';
import { TOOLS_FR } from './tools';
import { TOOL_TEXT_FR } from './toolText';
import { TOOLS_CATALOG_FR } from './toolsCatalog';
import { COMPARE_TEXT_FR } from './compareText';

export const FR: Record<string, Record<string, string>> = {
  shell: SHELL_FR,
  common: COMMON_FR,
  workspace: WORKSPACE_FR,
  council: COUNCIL_FR,
  chat: CHAT_FR,
  research: RESEARCH_FR,
  brief: BRIEF_FR,
  panels: PANELS_FR,
  watchlist: WATCHLIST_FR,
  ownData: OWN_DATA_FR,
  gapModel: GAP_MODEL_FR,
  yourTests: YOUR_TESTS_FR,
  tools: TOOLS_FR,
};

/** Sentences built in English elsewhere and swapped at display time (translateText in ../lang.ts). */
export const FR_TEXT: Record<string, string> = { ...COMPARE_TEXT_FR, ...MISSING_FR, ...BRIEF_TEXT_FR, ...PANEL_TEXT_FR, ...TOOL_TEXT_FR, ...TOOLS_CATALOG_FR, ...CHAT_TEXT_FR };
