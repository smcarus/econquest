import type express from 'express';
import type { Account } from '../../utils/auth';
import { refusal } from '../../utils/permissions';
import { appendAudit } from '../../utils/auditStore';
import { AUDIT_FILES, DATA_DIR } from '../config';
import type { Platform } from '../../platform/types';
import { createNodePlatform } from '../../platform/node';
import { checkOwnUpload, deleteOwnSeries, listOwnSeries, loadOwnSeries, OWN_NO_COUNTRY, OWN_SERIES_FOLDER, saveOwnSeries } from '../../engine/ownSeries';
import { isCountryIso3 } from '../../data/iso3166';

/** A three-letter code that is not an ISO 3166 country (or WLD), in words; null when it is fine or absent. */
function unknownCountry(meta: unknown): string | null {
  const code = String((meta as Record<string, unknown> | null)?.['iso3'] ?? '').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code) || code === OWN_NO_COUNTRY || isCountryIso3(code)) return null;
  return `${code} is not an ISO 3166 country code; use ${OWN_NO_COUNTRY} when the series is not about one country.`;
}

/**
 * Your own data (src/engine/ownSeries.ts): load a series from a CSV file, check it, keep it in
 * data/local/own-series/, list and delete it. Viewers can read; analysts and admins can load and
 * delete. Every save and delete goes to the audit log with the file's SHA-256.
 */
export interface OwnSeriesDeps {
  refuseRemoteChange: (req: express.Request, res: express.Response) => boolean;
  signedIn: (res: express.Response) => Account | null;
  /** Tests hand in a memory platform; the server uses its data folder. */
  platform?: Platform;
}

export function registerOwnSeriesRoutes(app: express.Express, deps: OwnSeriesDeps): void {
  const { refuseRemoteChange, signedIn } = deps;
  const platform = deps.platform ?? createNodePlatform({ dataDir: DATA_DIR });
  const viewer = (res: express.Response) => {
    const who = signedIn(res);
    if (who && who.role === 'viewer') {
      res.status(403).json({ error: refusal(who.role, 'analyst') });
      return true;
    }
    return false;
  };

  app.get('/api/own-series', async (_req, res) => {
    res.json({ series: await listOwnSeries(platform), folder: `data/${OWN_SERIES_FOLDER}` });
  });

  app.get('/api/own-series/:id', async (req, res) => {
    const f = await loadOwnSeries(platform, String(req.params.id));
    if (!f) return res.status(404).json({ error: 'No series of yours with that id.' });
    res.json(f);
  });

  // Check only: nothing is saved. The dialog shows the problems or a preview.
  app.post('/api/own-series/check', (req, res) => {
    const b = req.body || {};
    const c = checkOwnUpload(b.meta, b.csv);
    const parse = c.parse;
    const badCountry = unknownCountry(b.meta);
    const problems = [...(badCountry ? [badCountry] : []), ...(c.ok ? [] : c.problems)];
    res.json({
      ok: c.ok && !badCountry,
      problems,
      rowsRead: parse?.rowsRead ?? 0,
      blank: parse?.blank ?? 0,
      count: parse?.points.length ?? 0,
      first: parse?.points[0] ?? null,
      last: parse?.points[parse.points.length - 1] ?? null,
      sample: parse?.points.slice(0, 5) ?? [],
    });
  });

  app.post('/api/own-series', async (req, res) => {
    if (refuseRemoteChange(req, res)) return;
    if (viewer(res)) return;
    const b = req.body || {};
    const badCountry = unknownCountry(b.meta);
    if (badCountry) return res.status(400).json({ error: badCountry, problems: [badCountry] });
    const made = await saveOwnSeries(platform, b.meta, b.csv);
    if ('problems' in made) return res.status(400).json({ error: made.problems.join(' '), problems: made.problems });
    const s = made.saved;
    appendAudit(AUDIT_FILES, {
      kind: 'own_data',
      summary: `Loaded your own series "${s.meta.label}" (${s.meta.iso3}, ${s.points.length} figures)`,
      detail: { id: s.id, csvSha256: s.csvSha256, source: s.meta.source },
    });
    res.json({ saved: { id: s.id, count: s.points.length, first: s.points[0]?.date ?? null, last: s.points[s.points.length - 1]?.date ?? null, csvSha256: s.csvSha256, blank: s.blank } });
  });

  app.delete('/api/own-series/:id', async (req, res) => {
    if (refuseRemoteChange(req, res)) return;
    if (viewer(res)) return;
    const id = String(req.params.id);
    const f = await loadOwnSeries(platform, id);
    if (!f || !(await deleteOwnSeries(platform, id))) return res.status(404).json({ error: 'No series of yours with that id.' });
    appendAudit(AUDIT_FILES, { kind: 'own_data', summary: `Deleted your own series "${f.meta.label}"`, detail: { id, csvSha256: f.csvSha256 } });
    res.json({ deleted: id });
  });
}
