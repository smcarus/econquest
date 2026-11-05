import { isValidEvdsSeriesCode } from '../utils/officialYields';

/**
 * The keys you can enter in Menu > Settings > Data API keys. Browser-safe (no Node imports): the
 * server's storage lives in src/utils/userSettings.ts. Add an entry here to add a key to Settings.
 */
export interface ApiKeyField {
  /** The .env name, also the id used by the app and the endpoints. */
  id: string;
  label: string;
  provider: string;
  /** What the key changes in the app, in plain words. */
  feeds: string;
  /** What happens without it. */
  withoutIt: string;
  getKeyUrl: string;
  getKeySteps: string;
  /** Connection check row that tests this key. */
  checkId: string;
  /** False for settings that are not secret (a series code, a file path): shown in full. Default true. */
  secret?: boolean;
  /** Returns an error sentence, or null when the value looks right. */
  validate: (value: string) => string | null;
}

export const API_KEY_FIELDS: ApiKeyField[] = [
  {
    id: 'FRED_API_KEY',
    label: 'FRED API key',
    provider: 'Federal Reserve Bank of St. Louis (FRED)',
    feeds: '10-year government bond yields for the US, Mexico, South Africa, Japan, the UK, Poland and Chile, through the official FRED API.',
    withoutIt: 'Without a key the app reads the same yields from the FRED download, which needs no key but is less steady.',
    getKeyUrl: 'https://fred.stlouisfed.org/docs/api/api_key.html',
    getKeySteps: 'Free. Sign in at fred.stlouisfed.org, then My Account > API Keys > Request API Key.',
    checkId: 'fred_api',
    // FRED documents the key as a 32 character lower-case alphanumeric string.
    validate: (v) => (/^[a-z0-9]{32}$/.test(v) ? null : 'A FRED key is 32 lower-case letters and digits. Check it was copied in full.'),
  },
  {
    id: 'EIA_API_KEY',
    label: 'US EIA API key',
    provider: 'US Energy Information Administration (EIA open data)',
    feeds: 'Daily Brent and WTI spot oil prices, used in the commodity and Hormuz spillover lines.',
    withoutIt: 'Without a key oil prices come monthly from the World Bank Pink Sheet.',
    getKeyUrl: 'https://www.eia.gov/opendata/register.php',
    getKeySteps: 'Free. Register at eia.gov/opendata with your email; the key arrives by email.',
    checkId: 'eia',
    validate: (v) => (/^[A-Za-z0-9]{20,64}$/.test(v) ? null : 'An EIA key is a run of letters and digits (usually 40). Check it was copied in full.'),
  },
  {
    id: 'COMTRADE_API_KEY',
    label: 'UN Comtrade subscription key',
    provider: 'United Nations Comtrade',
    feeds: 'Trade partner shares (China, Taiwan, Russia, Gulf) and export mix, used on the Country tab and in the spillover scenarios.',
    withoutIt: 'Without a key the app uses the public preview, which answers but allows few requests.',
    getKeyUrl: 'https://comtradedeveloper.un.org/',
    getKeySteps: 'Free. Sign in at comtradeplus.un.org, then My Comtrade > My API portal, subscribe to "comtrade - v1" and copy the primary key.',
    checkId: 'comtrade',
    validate: (v) => (/^[A-Za-z0-9]{16,64}$/.test(v) ? null : 'A Comtrade key is a run of letters and digits (usually 32). Check it was copied in full.'),
  },
  {
    id: 'EVDS_API_KEY',
    label: 'Turkey central bank (EVDS) API key',
    provider: 'Central Bank of the Republic of Türkiye (EVDS)',
    feeds: "Turkey's 10-year government bond yield. Needs the 10Y series code below as well.",
    withoutIt: "Without it Turkey's 10Y yield reads Missing.",
    getKeyUrl: 'https://evds3.tcmb.gov.tr/',
    getKeySteps: 'Free. Register at evds3.tcmb.gov.tr, sign in, then open your profile and copy the API key.',
    checkId: 'evds',
    validate: (v) => (/^[A-Za-z0-9]{6,64}$/.test(v) ? null : 'An EVDS key is a run of letters and digits. Check it was copied in full.'),
  },
  {
    id: 'EVDS_TR10Y_SERIES',
    label: 'Turkey 10Y series code (EVDS)',
    provider: 'Central Bank of the Republic of Türkiye (EVDS)',
    feeds: 'Which EVDS series holds the 10-year bond yield. Not secret, shown in full.',
    withoutIt: "Without it Turkey's 10Y yield reads Missing, even with a key.",
    getKeyUrl: 'https://evds3.tcmb.gov.tr/',
    getKeySteps: 'Signed in to EVDS, find the 10-year government bond yield series and copy its code (it starts with "TP.").',
    checkId: 'evds',
    secret: false,
    validate: (v) => (isValidEvdsSeriesCode(v) ? null : 'An EVDS series code starts with "TP." followed by letters, digits and dots, for example TP.ABC.D10.'),
  },
];

export const API_KEY_IDS = API_KEY_FIELDS.map((f) => f.id);

export function apiKeyField(id: string): ApiKeyField | undefined {
  return API_KEY_FIELDS.find((f) => f.id === id);
}

