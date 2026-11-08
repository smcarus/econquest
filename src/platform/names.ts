/**
 * Checks shared by every platform: file names that stay inside the data folder, secret names,
 * and the log filter that hides keys.
 */
import type { LogFields } from './types';

/**
 * Normalises a data-folder file name and refuses anything that could reach outside it.
 * Accepts "local/watch-rules.json"; refuses "", "/etc/passwd", "../x", "a/../../x", "C:\\x" and
 * names with a NUL character.
 */
export function safeFileName(name: string): string {
  if (typeof name !== 'string' || name.trim() === '') throw new Error('File name is empty.');
  if (name.includes('\0')) throw new Error('File name contains a NUL character.');
  const unified = name.replace(/\\/g, '/');
  if (unified.startsWith('/') || /^[A-Za-z]:/.test(unified)) {
    throw new Error(`File name must be inside the data folder: ${name}`);
  }
  const parts: string[] = [];
  for (const part of unified.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') throw new Error(`File name must be inside the data folder: ${name}`);
    parts.push(part);
  }
  if (parts.length === 0) throw new Error('File name is empty.');
  return parts.join('/');
}

/** Folder names follow the same rule, except that "" means the data folder itself. */
export function safeFolderName(name: string): string {
  if (name === '' || name === '.' || name === './') return '';
  return safeFileName(name);
}

const SECRET_NAME = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/;

export function safeSecretName(name: string): string {
  if (typeof name !== 'string' || !SECRET_NAME.test(name)) {
    throw new Error('Secret names use letters, digits, "_", "." or "-" (up to 64 characters).');
  }
  return name;
}

const SECRET_FIELD = /(key|token|secret|password|passphrase|authorization|cookie|credential)/i;

/** Shapes of common provider keys, hidden even when they appear inside a message. */
const KEY_SHAPES: RegExp[] = [
  /AIza[0-9A-Za-z_-]{20,}/g, // Google
  /sk-ant-[0-9A-Za-z_-]{10,}/g, // Anthropic
  /sk-(?:proj-)?[0-9A-Za-z_-]{16,}/g, // OpenAI and similar
  /gh[pousr]_[0-9A-Za-z]{20,}/g, // GitHub
  /Bearer\s+[0-9A-Za-z._~+/=-]{8,}/gi,
];

export const HIDDEN = '[hidden]';

export function hideKeysInText(text: string): string {
  let out = text;
  for (const shape of KEY_SHAPES) out = out.replace(shape, HIDDEN);
  return out;
}

/** A copy of the fields with secret-looking names and key-shaped text hidden. */
export function hideKeysInFields(fields: LogFields | undefined, depth = 0): LogFields | undefined {
  if (!fields) return undefined;
  const out: LogFields = {};
  for (const [name, value] of Object.entries(fields)) {
    if (SECRET_FIELD.test(name)) {
      out[name] = value === undefined || value === null || value === '' ? value : HIDDEN;
    } else if (typeof value === 'string') {
      out[name] = hideKeysInText(value);
    } else if (value && typeof value === 'object' && !Array.isArray(value) && depth < 4) {
      out[name] = hideKeysInFields(value as LogFields, depth + 1);
    } else {
      out[name] = value;
    }
  }
  return out;
}
