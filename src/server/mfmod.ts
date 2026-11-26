/**
 * The World Bank's public country models (MFMod, run with ModelFlow), reached through the optional
 * models service on this computer (models/service.py; docker compose profile "models").
 *
 * Off unless MFMOD_URL is set. The address must be this computer or the service inside Docker
 * (localhost, 127.0.0.1, ::1, mfmod, host.docker.internal): the app never sends a model request to
 * another machine. Replies are passed on as the service gives them; no figure is made up here.
 */

import { MFMOD_COUNTRIES, hasMfmodModel } from '../utils/mfmodBaseline';
import { checkMfmodShock, shockDiff, type MfmodPlan, type MfmodScenarioData, type MfmodShockReply } from '../utils/mfmodShock';

export { MFMOD_COUNTRIES, hasMfmodModel };

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', 'mfmod', 'host.docker.internal']);

export type MfmodConfig = { off: true } | { problem: string } | { url: string };

export function mfmodConfigFromEnv(env: Record<string, string | undefined>): MfmodConfig {
  const raw = env.MFMOD_URL?.trim();
  if (!raw || raw.toLowerCase() === 'off') return { off: true };
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return { problem: `MFMOD_URL "${raw}" is not a web address (for example http://mfmod:8765).` };
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return { problem: 'MFMOD_URL must start with http:// or https://.' };
  if (!LOCAL_HOSTS.has(u.hostname)) return { problem: `MFMOD_URL must point at this computer or the models service in Docker (localhost or mfmod), not ${u.hostname}.` };
  return { url: u.origin };
}

export interface ServiceReply {
  status: number;
  text: string;
}
export type ServiceGet = (url: string, timeoutMs: number) => Promise<ServiceReply>;

export const serviceGet: ServiceGet = async (url, timeoutMs) => {
  const r = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: { Accept: 'application/json' } });
  return { status: r.status, text: await r.text() };
};

const why = (e: unknown): string => {
  const cause = e instanceof Error ? (e as { cause?: { code?: string; message?: string } }).cause : undefined;
  const m = e instanceof Error ? `${e.message} ${cause?.code ?? ''}` : String(e);
  if (/timeout|aborted/i.test(m)) return 'the models service did not answer in time.';
  if (/ECONNREFUSED|ENOTFOUND|EAI_AGAIN/i.test(m)) return 'nothing answered at the models service address. Start it with docker compose --profile models up -d.';
  if (/fetch failed/i.test(m)) return `the connection to the models service broke (${cause?.code || cause?.message || 'no reason given'}).`;
  return m.trim();
};

function parse(text: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(text);
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export interface MfmodStatus {
  state: 'off' | 'needs_setup' | 'no_answer' | 'connected';
  note: string;
  url?: string;
  modelflow?: string;
  onDisk?: number;
}

/** Whether the service answers and how many of the six model files it holds (the connection check). */
export async function mfmodStatus(env: Record<string, string | undefined>, get: ServiceGet = serviceGet): Promise<MfmodStatus> {
  const c = mfmodConfigFromEnv(env);
  if ('off' in c) return { state: 'off', note: 'Off. What-if answers use the app\'s own tools only.' };
  if ('problem' in c) return { state: 'needs_setup', note: c.problem };
  try {
    const r = await get(`${c.url}/health`, 8000);
    const body = parse(r.text);
    if (r.status !== 200 || !body?.ok) return { state: 'no_answer', note: `The models service answered HTTP ${r.status}.`, url: c.url };
    const models = Array.isArray(body.models) ? (body.models as Array<{ onDisk?: boolean }>) : [];
    const onDisk = models.filter((m) => m.onDisk).length;
    const modelflow = typeof body.modelflow === 'string' ? body.modelflow : undefined;
    if (onDisk === 0) return { state: 'needs_setup', note: 'The models service runs but has no model files yet; it downloads them from the World Bank when it starts.', url: c.url, modelflow, onDisk };
    return { state: 'connected', note: `${onDisk} of ${MFMOD_COUNTRIES.length} World Bank country models on this computer (ModelFlow ${modelflow ?? 'version unknown'}).`, url: c.url, modelflow, onDisk };
  } catch (e) {
    return { state: 'no_answer', note: `Models service: ${why(e)}`, url: c.url };
  }
}

export interface MfmodPassReply {
  status: number;
  body: Record<string, unknown>;
}

/** A shock to run in one country's model (/shock on the service). */
export interface MfmodShockAsk {
  kind: unknown;
  size: unknown;
  hold?: unknown;
}

/** /models, /baseline or /shock from the service, passed on; a clear note when it is off or silent. */
export async function mfmodAsk(env: Record<string, string | undefined>, call: 'models' | 'baseline' | 'shock', iso3?: string, get: ServiceGet = serviceGet, shock?: MfmodShockAsk): Promise<MfmodPassReply> {
  const c = mfmodConfigFromEnv(env);
  if ('off' in c) return { status: 200, body: { on: false, note: 'The World Bank country models are off (set MFMOD_URL; docs/INSTALL.md).' } };
  if ('problem' in c) return { status: 200, body: { on: true, ready: false, note: c.problem } };
  let path = '/models';
  if (call === 'baseline') {
    const code = (iso3 ?? '').toUpperCase();
    if (!hasMfmodModel(code)) return { status: 404, body: { on: true, ready: false, note: `The World Bank has not published a model for ${code || 'that country'}. Public models: ${MFMOD_COUNTRIES.join(', ')}.` } };
    path = `/baseline?iso3=${code}`;
  }
  if (call === 'shock') {
    const code = (iso3 ?? '').toUpperCase();
    if (!hasMfmodModel(code)) return { status: 404, body: { on: true, ready: false, note: `The World Bank has not published a model for ${code || 'that country'}. Public models: ${MFMOD_COUNTRIES.join(', ')}.` } };
    const c = checkMfmodShock(code, shock?.kind, shock?.size, shock?.hold);
    if (!c.ok) return { status: 400, body: { on: true, ready: false, note: `Shock not run: ${c.reason}.` } };
    path = `/shock?iso3=${code}&kind=${c.kind}&size=${c.size}&hold=${c.hold}`;
  }
  try {
    // A model's first load solves it, which takes a few seconds; later asks are quick.
    const r = await get(`${c.url}${path}`, 120_000);
    const body = parse(r.text);
    if (!body) return { status: 502, body: { on: true, ready: false, note: `The models service sent a reply the app could not read (HTTP ${r.status}).` } };
    if (r.status !== 200) return { status: r.status, body: { on: true, ready: false, note: String(body.error ?? `HTTP ${r.status}`) } };
    return { status: 200, body: { on: true, ready: true, source: 'World Bank MFMod model, run on this computer with ModelFlow', ...body } };
  } catch (e) {
    return { status: 200, body: { on: true, ready: false, note: `Models service: ${why(e)}` } };
  }
}

/**
 * The Scenario Agent's shocks run in one country's World Bank model (M3): each shock on its own,
 * one after the other, as the service holds one model run at a time.
 */
export async function mfmodScenario(env: Record<string, string | undefined>, iso3: string, plan: MfmodPlan[], get: ServiceGet = serviceGet): Promise<MfmodScenarioData> {
  const notRun = plan.filter((p): p is Extract<MfmodPlan, { reason: string }> => 'reason' in p).map((p) => ({ kind: p.kind, reason: p.reason }));
  const todo = plan.filter((p): p is Extract<MfmodPlan, { size: number }> => 'size' in p);
  if ('off' in mfmodConfigFromEnv(env)) return { on: false, runs: todo.map((p) => ({ ...p })), notRun };
  const runs: MfmodScenarioData['runs'] = [];
  for (const p of todo) {
    const r = await mfmodAsk(env, 'shock', iso3, get, p);
    const body = r.body as MfmodShockReply;
    const table = body.ready ? shockDiff(body) : null;
    runs.push(table ? { ...p, table } : { ...p, reason: body.note ?? (body.ready ? 'the reply had no series to compare' : `HTTP ${r.status}`) });
  }
  return { on: true, runs, notRun };
}
