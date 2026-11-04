import React, { useMemo } from 'react';
import { feature } from 'topojson-client';
import countriesTopoJson from 'world-atlas/countries-110m.json';
import { WatchlistItem } from '../types/council';
import { SOVEREIGN_CATALOG } from '../data/presetsAndBaselines';

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

// Comprehensive ISO-3166-1 numeric -> ISO-3 mapping for Natural Earth 110m countries
const ISO_NUMERIC_TO_ISO3: Record<string, { iso3: string; name: string }> = {
  '004': { iso3: 'AFG', name: 'Afghanistan' },
  '008': { iso3: 'ALB', name: 'Albania' },
  '012': { iso3: 'DZA', name: 'Algeria' },
  '024': { iso3: 'AGO', name: 'Angola' },
  '032': { iso3: 'ARG', name: 'Argentina' },
  '036': { iso3: 'AUS', name: 'Australia' },
  '040': { iso3: 'AUT', name: 'Austria' },
  '031': { iso3: 'AZE', name: 'Azerbaijan' },
  '050': { iso3: 'BGD', name: 'Bangladesh' },
  '112': { iso3: 'BLR', name: 'Belarus' },
  '056': { iso3: 'BEL', name: 'Belgium' },
  '068': { iso3: 'BOL', name: 'Bolivia' },
  '070': { iso3: 'BIH', name: 'Bosnia & Herzegovina' },
  '072': { iso3: 'BWA', name: 'Botswana' },
  '076': { iso3: 'BRA', name: 'Brazil' },
  '100': { iso3: 'BGR', name: 'Bulgaria' },
  '104': { iso3: 'MMR', name: 'Myanmar' },
  '116': { iso3: 'KHM', name: 'Cambodia' },
  '120': { iso3: 'CMR', name: 'Cameroon' },
  '124': { iso3: 'CAN', name: 'Canada' },
  '152': { iso3: 'CHL', name: 'Chile' },
  '156': { iso3: 'CHN', name: 'China' },
  '170': { iso3: 'COL', name: 'Colombia' },
  '178': { iso3: 'COG', name: 'Republic of the Congo' },
  '180': { iso3: 'COD', name: 'DR Congo' },
  '188': { iso3: 'CRI', name: 'Costa Rica' },
  '384': { iso3: 'CIV', name: 'Côte d’Ivoire' },
  '191': { iso3: 'HRV', name: 'Croatia' },
  '192': { iso3: 'CUB', name: 'Cuba' },
  '196': { iso3: 'CYP', name: 'Cyprus' },
  '203': { iso3: 'CZE', name: 'Czechia' },
  '208': { iso3: 'DNK', name: 'Denmark' },
  '214': { iso3: 'DOM', name: 'Dominican Republic' },
  '218': { iso3: 'ECU', name: 'Ecuador' },
  '818': { iso3: 'EGY', name: 'Egypt' },
  '222': { iso3: 'SLV', name: 'El Salvador' },
  '233': { iso3: 'EST', name: 'Estonia' },
  '231': { iso3: 'ETH', name: 'Ethiopia' },
  '246': { iso3: 'FIN', name: 'Finland' },
  '250': { iso3: 'FRA', name: 'France' },
  '266': { iso3: 'GAB', name: 'Gabon' },
  '268': { iso3: 'GEO', name: 'Georgia' },
  '276': { iso3: 'DEU', name: 'Germany' },
  '288': { iso3: 'GHA', name: 'Ghana' },
  '300': { iso3: 'GRC', name: 'Greece' },
  '304': { iso3: 'GRL', name: 'Greenland' },
  '320': { iso3: 'GTM', name: 'Guatemala' },
  '324': { iso3: 'GIN', name: 'Guinea' },
  '340': { iso3: 'HND', name: 'Honduras' },
  '348': { iso3: 'HUN', name: 'Hungary' },
  '352': { iso3: 'ISL', name: 'Iceland' },
  '356': { iso3: 'IND', name: 'India' },
  '360': { iso3: 'IDN', name: 'Indonesia' },
  '364': { iso3: 'IRN', name: 'Iran' },
  '368': { iso3: 'IRQ', name: 'Iraq' },
  '372': { iso3: 'IRL', name: 'Ireland' },
  '376': { iso3: 'ISR', name: 'Israel' },
  '380': { iso3: 'ITA', name: 'Italy' },
  '392': { iso3: 'JPN', name: 'Japan' },
  '400': { iso3: 'JOR', name: 'Jordan' },
  '398': { iso3: 'KAZ', name: 'Kazakhstan' },
  '404': { iso3: 'KEN', name: 'Kenya' },
  '408': { iso3: 'PRK', name: 'North Korea' },
  '410': { iso3: 'KOR', name: 'South Korea' },
  '414': { iso3: 'KWT', name: 'Kuwait' },
  '418': { iso3: 'LAO', name: 'Laos' },
  '428': { iso3: 'LVA', name: 'Latvia' },
  '422': { iso3: 'LBN', name: 'Lebanon' },
  '434': { iso3: 'LBY', name: 'Libya' },
  '440': { iso3: 'LTU', name: 'Lithuania' },
  '450': { iso3: 'MDG', name: 'Madagascar' },
  '458': { iso3: 'MYS', name: 'Malaysia' },
  '466': { iso3: 'MLI', name: 'Mali' },
  '484': { iso3: 'MEX', name: 'Mexico' },
  '496': { iso3: 'MNG', name: 'Mongolia' },
  '504': { iso3: 'MAR', name: 'Morocco' },
  '508': { iso3: 'MOZ', name: 'Mozambique' },
  '516': { iso3: 'NAM', name: 'Namibia' },
  '524': { iso3: 'NPL', name: 'Nepal' },
  '528': { iso3: 'NLD', name: 'Netherlands' },
  '554': { iso3: 'NZL', name: 'New Zealand' },
  '558': { iso3: 'NIC', name: 'Nicaragua' },
  '562': { iso3: 'NER', name: 'Niger' },
  '566': { iso3: 'NGA', name: 'Nigeria' },
  '578': { iso3: 'NOR', name: 'Norway' },
  '512': { iso3: 'OMN', name: 'Oman' },
  '586': { iso3: 'PAK', name: 'Pakistan' },
  '591': { iso3: 'PAN', name: 'Panama' },
  '598': { iso3: 'PNG', name: 'Papua New Guinea' },
  '600': { iso3: 'PRY', name: 'Paraguay' },
  '604': { iso3: 'PER', name: 'Peru' },
  '608': { iso3: 'PHL', name: 'Philippines' },
  '616': { iso3: 'POL', name: 'Poland' },
  '620': { iso3: 'PRT', name: 'Portugal' },
  '634': { iso3: 'QAT', name: 'Qatar' },
  '642': { iso3: 'ROU', name: 'Romania' },
  '643': { iso3: 'RUS', name: 'Russia' },
  '682': { iso3: 'SAU', name: 'Saudi Arabia' },
  '686': { iso3: 'SEN', name: 'Senegal' },
  '688': { iso3: 'SRB', name: 'Serbia' },
  '703': { iso3: 'SVK', name: 'Slovakia' },
  '705': { iso3: 'SVN', name: 'Slovenia' },
  '706': { iso3: 'SOM', name: 'Somalia' },
  '710': { iso3: 'ZAF', name: 'South Africa' },
  '728': { iso3: 'SSD', name: 'South Sudan' },
  '724': { iso3: 'ESP', name: 'Spain' },
  '144': { iso3: 'LKA', name: 'Sri Lanka' },
  '729': { iso3: 'SDN', name: 'Sudan' },
  '752': { iso3: 'SWE', name: 'Sweden' },
  '756': { iso3: 'CHE', name: 'Switzerland' },
  '760': { iso3: 'SYR', name: 'Syria' },
  '158': { iso3: 'TWN', name: 'Taiwan' },
  '834': { iso3: 'TZA', name: 'Tanzania' },
  '764': { iso3: 'THA', name: 'Thailand' },
  '788': { iso3: 'TUN', name: 'Tunisia' },
  '792': { iso3: 'TUR', name: 'Türkiye' },
  '795': { iso3: 'TKM', name: 'Turkmenistan' },
  '800': { iso3: 'UGA', name: 'Uganda' },
  '804': { iso3: 'UKR', name: 'Ukraine' },
  '784': { iso3: 'ARE', name: 'United Arab Emirates' },
  '826': { iso3: 'GBR', name: 'United Kingdom' },
  '840': { iso3: 'USA', name: 'United States' },
  '858': { iso3: 'URY', name: 'Uruguay' },
  '860': { iso3: 'UZB', name: 'Uzbekistan' },
  '862': { iso3: 'VEN', name: 'Venezuela' },
  '704': { iso3: 'VNM', name: 'Vietnam' },
  '887': { iso3: 'YEM', name: 'Yemen' },
  '894': { iso3: 'ZMB', name: 'Zambia' },
  '716': { iso3: 'ZWE', name: 'Zimbabwe' },
};

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
