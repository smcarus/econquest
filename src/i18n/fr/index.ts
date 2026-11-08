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

export const FR: Record<string, Record<string, string>> = {
  shell: SHELL_FR,
  common: COMMON_FR,
  workspace: WORKSPACE_FR,
  council: COUNCIL_FR,
  chat: CHAT_FR,
};

/** Sentences built in English elsewhere and swapped at display time (translateText in ../lang.ts). */
export const FR_TEXT: Record<string, string> = { ...MISSING_FR, ...CHAT_TEXT_FR };
