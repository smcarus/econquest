/**
 * The Quest results file, quests/resolutions.jsonl (src/utils/questResolve.ts): read it, check its
 * chain, and append a line with the next number and the hash of the line before. Never edited.
 * Server and scripts only.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { brokenAt, canonicalLine, GENESIS, type ResolutionDraft, type ResolutionLine } from './questResolve';

export const RESOLUTIONS_FILE = 'resolutions.jsonl';

export const resolutionsPath = (questsDir: string) => path.join(questsDir, RESOLUTIONS_FILE);

export const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

export interface ResolutionRecord {
  lines: ResolutionLine[];
  /** Lines that are not JSON or not a result line. */
  badLines: number;
  /** Index of the first line that breaks the chain, or -1 when it holds. */
  brokenAt: number;
}

export function loadResolutions(file: string): ResolutionRecord {
  let text = '';
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return { lines: [], badLines: 0, brokenAt: -1 };
  }
  const lines: ResolutionLine[] = [];
  let badLines = 0;
  let firstBad = -1;
  for (const raw of text.split('\n')) {
    if (!raw.trim()) continue;
    try {
      const l = JSON.parse(raw) as ResolutionLine;
      if (typeof l?.seq !== 'number' || !l.hash || !l.questId || !l.kind) throw new Error('not a result line');
      lines.push(l);
    } catch {
      if (firstBad === -1) firstBad = lines.length;
      badLines++;
    }
  }
  const chain = brokenAt(lines, sha256);
  const at = [chain, firstBad].filter((i) => i !== -1);
  return { lines, badLines, brokenAt: at.length ? Math.min(...at) : -1 };
}

/** Append one line. Refuses when the file's chain is already broken, so a bad file is fixed by hand first. */
export function appendResolution(file: string, draft: ResolutionDraft): ResolutionLine {
  const rec = loadResolutions(file);
  if (rec.brokenAt !== -1) throw new Error(`${path.basename(file)} is broken at line ${rec.brokenAt + 1}; nothing was written`);
  const last = rec.lines[rec.lines.length - 1];
  const body = { ...draft, seq: rec.lines.length + 1, prev: last ? last.hash : GENESIS };
  const line: ResolutionLine = { ...body, hash: sha256(canonicalLine(body)) } as ResolutionLine;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(line)}\n`);
  return line;
}
