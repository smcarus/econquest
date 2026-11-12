/**
 * Menu > Models & validation > Your tests (plan item L4a): register a test of your own. Reads the
 * app's registered tests only to learn each method's threshold names (and show the app's values as
 * a reference); never writes beside them.
 */
import type express from 'express';
import path from 'path';
import { loadSpecs, loadValidation, runBacktests } from '../../utils/backtestRun';
import type { BacktestResult, BacktestSpec } from '../../utils/backtest';
import { holmReadings, testsOnRecord } from '../../utils/multipleTesting';
import type { V1Month } from '../../utils/gdeltDaily';
import type { UcdpData } from '../../utils/ucdpConflict';
import { buildUserTest, methodParams } from '../../utils/userTests';
import { listUserTests, registerUserTest, userTestDir } from '../userTestStore';
import type { Account } from '../../utils/auth';

export interface UserTestDeps {
  dataDir: string;
  specDir: string;
  refuseRemoteChange: (req: express.Request, res: express.Response) => boolean;
  signedIn: (res: express.Response) => Account | null;
  audit: (summary: string, detail: Record<string, unknown>) => void;
  /** Files on disk some methods read (GDELT months, UCDP), as for the app's own backtests. */
  local?: { gdeltMonths: () => V1Month[]; ucdp: () => UcdpData | null };
}

/** Your tests' verdicts and forward record sit beside the app's but in files of their own. */
export const userResultFile = (dataDir: string) => path.join(dataDir, 'local', 'validation', 'user-results.json');
export const userForwardFile = (dataDir: string) => path.join(dataDir, 'local', 'validation', 'user-forward.jsonl');

export function registerUserTestRoutes(app: express.Express, deps: UserTestDeps): void {
  const methods = () => methodParams(loadSpecs(deps.specDir).map((s) => s.spec).filter((s): s is BacktestSpec => Boolean(s)));
  const dir = userTestDir(deps.dataDir);
  let running = false;

  app.get('/api/user-tests', (_req, res) => {
    const tests = listUserTests(dir);
    const v = loadValidation(userResultFile(deps.dataDir));
    // Holm across your own tests only: the app's tests are a separate family, so neither moves the other.
    const alphaFor = (id: string, version: number) => tests.find((t) => t.spec?.id === id && t.spec?.version === version)?.spec?.passMark?.maxPValue;
    const holm = Object.fromEntries(holmReadings(testsOnRecord(v.versions, alphaFor)));
    res.json({
      methods: methods(),
      tests: tests.map((t) => ({ file: t.file, hash: t.hash, problem: t.problem, spec: t.spec })),
      results: v.versions || {},
      holm,
      running,
      lastRun: v.lastRun ?? null,
      folder: 'data/local/validation/user-tests',
    });
  });

  // Runs every registered test that has no verdict yet, in the background, on the same free histories
  // as the app's own backtests. A recorded verdict is never run again, so it can never change.
  app.post('/api/user-tests/run', (req, res) => {
    if (deps.refuseRemoteChange(req, res)) return;
    if (running) return res.status(409).json({ error: 'RUNNING', message: 'Your tests are already running.' });
    running = true;
    void runBacktests({
      specDir: dir,
      resultFile: userResultFile(deps.dataDir),
      forwardFile: userForwardFile(deps.dataDir),
      skipRecorded: true,
      local: deps.local,
      onResult: (r: BacktestResult) => deps.audit(`Own test ${r.id} v${r.specVersion}: ${r.status.replace(/_/g, ' ')}`, { verdict: r.verdict, specHash: r.specHash, cases: r.cases, pValue: r.pValue, span: r.span }),
    })
      .catch((e) => deps.audit('Own tests could not run', { error: String(e?.message || e) }))
      .finally(() => {
        running = false;
      });
    res.status(202).json({ started: true });
  });

  app.post('/api/user-tests', (req, res) => {
    if (deps.refuseRemoteChange(req, res)) return;
    const me = deps.signedIn(res);
    const built = buildUserTest(req.body || {}, methods(), new Date().toISOString().slice(0, 10), me ? `${me.displayName} (${me.username})` : 'The user of this computer');
    if (!built.ok) return res.status(400).json({ error: 'NOT_READY', problems: built.problems });
    const saved = registerUserTest(dir, built.spec);
    if (!saved.ok) return res.status(409).json({ error: 'EXISTS', message: 'A test with this name is already registered and cannot be changed. Give the new idea a new name.' });
    deps.audit(`Registered own test ${built.spec.id}`, { id: built.spec.id, hash: saved.hash, method: built.spec.method });
    res.json({ ok: true, id: built.spec.id, hash: saved.hash, registeredOn: built.spec.registeredOn });
  });

  // A registered test is frozen: no route changes or removes one.
  const frozen = (_req: express.Request, res: express.Response) => res.status(405).json({ error: 'FROZEN', message: 'A registered test cannot be edited or removed. Register a new test with a new name.' });
  app.put('/api/user-tests/:id', frozen);
  app.patch('/api/user-tests/:id', frozen);
  app.delete('/api/user-tests/:id', frozen);
}
