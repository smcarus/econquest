import type express from 'express';
import { mfmodAsk, mfmodStatus, type ServiceGet } from '../mfmod';

/**
 * World Bank country models (optional models service, src/server/mfmod.ts):
 * GET /api/mfmod/status, GET /api/mfmod/models, GET /api/mfmod/baseline?iso3=PAK,
 * GET /api/mfmod/shock?iso3=PAK&kind=oil&size=20&hold=5 (kinds and limits: src/utils/mfmodShock.ts).
 */
export function registerMfmodRoutes(app: express.Express, deps: { env?: Record<string, string | undefined>; get?: ServiceGet } = {}): void {
  const env = () => deps.env ?? process.env;
  app.get('/api/mfmod/status', async (_req, res) => {
    res.json(await mfmodStatus(env(), deps.get));
  });
  app.get('/api/mfmod/models', async (_req, res) => {
    const r = await mfmodAsk(env(), 'models', undefined, deps.get);
    res.status(r.status).json(r.body);
  });
  app.get('/api/mfmod/baseline', async (req, res) => {
    const r = await mfmodAsk(env(), 'baseline', String(req.query.iso3 || ''), deps.get);
    res.status(r.status).json(r.body);
  });
  app.get('/api/mfmod/shock', async (req, res) => {
    const q = (k: string) => (typeof req.query[k] === 'string' ? (req.query[k] as string) : undefined);
    const r = await mfmodAsk(env(), 'shock', q('iso3') ?? '', deps.get, { kind: q('kind'), size: q('size'), hold: q('hold') });
    res.status(r.status).json(r.body);
  });
}
