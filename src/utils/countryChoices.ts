/**
 * Country pickers (Research > One country, Policy review) list the active watchlist first, then
 * every other country the app already covers (the built-in list, the lower-income countries and
 * any the user added), so a country is never out of reach just because another watchlist is open.
 * Hidden countries (Menu > Settings > Hidden names) stay out of both lists.
 */
export function otherCountries<T extends { iso3: string; countryName: string }>(onList: T[], all: T[], hidden?: Set<string>): T[] {
  const on = new Set(onList.map((c) => c.iso3));
  const seen = new Set<string>();
  return all
    .filter((c) => {
      if (on.has(c.iso3) || hidden?.has(c.iso3) || seen.has(c.iso3)) return false;
      seen.add(c.iso3);
      return true;
    })
    .sort((a, b) => a.countryName.localeCompare(b.countryName));
}
