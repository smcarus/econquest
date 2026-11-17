/**
 * Hidden names, set through the API and Settings (console integration item 8). The list holds
 * fingerprints only (src/utils/exclusions.ts): replies give kinds and counts, never names. Every
 * change is in the audit log as counts.
 *
 *   GET    /api/v1/exclusions          count, count per kind, entry ids and kinds (write:exclusions)
 *   POST   /api/v1/exclusions          add: { names: [ { kind, value } ] }
 *   PUT    /api/v1/exclusions          replace the whole list (an empty list clears it)
 *   POST   /api/v1/exclusions/remove   remove by value: { names: [ ... ] }
 *   DELETE /api/v1/exclusions/:id      remove one entry by its id
 *
 *   GET    /api/settings/hidden-names         the same view plus fingerprints, for the app's screens
 *   POST   /api/settings/hidden-names         add (from this computer)
 *   POST   /api/settings/hidden-names/remove  remove by value
 *   POST   /api/settings/hidden-names/clear   clear the list
 */
import type express from 'express';
import { appendAudit } from '../../utils/auditStore';
import { AUDIT_FILES } from '../config';
import { hiddenNote } from '../../utils/exclusions';
import type { ExclusionStore } from '../exclusionStore';

export interface ExclusionDeps {
  store: ExclusionStore;
  /** True when the request may change settings (this computer, or an admin); answers itself when not. */
  refuseRemoteChange: (req: express.Request, res: express.Response) => boolean;
}

const who = (res: express.Response) => {
  const t = res.locals.apiToken as { name?: string } | undefined;
  return t?.name ? `API token "${t.name}"` : 'Settings';
};

export function registerExclusionRoutes(app: express.Express, deps: ExclusionDeps): void {
  const { store } = deps;
  const apiView = () => {
    const v = store.view();
    return { count: v.count, by_kind: v.byKind, note: hiddenNote(v.count), entries: store.list().map((e) => ({ id: e.id, kind: e.kind, added_at: e.addedAt })) };
  };
  const audit = (res: express.Response, what: string, detail: Record<string, unknown>) =>
    appendAudit(AUDIT_FILES, { kind: 'api', summary: `${who(res)} ${what}; ${hiddenNote(store.count())} now`, detail });
  const fail = (res: express.Response, errors: string[]) => res.status(400).json({ error: 'BAD_NAMES', message: 'Nothing was changed.', errors: errors.slice(0, 50) });

  const add = (req: express.Request, res: express.Response, reply: () => unknown) => {
    const r = store.add((req.body as { names?: unknown } | undefined)?.names);
    if ('errors' in r) return fail(res, r.errors);
    audit(res, `added ${r.added} hidden name${r.added === 1 ? '' : 's'}${r.already ? ` (${r.already} already on the list)` : ''}`, { added: r.added, already: r.already });
    res.json({ ok: true, added: r.added, already: r.already, ...(reply() as object) });
  };
  const remove = (req: express.Request, res: express.Response, reply: () => unknown) => {
    const r = store.remove((req.body as { names?: unknown } | undefined)?.names);
    if ('errors' in r) return fail(res, r.errors);
    audit(res, `removed ${r.removed} hidden name${r.removed === 1 ? '' : 's'}`, { removed: r.removed });
    res.json({ ok: true, removed: r.removed, ...(reply() as object) });
  };

  app.get('/api/v1/exclusions', (_req, res) => res.json(apiView()));
  app.post('/api/v1/exclusions', (req, res) => add(req, res, apiView));
  app.post('/api/v1/exclusions/remove', (req, res) => remove(req, res, apiView));
  app.put('/api/v1/exclusions', (req, res) => {
    const r = store.replace((req.body as { names?: unknown } | undefined)?.names);
    if ('errors' in r) return fail(res, r.errors);
    audit(res, `replaced the hidden-names list`, { count: r.count });
    res.json({ ok: true, ...apiView() });
  });
  app.delete('/api/v1/exclusions/:id', (req, res) => {
    if (!store.removeById(String(req.params.id))) return res.status(404).json({ error: 'NO_ENTRY', message: 'No hidden name with that id.' });
    audit(res, 'removed 1 hidden name', { removed: 1 });
    res.json({ ok: true, ...apiView() });
  });

  // The app's screens: the browser checks positions against fingerprints; it never gets names.
  const appView = () => store.view();
  app.get('/api/settings/hidden-names', (_req, res) => res.json(appView()));
  app.post('/api/settings/hidden-names', (req, res) => {
    if (deps.refuseRemoteChange(req, res)) return;
    add(req, res, appView);
  });
  app.post('/api/settings/hidden-names/remove', (req, res) => {
    if (deps.refuseRemoteChange(req, res)) return;
    remove(req, res, appView);
  });
  app.post('/api/settings/hidden-names/clear', (req, res) => {
    if (deps.refuseRemoteChange(req, res)) return;
    store.replace([]);
    audit(res, 'cleared the hidden-names list', { count: 0 });
    res.json({ ok: true, ...appView() });
  });
}
