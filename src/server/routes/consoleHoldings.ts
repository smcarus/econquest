/**
 * Holdings write API (console integration item 7). An outside system with the write:holdings scope
 * sends its positions; they appear in Holdings next to the ones added in the app or by CSV (which is
 * unchanged), marked with the token's name. A token reads and changes only the positions it sent.
 *
 *   GET    /api/v1/holdings             the positions this token sent
 *   PUT    /api/v1/holdings             replace them: { holdings: [...] } (all or nothing)
 *   POST   /api/v1/holdings             add, or update by entity_id: { holdings: [...] }
 *   DELETE /api/v1/holdings/:id         remove one (by its id or its entity_id)
 *
 * Where they are saved: the workspace of the account that made the token (sign-in on), or the
 * shared workspace (sign-in off). Every change is in the audit log, with counts, never the positions.
 */
import type express from 'express';
import { appendAudit } from '../../utils/auditStore';
import { AUDIT_FILES } from '../config';
import { loadWorkspace, setWorkspaceValue, workspaceProblem } from '../../utils/workspaceStore';
import { apiHoldingView, mergeApiHoldings, parseApiHoldings } from '../../utils/holdingsApi';
import type { Holding } from '../../utils/holdings';

export const HOLDINGS_KEY = 'econquest.holdings.v1';

export interface ConsoleHoldingsDeps {
  /** The workspace file positions from this token go to. */
  workspaceForToken: (token: { id: string; createdById?: string }) => string;
  /** Positions naming a hidden country or security are left out of replies and counted (item 8). */
  hidden?: (h: Holding) => boolean;
}

type TokenLocal = { id: string; name: string; createdById?: string };
const tokenOf = (res: express.Response): TokenLocal | null => (res.locals.apiToken as TokenLocal | undefined) ?? null;

function readHoldings(file: string): Holding[] {
  try {
    const raw = loadWorkspace(file).values[HOLDINGS_KEY];
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function registerConsoleHoldingsRoutes(app: express.Express, deps: ConsoleHoldingsDeps): void {
  const mine = (file: string, token: TokenLocal) => readHoldings(file).filter((h) => h.from === token.id);
  /** The reply: positions shown, and how many are hidden. */
  const shown = (list: Holding[]) => {
    const visible = deps.hidden ? list.filter((h) => !deps.hidden!(h)) : list;
    return { holdings: visible.map(apiHoldingView), hidden: list.length - visible.length };
  };

  app.get('/api/v1/holdings', (_req, res) => {
    const token = tokenOf(res);
    if (!token) return res.status(401).json({ error: 'TOKEN_REQUIRED', message: 'Send a token with the write:holdings scope.' });
    res.json(shown(mine(deps.workspaceForToken(token), token)));
  });

  const write = (mode: 'replace' | 'upsert') => (req: express.Request, res: express.Response) => {
    const token = tokenOf(res);
    if (!token) return res.status(401).json({ error: 'TOKEN_REQUIRED', message: 'Send a token with the write:holdings scope.' });
    const parsed = parseApiHoldings((req.body as { holdings?: unknown } | undefined)?.holdings);
    if (parsed.errors.length) return res.status(400).json({ error: 'BAD_HOLDINGS', message: 'Nothing was changed.', errors: parsed.errors.slice(0, 100) });
    const file = deps.workspaceForToken(token);
    const before = readHoldings(file);
    const next = mergeApiHoldings(before, parsed.holdings, token, mode);
    const text = JSON.stringify(next);
    const tooBig = workspaceProblem(HOLDINGS_KEY, text);
    if (tooBig) return res.status(413).json({ error: 'TOO_LARGE', message: `Nothing was changed: ${tooBig} Send fewer positions.` });
    setWorkspaceValue(file, HOLDINGS_KEY, text);
    const now = next.filter((h) => h.from === token.id);
    appendAudit(AUDIT_FILES, {
      kind: 'api',
      summary: `API token "${token.name}" ${mode === 'replace' ? 'replaced its positions' : 'sent positions'}: ${parsed.holdings.length} received, ${now.length} now held from it`,
      detail: { token: token.id, mode, received: parsed.holdings.length, held: now.length },
    });
    res.json({ ok: true, ...shown(now) });
  };
  app.put('/api/v1/holdings', write('replace'));
  app.post('/api/v1/holdings', write('upsert'));

  app.delete('/api/v1/holdings/:id', (req, res) => {
    const token = tokenOf(res);
    if (!token) return res.status(401).json({ error: 'TOKEN_REQUIRED', message: 'Send a token with the write:holdings scope.' });
    const file = deps.workspaceForToken(token);
    const all = readHoldings(file);
    const key = String(req.params.id);
    const hit = all.find((h) => h.from === token.id && (h.id === key || h.entityId === key));
    if (!hit) return res.status(404).json({ error: 'NO_HOLDING', message: 'No position sent by this token with that id or entity_id.' });
    setWorkspaceValue(file, HOLDINGS_KEY, JSON.stringify(all.filter((h) => h !== hit)));
    appendAudit(AUDIT_FILES, { kind: 'api', summary: `API token "${token.name}" removed a position`, detail: { token: token.id, holding: hit.id } });
    res.json({ ok: true });
  });
}
