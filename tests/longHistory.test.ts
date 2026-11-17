import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withLongCli, withLongCpi, withLongPolicy } from '../src/utils/longHistory';
import { countrySeries } from '../src/utils/seriesHistory';

test('policy rate chart starts where the long BIS history starts, recent month-ends from the latest pull', () => {
  const pull = {
    pulledAt: '2026-11-05T00:00:00Z',
    daily: { BR: { bank: 'Central Bank of Brazil', points: [{ period: '2026-11-04', pct: 15 }] } },
    monthly: { BR: { bank: 'Central Bank of Brazil', points: [{ period: '2024-10', pct: 10.75 }, { period: '2026-10', pct: 15 }] } },
  };
  const long = { BR: { points: [{ period: '1999-01', pct: 29 }, { period: '2024-10', pct: 99 }] }, XX: { points: [{ period: '2000-01', pct: 1 }] } };
  const out = withLongPolicy(pull, long)!;
  assert.deepEqual(out.monthly.BR.points.map((p) => p.period), ['1999-01', '2024-10', '2026-10']);
  assert.equal(out.monthly.BR.points[1].pct, 10.75, 'the overlap keeps the latest pull');
  assert.equal(out.monthly.BR.bank, 'Central Bank of Brazil');
  assert.equal(out.monthly.XX, undefined, 'areas the everyday pull lacks are not added');
  const set = countrySeries('BRA', { cbpol: out });
  const s = set.series.find((x) => x.id === 'policy_rate')!;
  assert.equal(s.points[0].date, '1999-01');
  assert.equal(withLongPolicy(pull, null), pull, 'no long file: unchanged');
});

test('leading indicator and OECD inflation reach back; inflation is not joined across definitions', () => {
  const cli = withLongCli({ pulledAt: 'x', series: { BRA: [{ period: '2023-07', value: 100 }] } }, { BRA: [{ period: '1990-01', value: 99 }, { period: '2023-07', value: 1 }] })!;
  assert.deepEqual(cli.series.BRA.map((p) => p.value), [99, 100]);
  const cpi = withLongCpi(
    { BRA: { basis: 'national', points: [{ period: '2024-01', value: 4 }] }, MEX: { basis: 'oecd_yoy', points: [{ period: '2024-01', value: 5 }] } },
    { BRA: { basis: 'oecd_yoy', points: [{ period: '2000-01', value: 7 }] }, MEX: { basis: 'oecd_yoy', points: [{ period: '2000-01', value: 9 }] } },
  )!;
  assert.equal(cpi.BRA.points.length, 1);
  assert.deepEqual(cpi.MEX.points.map((p) => p.period), ['2000-01', '2024-01']);
});
