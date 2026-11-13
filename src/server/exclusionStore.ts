/**
 * The hidden-names list on disk (console integration item 8): data/local/hidden-names.json, mode
 * 600, fingerprints only (src/utils/exclusions.ts). Server only.
 */
import fs from 'fs';
import path from 'path';
import { createHash, randomBytes } from 'crypto';
import { writeFileAtomic } from '../utils/atomicWrite';
import { MAX_HIDDEN, fingerprintText, holdingNames, isHiddenKind, normaliseHidden, viewOf, type HiddenEntry, type HiddenKind, type HiddenView } from '../utils/exclusions';

export const fingerprint = (kind: HiddenKind, value: string): string => createHash('sha256').update(fingerprintText(kind, value)).digest('hex');

export interface NameInput {
  kind: unknown;
  value: unknown;
}

export class ExclusionStore {
  private cache: { mtimeMs: number; entries: HiddenEntry[]; fps: Set<string> } | null = null;
  constructor(private readonly file: string) {}

  static fileIn(dataDir: string): string {
    return path.join(dataDir, 'local', 'hidden-names.json');
  }

  list(): HiddenEntry[] {
    let mtimeMs = -1;
    try {
      mtimeMs = fs.statSync(this.file).mtimeMs;
    } catch {
      /* no file: an empty list */
    }
    if (this.cache && this.cache.mtimeMs === mtimeMs) return this.cache.entries;
    let entries: HiddenEntry[] = [];
    try {
      const raw = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      entries = Array.isArray(raw?.entries) ? raw.entries.filter((e: HiddenEntry) => isHiddenKind(e?.kind) && /^[0-9a-f]{64}$/.test(e?.fp)) : [];
    } catch {
      entries = [];
    }
    this.cache = { mtimeMs, entries, fps: new Set(entries.map((e) => e.fp)) };
    return entries;
  }

  private save(entries: HiddenEntry[]): void {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    writeFileAtomic(this.file, JSON.stringify({ entries }), 0o600);
    this.cache = null;
  }

  view(): HiddenView {
    return viewOf(this.list());
  }

  count(): number {
    return this.list().length;
  }

  private fps(): Set<string> {
    this.list();
    return this.cache!.fps;
  }

  /** Each input normalised and fingerprinted, or the reasons it was refused (without echoing it). */
  private parse(names: unknown): { items: Array<{ kind: HiddenKind; fp: string }>; errors: string[] } {
    if (!Array.isArray(names) || !names.length) return { items: [], errors: ['Send { "names": [ { "kind": "isin", "value": "..." } ] }.'] };
    const items: Array<{ kind: HiddenKind; fp: string }> = [];
    const errors: string[] = [];
    names.forEach((n: NameInput, i) => {
      if (!isHiddenKind(n?.kind)) return errors.push(`Name ${i + 1}: kind must be one of country, isin, lei, cik, ticker, entity_id.`);
      const v = normaliseHidden(n.kind, n.value);
      if ('error' in v) return errors.push(`Name ${i + 1}: ${v.error}`);
      items.push({ kind: n.kind, fp: fingerprint(n.kind, v.value) });
    });
    return { items, errors };
  }

  /** Add names; all or nothing. */
  add(names: unknown, now = new Date()): { added: number; already: number } | { errors: string[] } {
    const { items, errors } = this.parse(names);
    if (errors.length) return { errors };
    const entries = [...this.list()];
    const have = new Set(entries.map((e) => e.fp));
    let added = 0;
    for (const it of items) {
      if (have.has(it.fp)) continue;
      have.add(it.fp);
      entries.push({ id: `hn_${randomBytes(5).toString('hex')}`, kind: it.kind, fp: it.fp, addedAt: now.toISOString() });
      added += 1;
    }
    if (entries.length > MAX_HIDDEN) return { errors: [`At most ${MAX_HIDDEN} hidden names.`] };
    if (added) this.save(entries);
    return { added, already: items.length - added };
  }

  /** Replace the whole list; all or nothing. An empty list clears it. */
  replace(names: unknown, now = new Date()): { count: number } | { errors: string[] } {
    if (Array.isArray(names) && names.length === 0) {
      this.save([]);
      return { count: 0 };
    }
    const { items, errors } = this.parse(names);
    if (errors.length) return { errors };
    if (items.length > MAX_HIDDEN) return { errors: [`At most ${MAX_HIDDEN} hidden names.`] };
    const seen = new Set<string>();
    const entries: HiddenEntry[] = [];
    for (const it of items) {
      if (seen.has(it.fp)) continue;
      seen.add(it.fp);
      entries.push({ id: `hn_${randomBytes(5).toString('hex')}`, kind: it.kind, fp: it.fp, addedAt: now.toISOString() });
    }
    this.save(entries);
    return { count: entries.length };
  }

  /** Remove names given by value; returns how many were on the list. */
  remove(names: unknown): { removed: number } | { errors: string[] } {
    const { items, errors } = this.parse(names);
    if (errors.length) return { errors };
    const drop = new Set(items.map((i) => i.fp));
    const entries = this.list();
    const kept = entries.filter((e) => !drop.has(e.fp));
    if (kept.length !== entries.length) this.save(kept);
    return { removed: entries.length - kept.length };
  }

  removeById(id: string): boolean {
    const entries = this.list();
    const kept = entries.filter((e) => e.id !== id);
    if (kept.length === entries.length) return false;
    this.save(kept);
    return true;
  }

  isHidden(kind: HiddenKind, value: string | undefined | null): boolean {
    if (!value) return false;
    const fps = this.fps();
    if (!fps.size) return false;
    const n = normaliseHidden(kind, value);
    return 'value' in n && fps.has(fingerprint(kind, n.value));
  }

  countryHidden(iso3: string | undefined | null): boolean {
    return this.isHidden('country', iso3);
  }

  holdingHidden(h: Parameters<typeof holdingNames>[0]): boolean {
    const fps = this.fps();
    if (!fps.size) return false;
    return holdingNames(h).some((n) => fps.has(fingerprint(n.kind, n.value)));
  }
}
