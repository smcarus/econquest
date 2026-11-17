import React from 'react';
import { ExternalLink } from 'lucide-react';
import type { AgentAnswer } from '../utils/askCouncil';
import { useT, useTx } from '../i18n/useLang';
import { CHAT } from '../i18n/messages/chat';

/**
 * The Quant desk's figures under a Council chat answer (src/utils/quantDesk.ts): each figure from the
 * outside research tools with its value, its data-through date and a link to the result on the
 * server, the reply's label, and any "Research tools unavailable" line. Loaded only when the desk
 * answered, so the start-up bundle does not carry it.
 */
export const QuantDeskCard: React.FC<{ answer: AgentAnswer }> = ({ answer }) => {
  const t = useT(CHAT);
  const tx = useTx();
  return (
    <div className="border border-slate-200 dark:border-slate-700 p-3 space-y-2" data-quant-desk={answer.findings.length ? 'figures' : 'none'}>
      <div className="ui-label">{t('qd_title')}</div>
      {answer.findings.map((f) => {
        const first = f.figures[0];
        const through = first?.source.match(/data through (\d{4}-\d{2}-\d{2})/)?.[1];
        const label = first?.source.split('. ').slice(1).join('. ');
        return (
          <div key={f.iso3} className="text-sm text-slate-800 dark:text-slate-200" data-quant-finding={f.countryName}>
            <p>
              <span className="font-medium">{f.countryName}</span>: {tx(f.reading)}
            </p>
            <table className="mt-1 w-full text-xs">
              <tbody>
                {f.figures.map((g, i) => (
                  <tr key={`${g.label}-${i}`} className="border-t border-slate-100 dark:border-slate-800 align-top">
                    <td className="py-0.5 pr-2 text-slate-600 dark:text-slate-400">{tx(g.label)}</td>
                    <td className="py-0.5 pr-2 tabular-nums whitespace-nowrap text-slate-900 dark:text-slate-100">{g.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400" data-quant-cite="true">
              {through ? t('qd_through', { date: through }) : t('qd_noDate')}
              {first?.url && (
                <>
                  {' · '}
                  <a href={first.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-0.5 text-blue-700 dark:text-blue-300 hover:underline">
                    {t('qd_open')} <ExternalLink className="w-3 h-3" aria-hidden />
                  </a>
                </>
              )}
              {label ? <span className="block italic">{tx(label)}</span> : null}
            </p>
          </div>
        );
      })}
      {answer.missing.length > 0 && (
        <ul className="text-xs text-amber-800 dark:text-amber-300 space-y-0.5" data-quant-missing="true">
          {answer.missing.map((m) => (
            <li key={m}>{tx(m)}</li>
          ))}
        </ul>
      )}
    </div>
  );
};
