/**
 * Opening Menu > Quests from somewhere else (a country page, a Council chat answer): the caller names
 * a Quest (or none, for the list) and fires an event; App opens the Quests screen on it.
 */
export const OPEN_QUESTS_EVENT = 'econquest:open-quests';

let pending: string | null = null;

export function openQuests(questId?: string): void {
  pending = questId ?? null;
  window.dispatchEvent(new CustomEvent(OPEN_QUESTS_EVENT));
}

export function takeQuestFocus(): string | null {
  const p = pending;
  pending = null;
  return p;
}

export interface QuestLinkSummary {
  id: string;
  version: number;
  title: string;
  countries: string[];
  status: string;
  approved: boolean;
}

let cache: Promise<{ quests: QuestLinkSummary[]; translations?: unknown } | null> | null = null;

/** The Quest list, asked once per page load; null while Quests are switched off or the server is down. */
export function questList(): Promise<{ quests: QuestLinkSummary[]; translations?: unknown } | null> {
  if (!cache) {
    cache = fetch('/api/quests')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => (j && j.enabled ? { quests: j.quests as QuestLinkSummary[], translations: j.translations } : null))
      .catch(() => null);
  }
  return cache;
}

/** Quests about any of these countries that people can still take part in or read: open first, then the rest. */
export function questsAbout(quests: QuestLinkSummary[], iso3s: string[], max = 3): QuestLinkSummary[] {
  const want = new Set(iso3s.map((c) => c.toUpperCase()));
  const rank = (s: string) => (s === 'open' ? 0 : s === 'upcoming' ? 1 : 2);
  return quests
    .filter((q) => q.countries.some((c) => want.has(c.toUpperCase())))
    .sort((a, b) => rank(a.status) - rank(b.status) || Number(b.approved) - Number(a.approved) || a.id.localeCompare(b.id))
    .slice(0, max);
}
