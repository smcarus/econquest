import type express from 'express';
import type { Account } from '../../utils/auth';
import { refusal } from '../../utils/permissions';
import { appendAudit } from '../../utils/auditStore';
import { AUDIT_FILES, DATA_DIR } from '../config';
import type { Platform } from '../../platform/types';
import { createNodePlatform } from '../../platform/node';
import { isCountryIso3 } from '../../data/iso3166';
import { SOVEREIGN_CATALOG, catalogEntry } from '../../data/presetsAndBaselines';
import { BUDGET_EXEC_FOLDER, BUDGET_TEMPLATE, budgetSentence, budgetView, deleteBudget, loadBudget, saveBudget } from '../../engine/budgetExecution';

/**
 * Budget execution tracker (R4, src/engine/budgetExecution.ts): your approved budget and monthly
 * spending from a file you load, one per country, kept in data/local/budget-execution/. Viewers can
 * read; analysts and admins can load and delete. Every save and delete goes to the audit log with
 * the file's SHA-256, never its figures.
 */
export interface BudgetExecutionDeps {
  refuseRemoteChange: (req: express.Request, res: express.Response) => boolean;
  signedIn: (res: express.Response) => Account | null;
  platform?: Platform;
}

const code = (req: express.Request) => String(req.params.iso3 || '').toUpperCase().replace(/[^A-Z]/g, '');

export function registerBudgetExecutionRoutes(app: express.Express, deps: BudgetExecutionDeps): void {
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

  app.get('/api/budget-execution-template.csv', (_req, res) => {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="budget-execution-template.csv"');
    res.send(BUDGET_TEMPLATE);
  });

  app.get('/api/budget-execution/:iso3', async (req, res) => {
    const iso3 = code(req);
    if (!isCountryIso3(iso3)) return res.status(400).json({ error: `${iso3} is not an ISO 3166 country code.` });
    const f = await loadBudget(platform, iso3);
    if (!f) return res.json({ iso3, loaded: false, folder: `data/${BUDGET_EXEC_FOLDER}` });
    const v = budgetView(f);
    const name = catalogEntry(iso3)?.countryName || iso3;
    res.json({ loaded: true, ...v, sentence: budgetSentence(v, name), folder: `data/${BUDGET_EXEC_FOLDER}` });
  });

  app.post('/api/budget-execution/:iso3', async (req, res) => {
    if (refuseRemoteChange(req, res)) return;
    if (viewer(res)) return;
    const iso3 = code(req);
    if (!isCountryIso3(iso3)) return res.status(400).json({ error: `${iso3} is not an ISO 3166 country code.`, problems: [`${iso3} is not an ISO 3166 country code.`] });
    const b = req.body || {};
    const made = await saveBudget(platform, iso3, b.meta, b.csv);
    if ('problems' in made) return res.status(400).json({ error: made.problems.join(' '), problems: made.problems });
    const f = made.saved;
    appendAudit(AUDIT_FILES, {
      kind: 'own_data',
      summary: `Loaded your budget execution file for ${iso3} (${new Set(f.rows.map((r) => r.line)).size} lines, ${f.rows.length} rows)`,
      detail: { iso3, csvSha256: f.csvSha256, source: f.meta.source },
    });
    res.json({ saved: { iso3, rows: f.rows.length, csvSha256: f.csvSha256 } });
  });

  app.delete('/api/budget-execution/:iso3', async (req, res) => {
    if (refuseRemoteChange(req, res)) return;
    if (viewer(res)) return;
    const iso3 = code(req);
    const f = await loadBudget(platform, iso3);
    if (!f || !(await deleteBudget(platform, iso3))) return res.status(404).json({ error: 'No budget file of yours for that country.' });
    appendAudit(AUDIT_FILES, { kind: 'own_data', summary: `Deleted your budget execution file for ${iso3}`, detail: { iso3, csvSha256: f.csvSha256 } });
    res.json({ deleted: iso3 });
  });
}
