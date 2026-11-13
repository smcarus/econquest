/**
 * Indicator events for outside systems (console integration item 4). One envelope for every kind
 * of event, so a console handles them all the same way:
 *
 *   id            unique per event (evt_<time>_<random>)
 *   type          one of EVENT_TYPES
 *   entity        what it is about: a country (iso2 + iso3), a source, a watch, or the app itself
 *   severity      info | warning | critical
 *   occurred_at   when the app noticed it (ISO time)
 *   as_of         the date of the figure or release it is about (the source's own date)
 *   source        where the figure came from, as the app names it everywhere else
 *   evidence_url  an address in this app (or the source's page) where the evidence can be read
 *   shareable     true when every source named may be passed on for free (licence register)
 *   badge         the validation badge of the value (official figure, validated, not validated...)
 *   idempotency_key  the same for the same happening, so a console can drop repeats
 *   data          the figures that belong to this type (from, to, threshold, ...)
 *
 * Retries: a webhook delivery that fails is tried again after 30 s, 2 min, 10 min, 1 h and 6 h,
 * then given up and kept in the delivery log. Pure functions; the server side is
 * src/server/eventBus.ts.
 */
import { createHash, createHmac, randomBytes } from 'crypto';
import { iso2For } from '../data/iso3166Alpha2';
import { shareForSource } from './licenceLookup';
import type { EvidenceGrade } from './evidenceGrade';

export const EVENT_TYPES = [
  'signal_state_changed',
  'threshold_crossed',
  'badge_changed',
  'figure_revised',
  'feed_failed',
  'data_stale',
  'sanctions_list_changed',
  'release_upcoming',
  'council_run_finished',
  'daily_download_ready',
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export type Severity = 'info' | 'warning' | 'critical';

/** official: a published figure with no model in between; the rest are the signal standard's grades. */
export type ValueBadge = 'official' | 'not_validated' | EvidenceGrade;

export const BADGE_LABEL: Record<ValueBadge, string> = {
  official: 'Official figure',
  not_validated: 'Not validated',
  validated: 'Validated',
  provisional: 'Provisional pass',
  under_review: 'Under review',
  review_due: 'Review due',
  withdrawn: 'Withdrawn',
};

export interface EventEntity {
  kind: 'country' | 'source' | 'watch' | 'model' | 'app';
  iso2?: string | null;
  iso3?: string;
  /** Indicator or model id, for example "policy" or "cftc_crowding". */
  indicator?: string;
  /** A name a person can read, for example "Brazil" or "OFAC SDN list". */
  name?: string;
  id?: string;
}

export interface ConsoleEvent {
  id: string;
  type: EventType;
  entity: EventEntity;
  severity: Severity;
  occurred_at: string;
  as_of: string | null;
  source: string;
  evidence_url: string | null;
  shareable: boolean;
  badge: ValueBadge;
  idempotency_key: string;
  /** One line in plain words. */
  summary: string;
  data?: Record<string, unknown>;
}

export interface EventInput {
  type: EventType;
  entity: EventEntity;
  severity?: Severity;
  as_of?: string | null;
  source: string;
  evidence_url?: string | null;
  badge?: ValueBadge;
  summary: string;
  data?: Record<string, unknown>;
  /** What makes this happening different from another of the same type and entity (a period, a value). */
  discriminator?: string;
}

/**
 * Whether values from a source may be passed on for free. The app itself (a download finished, a
 * feed failed) carries no third-party figure, so it is shareable; a source the licence register
 * does not name is not, until it is checked.
 */
export function shareableSource(source: string): boolean {
  if (/^EconQuest\b/.test(source)) return true;
  const share = shareForSource(source);
  return share ? share.share === 'allowed' : false;
}

/** A country entity with both ISO codes. */
export function countryEntity(iso3: string, name?: string, indicator?: string): EventEntity {
  const up = iso3.toUpperCase();
  return { kind: 'country', iso2: iso2For(up), iso3: up, ...(name ? { name } : {}), ...(indicator ? { indicator } : {}) };
}

export function idempotencyKey(input: Pick<EventInput, 'type' | 'entity' | 'as_of' | 'discriminator'>): string {
  const e = input.entity;
  const parts = [input.type, e.kind, e.iso3 ?? '', e.indicator ?? '', e.id ?? '', input.as_of ?? '', input.discriminator ?? ''];
  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 32);
}

export function newEventId(now: Date = new Date()): string {
  return `evt_${now.getTime().toString(36)}_${randomBytes(5).toString('hex')}`;
}

export function makeEvent(input: EventInput, now: Date = new Date()): ConsoleEvent {
  return {
    id: newEventId(now),
    type: input.type,
    entity: input.entity,
    severity: input.severity ?? 'info',
    occurred_at: now.toISOString(),
    as_of: input.as_of ?? null,
    source: input.source,
    evidence_url: input.evidence_url ?? null,
    shareable: shareableSource(input.source),
    badge: input.badge ?? 'official',
    idempotency_key: idempotencyKey(input),
    summary: input.summary.slice(0, 500),
    ...(input.data ? { data: input.data } : {}),
  };
}

export function isEventType(v: unknown): v is EventType {
  return typeof v === 'string' && (EVENT_TYPES as readonly string[]).includes(v);
}

/** Seconds to wait before attempt n+1 after attempt n (1-based) failed; null once given up. */
export const RETRY_AFTER_S = [30, 120, 600, 3600, 21600] as const;
export const MAX_ATTEMPTS = RETRY_AFTER_S.length + 1;
export function retryDelayS(attempt: number): number | null {
  return attempt >= 1 && attempt <= RETRY_AFTER_S.length ? RETRY_AFTER_S[attempt - 1]! : null;
}

/**
 * The signature header of a delivery: HMAC-SHA256 over "<timestamp>.<body>" with the webhook's
 * secret, so a receiver can also refuse old replays by the timestamp.
 */
export function signDelivery(secret: string, timestamp: string, body: string): string {
  return `sha256=${createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')}`;
}

/** The headers every webhook delivery carries. */
export function deliveryHeaders(e: ConsoleEvent, deliveryId: string, attempt: number, secret: string, body: string, now: Date = new Date()): Record<string, string> {
  const ts = String(Math.floor(now.getTime() / 1000));
  return {
    'Content-Type': 'application/json',
    'User-Agent': 'EconQuest-Events/1',
    'X-EconQuest-Event': e.type,
    'X-EconQuest-Event-Id': e.id,
    'X-EconQuest-Delivery-Id': deliveryId,
    'X-EconQuest-Attempt': String(attempt),
    'X-EconQuest-Timestamp': ts,
    'X-EconQuest-Signature-256': signDelivery(secret, ts, body),
    'Idempotency-Key': e.idempotency_key,
  };
}

/** Does a webhook with these filters want this event? Empty filters = everything. */
export function wants(filter: { types?: EventType[]; countries?: string[] }, e: ConsoleEvent): boolean {
  if (filter.types?.length && !filter.types.includes(e.type)) return false;
  if (filter.countries?.length && (!e.entity.iso3 || !filter.countries.includes(e.entity.iso3))) return false;
  return true;
}

/** One SSE frame; the id lets a client reconnect with Last-Event-ID and miss nothing. */
export function sseFrame(e: ConsoleEvent): string {
  return `id: ${e.id}\nevent: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`;
}
