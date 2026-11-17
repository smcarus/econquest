/**
 * Which code is running: the version in package.json and the git commit it was built from, so a
 * citation, a flag or a replication pack names the exact code, not only "0.1.0".
 *
 * The commit comes from the build: Vite writes it into the web pages (__APP_COMMIT__, vite.config.ts),
 * and the server reads APP_COMMIT, which it sets from git at start-up or which the Docker image
 * carries (Dockerfile ARG APP_COMMIT). Empty when neither is known. Browser-safe.
 */
declare const __APP_COMMIT__: string | undefined;

const COMMIT = /^[0-9a-f]{7,40}$/i;

/** Short commit (12 characters), or '' when the build did not record one. */
export function appCommit(): string {
  let built = '';
  try {
    built = typeof __APP_COMMIT__ === 'string' ? __APP_COMMIT__ : '';
  } catch {
    built = '';
  }
  const fromEnv = typeof process !== 'undefined' && process.env ? process.env.APP_COMMIT ?? '' : '';
  const c = (built || fromEnv).trim();
  return COMMIT.test(c) ? c.slice(0, 12).toLowerCase() : '';
}

/** "0.1.0 (commit 1a2b3c4d5e6f)", or the version alone when the commit is unknown. */
export function versionWithCommit(version: string, commit: string = appCommit()): string {
  return commit ? `${version} (commit ${commit})` : version;
}
