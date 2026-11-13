/**
 * What-if results the user keeps for the trade-off chart (G37), held in this browser tab's memory by
 * country: a what-if card adds them, the Debt sustainability panel plots them beside the costed
 * options. Nothing is written to disk or sent anywhere; reloading the page clears them. At most six
 * per country, newest first.
 */
import type { TradeOffItem } from './tradeOff';

export const MAX_KEPT = 6;
const kept = new Map<string, TradeOffItem[]>();
const listeners = new Set<() => void>();

export function keptWhatIfs(iso3: string): TradeOffItem[] {
  return kept.get(iso3) ?? [];
}

export function keepWhatIf(iso3: string, item: TradeOffItem): void {
  const list = (kept.get(iso3) ?? []).filter((x) => x.id !== item.id);
  kept.set(iso3, [item, ...list].slice(0, MAX_KEPT));
  listeners.forEach((f) => f());
}

export function removeWhatIf(iso3: string, id: string): void {
  kept.set(iso3, keptWhatIfs(iso3).filter((x) => x.id !== id));
  listeners.forEach((f) => f());
}

export function onKeptChange(f: () => void): () => void {
  listeners.add(f);
  return () => {
    listeners.delete(f);
  };
}
