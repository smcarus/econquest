import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chokepointsUrl, chokepointWorldSeries, dailyAverage, parsePortWatchStats, partialNote, portActivitySeries, portsUrl } from '../src/utils/portWatch.ts';

const choke = {
  features: [
    { attributes: { portid: 'chokepoint1', year: 2026, month: 9, ships: 1200, volume: 3000000, lastday: 30 } },
    { attributes: { portid: 'chokepoint1', year: 2026, month: 10, SHIPS: 1240, volume: 3100000, LASTDAY: 31 } },
    { attributes: { portid: 'chokepoint1', year: 2026, month: 11, ships: 160, volume: 400000, lastday: 4 } },
    { attributes: { portid: 'chokepoint6', year: 2026, month: 10, ships: 3100, volume: null, lastday: 31 } },
    { attributes: { portid: 'chokepoint6', year: 2026, month: 13, ships: 1, volume: 1, lastday: 1 } },
    { attributes: { portid: 'chokepoint6', year: 2026, month: 9, ships: -5, lastday: 30 } },
  ],
};

test('PortWatch query URLs ask the layer for monthly sums', () => {
  const u = new URL(chokepointsUrl());
  assert.match(u.pathname, /Daily_Chokepoints_Data\/FeatureServer\/0\/query$/);
  assert.match(u.searchParams.get('where')!, /portid IN \('chokepoint1','chokepoint2'.*\) AND year >= 2019/);
  assert.equal(u.searchParams.get('groupByFieldsForStatistics'), 'portid,year,month');
  const stats = JSON.parse(u.searchParams.get('outStatistics')!);
  assert.deepEqual(stats.map((s: { outStatisticFieldName: string }) => s.outStatisticFieldName), ['ships', 'volume', 'lastday']);
  const p = new URL(portsUrl("bra'; drop"));
  assert.equal(p.searchParams.get('where'), "ISO3 = 'BRA' AND year >= 2019");
  assert.match(p.pathname, /Daily_Ports_Data/);
});

test('parsePortWatchStats reads months by chokepoint, ignoring case, bad months and negatives', () => {
  const m = parsePortWatchStats(choke, ['ships', 'volume']);
  assert.deepEqual([...m.keys()].sort(), ['chokepoint1', 'chokepoint6']);
  assert.deepEqual(m.get('chokepoint1')!.map((x) => x.month), ['2026-09', '2026-10', '2026-11']);
  assert.equal(m.get('chokepoint1')![1].sums.ships, 1240);
  assert.deepEqual(m.get('chokepoint6'), [{ month: '2026-10', lastDay: 31, sums: { ships: 3100 } }]);
  assert.equal(parsePortWatchStats({ error: { code: 400, message: 'Invalid query' } }, ['ships']).size, 0);
  assert.equal(parsePortWatchStats(null, ['ships']).size, 0);
});

test('daily averages divide by the days covered, so a partial month compares with full ones', () => {
  const months = parsePortWatchStats(choke, ['ships', 'volume']).get('chokepoint1')!;
  assert.deepEqual(dailyAverage(months, 'ships'), [
    { date: '2026-09', value: 40 },
    { date: '2026-10', value: 40 },
    { date: '2026-11', value: 40 },
  ]);
  assert.match(partialNote(months), /2026-11\) covers days 1 to 4 only/);
  assert.equal(partialNote(months.slice(0, 2)), '');
});

test('chokepoint world series: two per chokepoint, Missing with a reason when absent', () => {
  const byId = Object.fromEntries(parsePortWatchStats(choke, ['ships', 'volume']));
  const out = chokepointWorldSeries({ fetchedAt: '2026-11-08T00:00:00Z', byId });
  assert.equal(out.length, 16);
  const suez = out.find((s) => s.id === 'portwatch_suez_ships')!;
  assert.ok('points' in suez && suez.points.length === 3 && suez.unit === 'ships/day');
  const hormuzVol = out.find((s) => s.id === 'portwatch_hormuz_volume')!;
  assert.ok('reason' in hormuzVol && /no volume estimates/.test(hormuzVol.reason));
  const panama = out.find((s) => s.id === 'portwatch_panama_ships')!;
  assert.ok('reason' in panama && /no data for Panama Canal/.test(panama.reason));
  assert.ok(chokepointWorldSeries(null).every((s) => 'reason' in s && /not answered/.test(s.reason)));
  const refused = chokepointWorldSeries({ fetchedAt: 'x', byId: {}, reason: 'IMF PortWatch answered HTTP 403' });
  assert.ok(refused.every((s) => 'reason' in s && s.reason === 'IMF PortWatch answered HTTP 403'));
});

test('port activity: calls, imports and exports per day, or Missing for a country without ports', () => {
  const months = parsePortWatchStats(
    { features: [{ attributes: { year: 2026, month: 10, calls: 3100, imports: 31000000, exports: 62000000, lastday: 31 } }] },
    ['calls', 'imports', 'exports'],
  ).get('')!;
  const out = portActivitySeries('BRA', { iso3: 'BRA', fetchedAt: 'x', months });
  assert.deepEqual(out.map((s) => ('points' in s ? s.points[0].value : null)), [100, 1000000, 2000000]);
  const none = portActivitySeries('BOL', { iso3: 'BOL', fetchedAt: 'x', months: [] });
  assert.ok(none.every((s) => 'reason' in s && /landlocked/.test(s.reason)));
  assert.ok(portActivitySeries('BRA', null).every((s) => 'reason' in s));
});
