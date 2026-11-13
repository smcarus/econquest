/**
 * Browser side of hidden names (console integration item 8): fetches the fingerprints (never the
 * names) and works out which positions and countries on screen are hidden. Web Crypto SHA-256.
 */
import { fingerprintText, holdingNames, type HiddenView } from './exclusions';
import type { Holding } from './holdings';

export const HIDDEN_CHANGED_EVENT = 'econquest:hidden-names-changed';

export async function fetchHiddenView(): Promise<HiddenView | null> {
  try {
    const r = await fetch('/api/settings/hidden-names');
    if (!r.ok) return null;
    const v = (await r.json()) as HiddenView;
    return Array.isArray(v?.fingerprints) ? v : null;
  } catch {
    return null;
  }
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Which of these positions and countries are on the list. */
export async function hiddenSets(view: HiddenView | null, holdings: Holding[], iso3s: string[]): Promise<{ holdingIds: Set<string>; iso3: Set<string> }> {
  const out = { holdingIds: new Set<string>(), iso3: new Set<string>() };
  if (!view?.count || typeof crypto === 'undefined' || !crypto.subtle) return out;
  const fps = new Set(view.fingerprints.map((f) => f.fp));
  const memo = new Map<string, Promise<boolean>>();
  const hit = (text: string) => {
    if (!memo.has(text)) memo.set(text, sha256Hex(text).then((fp) => fps.has(fp)));
    return memo.get(text)!;
  };
  for (const iso3 of new Set(iso3s)) if (await hit(fingerprintText('country', iso3))) out.iso3.add(iso3);
  for (const h of holdings) {
    for (const n of holdingNames(h)) {
      if (await hit(fingerprintText(n.kind, n.value))) {
        out.holdingIds.add(h.id);
        break;
      }
    }
  }
  return out;
}
