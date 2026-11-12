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

export const PT: Record<string, Record<string, string>> = {
  shell: SHELL_PT,
  common: COMMON_PT,
  workspace: WORKSPACE_PT,
  council: COUNCIL_PT,
  chat: CHAT_PT,
  research: RESEARCH_PT,
  brief: BRIEF_PT,
  panels: PANELS_PT,
};

/** Sentences built in English elsewhere and swapped at display time (translateText in ../lang.ts). */
export const PT_TEXT: Record<string, string> = { ...MISSING_PT, ...BRIEF_TEXT_PT, ...PANEL_TEXT_PT, ...CHAT_TEXT_PT };
