/**
 * The scopes an API token can have, as the Settings screen lists them (console integration item 2).
 * Browser-safe; the server side is src/utils/apiTokens.ts.
 */
export const SCOPES = ['read:data', 'read:council', 'read:events', 'write:holdings', 'write:exclusions', 'run:scenarios'] as const;
export type Scope = (typeof SCOPES)[number];

export const SCOPE_LABEL: Record<Scope, string> = {
  'read:data': 'Read figures and series',
  'read:council': 'Read council runs',
  'read:events': 'Receive events and set watches',
  'write:holdings': 'Send positions',
  'write:exclusions': 'Set hidden names',
  'run:scenarios': 'Run scenarios on a portfolio',
};

/** What the legacy integration key may do: what it could do before tokens existed. */
export const LEGACY_SCOPES: readonly Scope[] = ['read:data', 'read:council', 'read:events'];

/** A token as Settings lists it: name, scopes and dates, never the secret or its hash. */
export interface PublicTokenView {
  id: string;
  name: string;
  scopes: Scope[];
  hint: string;
  createdAt: string;
  createdBy: string;
  lastUsedAt?: string;
  revokedAt?: string;
  revokedBy?: string;
  active: boolean;
}
