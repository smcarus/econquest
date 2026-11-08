/** React side of src/i18n/lang.ts: the chosen language, kept in step across every panel and window. */
import { useCallback, useSyncExternalStore } from 'react';
import { LANG_EVENT, LANG_KEY, readLang, translate, type Catalog, type Lang } from './lang';

function subscribe(cb: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === LANG_KEY) cb();
  };
  window.addEventListener(LANG_EVENT, cb);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(LANG_EVENT, cb);
    window.removeEventListener('storage', onStorage);
  };
}

export function useLang(): Lang {
  return useSyncExternalStore(subscribe, readLang, () => 'en' as Lang);
}

/** t(key, vars) for one message file in the chosen language. */
export function useT<K extends string>(catalog: Catalog<K>): (key: K, vars?: Record<string, string | number>) => string {
  const lang = useLang();
  return useCallback((key: K, vars?: Record<string, string | number>) => translate(catalog, lang, key, vars), [catalog, lang]);
}
