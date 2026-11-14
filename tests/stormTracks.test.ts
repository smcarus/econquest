import { test } from 'node:test';
import assert from 'node:assert/strict';
import { category, ibtracsParser, stormsNear, stormSentence, type Outline, type StormFile, type StormTrack } from '../src/utils/stormTracks';

// A 2 x 2 degree square island at the equator: lon 10-12, lat 0-2 (1 degree is about 111 km).
const island: Outline = [[[[10, 0], [12, 0], [12, 2], [10, 2], [10, 0]]]];
// Storms move west along a latitude; t = [lat, lon, wind] every 3 hours.
const track = (sid: string, season: number, lat: number, wind: number, stepDeg = 0.5): StormTrack => {
  const t: number[] = [];
  for (let lon = 16; lon >= 6; lon -= stepDeg) t.push(lat, lon, wind);
  return { sid, season, name: sid.toUpperCase(), basin: 'NI', t };
};

test('Saffir-Simpson categories from knots', () => {
  assert.deepEqual([20, 34, 63, 64, 83, 96, 113, 137].map(category), [-1, 0, 0, 1, 2, 3, 4, 5]);
});

test('parser reads the IBTrACS layout, skips the units line, old seasons and spur tracks', () => {
  const p = ibtracsParser('test.csv');
  const lines = [
    'SID,SEASON,NUMBER,BASIN,SUBBASIN,NAME,ISO_TIME,NATURE,LAT,LON,WMO_WIND,WMO_PRES,WMO_AGENCY,TRACK_TYPE,DIST2LAND,LANDFALL,IFLAG,USA_AGENCY,USA_ATCF_ID,USA_LAT,USA_LON,USA_RECORD,USA_STATUS,USA_WIND',
    ' ,Year, , , , , , ,degrees_north,degrees_east,kts,mb, , ,km,km, , , ,degrees_north,degrees_east, , ,kts',
    '1979001N10100,1979,1,NI,BB,OLD,1979-01-01 00:00:00,TS,10,100,50,990,,main,100,100,,,,,,,,55',
    '2001001N10100,2001,1,NI,BB,ABC,2001-01-01 00:00:00,TS,10.5,100.25,50,990,newdelhi,main,100,100,,,,,,,,55',
    '2001001N10100,2001,1,NI,BB,ABC,2001-01-01 03:00:00,TS,10.7,100.0,60,985,newdelhi,main,100,100,,,,,,,,',
    '2001001N10100,2001,1,NI,BB,ABC,2001-01-01 06:00:00,TS,10.9,99.8,,985,,main,100,100,,,,,,,,',
    '2001002N10100,2001,2,NI,BB,NOT_NAMED,2001-01-02 00:00:00,TS,11,90,,,,spur,100,100,,,,,,,,40',
    '2002002N10100,2002,2,WP,MM,NOT_NAMED,2002-01-02 00:00:00,TS,11,90,,,,main,100,100,,,,,,,,40',
  ];
  for (const l of lines) p.line(l);
  const f = p.done('2026-11-14T00:00:00Z') as StormFile;
  assert.equal(f.storms.length, 2);
  assert.equal(f.lastSeason, 2002);
  assert.deepEqual(f.storms[0].t, [10.5, 100.25, 55, 10.7, 100, 60, 10.9, 99.8, -1]);
  assert.equal(f.storms[0].name, 'ABC');
  assert.equal(f.storms[1].name, '');
  assert.equal(f.wmoWindPoints, 1);
  const bad = ibtracsParser('x.csv');
  bad.line('a,b,c');
  assert.match((bad.done('2026-01-01') as { reason: string }).reason, /columns/);
});

test('storms near a country: distance, strength, crossing, radius and fast storms', () => {
  const storms = [
    track('cross', 2001, 1, 100), // crosses the island, major
    track('near', 2002, 3, 80), // centre about 111 km north of the coast: hurricane, outside 100 km
    track('weak', 2003, 1, 30), // below tropical storm strength
    track('fast', 2004, -0.5, 50, 3), // 3 degrees between fixes, about 55 km south: filled in
    track('late', 2026, 1, 120), // after the last season counted
  ];
  const v = stormsNear(storms, island, 100, 2025);
  assert.deepEqual(v.list.map((s) => s.sid).sort(), ['cross', 'fast']);
  const cross = v.list.find((s) => s.sid === 'cross')!;
  assert.equal(cross.closestKm, 0);
  assert.equal(cross.category, 3);
  const fast = v.list.find((s) => s.sid === 'fast')!;
  assert.ok(Math.abs(fast.closestKm - 56) <= 2, String(fast.closestKm));
  assert.equal(v.seasons, 46);
  assert.deepEqual([v.storms, v.hurricanes, v.major, v.crossed], [2, 1, 1, 1]);
  assert.equal(v.majorEvery, 46);
  assert.equal(v.anyPct, Math.round((2 / 46) * 1000) / 10);
  assert.equal(v.years.find((y) => y.year === 2001)!.major, 1);
  const wide = stormsNear(storms, island, 200, 2025);
  assert.deepEqual(wide.strongest.map((s) => s.sid), ['cross', 'near', 'fast']);
  assert.equal(wide.list.find((s) => s.sid === 'near')!.closestKm, 111);
  assert.match(stormSentence(v, 'Isla'), /2 tropical storms or stronger passed within 100 km of Isla in the 46 seasons 1980-2025/);
});

test('an island on the 180th meridian', () => {
  const fiji: Outline = [[[[179, -17], [180, -17], [180, -16], [179, -16], [179, -17]]], [[[-180, -17], [-179, -17], [-179, -16], [-180, -16], [-180, -17]]]];
  const t: number[] = [];
  for (let lon = 175; lon <= 185; lon += 0.5) t.push(-16.5, lon > 180 ? lon - 360 : lon, 70);
  const v = stormsNear([{ sid: 'a', season: 2000, name: 'A', basin: 'SP', t }], fiji, 50, 2020);
  assert.equal(v.storms, 1);
  assert.equal(v.crossed, 1);
  // A storm at the antipode longitude band is far away.
  const t2: number[] = [];
  for (let lon = -10; lon <= 10; lon += 0.5) t2.push(-16.5, lon, 70);
  assert.equal(stormsNear([{ sid: 'b', season: 2000, name: 'B', basin: 'SA', t: t2 }], fiji, 200, 2020).storms, 0);
});
