/** Header button: the app's language (English, Español, Français, Português), pressed to move to the next one. */
import React from 'react';
import { Languages } from 'lucide-react';
import { langInfo, nextLang, writeLang } from '../i18n/lang';
import { useLang, useT } from '../i18n/useLang';
import { SHELL } from '../i18n/messages/shell';

export const LanguageButton: React.FC = () => {
  const lang = useLang();
  const t = useT(SHELL);
  const info = langInfo(lang);
  const next = langInfo(nextLang(lang));
  const vars = { name: info.name, next: next.name };
  return (
    <button
      type="button"
      onClick={() => writeLang(next.code)}
      title={t(info.reviewed ? 'langTitle' : 'langNotReviewed', vars)}
      aria-label={t('langAria', vars)}
      data-lang={lang}
      lang={lang}
      className="ui-pill inline-flex items-center gap-1.5 whitespace-nowrap"
    >
      <Languages className="w-3.5 h-3.5" aria-hidden />
      <span>{info.short}</span>
    </button>
  );
};
