import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COICOP2018, ECOICOP, eurostatGroups, groupsMinrUrl, groupsWeightsUrl, parseEurostatByCategory, partsGroups, weightsFor, NO_GROUP_SOURCE, NO_WEIGHTS_PARTS } from '../src/utils/priceGroups.ts';
import { imfGroupSeries, imfGroupWeights, imfGroupsKey, imfGroupsOn, matchImfGroups } from '../src/utils/imfCpiGroups.ts';
import type { ImfCpiStructure } from '../src/utils/imfCpi.ts';
import type { ImfSeries } from '../src/utils/imfReserves.ts';

/** A JSON-stat reply: dims freq, unit, coicop, geo, time (only coicop and time vary). */
function jsonStat(dim: string, data: Record<string, Record<string, number>>) {
  const cats = Object.keys(data);
  const times = [...new Set(cats.flatMap((c) => Object.keys(data[c])))].sort();
  const value: Record<string, number> = {};
  cats.forEach((c, ci) => times.forEach((t, ti) => {
    const v = data[c][t];
    if (v !== undefined) value[String(ci * times.length + ti)] = v;
  }));
  return {
    id: ['freq', 'unit', dim, 'geo', 'time'],
    size: [1, 1, cats.length, 1, times.length],
    value,
    dimension: {
      freq: { category: { index: { M: 0 } } },
      unit: { category: { index: { RCH_A: 0 } } },
      [dim]: { category: { index: Object.fromEntries(cats.map((c, i) => [c, i])) } },
      geo: { category: { index: { DE: 0 } } },
      time: { category: { index: Object.fromEntries(times.map((t, i) => [t, i])) } },
    },
  };
}

test('PY1 Eurostat URLs ask for every group in one request, in the matching classification', () => {
  const u = groupsMinrUrl('DE', '2024-01');
  assert.match(u, /prc_hicp_minr/);
  assert.match(u, /coicop18=TOTAL/);
  assert.match(u, /coicop18=CP13/);
  assert.match(groupsWeightsUrl('coicop2018', 'DE', 2025), /prc_hicp_inw.*coicop18=CP01/);
  assert.match(groupsWeightsUrl('ecoicop', 'DE', 2025), /prc_hicp_inw.*coicop=CP12/);
  assert.doesNotMatch(groupsWeightsUrl('ecoicop', 'DE', 2025), /CP13/);
});

test('PY1 parseEurostatByCategory reads several groups and refuses an ambiguous shape', () => {
  const j = jsonStat('coicop18', { CP01: { '2026-09': 2.1, '2026-10': 2.3 }, CP07: { '2026-10': -1.2 } });
  const r = parseEurostatByCategory(j, 'coicop18');
  assert.deepEqual(r.CP01, { '2026-09': 2.1, '2026-10': 2.3 });
  assert.deepEqual(r.CP07, { '2026-10': -1.2 });
  assert.deepEqual(parseEurostatByCategory({ ...j, size: [1, 2, 2, 1, 2] }, 'coicop18'), {});
  assert.deepEqual(parseEurostatByCategory(null, 'coicop18'), {});
});

test('PY1 eurostatGroups uses the 2018 classification with its own weights, as % of the basket', () => {
  const rates: Record<string, Record<string, number>> = { TOTAL: { '2026-10': 2.0 } };
  for (const c of Object.keys(COICOP2018)) rates[c] = { '2026-10': 1 + Number(c.slice(2)) / 10 };
  const weights: Record<string, Record<string, number>> = {};
  for (const c of Object.keys(COICOP2018)) weights[c] = { '2026': 1000 / 13 };
  const r = eurostatGroups('DEU', { minr: jsonStat('coicop18', rates), weights: jsonStat('coicop18', weights) });
  assert.ok(r.ok);
  assert.equal(r.classification, 'coicop2018');
  assert.equal(r.groups.length, 13);
  assert.equal(r.weightsYear, '2026');
  assert.equal(r.groups[0].weightPct, 7.69);
  assert.equal(r.groups[6].label, 'Transport');
  assert.deepEqual(r.headline, [{ period: '2026-10', value: 2 }]);
});

test('PY1 eurostatGroups falls back to the older classification and never borrows weights across them', () => {
  const rates: Record<string, Record<string, number>> = { CP00: { '2025-12': 2.4 } };
  for (const c of Object.keys(ECOICOP)) rates[c] = { '2025-12': 2 };
  const r = eurostatGroups('FRA', { minr: null, manr: jsonStat('coicop', rates), weights: null });
  assert.ok(r.ok);
  assert.equal(r.classification, 'ecoicop');
  assert.equal(r.groups.length, 12);
  assert.equal(r.groups[0].weightPct, undefined);
  assert.ok(r.missing.some((m) => /Official weights/.test(m)));
  assert.equal(eurostatGroups('FRA', { minr: null, manr: null }).ok, false);
});

test('PY1 weightsFor takes the newest year every group has, at or before the data year', () => {
  const w = weightsFor({ CP01: { '2025': 200, '2026': 210, '2027': 1 }, CP02: { '2025': 800, '2026': 790 } }, ['CP01', 'CP02'], 2026);
  assert.deepEqual(w, { year: '2026', pct: { CP01: 21, CP02: 79 } });
  assert.equal(weightsFor({ CP01: { '2026': 1 } }, ['CP01', 'CP02'], 2026), null);
});

test('PY1 partsGroups gives food, energy and the rest with no weights; no source reads Missing', () => {
  const r = partsGroups('USA', { rates: { headline: [{ period: '2026-10', value: 3 }], food: [{ period: '2026-10', value: 2 }], energy: [{ period: '2026-10', value: 5 }], core: [{ period: '2026-10', value: 3.1 }] }, labels: { headline: 'BLS' } });
  assert.ok(r.ok);
  assert.deepEqual(r.groups.map((g) => g.id), ['food', 'energy', 'rest']);
  assert.ok(r.groups.every((g) => g.weightPct === undefined));
  assert.ok(r.missing.includes(NO_WEIGHTS_PARTS));
  assert.deepEqual(partsGroups('GHA', null), { ok: false, reason: NO_GROUP_SOURCE });
});

const structure: ImfCpiStructure = {
  dims: [
    { id: 'COUNTRY', codes: [{ id: 'GHA', name: 'Ghana' }] },
    { id: 'INDEX_TYPE', codes: [{ id: 'CPI', name: 'Consumer price index (CPI)' }, { id: 'HICP', name: 'Harmonised index' }, { id: 'W', name: 'Weights' }] },
    { id: 'COICOP_1999', codes: [{ id: '_T', name: 'All Items' }, ...Object.entries(ECOICOP).map(([cp, name]) => ({ id: cp.replace('CP', 'CP_'), name: name.replace(' and ', ' & ') }))] },
    { id: 'TYPE_OF_TRANSFORMATION', codes: [{ id: 'IX', name: 'Index' }, { id: 'YOY_PCH_PA_PT', name: 'Year-over-year percent change' }] },
    { id: 'FREQUENCY', codes: [{ id: 'M', name: 'Monthly' }] },
  ],
};

test('PY1 IMF groups: matched by name, keyed by country and monthly y/y; off unless switched on', () => {
  const m = matchImfGroups(structure);
  assert.ok(m);
  assert.equal(m.dim, 'COICOP_1999');
  assert.equal(Object.keys(m.codes).length, 12);
  assert.equal(m.codes.CP07.id, 'CP_07');
  const k = imfGroupsKey(structure, m, 'GHA', 'yoy');
  assert.match(k.key, /^GHA\.CPI\.CP_01\+.*CP_12\.YOY_PCH_PA_PT\.M$/);
  const w = imfGroupsKey(structure, m, 'GHA', 'weight');
  assert.ok(w.ok);
  assert.match(w.key, /^GHA\.W\./);
  assert.equal(imfGroupsOn({}), false);
  assert.equal(imfGroupsOn({ IMF_CPI_GROUPS: 'on' }), true);
  assert.equal(matchImfGroups({ dims: [{ id: 'X', codes: [{ id: 'A', name: 'Food and non-alcoholic beverages' }] }] }), null);
});

test('PY1 IMF groups: series per group and weights as % of their sum', () => {
  const m = matchImfGroups(structure)!;
  const ser = (cp: string, obs: Array<[string, number]>, t = 'Year-over-year percent change'): ImfSeries => ({ key: `GHA.CPI.${cp}`, dims: { COICOP_1999: { id: cp, name: '' }, TYPE_OF_TRANSFORMATION: { id: 'T', name: t } }, obs: obs.map(([period, value]) => ({ period, value })) });
  const s = imfGroupSeries([ser('CP_01', [['2026-M09', 20]]), ser('CP_07', [['2026-09', 15]])], m);
  assert.deepEqual(Object.keys(s).sort(), ['CP01', 'CP07']);
  const w = imfGroupWeights([ser('CP_01', [['2025', 40]]), ser('CP_07', [['2025', 10]])], m, ['CP01', 'CP07'], 2026);
  assert.deepEqual(w, { year: '2025', pct: { CP01: 80, CP07: 20 } });
});
