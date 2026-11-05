/**
 * Checks every data source from this computer and prints one line per source.
 *
 *   npm run check:data            the table
 *   npm run check:data -- --json  the same as JSON
 *
 * Reads the same .env as the app, and the keys saved in the app (Menu > Settings > API keys),
 * which win over .env just as they do in the app. Keys are never printed. Needs no running server.
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { checkConnections, formatReport, isFailure } from '../src/utils/connectionCheck.ts';
import { applyKeysToEnv, envKeySnapshot, keySources, loadSettings, settingsFilePath } from '../src/utils/userSettings.ts';

dotenv.config();

const envFileKeys = envKeySnapshot(process.env);
const saved = loadSettings(settingsFilePath(process.env.DATA_DIR || path.join(process.cwd(), 'data')));
applyKeysToEnv(process.env, envFileKeys, saved);

const report = await checkConnections({
  env: process.env,
  keySources: keySources(envFileKeys, saved),
  readFile: (p) => {
    try {
      return { text: fs.readFileSync(p, 'utf8'), modified: fs.statSync(p).mtime };
    } catch {
      return null;
    }
  },
});

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(formatReport(report));
}
process.exitCode = report.results.some((r) => isFailure(r.state)) ? 1 : 0;
