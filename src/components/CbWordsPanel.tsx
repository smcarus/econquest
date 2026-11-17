import React, { useEffect, useMemo, useState } from 'react';
import { ValidationBadge } from './ValidationBadge';
import { MessageSquareQuote } from 'lucide-react';
import { cbWordCount, CBW_METHOD, CBW_REFERENCE, type CbwCount, type CbwStatement } from '../utils/cbWords';
import { explainInChat } from '../utils/explainHandoff';
import { useT, useTx } from '../i18n/useLang';
import { PANELS } from '../i18n/messages/panels';

/**
 * Country Research > History & data > Central bank word count (G31, src/utils/cbWords.ts): hawkish
 * and dovish phrases from a fixed, published dictionary in the statements you save in
 * data/local/cb-statements/<ISO3>/, plus a box to count any text you paste. No AI scoring.
 */

interface Reply {
  iso3: string;
  dir: string;
  statements: CbwStatement[];
  skipped: Array<{ file: string; reason: string }>;
  method: string;
  reference: string;
  sentence?: string;
}

const net = (c: CbwCount) => (c.net === null ? '—' : c.net.toFixed(2));
const top = (c: CbwCount) =>
  c.phrases
    .slice(0, 3)
    .map((p) => `${p.phrase} ×${p.n}`)
    .join(', ');

/** Net index by statement: 0 all dovish, 1 balanced, 2 all hawkish. */
const Line: React.FC<{ list: CbwStatement[]; label: string }> = ({ list, label }) => {
  const pts = list.filter((s) => s.net !== null);
  if (pts.length < 2) return null;
  const W = 560;
  const H = 120;
  const pad = { l: 26, r: 8, t: 8, b: 18 };
  const x = (i: number) => pad.l + (i / (pts.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + ((2 - v) / 2) * (H - pad.t - pad.b);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={label} data-cw-chart="true">
      {[0, 1, 2].map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} className={v === 1 ? 'stroke-slate-500 dark:stroke-slate-400' : 'stroke-slate-200 dark:stroke-slate-700'} strokeWidth={v === 1 ? 1 : 0.5} />
          <text x={pad.l - 4} y={y(v) + 3} textAnchor="end" fontSize="10" className="fill-slate-500 dark:fill-slate-400">
            {v}
          </text>
        </g>
      ))}
      <polyline fill="none" strokeWidth={1.5} className="stroke-blue-600 dark:stroke-blue-400" points={pts.map((p, i) => `${x(i)},${y(p.net!)}`).join(' ')} />
      {pts.map((p, i) => (
        <circle key={p.file} cx={x(i)} cy={y(p.net!)} r={2.5} className="fill-blue-600 dark:fill-blue-400">
          <title>{`${p.date}: ${p.net!.toFixed(2)}`}</title>
        </circle>
      ))}
      <text x={pad.l} y={H - 4} fontSize="10" className="fill-slate-500 dark:fill-slate-400">
        {pts[0].date}
      </text>
      <text x={W - pad.r} y={H - 4} fontSize="10" textAnchor="end" className="fill-slate-500 dark:fill-slate-400">
        {pts[pts.length - 1].date}
      </text>
    </svg>
  );
};

export const CbWordsPanel: React.FC<{ iso3: string; countryName: string }> = ({ iso3, countryName }) => {
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pasted, setPasted] = useState('');
  const t = useT(PANELS);
  const tx = useTx();

  useEffect(() => {
    let live = true;
    setReply(null);
    setError(null);
    fetch(`/api/cb-words/${encodeURIComponent(iso3)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((b: Reply) => live && setReply(b))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [iso3]);

  const paste = useMemo(() => (pasted.trim() ? cbWordCount(pasted) : null), [pasted]);
  const list = reply?.statements || [];
  const last = list[list.length - 1];

  return (
    <section className="ui-panel" data-cb-words="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <MessageSquareQuote className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('cbw_title', { country: countryName })}
          <ValidationBadge id="cb_word_count" />
          {last && (
            <button
              type="button"
              className="ui-btn ml-auto text-xs"
              data-explain-panel="true"
              onClick={() =>
                explainInChat({
                  kind: 'panel',
                  label: `Central bank word count, ${countryName}`,
                  value: list
                    .slice(-6)
                    .map((s) => `${s.date}: ${s.hawk} hawkish, ${s.dove} dovish, net ${net(s)}`)
                    .join('; '),
                  source: `Statements saved by the user in ${reply!.dir}; dictionary ${CBW_REFERENCE}`,
                  asOf: last.date,
                  iso3,
                  countryName,
                  detail: [reply!.sentence || '', CBW_METHOD],
                })
              }
            >
              {t('c_explain')}
            </button>
          )}
        </h2>
        <p className="ui-label">{t('cbw_intro')}</p>
      </header>
      <div className="p-4 space-y-3 text-xs">
        {!reply && !error && <p className="ui-body">{t('c_loading')}</p>}
        {error && <p className="text-sm text-amber-700 dark:text-amber-400">{t('c_couldNotRead', { what: t('cbw_what'), error })}</p>}
        {reply && !list.length && (
          <p className="text-sm text-amber-700 dark:text-amber-400" data-missing="true">
            {t('cbw_none', { dir: reply.dir })}
          </p>
        )}
        {list.length > 0 && (
          <>
            {last && (
              <p className="text-sm text-slate-900 dark:text-white" data-cw-sentence="true">
                {last.net === null ? t('cbw_lastNone', { date: last.date }) : t('cbw_last', { date: last.date, net: net(last), h: last.hawk, d: last.dove })}
              </p>
            )}
            <Line list={list} label={t('cbw_chartLabel')} />
            <table className="w-full text-xs" data-cw-table="true">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400">
                  <th className="py-1 pr-3 font-medium">{t('c_date')}</th>
                  <th className="py-1 pr-3 font-medium text-right">{t('cbw_hawk')}</th>
                  <th className="py-1 pr-3 font-medium text-right">{t('cbw_dove')}</th>
                  <th className="py-1 pr-3 font-medium text-right">{t('cbw_net')}</th>
                  <th className="py-1 pr-3 font-medium text-right">{t('cbw_words')}</th>
                  <th className="py-1 font-medium">{t('cbw_phrases')}</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {[...list].reverse().map((s) => (
                  <tr key={s.file} className="border-t border-slate-100 dark:border-slate-800" title={s.file}>
                    <td className="py-0.5 pr-3">{s.date}</td>
                    <td className="py-0.5 pr-3 text-right">{s.hawk}</td>
                    <td className="py-0.5 pr-3 text-right">{s.dove}</td>
                    <td className="py-0.5 pr-3 text-right font-medium">{net(s)}</td>
                    <td className="py-0.5 pr-3 text-right">{s.words}</td>
                    <td className="py-0.5 text-slate-500 dark:text-slate-400">{top(s)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-slate-500 dark:text-slate-400">{t('cbw_where', { dir: reply!.dir })}</p>
          </>
        )}
        {reply?.skipped.map((s) => (
          <p key={s.file} className="text-amber-700 dark:text-amber-400" data-missing="true">
            {t('cbw_skipped', { file: s.file, reason: tx(s.reason) })}
          </p>
        ))}
        <label className="block space-y-1">
          <span className="text-slate-600 dark:text-slate-300">{t('cbw_paste')}</span>
          <textarea
            className="w-full h-24 px-1.5 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            data-cw-paste="true"
          />
        </label>
        {paste && (
          <p className="text-slate-900 dark:text-white" data-cw-paste-result="true">
            {paste.net === null ? t('cbw_pasteNone', { words: paste.words }) : t('cbw_pasteOut', { h: paste.hawk, d: paste.dove, net: net(paste), words: paste.words, list: top(paste) })}
          </p>
        )}
        <p className="text-slate-500 dark:text-slate-400">{t('c_method', { method: CBW_METHOD })}</p>
        <details className="text-slate-500 dark:text-slate-400">
          <summary className="cursor-pointer">{t('c_references')}</summary>
          <ul className="mt-1">
            <li>{CBW_REFERENCE}</li>
          </ul>
        </details>
      </div>
    </section>
  );
};
