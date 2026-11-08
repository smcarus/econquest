/** Every route the shared engine answers, in one list. */
import { checkRouteTable, type Route } from './routes';
import { WATCH_RULE_ROUTES } from './routes/watchRules';

export const ENGINE_ROUTES: readonly Route[] = [...WATCH_RULE_ROUTES];

const problems = checkRouteTable(ENGINE_ROUTES);
if (problems.length > 0) throw new Error(problems.join(' '));
