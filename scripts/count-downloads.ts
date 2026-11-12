/**
 * Loaded with `node --import` by the daily run before each file-pull script (server.ts runScript).
 * When ECONQUEST_DOWNLOAD_COUNT_FILE is set, it counts what the script downloads and writes the
 * byte count to that file when the script ends, so the daily run can show it per step.
 */
import fs from 'fs';
import { installDownloadCounter } from '../src/utils/downloadCounter.ts';

const file = process.env.ECONQUEST_DOWNLOAD_COUNT_FILE;
if (file) {
  const counter = installDownloadCounter();
  process.on('exit', () => {
    try {
      fs.writeFileSync(file, String(counter.total()));
    } catch {
      // the daily run then shows no figure for this step
    }
  });
}
