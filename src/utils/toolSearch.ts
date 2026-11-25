/**
 * Find a tool by words (Tools page search). Every word must appear in the tool's title, what it does
 * or its group, in English or in the reader's language; accents and case are ignored.
 */
export interface Searchable {
  id: string;
  title: string;
  what: string;
}

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function searchTools<T extends Searchable>(tools: T[], query: string, extra: (t: T) => string = () => ''): T[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return tools.filter((t) => {
    const hay = fold(`${t.title} ${t.what} ${extra(t)}`);
    return words.every((w) => hay.includes(w));
  });
}
