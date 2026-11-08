/** Every message file, for the completeness test (tests/i18n.test.ts). Add new files here. */
import type { Catalog } from '../lang';
import { SHELL } from './shell';
import { COUNCIL } from './council';
import { OWN_DATA } from './ownData';
import { WORKSPACE } from './workspace';
import { WATCHLIST } from './watchlist';
import { RESEARCH } from './research';

export const ALL_CATALOGS: Catalog[] = [SHELL as Catalog, COUNCIL as Catalog, OWN_DATA as Catalog, WORKSPACE as Catalog, WATCHLIST as Catalog, RESEARCH as Catalog];
