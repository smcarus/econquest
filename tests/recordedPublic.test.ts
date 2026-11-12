/**
 * Replays the recorded feed replies anyone may use (tests/fixtures/recorded-public/, built by
 * `npm run record:public` from sources whose terms allow passing data on) through the real server.
 * This is the replay check outside contributors run: it ships in the public repository and needs no
 * key or connection. Sources left out of the folder read as not connected, which is expected.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { replaySuite } from './helpers/replaySuite.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
replaySuite(path.join(root, 'tests', 'fixtures', 'recorded-public'), 'public recorded replies', 'no public recording: run `npm run record:public` after `npm run record:feeds`');
