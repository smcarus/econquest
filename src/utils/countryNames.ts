/**
 * Every country a person can pick in Add a country, with its name in the page's language.
 *
 * The list used to come from the world map's countries (src/data/worldCountries.ts), and that map
 * leaves out small countries, so Malawi, Sierra Leone, Haiti, Rwanda and most island states could
 * not be added at all. It now covers every ISO 3166 country (src/data/iso3166.ts) except the
 * uninhabited territories. Names come from the map's English names where it has one, otherwise
 * from the browser's own country names (Intl.DisplayNames), which also give the Spanish, French and
 * Portuguese names, so nothing extra is shipped.
 *
 * Browser-safe and pure apart from Intl.
 */
import { ISO3_COUNTRIES } from '../data/iso3166';
import { ISO3_TO_ISO2 } from '../data/iso3166Alpha2';
import { ISO_NUMERIC_TO_ISO3 } from '../data/worldCountries';
import type { Lang } from '../i18n/lang';

/** Codes left out: places with no permanent population, and the World Bank's second code for Kosovo (the app uses UVK). */
export const NOT_PICKABLE: ReadonlySet<string> = new Set(['ATA', 'BVT', 'HMD', 'SGS', 'UMI', 'IOT', 'ATF', 'XKX']);

const MAP_NAMES: ReadonlyMap<string, string> = new Map(Object.values(ISO_NUMERIC_TO_ISO3).map((c) => [c.iso3, c.name]));

function displayNames(lang: Lang): Intl.DisplayNames | null {
  try {
    return new Intl.DisplayNames([lang], { type: 'region' });
  } catch {
    return null;
  }
}

/** The English name the app stores and sends to the server for this country. */
export function englishCountryName(iso3: string, names = displayNames('en')): string {
  const fromMap = MAP_NAMES.get(iso3);
  if (fromMap) return fromMap;
  const iso2 = ISO3_TO_ISO2[iso3];
  const shown = iso2 && names ? names.of(iso2) : undefined;
  return shown && shown !== iso2 ? shown : iso3;
}

export interface PickableCountry {
  iso3: string;
  /** Name in the page's language, for the list. */
  name: string;
  /** English name, saved with the added country. */
  englishName: string;
}

/** Every pickable country, sorted by its name in the page's language. */
export function pickableCountries(lang: Lang): PickableCountry[] {
  const en = displayNames('en');
  const local = lang === 'en' ? en : displayNames(lang);
  const out: PickableCountry[] = [];
  for (const iso3 of ISO3_COUNTRIES) {
    if (NOT_PICKABLE.has(iso3)) continue;
    const englishName = englishCountryName(iso3, en);
    let name = englishName;
    if (lang !== 'en' && local) {
      const iso2 = ISO3_TO_ISO2[iso3];
      const shown = iso2 ? local.of(iso2) : undefined;
      if (shown && shown !== iso2) name = shown;
    }
    out.push({ iso3, name, englishName });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, lang));
}
