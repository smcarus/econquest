import type express from 'express';
import { fetchWithTimeout, RESEARCH_USER_AGENT } from '../http';
import { SOVEREIGN_CATALOG } from '../../data/presetsAndBaselines.ts';
import {
  buildData,
  datamapperUrl,
  GVAR_CORE,
  GVAR_FIRST_YEAR,
  GVAR_SOURCE,
  GVAR_VARS,
  imtsUrl,
  parseDatamapper,
  parseImtsTrade,
  runGvar,
  tradeWeights,
  type GvarVar,
} from '../../utils/gvar';

/**
 * GET /api/gvar?iso3=&shock=&var=gdp|cpi&size= (gap CG16): a small global VAR of the main
 * economies plus the country being looked at, with IMF trade weights, and the spread of a shock of
 * `size` percentage points to `var` in `shock`. IMF replies are kept in memory for a day (growth and
 * inflation) or a week (trade); nothing is saved. A source that does not answer is named, and no
 * figure is made up in its place.
 */
const DAY = 24 * 3600 * 1000;
const cache = new Map<string, { at: number; ttl: number; value: unknown }>();
async function cached<T>(key: string, ttl: number, get: () => Promise<T>): Promise<T> {
  const have = cache.get(key);
  if (have && Date.now() - have.at < have.ttl) return have.value as T;
  const value = await get();
  cache.set(key, { at: Date.now(), ttl, value });
  return value;
}
async function json(url: string, ms: number): Promise<unknown> {
  const r = await fetchWithTimeout(url, ms, { Accept: 'application/json', 'User-Agent': RESEARCH_USER_AGENT });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

const known = (iso3: string) => SOVEREIGN_CATALOG.some((c) => c.iso3 === iso3);

export function registerGvarRoutes(app: express.Express): void {
  app.get('/api/gvar', async (req, res) => {
    const iso3 = String(req.query.iso3 || '').toUpperCase();
    const shock = String(req.query.shock || 'USA').toUpperCase();
    const variable = (GVAR_VARS as readonly string[]).includes(String(req.query.var)) ? (String(req.query.var) as GvarVar) : 'gdp';
    const size = Number(req.query.size ?? -1);
    if ((iso3 && !known(iso3)) || !known(shock)) return res.status(400).json({ error: 'Unknown country.' });
    if (!Number.isFinite(size) || size === 0 || Math.abs(size) > 10) return res.status(400).json({ error: 'The shock size is a number of percentage points between -10 and 10, not zero.' });
    const countries = [...new Set([...GVAR_CORE, ...(iso3 ? [iso3] : []), shock])];
    const through = new Date().getUTCFullYear() - 1;
    const problems: string[] = [];
    try {
      const [g, p] = await Promise.all(
        (['NGDP_RPCH', 'PCPIPCH'] as const).map((ind) => cached(`dm:${ind}:${countries.join(',')}`, DAY, async () => parseDatamapper(await json(datamapperUrl(ind, countries), 20_000), ind)))
      );
      const trade: Record<string, Record<string, number>> = {};
      const queue = [...countries];
      await Promise.all(
        Array.from({ length: 4 }, async () => {
          for (let c = queue.shift(); c; c = queue.shift()) {
            const me = c;
            const partners = countries.filter((x) => x !== me);
            try {
              trade[me] = await cached(`imts:${me}:${partners.join(',')}`, 7 * DAY, async () => parseImtsTrade(await json(imtsUrl(me, partners), 30_000)));
            } catch (e) {
              problems.push(`IMF trade by partner for ${me} did not answer (${(e as Error)?.message || e}); partners' own reports are used`);
            }
          }
        })
      );
      const { data, dropped } = buildData(countries, g, p, GVAR_FIRST_YEAR, through);
      const { W, missing } = tradeWeights(data.countries, trade);
      if (missing.length) return res.json({ error: `No IMF trade figures for ${missing.join(', ')}, so the trade weights cannot be built.`, problems, source: GVAR_SOURCE });
      const out = runGvar(data, W, shock, variable, size);
      res.json({ ...out, dropped, problems, source: GVAR_SOURCE, note: 'The latest years in the IMF figures can be IMF estimates. Annual data; a rough guide to direction and size, not a forecast.' });
    } catch (e) {
      res.json({ error: `The IMF World Economic Outlook figures did not load (${(e as Error)?.message || e}).`, problems, source: GVAR_SOURCE });
    }
  });
}
