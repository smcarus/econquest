/**
 * Central bank statements you save for the word count (G31, src/utils/cbWords.ts), kept in
 * data/local/cb-statements/<ISO3>/. One file per statement, named with its date (for example
 * 2026-10-29.txt or 2026-10-29-statement.html); plain text, Markdown or a saved web page. The app
 * downloads none: no central bank's terms of use and robots.txt have been checked for this, so you
 * save the statements yourself. Read on each request; nothing leaves the machine.
 */
import fs from 'fs';
import path from 'path';
import { DATA_DIR } from '../config';
import { cbwDateFromName, cbWordCount, type CbwStatement } from '../../utils/cbWords';

export const CBW_MAX_FILES = 400;
export const CBW_MAX_BYTES = 2 * 1024 * 1024;

export const cbStatementsDir = (iso3: string, dataDir = DATA_DIR) => path.join(dataDir, 'local', 'cb-statements', iso3.replace(/[^A-Z0-9]/g, ''));

export interface CbStatementsRead {
  dir: string;
  statements: CbwStatement[];
  skipped: Array<{ file: string; reason: string }>;
}

export function readCbStatements(iso3: string, dataDir = DATA_DIR): CbStatementsRead {
  const dir = cbStatementsDir(iso3, dataDir);
  const rel = path.relative(dataDir, dir).split(path.sep).join('/');
  let names: string[] = [];
  try {
    names = fs.readdirSync(dir).filter((n) => /\.(txt|md|html?)$/i.test(n) && !n.startsWith('.'));
  } catch {
    return { dir: `data/${rel}/`, statements: [], skipped: [] };
  }
  const statements: CbwStatement[] = [];
  const skipped: CbStatementsRead['skipped'] = [];
  for (const file of names.sort().slice(-CBW_MAX_FILES)) {
    const date = cbwDateFromName(file);
    if (!date) {
      skipped.push({ file, reason: 'no date in the file name (use 2026-10-29.txt)' });
      continue;
    }
    try {
      const full = path.join(dir, file);
      const size = fs.statSync(full).size;
      if (size > CBW_MAX_BYTES) {
        skipped.push({ file, reason: 'larger than 2 MB' });
        continue;
      }
      statements.push({ file, date, ...cbWordCount(fs.readFileSync(full, 'utf8')) });
    } catch (e: any) {
      skipped.push({ file, reason: e?.message || 'could not be read' });
    }
  }
  statements.sort((a, b) => a.date.localeCompare(b.date) || a.file.localeCompare(b.file));
  return { dir: `data/${rel}/`, statements, skipped };
}
