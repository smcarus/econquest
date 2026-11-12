import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { parseBackup, type BackupFile, type BackupSummary } from '../utils/backup';
import { useT, useTx } from '../i18n/useLang';
import { MENU, type MenuT } from '../i18n/messages/menu';
import { SYNCED_KEYS } from '../utils/workspaceSync';

/**
 * Menu > Settings > Backup. Download everything you made in the app as one file, or restore one.
 * API keys are never in the file. Restoring saves a copy of the current state first.
 */
const when = (iso: string, t: MenuT) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? t('bk_unknownDate') : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

/** What a backup holds, in the reader's language (utils/backup.ts describeBackup is the English one). */
function describe(s: BackupSummary, t: MenuT): string {
  const counts: Array<[keyof BackupSummary, number]> = [
    ['briefs', s.briefs], ['docs', s.docs], ['councilDocs', s.councilDocs], ['notebooks', s.notebooks],
    ['episodes', s.episodes], ['watchRules', s.watchRules], ['reviews', s.reviews ?? 0], ['snapshots', s.snapshots ?? 0],
  ];
  const parts = counts.filter(([, n]) => n).map(([k, n]) => t(`bk_${k}${n === 1 ? '1' : 'N'}` as Parameters<MenuT>[0], { n }));
  const WS: Record<string, Parameters<MenuT>[0]> = { holdings: 'bk_ws_holdings', watchlists: 'bk_ws_watchlists', 'countries you added': 'bk_ws_added', 'AI model settings': 'bk_ws_ai' };
  const ws = s.workspace.map((w) => (WS[w] ? t(WS[w]) : w));
  if (ws.length) parts.push(ws.length === 1 ? ws[0] : `${ws.slice(0, -1).join(', ')}${t('bk_and')}${ws[ws.length - 1]}`);
  return parts.length ? parts.join(', ') : t('bk_nothing');
}

export const BackupSettings: React.FC = () => {
  const t = useT(MENU);
  const tx = useTx();
  const [current, setCurrent] = useState<BackupSummary | null>(null);
  const [error, setError] = useState('');
  const [chosen, setChosen] = useState<{ name: string; backup: BackupFile; summary: BackupSummary } | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/backup');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setCurrent(((await res.json()) as { summary: BackupSummary }).summary);
    } catch (e) {
      setError(t('c_serverDown', { detail: e instanceof Error ? e.message : String(e) }));
    }
  }, [t]);
  useEffect(() => {
    void load();
  }, [load]);

  const choose = async (file: File | undefined) => {
    setError('');
    setDone('');
    setChosen(null);
    if (!file) return;
    const parsed = parseBackup(await file.text());
    if (!parsed.ok) return setError(parsed.error);
    setChosen({ name: file.name, backup: parsed.backup, summary: parsed.summary });
  };

  const restore = async () => {
    if (!chosen) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backup: chosen.backup }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; savedCopy?: string };
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      // The browser keeps its own copy of holdings and watchlists; drop it so the restored file wins.
      for (const key of SYNCED_KEYS) {
        try {
          localStorage.removeItem(key);
        } catch {
          // storage blocked: the page reload still reads the file first
        }
      }
      setDone(t('bk_done', { path: body.savedCopy || '' }));
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5" data-backup-settings="true">
      <p className="text-xs text-slate-600 dark:text-slate-400">
        {t('bk_intro')}
      </p>

      <div>
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t('bk_download')}</h4>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400" data-backup-current="true">
          {current ? t('bk_now', { list: describe(current, t) }) : error ? '' : t('c_loading')}
        </p>
        <a href="/api/backup/download" download className="mt-2 ui-btn ui-btn-primary inline-flex items-center gap-1.5">
          <Download className="w-3.5 h-3.5" aria-hidden /> {t('bk_downloadBtn')}
        </a>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t('bk_restore')}</h4>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          {t('bk_restoreNote')}
        </p>
        <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" onChange={(e) => void choose(e.target.files?.[0])} aria-label={t('bk_choose')} />
        <button type="button" className="mt-2 ui-btn inline-flex items-center gap-1.5" onClick={() => fileRef.current?.click()} disabled={busy}>
          <Upload className="w-3.5 h-3.5" aria-hidden /> {t('bk_choose')}
        </button>
        {chosen && (
          <div className="mt-3 p-3 border border-slate-200 dark:border-slate-800" data-backup-chosen="true">
            <p className="text-sm text-slate-800 dark:text-slate-100">
              {t('bk_chosen', { name: chosen.name, when: when(chosen.summary.createdAt, t), list: describe(chosen.summary, t) })}
            </p>
            <div className="mt-2 flex gap-2">
              <button type="button" className="ui-btn ui-btn-primary" onClick={() => void restore()} disabled={busy}>
                {busy ? t('bk_restoring') : t('bk_restoreBtn')}
              </button>
              <button type="button" className="ui-btn ui-btn-ghost" onClick={() => setChosen(null)} disabled={busy}>
                {t('c_cancel')}
              </button>
            </div>
          </div>
        )}
        {done && (
          <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400" role="status">
            {done}
          </p>
        )}
      </div>

      {error && (
        <p className="text-xs text-rose-700 dark:text-rose-400" role="alert">
          {tx(error)}
        </p>
      )}
    </div>
  );
};
