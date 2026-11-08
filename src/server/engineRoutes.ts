/**
 * Express adapter for the shared engine's route table (src/engine/routes.ts): mounts each engine
 * route on the server so the web version answers the same addresses as the phone app, from the
 * same code. Sign-in, the host guard, CSRF and rate limits run before these routes as for any
 * other /api address.
 */
import type express from 'express';
import { dispatch, type Caller, type EngineContext, type Route, type RouteMethod } from '../engine/routes';

export type CallerFor = (req: express.Request, res: express.Response) => Caller;

function queryOf(req: express.Request): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(req.query ?? {})) {
    if (typeof value === 'string') out[name] = value;
    else if (Array.isArray(value) && typeof value[0] === 'string') out[name] = value[0];
  }
  return out;
}

const VERB: Record<RouteMethod, 'get' | 'post' | 'put' | 'patch' | 'delete'> = { GET: 'get', POST: 'post', PUT: 'put', PATCH: 'patch', DELETE: 'delete' };

export function mountEngineRoutes(app: express.Express, routes: readonly Route[], ctx: EngineContext, callerFor: CallerFor): void {
  for (const route of routes) {
    app[VERB[route.method]](route.path, async (req: express.Request, res: express.Response) => {
      // Dispatch from the table (not the route directly) so the server and the phone share one
      // path for matching, errors and logging.
      const out = await dispatch([route], ctx, {
        method: route.method,
        path: req.path,
        query: queryOf(req),
        body: req.body,
        caller: callerFor(req, res),
      });
      for (const [name, value] of Object.entries(out.headers ?? {})) res.setHeader(name, value);
      res.status(out.status).json(out.body);
    });
  }
}
