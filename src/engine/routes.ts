/**
 * The route table: every /api address the shared engine answers, written once and served in two
 * ways. On a computer, the Express adapter (src/server/engineRoutes.ts) mounts each route on the
 * server. In the phone app, the screens' requests to /api are handed straight to dispatch() below,
 * with no server and no network in between. Routes move here from server.ts a few at a time.
 */
import { hideKeysInText } from '../platform/names';
import type { Platform } from '../platform/types';

export type RouteMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Who is asking, worked out by whoever received the request. */
export interface Caller {
  /**
   * True when changes are allowed from here: on the server, a signed-in person or a request from
   * the computer running the app; in the phone app, always (it is the person's own device).
   */
  trusted: boolean;
  /** The signed-in account, when there is one. */
  account: { id: string; username: string; displayName: string; role: string } | null;
  /** Shown in refusals so a person can see where a request came from. */
  from: string;
}

export interface EngineRequest {
  method: RouteMethod;
  /** The path without the query string, e.g. "/api/watch-rules". */
  path: string;
  /** Values for ":name" parts of the route's path. */
  params: Record<string, string>;
  query: Record<string, string>;
  /** The parsed JSON body; undefined when there is none. */
  body: unknown;
  caller: Caller;
}

export interface EngineResponse {
  status: number;
  /** Sent as JSON. */
  body: unknown;
  headers?: Record<string, string>;
}

export interface EngineContext {
  platform: Platform;
}

export interface Route {
  method: RouteMethod;
  /** "/api/..." with optional ":name" parts. */
  path: string;
  handle(req: EngineRequest, ctx: EngineContext): Promise<EngineResponse>;
}

export const json = (body: unknown, status = 200): EngineResponse => ({ status, body });
export const fail = (status: number, error: string): EngineResponse => ({ status, body: { error } });

/** The matching route and the values of its ":name" parts, or null. */
export function matchRoute(routes: readonly Route[], method: string, path: string): { route: Route; params: Record<string, string> } | null {
  const want = path.split('/').filter(Boolean);
  for (const route of routes) {
    if (route.method !== method) continue;
    const have = route.path.split('/').filter(Boolean);
    if (have.length !== want.length) continue;
    const params: Record<string, string> = {};
    let ok = true;
    for (let i = 0; i < have.length; i += 1) {
      const part = have[i] ?? '';
      const value = want[i] ?? '';
      if (part.startsWith(':')) {
        try {
          params[part.slice(1)] = decodeURIComponent(value);
        } catch {
          ok = false;
          break;
        }
      } else if (part !== value) {
        ok = false;
        break;
      }
    }
    if (ok) return { route, params };
  }
  return null;
}

/**
 * Answers one request from the table. An unknown address is a 404 and a handler that throws is a
 * 500 with a plain message (any key in it hidden), so the caller always gets JSON back.
 */
export async function dispatch(routes: readonly Route[], ctx: EngineContext, req: Omit<EngineRequest, 'params'>): Promise<EngineResponse> {
  const hit = matchRoute(routes, req.method, req.path);
  if (!hit) return fail(404, `Nothing answers ${req.method} ${req.path} here.`);
  try {
    return await hit.route.handle({ ...req, params: hit.params }, ctx);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.platform.log.error('Route failed', { method: req.method, path: hit.route.path, error: message });
    return fail(500, `Something went wrong answering this request (${hideKeysInText(message)}).`);
  }
}

/** Refuses duplicate routes, so two moves cannot quietly answer the same address. */
export function checkRouteTable(routes: readonly Route[]): string[] {
  const seen = new Set<string>();
  const problems: string[] = [];
  for (const r of routes) {
    const key = `${r.method} ${r.path.replace(/:[^/]+/g, ':')}`;
    if (seen.has(key)) problems.push(`Two routes answer ${key}.`);
    seen.add(key);
    if (!r.path.startsWith('/api/')) problems.push(`${r.method} ${r.path} must start with /api/.`);
  }
  return problems;
}
