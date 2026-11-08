/** Node side of docs/TRACK_RECORD.md: reads the recorded verdicts and the pre-registered test files from docs/, and the Signal Quest verdicts from quests/. */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { VERDICT_FOLDER, type RecordedVerdict, type VerdictKind } from './methodsDoc';
import { trackRecordMarkdown, trackRows, type RecordedRun, type TestFile, type TrackRow } from './trackRecordDoc';
import { loadTestRecord, testRecordPath } from './questTestStore';
import type { QuestTestVerdict } from './questSignal';

function repoInputs(root: string, questsDir = path.join(root, 'quests')): { verdicts: RecordedVerdict[]; files: TestFile[]; runs: RecordedRun[]; questVerdicts: QuestTestVerdict[] } {
  const files: TestFile[] = [];
  for (const [kind, folder] of Object.entries(VERDICT_FOLDER) as [VerdictKind, string][]) {
    const dir = path.join(root, 'docs/validation', folder);
    const manifest = JSON.parse(readFileSync(path.join(dir, 'manifest.json'), 'utf8')).files as Record<string, string>;
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'manifest.json').sort()) {
      const spec = JSON.parse(readFileSync(path.join(dir, file), 'utf8'));
      files.push({ kind, id: spec.id, version: Number(spec.version) || 1, file, registeredOn: spec.registeredOn, hash: manifest[file], maxPValue: typeof spec.passMark?.maxPValue === 'number' ? spec.passMark.maxPValue : undefined });
    }
  }
  const record = JSON.parse(readFileSync(path.join(root, 'docs/validation/recorded-verdicts.json'), 'utf8'));
  const quests = loadTestRecord(testRecordPath(questsDir));
  if (quests.problems.length) throw new Error(`quests/test-verdicts.json: ${quests.problems.join('; ')}`);
  const questRuns = quests.record.runs.map((r) => ({ ranAt: r.ranAt, where: `${r.where}, npm run quests:run-tests for Signal Quest ${r.questId} (run by ${r.by})` }));
  return { verdicts: record.verdicts as RecordedVerdict[], files, runs: [...(record.runs || []), ...questRuns], questVerdicts: quests.record.verdicts };
}

export function trackRecordFromRepo(root: string): string {
  const x = repoInputs(root);
  return trackRecordMarkdown(x.verdicts, x.files, x.runs, x.questVerdicts);
}

/** Every row of the track record with its Holm reading; Signal Quest verdicts read from `questsDir`. */
export function trackRowsFromRepo(root: string, questsDir?: string): TrackRow[] {
  const x = repoInputs(root, questsDir);
  return trackRows(x.verdicts, x.files, x.questVerdicts);
}
