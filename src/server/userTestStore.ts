/**
 * Your own registered tests (plan item L4a), kept apart from the app's: one frozen file per test in
 * data/local/validation/user-tests/, with a manifest of SHA-256 fingerprints written at the moment of
 * saving. A file is never overwritten; a test whose bytes no longer match its fingerprint is refused
 * when read (src/utils/backtestRun.ts loadSpecs), exactly as the app's own tests are.
 */
import fs from 'fs';
import path from 'path';
import { writeFileAtomic } from '../utils/atomicWrite';
import { loadSpecs, sha256, type LoadedSpec } from '../utils/backtestRun';
import { userTestJson, type UserTestSpec } from '../utils/userTests';

export const userTestDir = (dataDir: string) => path.join(dataDir, 'local', 'validation', 'user-tests');

export function listUserTests(dir: string): LoadedSpec[] {
  return fs.existsSync(dir) ? loadSpecs(dir) : [];
}

/** Saves and freezes a test. Refuses an id already used: a changed idea is a new test with a new name. */
export function registerUserTest(dir: string, spec: UserTestSpec): { ok: true; file: string; hash: string } | { ok: false; error: 'exists' } {
  const file = `${spec.id}.json`;
  const full = path.join(dir, file);
  const manifestFile = path.join(dir, 'manifest.json');
  let manifest: { files: Record<string, string> } = { files: {} };
  try {
    manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    if (!manifest?.files || typeof manifest.files !== 'object') manifest = { files: {} };
  } catch {
    // first test: no manifest yet
  }
  if (fs.existsSync(full) || manifest.files[file]) return { ok: false, error: 'exists' };
  const text = userTestJson(spec);
  const hash = sha256(text);
  writeFileAtomic(full, text);
  writeFileAtomic(manifestFile, `${JSON.stringify({ files: { ...manifest.files, [file]: hash } }, null, 2)}\n`);
  return { ok: true, file, hash };
}
