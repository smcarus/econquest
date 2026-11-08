/**
 * The record of Signal Quest test verdicts on disk: quests/test-verdicts.json (src/utils/questSignal.ts).
 * Written only by `npm run quests:run-tests`, once per Quest version; a verdict is never replaced.
 * Server and scripts only.
 */
import fs from 'fs';
import path from 'path';
import { emptyTestRecord, testRecordProblems, type QuestTestRecord, type QuestTestVerdict } from './questSignal';

export const TEST_RECORD_FILE = 'test-verdicts.json';
export const testRecordPath = (questsDir: string) => path.join(questsDir, TEST_RECORD_FILE);

/** The record, or an empty one when there is no file yet; `problems` when the file is broken. */
export function loadTestRecord(file: string): { record: QuestTestRecord; problems: string[] } {
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return { record: emptyTestRecord(), problems: [] };
    return { record: emptyTestRecord(), problems: [`${path.basename(file)} is not valid JSON`] };
  }
  const problems = testRecordProblems(raw);
  return problems.length ? { record: emptyTestRecord(), problems } : { record: raw as QuestTestRecord, problems };
}

/** Adds one run's verdicts. Refuses a Quest version that was run before, or a test already on record. */
export function appendTestRun(file: string, run: QuestTestRecord['runs'][number], verdicts: QuestTestVerdict[]): QuestTestRecord {
  const { record, problems } = loadTestRecord(file);
  if (problems.length) throw new Error(`${path.basename(file)}: ${problems.join('; ')}. Restore it from git before running.`);
  const before = record.runs.find((r) => r.questId === run.questId && r.questVersion === run.questVersion);
  if (before) throw new Error(`The tests for ${run.questId} v${run.questVersion} were run on ${before.ranAt}; each is run once`);
  for (const v of verdicts) if (record.verdicts.some((x) => x.id === v.id && x.version === v.version)) throw new Error(`${v.id} v${v.version} is already on record`);
  const next: QuestTestRecord = { ...record, runs: [...record.runs, run], verdicts: [...record.verdicts, ...verdicts] };
  fs.writeFileSync(file, `${JSON.stringify(next, null, 1)}\n`);
  return next;
}
