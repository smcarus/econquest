import React, { useMemo } from 'react';
import { feature } from 'topojson-client';
import countriesTopoJson from 'world-atlas/countries-110m.json';
import { WatchlistItem } from '../types/council';
import { SOVEREIGN_CATALOG } from '../data/presetsAndBaselines';
import { ISO_NUMERIC_TO_ISO3 } from '../data/worldCountries';

export interface CountryMapFeatureInfo {
  numericId: string;
  iso3: string;
  countryName: string;
  svgPath: string;
  centroidX: number;
  centroidY: number;
  watchlistItem?: WatchlistItem;
}

export interface RegionalTheaterPreset {
  id: 'GLOBAL' | 'AMERICAS' | 'EUROPE_MENA' | 'MIDDLE_EAST_RED_SEA' | 'EAST_ASIA_MALACCA' | 'ACTIVE_SOVEREIGN';
  label: string;
  zoom: number;
  centerLat: number;
  centerLon: number;
}

export const REGIONAL_THEATER_PRESETS: RegionalTheaterPreset[] = [
  { id: 'GLOBAL', label: 'Global (1x)', zoom: 1, centerLat: 12, centerLon: 10 },
  { id: 'MIDDLE_EAST_RED_SEA', label: 'Middle East & Red Sea', zoom: 2.6, centerLat: 24, centerLon: 44 },
  { id: 'EUROPE_MENA', label: 'Europe & Black Sea', zoom: 2.4, centerLat: 47, centerLon: 18 },
  { id: 'EAST_ASIA_MALACCA', label: 'East Asia & Malacca', zoom: 2.3, centerLat: 22, centerLon: 116 },
  { id: 'AMERICAS', label: 'Americas', zoom: 1.85, centerLat: 5, centerLon: -72 },
];


function convertRingToSvgPath(
  ring: number[][],
  projectLatLon: (lat: number, lon: number) => { x: number; y: number }
): { path: string; sumX: number; sumY: number; count: number } {
  if (!ring || ring.length < 3) {
    return { path: '', sumX: 0, sumY: 0, count: 0 };
  }
  const parts: string[] = [];
  let prevLon: number | null = null;
  let sumX = 0;
  let sumY = 0;
  let count = 0;

  for (let i = 0; i < ring.length; i++) {
    const lon = ring[i][0];
    const lat = ring[i][1];
    // Skip Antarctica below -62 deg to keep the strategic map clean
    if (lat < -62) continue;

    const pt = projectLatLon(lat, lon);
    sumX += pt.x;
    sumY += pt.y;
    count += 1;

    // Antimeridian jump protection: if longitude jumps by > 160 degrees, start a new sub-path
    if (prevLon === null || Math.abs(lon - prevLon) > 160) {
      parts.push(`M${pt.x.toFixed(1)},${pt.y.toFixed(1)}`);
    } else {
      parts.push(`L${pt.x.toFixed(1)},${pt.y.toFixed(1)}`);
    }
    prevLon = lon;
  }

  if (parts.length < 3) {
    return { path: '', sumX: 0, sumY: 0, count: 0 };
  }

  return {
    path: `${parts.join(' ')} Z`,
    sumX,
    sumY,
    count,
  };
}

interface WorldCountryVectorLayerProps {
  activeIso3: string;
  watchlistItems?: WatchlistItem[];
  projectLatLon: (lat: number, lon: number) => { x: number; y: number };
  showRiskChoropleth?: boolean;
  zoomLevel?: number;
  hoveredIso3?: string | null;
  onHoverCountry?: (country: CountryMapFeatureInfo | null) => void;
  onSelectCountry?: (country: CountryMapFeatureInfo) => void;
}

export const WorldCountryVectorLayer: React.FC<WorldCountryVectorLayerProps> = ({
  activeIso3,
  watchlistItems = SOVEREIGN_CATALOG,
  projectLatLon,
  showRiskChoropleth = true,
  zoomLevel = 1,
  hoveredIso3,
  onHoverCountry,
  onSelectCountry,
}) => {
  // Build lookup map of all known sovereigns (active watchlist + SOVEREIGN_CATALOG)
  const sovereignLookup = useMemo(() => {
    const map = new Map<string, WatchlistItem>();
    for (const item of SOVEREIGN_CATALOG) {
      map.set(item.iso3.toUpperCase(), item);
    }
    for (const item of watchlistItems) {
      map.set(item.iso3.toUpperCase(), item);
    }
    return map;
  }, [watchlistItems]);

  // Extract and project all Natural Earth 110m country polygons
  const countryFeatures = useMemo<CountryMapFeatureInfo[]>(() => {
    const topo: any = countriesTopoJson;
    const geoCollection: any = feature(topo, topo.objects.countries);
    const features: any[] = geoCollection?.features || [];

    const result: CountryMapFeatureInfo[] = [];

    for (const feat of features) {
      const rawId = String(feat.id ?? '').padStart(3, '0');
      const mapped = ISO_NUMERIC_TO_ISO3[rawId];
      const propName = feat.properties?.name || mapped?.name || 'Sovereign Territory';
      const iso3 = mapped?.iso3 || propName.slice(0, 3).toUpperCase();

      // Skip Antarctica (010)
      if (rawId === '010' || propName === 'Antarctica') continue;

      const geom = feat.geometry;
      if (!geom) continue;

      const pathSegments: string[] = [];
      let totalX = 0;
      let totalY = 0;
      let totalPts = 0;

      if (geom.type === 'Polygon') {
        for (const ring of geom.coordinates) {
          const r = convertRingToSvgPath(ring, projectLatLon);
          if (r.path) {
            pathSegments.push(r.path);
            totalX += r.sumX;
            totalY += r.sumY;
            totalPts += r.count;
          }
        }
      } else if (geom.type === 'MultiPolygon') {
        for (const poly of geom.coordinates) {
          for (const ring of poly) {
            const r = convertRingToSvgPath(ring, projectLatLon);
            if (r.path) {
              pathSegments.push(r.path);
              totalX += r.sumX;
              totalY += r.sumY;
              totalPts += r.count;
            }
          }
        }
      }

      if (pathSegments.length === 0) continue;

      result.push({
        numericId: rawId,
        iso3,
        countryName: mapped?.name || propName,
        svgPath: pathSegments.join(' '),
        centroidX: totalPts > 0 ? totalX / totalPts : 0,
        centroidY: totalPts > 0 ? totalY / totalPts : 0,
        watchlistItem: sovereignLookup.get(iso3),
      });
    }

    return result;
  }, [projectLatLon, sovereignLookup]);

  const baseStrokeWidth = Math.max(0.32, 0.75 / Math.sqrt(Math.max(1, zoomLevel)));
  const activeStrokeWidth = Math.max(0.75, 1.55 / Math.sqrt(Math.max(1, zoomLevel)));

  return (
    <g className="world-country-vector-layer">
      {countryFeatures.map((c) => {
        const isActiveSovereign = c.iso3 === activeIso3;
        const isHovered = hoveredIso3 === c.iso3;
        const wItem = c.watchlistItem;

        // Determine country fill & border styling
        let fillClass =
          'fill-[#D6E0EC] dark:fill-[#0F1B2D] stroke-[#8FA1B8] dark:stroke-[#2A3B52]';

        if (isActiveSovereign) {
          fillClass =
            'fill-blue-500/45 dark:fill-blue-500/40 stroke-blue-700 dark:stroke-blue-400';
        } else if (showRiskChoropleth && wItem) {
          if (wItem.alertStatus === 'CRITICAL' || wItem.cds5YBps >= 300) {
            fillClass =
              'fill-rose-500/30 dark:fill-rose-500/30 stroke-rose-600/80 dark:stroke-rose-400/80';
          } else if (wItem.alertStatus === 'ELEVATED' || wItem.cds5YBps >= 140) {
            fillClass =
              'fill-amber-500/30 dark:fill-amber-500/25 stroke-amber-600/80 dark:stroke-amber-400/80';
          } else {
            fillClass =
              'fill-emerald-500/25 dark:fill-emerald-500/25 stroke-emerald-600/80 dark:stroke-emerald-400/80';
          }
        }

        if (isHovered && !isActiveSovereign) {
          fillClass =
            'fill-blue-500/35 dark:fill-blue-400/35 stroke-blue-600 dark:stroke-blue-300';
        }

        return (
          <path
            key={`${c.numericId}-${c.iso3}`}
            d={c.svgPath}
            fillRule="evenodd"
            strokeWidth={isActiveSovereign || isHovered ? activeStrokeWidth : baseStrokeWidth}
            strokeLinejoin="round"
            className={`transition-colors duration-150 ${fillClass} ${
              wItem ? 'cursor-pointer' : 'cursor-grab'
            }`}
            onMouseEnter={() => onHoverCountry && onHoverCountry(c)}
            onMouseLeave={() => onHoverCountry && onHoverCountry(null)}
            onClick={(e) => {
              if (onSelectCountry && wItem) {
                e.stopPropagation();
                onSelectCountry(c);
              }
            }}
          >
            <title>
              {wItem
                ? `${c.countryName} (${c.iso3}) · 5Y CDS: ${wItem.cds5YBps} bps · 10Y Yield: ${wItem.yield10YPct}% · Debt/GDP: ${wItem.debtToGdpPct}% · Click to select sovereign`
                : `${c.countryName} (${c.iso3})`}
            </title>
          </path>
        );
      })}
    </g>
  );
};
