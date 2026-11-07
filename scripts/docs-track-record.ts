/** Writes docs/TRACK_RECORD.md (npm run docs:track-record). */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { trackRecordFromRepo } from '../src/utils/trackRecordDocNode.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
writeFileSync(new URL('../docs/TRACK_RECORD.md', import.meta.url), trackRecordFromRepo(root));
console.log('Wrote docs/TRACK_RECORD.md');
