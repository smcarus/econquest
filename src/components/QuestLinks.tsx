/**
 * Links to Quests about a country (Quests go-live checklist): on the country page and under a Council
 * chat answer. Shows nothing while Quests are switched off or when no Quest is about the country.
 */
import React, { useEffect, useState } from 'react';
import { Compass } from 'lucide-react';
import { useLang, useT } from '../i18n/useLang';
import { QUESTS } from '../i18n/messages/quests';
import { openQuests, questList, questsAbout, type QuestLinkSummary } from '../utils/questHandoff';
import { questTitleIn, type QuestTranslationMap } from '../utils/questTranslations';

export function QuestLinks({ iso3s, where }: { iso3s: string[]; where: 'country' | 'council' }) {
  const t = useT(QUESTS);
  const lang = useLang();
  const [found, setFound] = useState<{ list: QuestLinkSummary[]; tr?: QuestTranslationMap } | null>(null);
  const key = iso3s.join(',');
  useEffect(() => {
    let live = true;
    questList().then((r) => {
      if (live) setFound(r ? { list: questsAbout(r.quests, iso3s), tr: r.translations as QuestTranslationMap | undefined } : null);
    });
    return () => {
      live = false;
    };
  }, [key]);
  if (!found || found.list.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm" data-quest-links={where}>
      <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
        <Compass className="w-3.5 h-3.5" aria-hidden /> {where === 'country' ? t('linksCountry') : t('linksCouncil')}
      </span>
      {found.list.map((q) => (
        <button key={q.id} type="button" className="ui-pill" onClick={() => openQuests(q.id)} data-quest-link={q.id}>
          {questTitleIn(q.id, q.title, lang, found.tr)}
        </button>
      ))}
      <button type="button" className="ui-btn ui-btn-ghost text-xs" onClick={() => openQuests()}>
        {t('linksAll')}
      </button>
    </div>
  );
}
