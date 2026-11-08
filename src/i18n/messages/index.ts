/** Every message file, for the completeness test (tests/i18n.test.ts). Add new files here. */
import type { Catalog } from '../lang';
import { SHELL } from './shell';
import { COUNCIL } from './council';
import { OWN_DATA } from './ownData';
import { WORKSPACE } from './workspace';
import { WATCHLIST } from './watchlist';
import { RESEARCH } from './research';
import { BRIEF } from './brief';
import { PANELS } from './panels';
import { TOOLS } from './tools';
import { MENU } from './menu';
import { CHAT } from './chat';
import { REPORTS } from './reports';
import { COMMON } from './common';
import { GAP_MODEL } from './gapModel';

export const ALL_CATALOGS: Catalog[] = [SHELL as Catalog, COUNCIL as Catalog, OWN_DATA as Catalog, WORKSPACE as Catalog, WATCHLIST as Catalog, RESEARCH as Catalog, BRIEF as Catalog, PANELS as Catalog, COMMON as Catalog, TOOLS as Catalog, MENU as Catalog, CHAT as Catalog, REPORTS as Catalog, GAP_MODEL as Catalog];
