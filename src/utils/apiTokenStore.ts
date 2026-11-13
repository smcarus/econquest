/**
 * File storage for API tokens (server only): data/local/api-tokens.json, mode 600, written
 * atomically. Holds names, scopes, dates and SHA-256 hashes, never a secret. Not part of backups
 * (src/utils/backup.ts lists what is), so a backup file can never carry a way in.
 */
import fs from 'fs';
import path from 'path';
import { timingSafeEqual } from 'crypto';
import { writeFileAtomic } from './atomicWrite';
import {
  MAX_TOKENS,
  hashSecret,
  isScope,
  newSecret,
  newTokenId,
  scopesProblem,
  tokenIdFrom,
  tokenNameProblem,
  type ApiToken,
  type Scope,
} from './apiTokens';

export function apiTokensFile(dataDir: string): string {
  return path.join(dataDir, 'local', 'api-tokens.json');
}

/** Last-used times are written at most this often per token, so a busy client does not rewrite the file on every call. */
const LAST_USED_EVERY_MS = 60_000;

export class ApiTokenStore {
  private tokens: ApiToken[] | null = null;

  constructor(private readonly file: string) {}

  private load(): ApiToken[] {
    if (this.tokens) return this.tokens;
    try {
      const parsed = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      this.tokens = Array.isArray(parsed?.tokens)
        ? parsed.tokens.filter((t: ApiToken) => t && typeof t.id === 'string' && typeof t.hash === 'string' && Array.isArray(t.scopes)).map((t: ApiToken) => ({ ...t, scopes: t.scopes.filter(isScope) }))
        : [];
    } catch {
      this.tokens = [];
    }
    return this.tokens!;
  }

  private save(): void {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    writeFileAtomic(this.file, JSON.stringify({ tokens: this.load() }, null, 1));
    try {
      fs.chmodSync(this.file, 0o600);
    } catch {
      /* not every file system keeps modes */
    }
  }

  list(): ApiToken[] {
    return [...this.load()];
  }

  /** Make a token; the secret is returned once and never kept. */
  create(input: { name: unknown; scopes: unknown; createdBy: string }): { token: ApiToken; secret: string } | { error: string } {
    const problem = tokenNameProblem(input.name) || scopesProblem(input.scopes);
    if (problem) return { error: problem };
    const active = this.load().filter((t) => !t.revokedAt);
    if (active.length >= MAX_TOKENS) return { error: `There are already ${MAX_TOKENS} active tokens. Revoke one you no longer use first.` };
    const name = String(input.name).trim();
    if (active.some((t) => t.name.toLowerCase() === name.toLowerCase())) return { error: `An active token is already called "${name}".` };
    const id = newTokenId();
    const secret = newSecret(id);
    const scopes = [...new Set(input.scopes as Scope[])];
    const token: ApiToken = { id, name, scopes, hash: hashSecret(secret), hint: secret.slice(0, 12), createdAt: new Date().toISOString(), createdBy: input.createdBy };
    this.load().push(token);
    this.save();
    return { token, secret };
  }

  revoke(id: string, by: string): ApiToken | null {
    const t = this.load().find((x) => x.id === id);
    if (!t) return null;
    if (!t.revokedAt) {
      t.revokedAt = new Date().toISOString();
      t.revokedBy = by;
      this.save();
    }
    return t;
  }

  /** The active token a secret belongs to, or null. Compared in constant time. */
  resolve(secret: string, now: Date = new Date()): ApiToken | null {
    const id = tokenIdFrom(secret);
    if (!id) return null;
    const t = this.load().find((x) => x.id === id);
    if (!t || t.revokedAt) return null;
    const a = Buffer.from(hashSecret(secret), 'hex');
    const b = Buffer.from(t.hash, 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const last = t.lastUsedAt ? Date.parse(t.lastUsedAt) : 0;
    if (now.getTime() - last > LAST_USED_EVERY_MS) {
      t.lastUsedAt = now.toISOString();
      try {
        this.save();
      } catch {
        /* a read-only moment must not refuse a valid token */
      }
    }
    return t;
  }
}
