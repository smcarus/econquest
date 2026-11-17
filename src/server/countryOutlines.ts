/**
 * Country outlines for distance checks (I8 storm tracks), from the world-atlas package (Natural Earth
 * 1:50m, public domain; 1:10m for the few small islands missing at 1:50m). Server only: read from
 * node_modules when first asked, kept in memory.
 */
import { createRequire } from 'module';
import { feature } from 'topojson-client';
import { ISO_NUMERIC_TO_ALPHA3 } from '../data/isoNumeric';
import type { Outline } from '../utils/stormTracks';

const require = createRequire(import.meta.url);
const cache = new Map<string, Map<string, Outline>>();

function load(scale: '50m' | '10m'): Map<string, Outline> {
  const got = cache.get(scale);
  if (got) return got;
  const out = new Map<string, Outline>();
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const topo = require(`world-atlas/countries-${scale}.json`) as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fc = feature(topo, topo.objects.countries) as any;
    for (const f of fc.features) {
      const iso3 = ISO_NUMERIC_TO_ALPHA3[String(f.id)];
      const g = f.geometry;
      if (!iso3 || !g) continue;
      const polys: Outline = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
      if (polys.length) out.set(iso3, polys);
    }
  } catch {
    // package missing: no outlines
  }
  cache.set(scale, out);
  return out;
}

/** The country's outline, or null when world-atlas has none. */
export function countryOutline(iso3: string): Outline | null {
  const code = iso3.toUpperCase();
  return load('50m').get(code) ?? load('10m').get(code) ?? null;
}
