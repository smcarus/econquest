/**
 * Checks every data source from this computer and prints one line per source.
 *
 *   npm run check:data            the table
 *   npm run check:data -- --json  the same as JSON
 *
 * Reads the same .env as the app. Keys are never printed. Needs no running server.
 */
import dotenv from 'dotenv';
import fs from 'fs';
import { checkConnections, formatReport, isFailure } from '../src/utils/connectionCheck.ts';

dotenv.config();

const report = await checkConnections({
  env: process.env,
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
