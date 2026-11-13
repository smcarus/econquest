/**
 * Event addresses for outside systems (console integration item 4). All need a token with the
 * read:events scope (or the legacy integration key), checked before these routes run.
 *
 *   GET    /api/v1/events                 events after an id or a time, filtered (catch-up)
 *   GET    /api/v1/events/stream          server-sent events; Last-Event-ID replays what was missed
 *   GET    /api/v1/events/deliveries      the delivery log of your webhooks
 *   GET    /api/v1/webhooks               your webhooks
 *   POST   /api/v1/webhooks               add one: { url, types?, countries?, name? }; the secret is shown once
 *   DELETE /api/v1/webhooks/:id           remove one
 *
 * The existing integration stream (/api/v1/integration/stream) gets the same events too.
 */
import type express from 'express';
import { appendAudit } from '../../utils/auditStore';
import { AUDIT_FILES } from '../config';
import { EVENT_TYPES, isEventType, sseFrame, wants, type ConsoleEvent, type EventType } from '../../utils/consoleEvents';
import { eventsAfter, publicWebhook, readDeliveries, readEvents, type EventFiles, type WebhookStore } from '../eventBus';
import { iso3FromCode } from '../../data/iso3166Alpha2';

interface Client {
  res: express.Response;
  types?: EventType[];
  countries?: string[];
}

export interface ConsoleEventDeps {
  files: EventFiles;
  webhooks: WebhookStore;
  urlProblem: (url: string) => string | null;
}

/** Who owns what a request makes: its token id ("legacy" for the integration key), or "app" for a signed-in person. */
const ownerOf = (res: express.Response): string => (res.locals.apiToken as { id?: string } | undefined)?.id ?? 'app';

function listParam(v: unknown): string[] {
  return typeof v === 'string' && v.trim() ? v.split(',').map((x) => x.trim()).filter(Boolean) : [];
}

function filters(q: Record<string, unknown>): { types?: EventType[]; countries?: string[]; error?: string } {
  const types = listParam(q.types);
  const bad = types.find((t) => !isEventType(t));
  if (bad) return { error: `Unknown event type: ${bad}. Types: ${EVENT_TYPES.join(', ')}.` };
  const countries = listParam(q.countries).map((c) => iso3FromCode(c) ?? c.toUpperCase());
  return { ...(types.length ? { types: types as EventType[] } : {}), ...(countries.length ? { countries } : {}) };
}

export function registerConsoleEventRoutes(app: express.Express, deps: ConsoleEventDeps): { broadcast: (e: ConsoleEvent) => void; clients: () => number; close: () => void } {
  const clients = new Set<Client>();

  app.get('/api/v1/events', (req, res) => {
    const f = filters(req.query as Record<string, unknown>);
    if (f.error) return res.status(400).json({ error: 'BAD_FILTER', message: f.error });
    const since = typeof req.query.since === 'string' ? req.query.since : undefined;
    if (since && Number.isNaN(Date.parse(since))) return res.status(400).json({ error: 'BAD_FILTER', message: 'since must be an ISO date or time.' });
    const events = eventsAfter(readEvents(deps.files), { after: typeof req.query.after === 'string' ? req.query.after : undefined, since, types: f.types, countries: f.countries, limit: Number(req.query.limit) || undefined });
    res.json({ events, types: EVENT_TYPES, last_id: events.at(-1)?.id ?? null });
  });

  app.get('/api/v1/events/stream', (req, res) => {
    const f = filters(req.query as Record<string, unknown>);
    if (f.error) return res.status(400).json({ error: 'BAD_FILTER', message: f.error });
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    res.write(`: connected ${new Date().toISOString()}\nretry: 5000\n\n`);
    // Reconnecting with Last-Event-ID: send what was missed first.
    const last = String(req.headers['last-event-id'] || req.query.lastEventId || '').trim();
    if (last) for (const e of eventsAfter(readEvents(deps.files), { after: last, types: f.types, countries: f.countries, limit: 1000 })) res.write(sseFrame(e));
    const client: Client = { res, ...f };
    clients.add(client);
    const ping = setInterval(() => res.write(`: ping\n\n`), 25_000);
    ping.unref?.();
    req.on('close', () => {
      clearInterval(ping);
      clients.delete(client);
    });
  });

  app.get('/api/v1/events/deliveries', (req, res) => {
    const mine = deps.webhooks.list().filter((w) => w.owner === ownerOf(res)).map((w) => w.id);
    const only = typeof req.query.webhook === 'string' ? [req.query.webhook].filter((id) => mine.includes(id)) : mine;
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 100));
    res.json({ deliveries: readDeliveries(deps.files, only).slice(-limit).reverse() });
  });

  app.get('/api/v1/webhooks', (_req, res) => {
    res.json({ webhooks: deps.webhooks.list().filter((w) => w.owner === ownerOf(res) && !w.disabledAt).map(publicWebhook) });
  });

  app.post('/api/v1/webhooks', (req, res) => {
    const url = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
    const problem = url ? deps.urlProblem(url) : 'Send the address to deliver to as url.';
    if (problem) return res.status(400).json({ error: 'BAD_URL', message: problem });
    const countries = Array.isArray(req.body?.countries) ? req.body.countries.map((c: unknown) => iso3FromCode(String(c)) ?? String(c)) : undefined;
    const made = deps.webhooks.add({ name: req.body?.name, url, types: req.body?.types, countries, owner: ownerOf(res) });
    if ('error' in made) return res.status(400).json({ error: 'BAD_WEBHOOK', message: made.error });
    appendAudit(AUDIT_FILES, { kind: 'api', summary: `Added the webhook "${made.webhook.name}" (${made.webhook.types.length ? made.webhook.types.join(', ') : 'every event type'})`, detail: { webhook: made.webhook.id, host: new URL(url).host } });
    res.status(201).json({ webhook: publicWebhook(made.webhook), secret: made.secret, note: 'Keep the secret: it signs every delivery (X-EconQuest-Signature-256) and is not shown again.' });
  });

  app.delete('/api/v1/webhooks/:id', (req, res) => {
    const w = deps.webhooks.remove(String(req.params.id), ownerOf(res));
    if (!w) return res.status(404).json({ error: 'NO_WEBHOOK', message: 'No webhook of yours with that id.' });
    appendAudit(AUDIT_FILES, { kind: 'api', summary: `Removed the webhook "${w.name}"`, detail: { webhook: w.id } });
    res.json({ ok: true });
  });

  return {
    broadcast(e: ConsoleEvent) {
      const frame = sseFrame(e);
      for (const c of clients) {
        if (!wants(c, e)) continue;
        try {
          c.res.write(frame);
        } catch {
          clients.delete(c);
        }
      }
    },
    clients: () => clients.size,
    close() {
      for (const c of clients) {
        try {
          c.res.end();
        } catch {
          /* closed */
        }
      }
      clients.clear();
    },
  };
}
