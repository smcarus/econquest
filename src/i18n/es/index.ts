/**
 * All the Spanish, in one file the app loads only when someone picks Spanish (ensureLang in
 * ../lang.ts). Add each new area's Spanish here under the same area name as its English file.
 */
import { SHELL_ES } from './shell';
import { COUNCIL_ES } from './council';
import { OWN_DATA_ES } from './ownData';

export const ES: Record<string, Record<string, string>> = {
  shell: SHELL_ES,
  council: COUNCIL_ES,
  ownData: OWN_DATA_ES,
};
