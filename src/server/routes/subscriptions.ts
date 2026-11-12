import type express from 'express';
import type { Account } from '../../utils/auth';
import { refusal } from '../../utils/permissions';
import { appendAudit } from '../../utils/auditStore';
import { isLocalRequest } from '../../utils/userSettings';
import { apiKeyFrom } from '../dataApi';
import { AUDIT_FILES, DATA_DIR } from '../config';
import type { Platform } from '../../platform/types';
import { createNodePlatform } from '../../platform/node';
import { isCountryIso3 } from '../../data/iso3166';
import {
  addPaidMapping,
  listPaidMappings,
  loadPaidPoints,
  paidGap,
  paidVendor,
  paidVendorFromEnv,
  PAID_MAPPINGS_FILE,
  PAID_VENDORS,
  removePaidMapping,
} from '../../engine/paidData';
import { macrobondCredentials, pullMacrobond, type MacrobondStep } from '../../engine/macrobond';

/** What the last fetch from your subscription said: counts and dates, never a figure. */
export interface SubscriptionFetch {
  at: string;
  ok: boolean;
  note: string;
  steps: MacrobondStep[];
}
let lastFetch: SubscriptionFetch | null = null;
/** Tests only. */
export function resetSubscriptionFetch(): void {
  lastFetch = null;
}

/**
 * Fetches every mapped series of the vendor switched on (the daily run and the Fetch now button).
 * Off, or a vendor with no adapter yet: nothing is fetched and the note says why.
 */
export async function fetchSubscription(platform: Platform, env: Record<string, string | undefined>, onlyIds?: string[]): Promise<SubscriptionFetch & { skipped?: boolean }> {
  const at = new Date(platform.clock.now()).toISOString();
  const vendor = paidVendorFromEnv(env);
  if (!vendor) return { at, ok: true, skipped: true, note: 'Your data subscription is off; nothing to fetch', steps: [] };
  if (!vendor.adapterBuilt) return { at, ok: true, skipped: true, note: `The app cannot fetch from ${vendor.name} yet (data plan change ${vendor.plannedIn}); nothing fetched`, steps: [] };
  if (vendor.id === 'macrobond') {
    const creds = macrobondCredentials(env);
    if (!creds) return { at, ok: false, note: 'Your subscription is Macrobond, but the client ID and secret are not both set (Menu > Settings > Your subscriptions)', steps: [] };
    const pull = await pullMacrobond(platform, creds, { onlyIds });
    lastFetch = { at, ok: pull.ok, note: pull.note, steps: pull.steps };
    return lastFetch;
  }
  return { at, ok: true, skipped: true, note: `No fetching part for ${vendor.name} yet; nothing fetched`, steps: [] };
}

/**
 * Your paid data subscription (src/engine/paidData.ts, data plan G4): the switch and vendor are
 * settings (Menu > Settings > Your subscriptions); these routes keep the list of series you map.
 *
 * Only this computer sees subscription figures: a request from another address, or from a script
 * sending the data API key, is told they are withheld. Every add and remove goes to the audit log
 * with the vendor code and your label, never a figure or a sign-in detail.
 */
export interface SubscriptionDeps {
  refuseRemoteChange: (req: express.Request, res: express.Response) => boolean;
  signedIn: (res: express.Response) => Account | null;
  /** Tests hand in a memory platform; the server uses its data folder. */
  platform?: Platform;
  /** Settings as applied (process.env in the app). */
  env?: Record<string, string | undefined>;
}

/**
 * True when this request may see subscription figures: it comes from this computer (or the
 * settings allow other addresses, as under Docker) and is not a script using the data API key.
 */
export function paidVisibleTo(req: express.Request, env: Record<string, string | undefined>): boolean {
  if (apiKeyFrom(req.headers as Record<string, string | string[] | undefined>)) return false;
  return isLocalRequest(req.socket?.remoteAddress, env);
}

export function registerSubscriptionRoutes(app: express.Express, deps: SubscriptionDeps): Platform {
  const { refuseRemoteChange, signedIn } = deps;
  const env = deps.env ?? process.env;
  const platform = deps.platform ?? createNodePlatform({ dataDir: DATA_DIR });
  const viewer = (res: express.Response) => {
    const who = signedIn(res);
    if (who && who.role === 'viewer') {
      res.status(403).json({ error: refusal(who.role, 'analyst') });
      return true;
    }
    return false;
  };

  // What the settings page and Data health show: never a figure, only counts and dates.
  app.get('/api/subscriptions', async (req, res) => {
    const vendor = paidVendorFromEnv(env);
    const mappings = await listPaidMappings(platform);
    const rows = await Promise.all(
      mappings.map(async (m) => {
        const v = paidVendor(m.vendor)!;
        const cache = await loadPaidPoints(platform, m);
        const active = vendor?.id === m.vendor;
        const gap = paidGap(v, cache);
        return {
          id: m.id,
          vendor: m.vendor,
          vendorName: v.name,
          code: m.code,
          iso3: m.iso3,
          label: m.label,
          unit: m.unit,
          freq: m.freq,
          addedAt: m.addedAt,
          active,
          count: cache?.points.length ?? 0,
          first: cache?.points[0]?.date ?? null,
          last: cache?.points[cache.points.length - 1]?.date ?? null,
          pulledAt: cache?.pulledAt ?? null,
          status: !active ? `Not in use: your subscription is ${vendor ? `set to ${vendor.name}` : 'off'}` : gap ?? 'Ready',
        };
      })
    );
    res.json({
      on: !!vendor,
      vendor: vendor ? { id: vendor.id, name: vendor.name, plannedIn: vendor.plannedIn, adapterBuilt: vendor.adapterBuilt, memoryOnly: vendor.memoryOnly } : null,
      vendors: PAID_VENDORS.map((v) => ({ id: v.id, name: v.name, plannedIn: v.plannedIn, adapterBuilt: v.adapterBuilt, memoryOnly: v.memoryOnly, codeExample: v.codeExample })),
      mappings: rows,
      thisComputer: paidVisibleTo(req, env),
      lastFetch,
      savedIn: `data/${PAID_MAPPINGS_FILE}`,
    });
  });

  app.post('/api/subscriptions/mappings', async (req, res) => {
    if (refuseRemoteChange(req, res)) return;
    if (viewer(res)) return;
    const made = await addPaidMapping(platform, req.body || {}, isCountryIso3);
    if ('problems' in made) return res.status(400).json({ error: made.problems.join(' '), problems: made.problems });
    const m = made.saved;
    appendAudit(AUDIT_FILES, { kind: 'paid_data', summary: `Mapped your ${paidVendor(m.vendor)?.name} series ${m.code} as "${m.label}" (${m.iso3})`, detail: { id: m.id, vendor: m.vendor, code: m.code } });
    res.json({ saved: m });
  });

  // Fetch now (Settings > Your subscriptions): this computer only; the reply has counts and dates, no figures.
  app.post('/api/subscriptions/fetch', async (req, res) => {
    if (refuseRemoteChange(req, res)) return;
    if (viewer(res)) return;
    if (!paidVisibleTo(req, env)) return res.status(403).json({ error: 'Fetching from your subscription works only on the computer running the app.' });
    res.json(await fetchSubscription(platform, env));
  });

  app.delete('/api/subscriptions/mappings/:id', async (req, res) => {
    if (refuseRemoteChange(req, res)) return;
    if (viewer(res)) return;
    const gone = await removePaidMapping(platform, String(req.params.id));
    if (!gone) return res.status(404).json({ error: 'No mapped series with that id.' });
    appendAudit(AUDIT_FILES, { kind: 'paid_data', summary: `Removed your ${paidVendor(gone.vendor)?.name} series ${gone.code} ("${gone.label}")`, detail: { id: gone.id, vendor: gone.vendor, code: gone.code } });
    res.json({ deleted: gone.id });
  });

  return platform;
}
