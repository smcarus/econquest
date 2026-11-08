/**
 * Prints what the IMF data API actually holds for the datasets the app reads (IL, BOP, COFER, CPI),
 * so the name matching in src/utils/imfReserves.ts, imfCofer.ts and imfCpi.ts can be checked
 * against the live codes. Run on a computer that can reach api.imf.org:
 *
 *   npm run check:imf
 *
 * Needs no key and no running server. Prints dimension order, the indicator codes whose IMF names
 * look relevant, and a few Brazil (or world) series keys with their names.
 */
import { IMF_MEASURES, getJson, imfDataUrl, imfStructureUrl, matchIndicators, parseImfData, parseImfStructure, pickSeries, seriesKey, labelOf } from '../src/utils/imfReserves.ts';
import { WORLD_IDS, coferKey, findWorldCode, describeSeries } from '../src/utils/imfCofer.ts';
import { imfCpiDataUrl, imfCpiKey, imfCpiStructureUrl, parseImfCpiStructure, pickImfCpiSeries } from '../src/utils/imfCpi.ts';

const fetchFn = (u: string, i?: RequestInit) => fetch(u, i);
const LOOK: Record<string, RegExp> = {
  IL: /reserve/i,
  BOP: /current account|goods and services|^goods\b|^services\b|direct investment|portfolio investment|other investment|financial account/i,
  COFER: /./,
};

for (const flow of ['IL', 'BOP', 'COFER']) {
  console.log(`\n=== ${flow}`);
  const r = await getJson(fetchFn, imfStructureUrl(flow), 60000);
  if (!r.json) {
    console.log(`structure: ${r.error}`);
    continue;
  }
  const s = parseImfStructure(flow, r.json);
  if (!s) {
    const data = (r.json as { data?: Record<string, unknown> }).data ?? {};
    console.log(`structure answered but was not read. Top-level keys: ${Object.keys(data).join(', ')}`);
    continue;
  }
  console.log(`dimensions: ${s.dims.join('.')}  (indicator: ${s.indicatorDim}, country: ${s.countryDim ?? '-'}, frequency: ${s.freqDim ?? '-'})`);
  console.log(`indicator codes: ${s.indicators.length}; country codes in structure: ${s.countryCodes?.length ?? 0}`);
  const hits = s.indicators.filter((c) => LOOK[flow].test(c.name)).slice(0, 40);
  for (const c of hits) console.log(`  ${c.id}  ${c.name}`);
  if (flow === 'COFER') {
    const w = findWorldCode(s);
    console.log(`world code by name: ${w ? `${w.id} (${w.name})` : 'none'}`);
    for (const id of w ? [w.id] : WORLD_IDS) {
      const d = await getJson(fetchFn, imfDataUrl(flow, coferKey(s, id)), 60000);
      const series = d.json ? parseImfData(d.json) : [];
      console.log(`data ${id}: ${d.error ?? `${series.length} series`}`);
      if (series.length) {
        console.log(`  ${describeSeries(series, 12)}`);
        break;
      }
    }
    continue;
  }
  for (const m of Object.values(IMF_MEASURES).filter((x) => x.flow === flow)) {
    const codes = matchIndicators(s, m);
    console.log(`\n${m.label}: matched ${codes.length ? codes.map((c) => `${c.id} ("${c.name}")`).join(', ') : 'nothing'}`);
    if (!codes.length) continue;
    const key = seriesKey(s, 'BRA', m.freq, codes.map((c) => c.id));
    const d = await getJson(fetchFn, imfDataUrl(flow, key), 60000);
    const series = d.json ? parseImfData(d.json) : [];
    console.log(`  data ${key}: ${d.error ?? `${series.length} series`}`);
    for (const x of series.slice(0, 8)) {
      const last = x.obs[x.obs.length - 1];
      console.log(`    ${x.key}  scale ${x.scale ?? '?'}  last ${last ? `${last.period} ${last.value}` : '-'}  [${labelOf(x)}]`);
    }
    const p = pickSeries(series, m);
    console.log(`  picked: ${p ? p.key : 'none'}`);
  }
}

// ---- CPI (monthly consumer prices, src/utils/imfCpi.ts) ----------------------------------------
{
  console.log('\n=== CPI');
  const r = await getJson(fetchFn, imfCpiStructureUrl(), 60000);
  const s = r.json ? parseImfCpiStructure(r.json) : null;
  if (!s) console.log(`structure: ${r.error ?? 'answered but was not read'}`);
  else {
    console.log(`dimensions: ${s.dims.map((d) => `${d.id} (${d.codes.length} codes)`).join('.')}`);
    for (const d of s.dims.filter((x) => x.codes.length && x.codes.length < 400 && !/COUNTRY|REF_AREA/.test(x.id))) {
      const hits = d.codes.filter((c) => /consumer price|all items|^total|year|percent change|index/i.test(c.name)).slice(0, 15);
      for (const c of hits) console.log(`  ${d.id} ${c.id}  ${c.name}`);
    }
    for (const iso3 of ['USA', 'IND', 'BRA']) {
      const k = imfCpiKey(s, iso3);
      const d = await getJson(fetchFn, imfCpiDataUrl(k.key), 60000);
      const series = d.json ? parseImfData(d.json) : [];
      console.log(`\n${iso3} key ${k.key} (${k.picked.join(', ') || 'nothing matched'}): ${d.error ?? `${series.length} series`}`);
      for (const x of series.slice(0, 6)) {
        const last = x.obs[x.obs.length - 1];
        console.log(`    ${x.key}  last ${last ? `${last.period} ${last.value}` : '-'}`);
      }
      console.log(`  picked: ${pickImfCpiSeries(series)?.key ?? 'none'}`);
    }
  }
}
