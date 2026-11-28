/**
 * Sealed hand-in files (roadmap Phase 5, Q9) for students who work on their own copy of the app
 * instead of the class's server. The teacher downloads a hand-in sheet for an assignment: the Quest,
 * the due time, the rule on AI tools and the class's public key. On their own copy the student opens
 * the sheet (Menu > Quests > Hand in), writes their answer and seals it: the answer is locked with
 * a fresh AES-256-GCM key, and that key with the class's RSA-OAEP public key, so only the teacher's
 * copy can open the file and any change to it is detected. The teacher loads the file into the class
 * and it becomes the student's entry. The time inside the file comes from the student's computer,
 * so it is shown as such; the teacher can compare it with when the file arrived.
 *
 * Browser-safe: sealing uses Web Crypto (globalThis.crypto.subtle), in the browser and in Node.
 * Opening the file is server-only (src/server/routes/classes.ts).
 */
import type { AiRule } from './classAssignments';

export const SHEET_KIND = 'econquest-hand-in-sheet';
export const SEALED_KIND = 'econquest-hand-in';
export const SEAL_ALG = 'RSA-OAEP-256+A256GCM';
/** A sealed file is small; anything larger is refused before it is opened. */
export const SEALED_MAX_BYTES = 64_000;

export interface HandInSheet {
  kind: typeof SHEET_KIND;
  version: 1;
  sheetId: string;
  classId: string;
  className: string;
  assignmentId: string;
  title: string;
  summary: string;
  instructions: string;
  due: string;
  dueUtc: string;
  timeZone: string;
  aiRule: AiRule;
  answerKind: 'probability' | 'level' | 'position' | 'value';
  positions?: string[];
  questId: string;
  questVersion: number;
  questHash: string;
  closesOn: string;
  /** The class's RSA-OAEP public key, SPKI DER in base64. */
  publicKey: string;
}

/** What the student writes; sealed inside the file. */
export interface HandInPayload {
  username: string;
  name: string;
  answer: Record<string, number>;
  rationale?: string;
  code?: string;
  aiNote?: string;
  aiDeclaredNone?: boolean;
  /** From the student's computer. */
  sealedAt: string;
  sheetId: string;
  questHash: string;
}

export interface SealedHandIn {
  kind: typeof SEALED_KIND;
  version: 1;
  alg: typeof SEAL_ALG;
  sheetId: string;
  classId: string;
  assignmentId: string;
  /** The AES key, locked with the class's public key (base64). */
  key: string;
  iv: string;
  /** The payload, locked with the AES key; the last 16 bytes are the GCM tag (base64). */
  data: string;
}

const str = (v: unknown, max: number) => typeof v === 'string' && v.length > 0 && v.length <= max;

export function sheetProblems(x: unknown): string[] {
  const s = x as Partial<HandInSheet> | null;
  if (!s || typeof s !== 'object' || s.kind !== SHEET_KIND || s.version !== 1) return ['This is not a hand-in sheet from EconQuest'];
  const p: string[] = [];
  for (const k of ['sheetId', 'classId', 'assignmentId', 'title', 'questId', 'questHash', 'due', 'dueUtc', 'publicKey'] as const) if (!str(s[k], k === 'publicKey' ? 2000 : 400)) p.push(`The sheet has no ${k}`);
  if (!['probability', 'level', 'position', 'value'].includes(String(s.answerKind))) p.push('The sheet has no answer type');
  return p;
}

export function sealedProblems(x: unknown): string[] {
  const s = x as Partial<SealedHandIn> | null;
  if (!s || typeof s !== 'object' || s.kind !== SEALED_KIND || s.version !== 1 || s.alg !== SEAL_ALG) return ['This is not a sealed hand-in file from EconQuest'];
  if (!str(s.sheetId, 100) || !str(s.classId, 100) || !str(s.assignmentId, 100) || !str(s.key, 2000) || !str(s.iv, 40) || !str(s.data, SEALED_MAX_BYTES)) return ['The hand-in file is incomplete'];
  return [];
}

const b64 = (bytes: ArrayBuffer | Uint8Array) => {
  const u = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]!);
  return btoa(s);
};
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

/** Seal a hand-in for the sheet's class: only the teacher's copy can open it. */
export async function sealHandIn(sheet: HandInSheet, payload: HandInPayload): Promise<SealedHandIn> {
  const subtle = globalThis.crypto.subtle;
  const pub = await subtle.importKey('spki', unb64(sheet.publicKey), { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
  const aes = await subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const data = await subtle.encrypt({ name: 'AES-GCM', iv }, aes, new TextEncoder().encode(JSON.stringify(payload)));
  const raw = await subtle.exportKey('raw', aes);
  const key = await subtle.encrypt({ name: 'RSA-OAEP' }, pub, raw);
  return { kind: SEALED_KIND, version: 1, alg: SEAL_ALG, sheetId: sheet.sheetId, classId: sheet.classId, assignmentId: sheet.assignmentId, key: b64(key), iv: b64(iv), data: b64(data) };
}

/** A short fingerprint of a sealed file, the same on the student's screen and the teacher's. */
export async function sealFingerprint(s: Pick<SealedHandIn, 'key' | 'iv' | 'data'>): Promise<string> {
  const d = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${s.key}.${s.iv}.${s.data}`));
  return [...new Uint8Array(d)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
}
