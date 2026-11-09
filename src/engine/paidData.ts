/**
 * Your paid data subscription (data plan G4): the frame that lets someone who already pays for a
 * data service (Macrobond first, then Haver and Moody's) see their own series in the app, without
 * the app ever passing those figures on.
 *
 * How it works, in plain words:
 * - Off by default. Menu > Settings > Your subscriptions switches it on and picks the vendor. The
 *   sign-in details are kept like the app's other API keys (encrypted when a master key is set,
 *   never in the audit log or a backup).
 * - The app ships no vendor series codes and no vendor figures. You say which of your vendor's
 *   series you want ("usgdp" for US real GDP, say), for which country, and what it is.
 * - Each mapped series shows with the label "Your subscription: <vendor>" and the vendor's own code
 *   as its source, next to the free series, never replacing or blending with them.
 * - Paid figures never leave this computer: every table download, replication pack, backup, share
 *   mode and the public copy leave them out, and say "Withheld: your subscription data" where they
 *   would have been. Scripts reading the data addresses and other computers on the network get the
 *   same answer. The council's AI model is never sent them.
 *
 * This file is the frame only. The code that signs in to a vendor and fetches a mapped series (an
 * "adapter") comes in later changes: Macrobond (G5), Haver (G14), Moody's (G15, memory only: its
 * figures are never saved to disk). Until a vendor's adapter exists, its mapped series read Missing
 * with that reason.
 *
 * Shared engine: runs on the server, the phone and in tests; reaches files only through Platform.
 */
import type { Platform } from '../platform/types';

export type PaidVendorId = 'macrobond' | 'haver' | 'moodys';
export type PaidFreq = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
export const PAID_FREQS: readonly PaidFreq[] = ['daily', 'weekly', 'monthly', 'quarterly', 'annual'];

export interface PaidVendor {
  id: PaidVendorId;
  name: string;
  /** The data plan change that adds this vendor's adapter. */
  plannedIn: string;
  /** True once the adapter is built; until then mapped series read Missing. */
  adapterBuilt: boolean;
  /** The vendor's terms may not allow a saved copy: figures are held in memory only. */
  memoryOnly: boolean;
  /** Settings ids (src/data/apiKeyFields.ts) holding this vendor's sign-in details. */
  credentialIds: string[];
  /** An example of the vendor's own series code, for the box hint. */
  codeExample: string;
}

export const PAID_VENDORS: readonly PaidVendor[] = [
  { id: 'macrobond', name: 'Macrobond', plannedIn: 'G5', adapterBuilt: false, memoryOnly: false, credentialIds: ['MACROBOND_CLIENT_ID', 'MACROBOND_CLIENT_SECRET'], codeExample: 'usgdp' },
  { id: 'haver', name: 'Haver Analytics', plannedIn: 'G14', adapterBuilt: false, memoryOnly: false, credentialIds: [], codeExample: 'GDPH@USECON' },
  { id: 'moodys', name: "Moody's Analytics", plannedIn: 'G15', adapterBuilt: false, memoryOnly: true, credentialIds: [], codeExample: 'FGDP$.IUSA' },
];

export const paidVendor = (id: string | undefined | null): PaidVendor | undefined => PAID_VENDORS.find((v) => v.id === String(id || '').trim().toLowerCase());

/** The settings id of the on/off switch and vendor choice. */
export const PAID_SWITCH_ID = 'PAID_DATA_VENDOR';

/** The vendor switched on in `env` (settings applied), or null when the subscription is off. */
export function paidVendorFromEnv(env: Record<string, string | undefined>): PaidVendor | null {
  const v = (env[PAID_SWITCH_ID] || '').trim().toLowerCase();
  if (!v || v === 'off') return null;
  return paidVendor(v) ?? null;
}

/** Words every reader of a subscription figure can match on (downloads, sharing mode, charts). */
export const PAID_SOURCE_PREFIX = 'Your subscription: ';
export const isPaidSource = (source: string | undefined | null): boolean => typeof source === 'string' && source.startsWith(PAID_SOURCE_PREFIX);
export const PAID_ID_PREFIX = 'paid_';
export const isPaidSeriesId = (id: string | undefined | null): boolean => typeof id === 'string' && id.startsWith(PAID_ID_PREFIX);
/** What a download, backup or shared copy says where a subscription figure would have been. */
export const PAID_WITHHELD = 'Withheld: your subscription data';
/** The longer reason, for a reason column or a refused request. */
export const PAID_WITHHELD_REASON = `${PAID_WITHHELD}. Figures from your own paid subscription stay on this computer and are never put in downloads, backups, shared copies or answers to scripts (Menu > Settings > Your subscriptions)`;

export const PAID_FOLDER = 'local/paid';
export const PAID_MAPPINGS_FILE = `${PAID_FOLDER}/mappings.json`;
export const PAID_MAX_MAPPINGS = 200;
export const PAID_CODE_MAX = 120;
export const PAID_TEXT_MAX = 120;

export interface PaidMapping {
  /** The series id in the app: paid_<vendor>_<code>_<country>. */
  id: string;
  vendor: PaidVendorId;
  /** The vendor's own series code, exactly as the vendor writes it. */
  code: string;
  /** ISO 3166 alpha-3, or WLD when the series is not about one country. */
  iso3: string;
  /** What the series is, in your words ("US real GDP"). */
  label: string;
  unit: string;
  freq: PaidFreq;
  addedAt: string;
}

export interface PaidPoint {
  date: string;
  value: number;
}

/** What an adapter saves for one mapped series (or holds in memory for a memory-only vendor). */
export interface PaidCache {
  id: string;
  code: string;
  pulledAt: string;
  points: PaidPoint[];
}

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

function idPart(s: string, max: number): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max) || 'x';
}

export function paidSeriesId(vendor: PaidVendorId, code: string, iso3: string): string {
  return `${PAID_ID_PREFIX}${vendor}_${idPart(code, 48)}_${iso3.toLowerCase()}`;
}

/**
 * Checks what you typed for a new mapping. Nothing is saved here. `isCountry` says whether a code is
 * an ISO 3166 country (the server hands in src/data/iso3166.ts; the engine stays free of it).
 */
export function checkPaidMapping(input: unknown, now: Date, isCountry: (iso3: string) => boolean = () => true): { mapping: PaidMapping } | { problems: string[] } {
  const o = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const problems: string[] = [];
  const vendor = paidVendor(String(o.vendor ?? ''));
  if (!vendor) problems.push('Pick the vendor the series comes from.');
  const code = typeof o.code === 'string' ? o.code.trim() : '';
  if (!code) problems.push("Type the vendor's own series code.");
  else if (code.length > PAID_CODE_MAX || /\s/.test(code)) problems.push(`A series code has no spaces and at most ${PAID_CODE_MAX} characters.`);
  const iso3 = clean(o.iso3, 3).toUpperCase();
  if (!/^[A-Z]{3}$/.test(iso3) || (iso3 !== 'WLD' && !isCountry(iso3))) problems.push('Pick a country (or "Not about one country").');
  const label = clean(o.label, PAID_TEXT_MAX);
  if (!label) problems.push('Say what the series is, for example "US real GDP".');
  const unit = clean(o.unit, PAID_TEXT_MAX);
  if (!unit) problems.push('Give its unit, for example "% y/y" or "USD billions".');
  const freq = PAID_FREQS.find((f) => f === o.freq);
  if (!freq) problems.push('Pick how often it comes out.');
  if (problems.length || !vendor || !freq) return { problems };
  return { mapping: { id: paidSeriesId(vendor.id, code, iso3), vendor: vendor.id, code, iso3, label, unit, freq, addedAt: now.toISOString() } };
}

function readMappings(text: string | null): PaidMapping[] {
  if (!text) return [];
  try {
    const raw = JSON.parse(text) as { mappings?: unknown };
    const list = Array.isArray(raw?.mappings) ? raw.mappings : [];
    return list.filter((m): m is PaidMapping => !!m && typeof m === 'object' && isPaidSeriesId((m as PaidMapping).id) && !!paidVendor((m as PaidMapping).vendor) && typeof (m as PaidMapping).code === 'string');
  } catch {
    return [];
  }
}

/** The mappings file's own text read without a Platform (the connection check). */
export const parsePaidMappings = readMappings;

export async function listPaidMappings(platform: Platform): Promise<PaidMapping[]> {
  return readMappings(await platform.files.read(PAID_MAPPINGS_FILE)).sort((a, b) => a.iso3.localeCompare(b.iso3) || a.label.localeCompare(b.label));
}

async function writeMappings(platform: Platform, mappings: PaidMapping[]): Promise<void> {
  await platform.files.write(PAID_MAPPINGS_FILE, JSON.stringify({ format: 1, mappings }, null, 2));
}

export async function addPaidMapping(platform: Platform, input: unknown, isCountry?: (iso3: string) => boolean): Promise<{ saved: PaidMapping } | { problems: string[] }> {
  const c = checkPaidMapping(input, new Date(platform.clock.now()), isCountry);
  if ('problems' in c) return c;
  const all = await listPaidMappings(platform);
  if (all.some((m) => m.id === c.mapping.id)) return { problems: ['That series code is already mapped for this country.'] };
  if (all.length >= PAID_MAX_MAPPINGS) return { problems: [`You already map ${PAID_MAX_MAPPINGS} series; remove one first.`] };
  await writeMappings(platform, [...all, c.mapping]);
  return { saved: c.mapping };
}

/** Removes a mapping and anything saved or held for it. */
export async function removePaidMapping(platform: Platform, id: string): Promise<PaidMapping | null> {
  const all = await listPaidMappings(platform);
  const hit = all.find((m) => m.id === id);
  if (!hit) return null;
  await writeMappings(platform, all.filter((m) => m.id !== id));
  await platform.files.remove(cacheFile(hit));
  memory.delete(id);
  return hit;
}

const cacheFile = (m: Pick<PaidMapping, 'vendor' | 'id'>) => `${PAID_FOLDER}/${m.vendor}/${m.id}.json`;

/** Figures of memory-only vendors, never written to disk; gone when the app stops. */
const memory = new Map<string, PaidCache>();

/** For adapters: keeps what was fetched for one mapping (in memory only for a memory-only vendor). */
export async function savePaidPoints(platform: Platform, m: PaidMapping, points: PaidPoint[], pulledAt: string): Promise<void> {
  const cache: PaidCache = { id: m.id, code: m.code, pulledAt, points: points.filter((p) => typeof p.date === 'string' && Number.isFinite(p.value)) };
  if (paidVendor(m.vendor)?.memoryOnly) {
    memory.set(m.id, cache);
    return;
  }
  await platform.files.write(cacheFile(m), JSON.stringify(cache));
}

export async function loadPaidPoints(platform: Platform, m: PaidMapping): Promise<PaidCache | null> {
  if (paidVendor(m.vendor)?.memoryOnly) return memory.get(m.id) ?? null;
  const text = await platform.files.read(cacheFile(m));
  if (!text) return null;
  try {
    const c = JSON.parse(text) as PaidCache;
    return c && Array.isArray(c.points) && c.code === m.code ? c : null;
  } catch {
    return null;
  }
}

/** Tests only. */
export function clearPaidMemory(): void {
  memory.clear();
}

/** A mapped series in the shape charts read (src/utils/seriesHistory.ts Series), labelled as yours. */
export interface PaidSeriesView {
  id: string;
  label: string;
  unit: string;
  freq: PaidFreq;
  source: string;
  pulledAt: string;
  points: PaidPoint[];
  about: string;
  /** Always true: lets every reader tell subscription figures from free ones. */
  paid: true;
}

export interface PaidMissing {
  id: string;
  label: string;
  reason: string;
}

export const paidLabel = (m: PaidMapping, vendor: PaidVendor) => `${m.label} (${PAID_SOURCE_PREFIX}${vendor.name})`;
export const paidSource = (m: PaidMapping, vendor: PaidVendor) => `${PAID_SOURCE_PREFIX}${vendor.name}, series ${m.code}`;

/** Why a mapped series has no figures, or null when it has some. */
export function paidGap(vendor: PaidVendor, cache: PaidCache | null): string | null {
  if (!vendor.adapterBuilt) return `The app cannot fetch from ${vendor.name} yet: that part is planned as data plan change ${vendor.plannedIn}. The mapping is kept until then`;
  if (!cache || !cache.points.length) return vendor.memoryOnly ? `Not fetched from your ${vendor.name} subscription since the app started (held in memory only, never saved)` : `Not fetched from your ${vendor.name} subscription yet`;
  return null;
}

/**
 * The mapped series of one country (or WLD) for the vendor switched on. Nothing when the
 * subscription is off. Callers decide whether the request may see the figures at all
 * (paidVisibleTo on the server).
 */
export async function paidSeriesFor(platform: Platform, iso3: string, vendor: PaidVendor | null): Promise<{ series: PaidSeriesView[]; missing: PaidMissing[] }> {
  if (!vendor) return { series: [], missing: [] };
  const code = iso3.toUpperCase();
  const mine = (await listPaidMappings(platform)).filter((m) => m.vendor === vendor.id && m.iso3 === code);
  const series: PaidSeriesView[] = [];
  const missing: PaidMissing[] = [];
  for (const m of mine) {
    const cache = await loadPaidPoints(platform, m);
    const gap = paidGap(vendor, cache);
    if (gap || !cache) {
      missing.push({ id: m.id, label: paidLabel(m, vendor), reason: gap ?? `Not fetched from your ${vendor.name} subscription yet` });
      continue;
    }
    series.push({
      id: m.id,
      label: paidLabel(m, vendor),
      unit: m.unit,
      freq: m.freq,
      source: paidSource(m, vendor),
      pulledAt: cache.pulledAt,
      points: cache.points,
      about: `From your own ${vendor.name} subscription (series ${m.code}), mapped by you. The app has not checked these figures. They stay on this computer: downloads, backups and shared copies say "${PAID_WITHHELD}" instead.`,
      paid: true,
    });
  }
  return { series, missing };
}

/** Withheld rows for a download: each mapped series named, with its source, and no figures. */
export function paidWithheldRows(header: string[], iso3: string, mappings: PaidMapping[], vendor: PaidVendor | null): Array<Array<string | number | null>> {
  if (!vendor) return [];
  const code = iso3.toUpperCase();
  return mappings
    .filter((m) => m.vendor === vendor.id && m.iso3 === code)
    .map((m) => {
      const cell: Record<string, string | null> = {
        iso3: code,
        series_id: m.id,
        series: paidLabel(m, vendor),
        label: paidLabel(m, vendor),
        unit: m.unit,
        frequency: m.freq,
        freq: m.freq,
        source: paidSource(m, vendor),
        value: header.includes('status') ? null : PAID_WITHHELD,
        status: 'Withheld',
        reason_if_missing: PAID_WITHHELD_REASON,
      };
      return header.map((h) => cell[h] ?? null);
    });
}

type Cell = string | number | null | undefined;

/**
 * Every table download goes through this, sharing mode or not: a row whose source is your
 * subscription loses its value. Tables with a status column read "Withheld" there with the reason;
 * others carry the words in the value cell.
 */
export function withholdPaidRows(header: string[], rows: Cell[][]): Cell[][] {
  const v = header.indexOf('value');
  const src = header.indexOf('source');
  if (v < 0 || src < 0) return rows;
  const status = header.indexOf('status');
  const reason = header.indexOf('reason_if_missing');
  return rows.map((row) => {
    if (!isPaidSource(String(row[src] ?? ''))) return row;
    const out = [...row];
    if (status >= 0) {
      out[v] = null;
      out[status] = 'Withheld';
      if (reason >= 0) out[reason] = PAID_WITHHELD_REASON;
    } else {
      out[v] = PAID_WITHHELD;
    }
    return out;
  });
}
