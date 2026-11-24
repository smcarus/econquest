/**
 * Scripts that test live sources (check:data, oecd:vintages, mac:validate, council:record) call
 * ensureCurrentCode() first. When this folder is behind GitHub, it updates the folder
 * (scripts/safe-pull.sh, the same as `npm run go`), installs packages if they changed, and runs the
 * script again on the new code, so an old copy of a script that has since been fixed is not run by
 * mistake. Offline, on a branch without an upstream, inside Docker (no .git) or on Windows it only
 * says what it could not do and runs the code that is here.
 *
 * Turn it off for one run: ECONQUEST_NO_UPDATE=1 npm run check:data
 */
import { execFileSync, spawnSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/** Set on the second run so it does not check again. */
const CHECKED = 'ECONQUEST_CODE_CHECKED';

export interface CodeUpdateDeps {
  root: string;
  env: NodeJS.ProcessEnv;
  platform: NodeJS.Platform;
  log: (line: string) => void;
  /** Runs a command; returns its output, or null when it failed. */
  run: (cmd: string, args: string[], opts?: { inherit?: boolean; timeoutMs?: number }) => string | null;
  /** Runs this script again with ECONQUEST_CODE_CHECKED set and ends with its exit code. */
  rerun: () => never;
}

export type CodeUpdateOutcome = 'off' | 'no-git' | 'no-upstream' | 'offline' | 'current' | 'pull-failed' | 'windows' | 'rerun';

export function checkAndUpdate(d: CodeUpdateDeps): CodeUpdateOutcome {
  if (d.env.ECONQUEST_NO_UPDATE === '1' || d.env[CHECKED] === '1') return 'off';
  if (!fs.existsSync(path.join(d.root, '.git'))) return 'no-git';
  const upstream = d.run('git', ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
  if (!upstream) return 'no-upstream';
  if (d.run('git', ['fetch', '--quiet'], { timeoutMs: 20_000 }) === null) {
    d.log('[code] Could not reach GitHub to check for newer code; running the code here.');
    return 'offline';
  }
  const behind = Number(d.run('git', ['rev-list', '--count', 'HEAD..@{u}']) || 0);
  if (!behind) return 'current';
  if (d.platform === 'win32') {
    d.log(`[code] This folder is ${behind} update(s) behind ${upstream.trim()}. Run git pull, then this command again; running the code here for now.`);
    return 'windows';
  }
  d.log(`[code] This folder is ${behind} update(s) behind ${upstream.trim()}; updating first so the newest version of this script runs.`);
  const lock = (): string => {
    try {
      return crypto.createHash('sha1').update(fs.readFileSync(path.join(d.root, 'package-lock.json'))).digest('hex');
    } catch {
      return '';
    }
  };
  const lockBefore = lock();
  if (d.run('bash', [path.join(d.root, 'scripts', 'safe-pull.sh')], { inherit: true }) === null) {
    d.log('[code] The update stopped (see above); running the code already here, which may be out of date.');
    return 'pull-failed';
  }
  if (lock() !== lockBefore) {
    d.log('[code] Packages changed; running npm install.');
    if (d.run('npm', ['install', '--no-audit', '--no-fund'], { inherit: true }) === null) d.log('[code] npm install failed; carrying on.');
  }
  d.log('[code] Updated; running the script again on the new code.');
  return d.rerun();
}

/** The real thing, for scripts: call at the top, before any download. */
export function ensureCurrentCode(root: string): void {
  // Commands this script starts (mac:validate runs check:data) do not check again.
  const done = () => {
    process.env[CHECKED] = '1';
  };
  const outcome = checkAndUpdate({
    root,
    env: process.env,
    platform: process.platform,
    log: (line) => console.log(line),
    run: (cmd, args, opts) => {
      try {
        const out = execFileSync(cmd, args, { cwd: root, encoding: 'utf8', stdio: opts?.inherit ? 'inherit' : ['ignore', 'pipe', 'ignore'], timeout: opts?.timeoutMs });
        return out ?? '';
      } catch {
        return null;
      }
    },
    rerun: () => {
      const r = spawnSync(process.execPath, [...process.execArgv, ...process.argv.slice(1)], { cwd: process.cwd(), stdio: 'inherit', env: { ...process.env, [CHECKED]: '1' } });
      process.exit(r.status ?? 1);
    },
  });
  if (outcome !== 'rerun') done();
}
