/** GET and PUT /api/watch-rules: the watch alerts you set (src/engine/watchRules.ts). */
import { fail, json, type Route } from '../routes';
import { loadWatchRules, parseRules, saveWatchRules, WATCH_RULES_FILE_NAME } from '../watchRules';

const SHOWN_FILE = `data/${WATCH_RULES_FILE_NAME}`;

export const WATCH_RULE_ROUTES: Route[] = [
  {
    method: 'GET',
    path: '/api/watch-rules',
    async handle(_req, { platform }) {
      return json({ rules: await loadWatchRules(platform), file: SHOWN_FILE });
    },
  },
  {
    method: 'PUT',
    path: '/api/watch-rules',
    async handle(req, { platform }) {
      if (!req.caller.trusted) {
        return fail(403, `Watch alerts can only be changed from the computer running the app (this request came from ${req.caller.from}).`);
      }
      const rules = parseRules(req.body);
      try {
        await saveWatchRules(platform, rules);
      } catch (error) {
        const e = error as { code?: string; message?: string };
        return fail(500, `Could not save the watch alerts file (${e.code || e.message || 'unknown error'}).`);
      }
      return json({ ok: true, rules });
    },
  },
];
