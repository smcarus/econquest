import type express from 'express';
import { fetchWithTimeout, RESEARCH_USER_AGENT } from '../http';
import { SOVEREIGN_CATALOG } from '../../data/presetsAndBaselines.ts';
import { iso2For } from '../../data/iso3166Alpha2';
import { BIS_SPEECHES_RSS, DOC_SOURCE_LABEL, parseBisSpeeches, parseWdsDocs, speechesFor, wdsUrl, type OfficialDoc } from '../../utils/officialDocs';

/**
 * GET /api/official-docs?iso3= (CG17): World Bank documents for the country and BIS central bankers'
 * speeches that name it. Each source is cached for six hours; one that does not answer is named.
 */
const TTL = 6 * 3600 * 1000;
const cache = new Map<string, { at: number; value: unknown }>();

async function cached<T>(key: string, get: () => Promise<T>): Promise<T> {
  const have = cache.get(key);
  if (have && Date.now() - have.at < TTL) return have.value as T;
  const value = await get();
  cache.set(key, { at: Date.now(), value });
  return value;
}

async function text(url: string): Promise<string> {
  const r = await fetchWithTimeout(url, 15_000, { Accept: '*/*', 'User-Agent': RESEARCH_USER_AGENT });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}

export function registerOfficialDocsRoutes(app: express.Express): void {
  app.get('/api/official-docs', async (req, res) => {
    const iso3 = String(req.query.iso3 || '').toUpperCase();
    const country = SOVEREIGN_CATALOG.find((c) => c.iso3 === iso3);
    if (!country) return res.status(400).json({ error: 'Unknown country.' });
    const iso2 = iso2For(iso3);
    const problems: string[] = [];
    let wb: { docs: OfficialDoc[]; routine: number } = { docs: [], routine: 0 };
    let speeches: OfficialDoc[] = [];
    await Promise.all([
      iso2
        ? cached(`wb:${iso2}`, async () => parseWdsDocs(JSON.parse(await text(wdsUrl(iso2)))))
            .then((v) => (wb = v))
            .catch((e) => problems.push(`${DOC_SOURCE_LABEL.worldbank} did not answer (${e?.message || e})`))
        : Promise.resolve(problems.push(`${DOC_SOURCE_LABEL.worldbank}: no two-letter code for ${iso3}`)),
      cached('bis', async () => parseBisSpeeches(await text(BIS_SPEECHES_RSS)))
        .then((all) => (speeches = speechesFor(all, iso3, country.countryName)))
        .catch((e) => problems.push(`${DOC_SOURCE_LABEL.bis} did not answer (${e?.message || e})`)),
    ]);
    res.json({ iso3, worldbank: wb.docs.slice(0, 25), routineLeftOut: wb.routine, speeches: speeches.slice(0, 15), problems, labels: DOC_SOURCE_LABEL });
  });
}
