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
];

export const API_KEY_IDS = API_KEY_FIELDS.map((f) => f.id);

export function apiKeyField(id: string): ApiKeyField | undefined {
  return API_KEY_FIELDS.find((f) => f.id === id);
}

