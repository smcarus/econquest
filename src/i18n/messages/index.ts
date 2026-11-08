/** Every message file, for the completeness test (tests/i18n.test.ts). Add new files here. */
import type { Catalog } from '../lang';
import { SHELL } from './shell';
import { COUNCIL } from './council';
import { OWN_DATA } from './ownData';

export const ALL_CATALOGS: Catalog[] = [SHELL as Catalog, COUNCIL as Catalog, OWN_DATA as Catalog];
