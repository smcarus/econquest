/**
 * `npm run daily:status`: what the last daily start-up run did (src/utils/dailyRun.ts), from
 * data/local/daily-run.json. `-- --full` adds every file not saved, every source that needs setup,
 * and what has to be downloaded by hand.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dailyFilePath, formatDaily, readDaily } from '../src/utils/dailyRun.ts';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = process.env.DATA_DIR || path.join(root, 'data');
const last = readDaily(dailyFilePath(dataDir)).last;
console.log(last ? formatDaily(last, { full: process.argv.includes('--full') }) : 'Daily data run: has not run yet (npm run go starts it, or npm run daily).');
