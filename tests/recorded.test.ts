/**
 * Replays the feed replies recorded on a computer that reached the feeds (`npm run record:feeds`,
 * saved in tests/fixtures/recorded/) through the real server, and checks the app still reads from
 * them everything it read when they were recorded: each source connected then is connected now,
 * and each watchlist and country figure filled then is filled now. A source that changed its
 * format shows up here, with the source named, before anyone sees Missing in the app.
 *
 * Skipped (with a note) until a recording exists.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { maskUrl, rangeOnlyDiffers, sharedParams, urlStem } from './helpers/feedRecording.mjs';
import { replaySuite } from './helpers/replaySuite.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const recDir = process.env.REPLAY_DIR || path.join(root, 'tests', 'fixtures', 'recorded');

test('recording helpers: keys never reach the stored URL, and moved ranges still match', () => {
  assert.equal(maskUrl('https://api.stlouisfed.org/fred/series/observations?series_id=X1&api_key=abc123&file_type=json'), 'https://api.stlouisfed.org/fred/series/observations?series_id=X1&api_key=X&file_type=json');
  assert.equal(maskUrl('https://comtradeapi.un.org/data/v1/get?subscription-key=zzz&reporterCode=76'), 'https://comtradeapi.un.org/data/v1/get?subscription-key=X&reporterCode=76');
  assert.equal(maskUrl('https://user:pw@example.org/a?token=t'), 'https://example.org/a?token=X');
  assert.equal(urlStem('https://stats.bis.org/api/v1/data/WS_CBPOL/M.BR?startPeriod=2023-11'), 'https://stats.bis.org/api/v1/data/WS_CBPOL/M.BR');
  assert.equal(sharedParams('https://x.org/a?f=json&start=2023-11', 'https://x.org/a?f=json&start=2023-12'), 1);
  // A moved date range may stand in; another country's series id may not.
  assert.ok(rangeOnlyDiffers('https://x.org/a?f=json&start=2023-11', 'https://x.org/a?f=json&start=2023-12'));
  assert.ok(rangeOnlyDiffers('https://fred.stlouisfed.org/graph/fredgraph.csv?id=IRLTLT01USM156N&cosd=2024-11-01', 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=IRLTLT01USM156N&cosd=2024-12-01'));
  assert.ok(!rangeOnlyDiffers('https://fred.stlouisfed.org/graph/fredgraph.csv?id=IRLTLT01USM156N&cosd=2024-11-01', 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=IRLTLT01AUM156N&cosd=2024-11-01'));
  assert.ok(!rangeOnlyDiffers('https://x.org/a?f=json', 'https://x.org/a?f=json&country=BR'));
  assert.ok(rangeOnlyDiffers('https://x.org/a?f=json', 'https://x.org/a?f=json&limit=13'));
});

replaySuite(recDir, 'recorded replies', 'no full recording here (it stays private; tests/recordedPublic.test.ts replays the public one): run `npm run record:feeds` on a computer that reaches the feeds');
