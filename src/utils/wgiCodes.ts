/**
 * World Bank Worldwide Governance Indicators on the World Bank API (api.worldbank.org/v2).
 *
 * The API stopped serving the old codes (VA.EST, PV.EST, GE.EST, RQ.EST, RL.EST, CC.EST): a request
 * for them answers "The indicator was not found. It may have been deleted or archived" (seen in the
 * replies recorded on 5 November 2026, and in the owner's run of 22 November, where all six failed).
 * Since the 2025 WGI revision the same estimates are published as GOV_WGI_<code> (for example
 * GOV_WGI_GE.EST, data.worldbank.org/indicator/GOV_WGI_GE.EST), in the WGI source (source 3).
 * Readers try the new address first, then the same code without the source, then the old code, and
 * take the first reply that holds data, so a further change on the World Bank side shows as Missing
 * with the reason rather than a wrong figure. Browser-safe, pure.
 */
export const WGI_SOURCE_ID = 3;

/** True for one of the six WGI estimate codes as the app names them (VA.EST ... CC.EST). */
export const isWgiCode = (code: string) => /^(VA|PV|GE|RQ|RL|CC)\.EST$/.test(code);

/** The indicator paths to try for a WGI code, newest first: `<indicator>?<source query>`. */
export function wgiIndicatorTries(code: string): Array<{ indicator: string; source: string }> {
  return [
    { indicator: `GOV_WGI_${code}`, source: `source=${WGI_SOURCE_ID}&` },
    { indicator: `GOV_WGI_${code}`, source: '' },
    { indicator: code, source: '' },
  ];
}

/** Every address to try for one WGI code and one country path ("BRA", "all"), with the rest of the query. */
export function wgiUrls(countryPath: string, code: string, query: string): string[] {
  return wgiIndicatorTries(code).map((t) => `https://api.worldbank.org/v2/country/${countryPath}/indicator/${t.indicator}?${t.source}${query}`);
}

/** True when a World Bank API reply carries data rows (not the "indicator was not found" message). */
export function wbReplyHasRows(json: unknown): boolean {
  return Array.isArray(json) && json.length >= 2 && Array.isArray(json[1]);
}
