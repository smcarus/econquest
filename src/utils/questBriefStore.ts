/**
 * Debate opening briefs on disk (src/utils/questDebate.ts): quests/briefs/<id>.<version>.json, one
 * per Debate Quest version, written once by `npm run quests:brief` and never changed. Server and
 * scripts only.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { canonicalBrief, type DebateBrief } from './questDebate';

export const BRIEFS_DIR = 'briefs';

export const briefPath = (questsDir: string, id: string, version: number) => path.join(questsDir, BRIEFS_DIR, `${id}.${version}.json`);

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

/** The brief for a Quest version and whether its hash holds, or null when none was written. */
export function readBrief(questsDir: string, id: string, version: number): { brief: DebateBrief; hashOk: boolean } | null {
  try {
    const brief = JSON.parse(fs.readFileSync(briefPath(questsDir, id, version), 'utf8')) as DebateBrief;
    return { brief, hashOk: brief.hash === sha256(canonicalBrief(brief)) };
  } catch {
    return null;
  }
}

/** Writes a new brief with its hash. Refuses to replace one: a brief is recorded once. */
export function writeBrief(questsDir: string, b: Omit<DebateBrief, 'hash'>): DebateBrief {
  const file = briefPath(questsDir, b.questId, b.questVersion);
  if (fs.existsSync(file)) throw new Error(`${path.relative(questsDir, file)} already exists; a brief is recorded once and never replaced`);
  const brief: DebateBrief = { ...b, hash: sha256(canonicalBrief(b)) };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(brief, null, 2)}\n`);
  return brief;
}
