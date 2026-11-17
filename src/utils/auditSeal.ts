/**
 * Audit seal (console integration item 10). Each audit entry already carries a SHA-256 hash chained
 * to the one before it, so a changed or removed line shows. What the chain alone cannot show is
 * someone with the file rewriting the whole chain from some point on. The seal closes that: with
 * AUDIT_SEAL_KEY set, every new entry also gets an HMAC-SHA256 of its hash under that key, which
 * only someone holding the key can make. Keep the key somewhere other than the data folder (the
 * server's environment, a secrets manager); a copy of the log in a locked bucket
 * (src/server/auditBucket.ts) covers the case where the key leaks too.
 *
 * The seal is written beside the hash and is not part of it, so older entries still check, and
 * entries written while no key was set read as "not sealed", never as broken.
 *
 * Server only (node:crypto).
 */
import { createHash, createHmac, timingSafeEqual } from 'crypto';

/** At least 32 characters, so the key is not something guessable. */
export const SEAL_KEY_MIN = 32;

export interface SealKey {
  /** First 12 hex characters of SHA-256 of the key: tells keys apart, gives nothing away. */
  id: string;
  key: string;
}

export function sealKeyProblem(key: string | undefined): string | null {
  if (!key) return null;
  return key.length < SEAL_KEY_MIN ? `AUDIT_SEAL_KEY must be at least ${SEAL_KEY_MIN} characters; the audit log is not being sealed.` : null;
}

export function sealKeyFrom(key: string | undefined): SealKey | null {
  const k = (key || '').trim();
  if (!k || sealKeyProblem(k)) return null;
  return { id: createHash('sha256').update(k).digest('hex').slice(0, 12), key: k };
}

export function sealOf(key: SealKey, hash: string): string {
  return createHmac('sha256', key.key).update(`eq-audit-seal:v1:${hash}`).digest('hex');
}

export interface SealCheck {
  /** Whether a key is set on this server. */
  keySet: boolean;
  keyId?: string;
  sealed: number;
  /** Entries with no seal (written before a key was set, or while it was not). */
  unsealed: number;
  /** Entries sealed with another key (rotated): counted, not checked. */
  otherKey: number;
  /** Unsealed entries that come after a sealed one: the key was taken away, or seals were stripped. */
  unsealedAfterSealed: number;
  ok: boolean;
  /** The first entry whose seal does not match. */
  badSeq?: number;
  problem?: string;
}

/** Checks the seals of entries (already chain-checked). An entry sealed with this key must match. */
export function checkSeals(entries: Array<{ seq: number; hash: string; seal?: string; sealKey?: string }>, key: SealKey | null): SealCheck {
  const out: SealCheck = { keySet: !!key, ...(key ? { keyId: key.id } : {}), sealed: 0, unsealed: 0, otherKey: 0, unsealedAfterSealed: 0, ok: true };
  let seenSeal = false;
  for (const e of entries) {
    if (!e.seal) {
      out.unsealed += 1;
      if (seenSeal) out.unsealedAfterSealed += 1;
      continue;
    }
    seenSeal = true;
    if (!key || e.sealKey !== key.id) {
      out.otherKey += 1;
      continue;
    }
    const want = Buffer.from(sealOf(key, e.hash), 'hex');
    const got = Buffer.from(String(e.seal), 'hex');
    if (want.length !== got.length || !timingSafeEqual(want, got)) {
      return { ...out, ok: false, badSeq: e.seq, problem: `entry ${e.seq} has a seal that does not match: the log was rewritten from there by someone without the key` };
    }
    out.sealed += 1;
  }
  return out;
}
