import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailyLine, dailyProgress, DAILY_PARTS } from '../src/utils/dailyProgress';

const now = new Date('2026-11-14T10:00:00Z');

test('a run in progress says which part it is on and what needs you', () => {
  const p = dailyProgress(
    {
      startedAt: '2026-11-14T09:30:00Z',
      downloadedBytes: 5e8,
      steps: [
        { id: 'feeds', label: 'Free feeds for every country', outcome: 'failed', note: '12 of 30 failed', details: ['Failed: IMF history: timed out', 'Needs setup: FRED: add your key'] },
        { id: 'weo', label: 'Past IMF WEO editions', outcome: 'done' },
      ],
    },
    now,
  );
  assert.equal(p.state, 'running');
  assert.equal(p.partsDone, 1);
  assert.equal(p.current, 2);
  assert.equal(p.failed, 1);
  assert.deepEqual(p.needsYou, ['FRED: add your key']);
  assert.match(dailyLine(p)!, new RegExp(`part 2 of ${DAILY_PARTS.length}`));
});

test('finished, stopped and no run say nothing at the top of the screen', () => {
  assert.equal(dailyLine(dailyProgress({ startedAt: '2026-11-14T08:00:00Z', finishedAt: '2026-11-14T09:00:00Z', steps: [] }, now)), null);
  const stopped = dailyProgress({ startedAt: '2026-11-13T08:00:00Z', steps: [] }, now);
  assert.equal(stopped.state, 'stopped');
  assert.equal(dailyLine(stopped), null);
  assert.equal(dailyProgress(null, now).state, 'none');
});
