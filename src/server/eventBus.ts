/**
 * Event bus for outside systems (console integration item 4). Files under data/local/events/:
 *
 *   events.jsonl     every event, one per line (the last EVENT_KEEP kept); any process may append
 *                    (the daily run is a separate process from the server)
 *   webhooks.json    webhook subscriptions: address, filters, owner, secret (encrypted when a
 *                    master key is set, ECONQUEST_SECRET_KEY), mode 600
 *   outbox.json      deliveries waiting for their next try, and how far the server has read
 *   deliveries.jsonl one line per delivery attempt: when, where, status, how long, next try
 *
 * The server reads new lines of events.jsonl every few seconds, sends each to the live streams and
 * queues one delivery per matching webhook. Deliveries are tried at once, then after 30 s, 2 min,
 * 10 min, 1 h and 6 h, and then given up (still in the log). Repeats are dropped by idempotency
 * key when the event is written, so a console sees one event per happening.
 */
import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import { writeFileAtomic } from '../utils/atomicWrite';
import type { SecretBox } from '../utils/secretBox';
import {
  MAX_ATTEMPTS,
  deliveryHeaders,
  isEventType,
  makeEvent,
  retryDelayS,
  wants,
  type ConsoleEvent,
  type EventInput,
  type EventType,
} from '../utils/consoleEvents';

export const EVENT_KEEP = 5000;
export const DELIVERY_KEEP = 5000;
export const MAX_WEBHOOKS = 20;
/** Repeats are looked for among this many recent events. */
const DEDUPE_WINDOW = 2000;

export interface EventFiles {
  dir: string;
  events: string;
  webhooks: string;
  outbox: string;
  deliveries: string;
}

export function eventFiles(dataDir: string): EventFiles {
  const dir = path.join(dataDir, 'local', 'events');
  return {
    dir,
    events: path.join(dir, 'events.jsonl'),
    webhooks: path.join(dir, 'webhooks.json'),
    outbox: path.join(dir, 'outbox.json'),
    deliveries: path.join(dir, 'deliveries.jsonl'),
  };
}

function readLines(file: string): string[] {
  try {
    return fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.trim());
  } catch {
    return [];
  }
}

function parseEvents(lines: string[]): ConsoleEvent[] {
  const out: ConsoleEvent[] = [];
  for (const l of lines) {
    try {
      const e = JSON.parse(l);
      if (e && typeof e.id === 'string' && isEventType(e.type)) out.push(e);
    } catch {
      /* a cut-off line: skipped */
    }
  }
  return out;
}

export function readEvents(files: EventFiles): ConsoleEvent[] {
  return parseEvents(readLines(files.events));
}

/** Keep the file to its last `keep` lines once it grows past half again as many. */
function trim(file: string, keep: number): void {
  const lines = readLines(file);
  if (lines.length <= keep * 1.5) return;
  writeFileAtomic(file, lines.slice(-keep).join('\n') + '\n', 0o600);
}

/**
 * Write events (any process). Inputs whose idempotency key is already among the recent events are
 * dropped. Returns the events written. Never throws: an event that cannot be written must not stop
 * the job that noticed it.
 */
export function emitEvents(files: EventFiles, inputs: EventInput[], now: Date = new Date()): ConsoleEvent[] {
  if (!inputs.length) return [];
  try {
    fs.mkdirSync(files.dir, { recursive: true });
    const seen = new Set(readEvents(files).slice(-DEDUPE_WINDOW).map((e) => e.idempotency_key));
    const fresh: ConsoleEvent[] = [];
    for (const input of inputs) {
      const e = makeEvent(input, now);
      if (seen.has(e.idempotency_key)) continue;
      seen.add(e.idempotency_key);
      fresh.push(e);
    }
    if (fresh.length) {
      fs.appendFileSync(files.events, fresh.map((e) => JSON.stringify(e)).join('\n') + '\n', { mode: 0o600 });
      trim(files.events, EVENT_KEEP);
    }
    return fresh;
  } catch (error) {
    console.error('[events] could not write events:', (error as Error)?.message);
    return [];
  }
}

/** Events for a reader: after an event id (or a time), filtered, oldest first. */
export function eventsAfter(all: ConsoleEvent[], opts: { after?: string; since?: string; types?: EventType[]; countries?: string[]; limit?: number }): ConsoleEvent[] {
  let list = all;
  if (opts.after) {
    const i = list.findIndex((e) => e.id === opts.after);
    list = i >= 0 ? list.slice(i + 1) : list;
  }
  if (opts.since) {
    const t = new Date(opts.since).toISOString();
    list = list.filter((e) => e.occurred_at >= t);
  }
  list = list.filter((e) => wants({ types: opts.types, countries: opts.countries }, e));
  const limit = Math.min(1000, Math.max(1, opts.limit ?? 200));
  // Catching up: the oldest first, so paging with after= misses nothing. Otherwise the latest.
  return opts.after || opts.since ? list.slice(0, limit) : list.slice(-limit);
}

// ---------------------------------------------------------------------------------------------
// Webhook subscriptions

export interface Webhook {
  id: string;
  name: string;
  url: string;
  types: EventType[];
  countries: string[];
  /** The secret, encrypted (enc:v1:) when a master key is set. */
  secret: string;
  /** Who made it: token id, "legacy", or "app". */
  owner: string;
  createdAt: string;
  disabledAt?: string;
}

export type PublicWebhook = Omit<Webhook, 'secret'>;

export function publicWebhook(w: Webhook): PublicWebhook {
  const { secret: _s, ...rest } = w;
  return rest;
}

export class WebhookStore {
  constructor(private readonly files: EventFiles, private readonly box: SecretBox | null) {}

  list(): Webhook[] {
    try {
      const parsed = JSON.parse(fs.readFileSync(this.files.webhooks, 'utf8'));
      return Array.isArray(parsed?.webhooks) ? parsed.webhooks : [];
    } catch {
      return [];
    }
  }

  private save(list: Webhook[]): void {
    fs.mkdirSync(this.files.dir, { recursive: true });
    writeFileAtomic(this.files.webhooks, JSON.stringify({ webhooks: list }, null, 1), 0o600);
  }

  /** The plain secret of a webhook, for signing; null if it cannot be opened (master key changed). */
  secretOf(w: Webhook): string | null {
    if (w.secret.startsWith('enc:v1:')) return this.box ? this.box.decrypt(w.secret) : null;
    return w.secret;
  }

  add(input: { name?: unknown; url: string; types?: unknown; countries?: unknown; owner: string }): { webhook: Webhook; secret: string } | { error: string } {
    const list = this.list();
    if (list.filter((w) => !w.disabledAt).length >= MAX_WEBHOOKS) return { error: `There are already ${MAX_WEBHOOKS} webhooks. Remove one first.` };
    const types = Array.isArray(input.types) ? input.types : [];
    const badType = types.find((t) => !isEventType(t));
    if (badType !== undefined) return { error: `Unknown event type: ${String(badType)}.` };
    const countries = Array.isArray(input.countries) ? input.countries.map((c) => String(c).toUpperCase()) : [];
    if (countries.some((c) => !/^[A-Z]{3}$/.test(c))) return { error: 'countries must be ISO alpha-3 or alpha-2 codes.' };
    const name = typeof input.name === 'string' && input.name.trim() ? input.name.trim().slice(0, 60) : input.url.slice(0, 60);
    const secret = `whsec_${randomBytes(24).toString('base64url')}`;
    const webhook: Webhook = {
      id: `wh_${randomBytes(6).toString('hex')}`,
      name,
      url: input.url,
      types: types as EventType[],
      countries,
      secret: this.box ? this.box.encrypt(secret) : secret,
      owner: input.owner,
      createdAt: new Date().toISOString(),
    };
    this.save([...list, webhook]);
    return { webhook, secret };
  }

  remove(id: string, owner: string): Webhook | null {
    const list = this.list();
    const w = list.find((x) => x.id === id && !x.disabledAt && (x.owner === owner || owner === 'app'));
    if (!w) return null;
    w.disabledAt = new Date().toISOString();
    this.save(list);
    return w;
  }
}

// ---------------------------------------------------------------------------------------------
// Outbox and delivery log

export interface QueuedDelivery {
  deliveryId: string;
  eventId: string;
  webhookId: string;
  attempt: number;
  dueAt: string;
}

interface Outbox {
  /** Bytes of events.jsonl already read by the server. */
  offset: number;
  /** The last event read, to carry on after it when the file was trimmed (rewritten shorter). */
  lastId?: string;
  /** The file's inode when last read: trimming rewrites the file, so a new inode means trimmed. */
  ino?: number;
  queue: QueuedDelivery[];
}

export interface DeliveryRecord {
  at: string;
  deliveryId: string;
  eventId: string;
  eventType: EventType;
  webhookId: string;
  url: string;
  attempt: number;
  status: number | null;
  ok: boolean;
  ms: number;
  /** What came back, cut short, or why nothing did. */
  note: string;
  /** When the next try is due; absent once delivered or given up. */
  nextAttemptAt?: string;
  gaveUp?: boolean;
}

export function readDeliveries(files: EventFiles, webhookIds?: string[]): DeliveryRecord[] {
  const out: DeliveryRecord[] = [];
  for (const l of readLines(files.deliveries)) {
    try {
      const d = JSON.parse(l) as DeliveryRecord;
      if (!webhookIds || webhookIds.includes(d.webhookId)) out.push(d);
    } catch {
      /* skipped */
    }
  }
  return out;
}

export type Fetcher = (url: string, init: { method: string; headers: Record<string, string>; body: string; signal: AbortSignal }) => Promise<{ status: number; text(): Promise<string> }>;

export interface HubDeps {
  files: EventFiles;
  webhooks: WebhookStore;
  /** Called with each new event (the server sends it to the live streams). */
  broadcast: (e: ConsoleEvent) => void;
  /** Returns a reason when a webhook address may not be called (src/utils/requestGuard.ts). */
  urlProblem: (url: string) => string | null;
  fetcher?: Fetcher;
  timeoutMs?: number;
}

/** The server side: reads new events, sends them to streams, queues and makes deliveries. */
export class EventHub {
  private busy = false;
  constructor(private readonly deps: HubDeps) {}

  private readOutbox(): Outbox | null {
    try {
      const o = JSON.parse(fs.readFileSync(this.deps.files.outbox, 'utf8'));
      return Number.isInteger(o?.offset) && Array.isArray(o?.queue) ? o : null;
    } catch {
      return null;
    }
  }

  private writeOutbox(o: Outbox): void {
    fs.mkdirSync(this.deps.files.dir, { recursive: true });
    writeFileAtomic(this.deps.files.outbox, JSON.stringify(o), 0o600);
  }

  private size(): number {
    return this.stat().size;
  }

  private stat(): { size: number; ino: number } {
    try {
      const st = fs.statSync(this.deps.files.events);
      return { size: st.size, ino: st.ino };
    } catch {
      return { size: 0, ino: 0 };
    }
  }

  /**
   * First start: begin at the end of the file, so old events are not sent again to webhooks made
   * later. (Readers can still fetch them from /api/v1/events.)
   */
  start(): void {
    if (!this.readOutbox()) {
      const { size, ino } = this.stat();
      this.writeOutbox({ offset: size, ino, queue: [] });
    }
  }

  /** Read events written since last time; broadcast and queue them. */
  pull(now: Date = new Date()): ConsoleEvent[] {
    const box = this.readOutbox() ?? { offset: 0, queue: [] };
    const { size, ino } = this.stat();
    const rewritten = Boolean(box.ino && ino && box.ino !== ino);
    if (size === box.offset && !rewritten) return [];
    let events: ConsoleEvent[];
    let offset: number;
    if (size < box.offset || rewritten) {
      // The file was trimmed: carry on after the last event read (all of it if that one is gone).
      const all = readEvents(this.deps.files);
      const i = box.lastId ? all.findIndex((e) => e.id === box.lastId) : -1;
      events = i >= 0 ? all.slice(i + 1) : all.filter((e) => !box.lastId || e.id > box.lastId);
      offset = size;
    } else {
      const fd = fs.openSync(this.deps.files.events, 'r');
      let text = '';
      try {
        const buf = Buffer.alloc(size - box.offset);
        fs.readSync(fd, buf, 0, buf.length, box.offset);
        text = buf.toString('utf8');
      } finally {
        fs.closeSync(fd);
      }
      // Only whole lines: a line still being written is read next time.
      const end = text.lastIndexOf('\n');
      if (end < 0) return [];
      events = parseEvents(text.slice(0, end).split('\n'));
      offset = box.offset + Buffer.byteLength(text.slice(0, end + 1));
    }
    const hooks = this.deps.webhooks.list().filter((w) => !w.disabledAt);
    const queue = [...box.queue];
    for (const e of events) {
      this.deps.broadcast(e);
      for (const w of hooks) {
        if (!wants(w, e)) continue;
        queue.push({ deliveryId: `dlv_${randomBytes(6).toString('hex')}`, eventId: e.id, webhookId: w.id, attempt: 1, dueAt: now.toISOString() });
      }
    }
    this.writeOutbox({ offset, lastId: events.at(-1)?.id ?? box.lastId, ino, queue });
    return events;
  }

  /** Make every delivery that is due. One run at a time. */
  async deliver(now: Date = new Date()): Promise<DeliveryRecord[]> {
    if (this.busy) return [];
    this.busy = true;
    try {
      const box = this.readOutbox();
      if (!box) return [];
      const due = box.queue.filter((q) => q.dueAt <= now.toISOString());
      if (!due.length) return [];
      const events = new Map(readEvents(this.deps.files).map((e) => [e.id, e]));
      const hooks = new Map(this.deps.webhooks.list().map((w) => [w.id, w]));
      const records: DeliveryRecord[] = [];
      const later: QueuedDelivery[] = [];
      for (const q of due) {
        const e = events.get(q.eventId);
        const w = hooks.get(q.webhookId);
        if (!e || !w || w.disabledAt) continue;
        const rec = await this.attempt(q, e, w, now);
        records.push(rec);
        if (rec.nextAttemptAt) later.push({ ...q, attempt: q.attempt + 1, dueAt: rec.nextAttemptAt });
      }
      const doneIds = new Set(due.map((q) => q.deliveryId));
      const fresh = this.readOutbox() ?? box;
      this.writeOutbox({ offset: fresh.offset, lastId: fresh.lastId, ino: fresh.ino, queue: [...fresh.queue.filter((q) => !doneIds.has(q.deliveryId)), ...later] });
      if (records.length) {
        fs.appendFileSync(this.deps.files.deliveries, records.map((r) => JSON.stringify(r)).join('\n') + '\n', { mode: 0o600 });
        trim(this.deps.files.deliveries, DELIVERY_KEEP);
      }
      return records;
    } finally {
      this.busy = false;
    }
  }

  private async attempt(q: QueuedDelivery, e: ConsoleEvent, w: Webhook, now: Date): Promise<DeliveryRecord> {
    const base = { at: now.toISOString(), deliveryId: q.deliveryId, eventId: e.id, eventType: e.type, webhookId: w.id, url: w.url, attempt: q.attempt };
    const retry = (note: string, status: number | null, ms: number): DeliveryRecord => {
      const wait = retryDelayS(q.attempt);
      return wait === null || q.attempt >= MAX_ATTEMPTS
        ? { ...base, status, ok: false, ms, note, gaveUp: true }
        : { ...base, status, ok: false, ms, note, nextAttemptAt: new Date(now.getTime() + wait * 1000).toISOString() };
    };
    const problem = this.deps.urlProblem(w.url);
    if (problem) return { ...base, status: null, ok: false, ms: 0, note: problem, gaveUp: true };
    const secret = this.deps.webhooks.secretOf(w);
    if (!secret) return { ...base, status: null, ok: false, ms: 0, note: 'The webhook secret cannot be opened with the current master key (ECONQUEST_SECRET_KEY changed). Remove the webhook and add it again.', gaveUp: true };
    const body = JSON.stringify(e);
    const headers = deliveryHeaders(e, q.deliveryId, q.attempt, secret, body, now);
    const fetcher: Fetcher = this.deps.fetcher ?? ((url, init) => fetch(url, init));
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), this.deps.timeoutMs ?? 8000);
    const t0 = Date.now();
    try {
      const res = await fetcher(w.url, { method: 'POST', headers, body, signal: ctl.signal });
      const text = (await res.text().catch(() => '')).slice(0, 200);
      const ms = Date.now() - t0;
      if (res.status >= 200 && res.status < 300) return { ...base, status: res.status, ok: true, ms, note: text || `HTTP ${res.status}` };
      return retry(text || `HTTP ${res.status}`, res.status, ms);
    } catch (err) {
      return retry(ctl.signal.aborted ? 'No answer in time' : String((err as Error)?.message || err).slice(0, 200), null, Date.now() - t0);
    } finally {
      clearTimeout(timer);
    }
  }

  queued(): QueuedDelivery[] {
    return this.readOutbox()?.queue ?? [];
  }
}
