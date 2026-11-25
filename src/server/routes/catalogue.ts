import type express from 'express';
import { fetchWithTimeout, RESEARCH_USER_AGENT } from '../http';
import {
  CATALOGUE_LABEL,
  CATALOGUE_LICENCE,
  CATALOGUE_URLS,
  matchEntries,
  parseDbnomicsSearch,
  parseEurostatToc,
  parseImfIndicators,
  parseWbIndicators,
  type CatalogueEntry,
  type CatalogueSource,
} from '../../utils/catalogueSearch';

/**
 * GET /api/catalogue/search?q= (CG6): DBnomics is searched on its own server for each query; the
 * IMF, World Bank and Eurostat lists are downloaded once a day and searched here. A catalogue that
 * does not answer is listed with the reason; the others still answer.
 */
const DAY = 24 * 3600 * 1000;
const lists = new Map<Exclude<CatalogueSource, 'dbnomics'>, { at: number; entries: CatalogueEntry[] }>();

async function getText(url: string, ms: number): Promise<string> {
  const r = await fetchWithTimeout(url, ms, { Accept: '*/*', 'User-Agent': RESEARCH_USER_AGENT });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}

async function listFor(src: Exclude<CatalogueSource, 'dbnomics'>): Promise<CatalogueEntry[]> {
  const have = lists.get(src);
  if (have && Date.now() - have.at < DAY) return have.entries;
  const text = await getText(CATALOGUE_URLS[src], 30_000);
  const entries = src === 'eurostat' ? parseEurostatToc(text) : src === 'imf' ? parseImfIndicators(JSON.parse(text)) : parseWbIndicators(JSON.parse(text));
  if (!entries.length) throw new Error('the list came back empty');
  lists.set(src, { at: Date.now(), entries });
  return entries;
}

export function registerCatalogueRoutes(app: express.Express): void {
  app.get('/api/catalogue/search', async (req, res) => {
    const q = String(req.query.q || '').trim().slice(0, 120);
    if (q.length < 2) return res.json({ q, results: [], problems: [], licences: CATALOGUE_LICENCE, labels: CATALOGUE_LABEL });
    const problems: string[] = [];
    const tasks: Array<Promise<CatalogueEntry[]>> = [
      getText(CATALOGUE_URLS.dbnomics(q, 25), 15_000).then((t) => parseDbnomicsSearch(JSON.parse(t))),
      ...(['imf', 'worldbank', 'eurostat'] as const).map((s) => listFor(s).then((e) => matchEntries(e, q, 25))),
    ];
    const names: CatalogueSource[] = ['dbnomics', 'imf', 'worldbank', 'eurostat'];
    const got = await Promise.allSettled(tasks);
    const results: CatalogueEntry[] = [];
    got.forEach((g, k) => {
      if (g.status === 'fulfilled') results.push(...g.value);
      else problems.push(`${CATALOGUE_LABEL[names[k]]} did not answer (${(g.reason as Error)?.message || g.reason})`);
    });
    res.json({ q, results, problems, licences: CATALOGUE_LICENCE, labels: CATALOGUE_LABEL });
  });
}
