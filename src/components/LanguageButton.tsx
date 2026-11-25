/** Header button: the app's language (English, Español, Français, Português), pressed to move to the next one. */
import React from 'react';
import { Languages } from 'lucide-react';
import { langInfo, nextLang, writeLang } from '../i18n/lang';
import { useLang, useT } from '../i18n/useLang';
import { SHELL } from '../i18n/messages/shell';

/** `labelled` shows the full language name (used in the Menu on a phone). */
export const LanguageButton: React.FC<{ labelled?: boolean }> = ({ labelled = false }) => {
  const lang = useLang();
  const t = useT(SHELL);
  const info = langInfo(lang);
  const next = langInfo(nextLang(lang));
  const vars = { name: info.name, next: next.name };
  const shown = labelled ? info.name : info.short;
  return (
    <button
      type="button"
      onClick={() => writeLang(next.code)}
      title={t(info.reviewed ? 'langTitle' : 'langNotReviewed', vars)}
      // The spoken name starts with the visible text, so voice-control users can say what they see.
      aria-label={`${shown}. ${t('langAria', vars)}`}
      data-lang={lang}
      lang={lang}
      className="ui-pill inline-flex items-center gap-1.5 whitespace-nowrap"
    >
      <Languages className="w-3.5 h-3.5" aria-hidden />
      <span>{shown}</span>
    </button>
  );
};
