/**
 * Menu > Models & validation > Your tests (plan item L4a): register a test of your own. Reads the
 * app's registered tests only to learn each method's threshold names (and show the app's values as
 * a reference); never writes beside them.
 */
import type express from 'express';
import { loadSpecs } from '../../utils/backtestRun';
import type { BacktestSpec } from '../../utils/backtest';
import { buildUserTest, methodParams } from '../../utils/userTests';
import { listUserTests, registerUserTest, userTestDir } from '../userTestStore';
import type { Account } from '../../utils/auth';

export interface UserTestDeps {
  dataDir: string;
  specDir: string;
  refuseRemoteChange: (req: express.Request, res: express.Response) => boolean;
  signedIn: (res: express.Response) => Account | null;
  audit: (summary: string, detail: Record<string, unknown>) => void;
}

export function registerUserTestRoutes(app: express.Express, deps: UserTestDeps): void {
  const methods = () => methodParams(loadSpecs(deps.specDir).map((s) => s.spec).filter((s): s is BacktestSpec => Boolean(s)));
  const dir = userTestDir(deps.dataDir);

  app.get('/api/user-tests', (_req, res) => {
    res.json({
      methods: methods(),
      tests: listUserTests(dir).map((t) => ({ file: t.file, hash: t.hash, problem: t.problem, spec: t.spec })),
      folder: 'data/local/validation/user-tests',
    });
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
