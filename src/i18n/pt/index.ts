/**
 * All the Portuguese, in one file the app loads only when someone picks Portuguese (ensureLang in
 * ../lang.ts), separate from the other languages so none downloads another. Add each area's
 * Portuguese here under the same area name as its English file; an area not here yet shows in
 * English. Brazilian Portuguese with the polite "você" throughout (Sam, 2026-11-12, roadmap U2).
 */
import { SHELL_PT } from './shell';
import { COMMON_PT } from './common';
import { WORKSPACE_PT } from './workspace';
import { COUNCIL_PT } from './council';
import { CHAT_PT } from './chat';
import { MISSING_PT } from './missing';
import { CHAT_TEXT_PT } from './chatText';
import { RESEARCH_PT } from './research';
import { BRIEF_PT } from './brief';
import { BRIEF_TEXT_PT } from './briefText';
import { PANELS_PT } from './panels';
import { PANEL_TEXT_PT } from './panelText';
import { WATCHLIST_PT } from './watchlist';
import { OWN_DATA_PT } from './ownData';
import { GAP_MODEL_PT } from './gapModel';
import { SYNTH_PT } from './synth';
import { YOUR_PRICES_PT } from './yourPrices';
import { QUESTS_PT } from './quests';
import { YOUR_TESTS_PT } from './yourTests';
import { TOOLS_PT } from './tools';
import { TOOL_TEXT_PT } from './toolText';
import { TOOLS_CATALOG_PT } from './toolsCatalog';
import { COMPARE_TEXT_PT } from './compareText';
import { MENU_PT } from './menu';
import { KEY_FIELDS_PT } from './keyFieldsText';
import { GLOSSARY_PT } from './glossaryText';
import { REPORTS_PT } from './reports';
import { REPORTS_TEXT_PT } from './reportsText';
import { QUEST_TEXT_PT } from './questText';
import { DEFINITIONS_TEXT_PT } from './definitionsText';
import { WORKED_TEXT_PT } from './workedText';

export const PT: Record<string, Record<string, string>> = {
  shell: SHELL_PT,
  common: COMMON_PT,
  workspace: WORKSPACE_PT,
  council: COUNCIL_PT,
  chat: CHAT_PT,
  research: RESEARCH_PT,
  brief: BRIEF_PT,
  panels: PANELS_PT,
  watchlist: WATCHLIST_PT,
  ownData: OWN_DATA_PT,
  gapModel: GAP_MODEL_PT,
  synth: SYNTH_PT,
  yourPrices: YOUR_PRICES_PT,
  quests: QUESTS_PT,
  yourTests: YOUR_TESTS_PT,
  tools: TOOLS_PT,
  menu: MENU_PT,
  reports: REPORTS_PT,
};

/** Sentences built in English elsewhere and swapped at display time (translateText in ../lang.ts). */
export const PT_TEXT: Record<string, string> = { ...QUEST_TEXT_PT, ...WORKED_TEXT_PT, ...DEFINITIONS_TEXT_PT, ...COMPARE_TEXT_PT, ...MISSING_PT, ...BRIEF_TEXT_PT, ...PANEL_TEXT_PT, ...TOOL_TEXT_PT, ...TOOLS_CATALOG_PT, ...KEY_FIELDS_PT, ...GLOSSARY_PT, ...CHAT_TEXT_PT, ...REPORTS_TEXT_PT };
