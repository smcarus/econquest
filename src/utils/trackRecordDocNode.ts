/** Node side of docs/TRACK_RECORD.md: reads the recorded verdicts and the pre-registered test files from docs/. */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { VERDICT_FOLDER, type RecordedVerdict, type VerdictKind } from './methodsDoc';
import { trackRecordMarkdown, type TestFile } from './trackRecordDoc';

export function trackRecordFromRepo(root: string): string {
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
  return trackRecordMarkdown(record.verdicts as RecordedVerdict[], files, record.runs || []);
}
