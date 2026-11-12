import React, { useEffect, useRef, useState } from 'react';
import { UserRound, X } from 'lucide-react';
import { fetchAuthStatus, postAuth, type AuthStatus } from '../utils/authClient';
import { useT } from '../i18n/useLang';
import { MENU } from '../i18n/messages/menu';
import { FIELD_CLASS, FirstAccountForm } from './SignInPage';

/**
 * Menu > Account: who is signed in, sign out and change password. While sign-in is off (no accounts,
 * app on this computer only) it says so and offers to create the first admin account.
 */
export function AccountDialog({ onClose }: { onClose: () => void }) {
  const t = useT(MENU);
  const [status, setStatus] = useState<AuthStatus | null | undefined>(undefined);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    void fetchAuthStatus().then(setStatus);
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const signOut = async () => {
    await postAuth('/api/auth/sign-out', {});
    window.location.reload();
  };
  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== again) return setMessage({ ok: false, text: t('ac_differ') });
    const r = await postAuth<{ endedSessions: number }>('/api/auth/password', { current, next });
    if (!r.ok) return setMessage({ ok: false, text: r.error });
    setCurrent('');
    setNext('');
    setAgain('');
    const n = r.data.endedSessions;
    setMessage({ ok: true, text: `${t('ac_changed')}${n ? t(n === 1 ? 'ac_ended1' : 'ac_endedN', { n }) : ''}` });
  };

  const account = status?.account;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="account-title" className="w-full max-w-md max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <h2 id="account-title" className="ui-title inline-flex items-center gap-2">
            <UserRound className="w-4 h-4" aria-hidden /> {t('ac_title')}
          </h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={t('ac_closeAria')} className="ui-btn ui-btn-ghost">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto ui-body">
          {status === undefined && <p>{t('c_loading')}</p>}
          {status === null && <p>{t('ac_serverDown')}</p>}
          {status && status.mode === 'off' && (
            <>
              <p>{t('ac_off')}</p>
              {status.canCreateFirstAccount ? (
                <>
                  <p>{t('ac_share')}</p>
                  <FirstAccountForm needsCode={false} onDone={() => window.location.reload()} />
                </>
              ) : (
                <p>{t('ac_onlyHere')}</p>
              )}
            </>
          )}
          {account && (
            <>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                <dt className="ui-label">{t('ac_name')}</dt>
                <dd>{account.displayName}</dd>
                <dt className="ui-label">{t('ac_username')}</dt>
                <dd>{account.username}</dd>
                <dt className="ui-label">{t('ac_role')}</dt>
                <dd>{t(`ac_role_${account.role}`)}</dd>
              </dl>
              <button type="button" onClick={signOut} className="ui-btn">
                {t('ac_signOut')}
              </button>
              <form onSubmit={changePassword} className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-3" aria-label={t('ac_change')}>
                <h3 className="ui-label">{t('ac_change')}</h3>
                <input aria-label={t('ac_current')} type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder={t('ac_current')} className={FIELD_CLASS} required />
                <input aria-label={t('ac_new')} type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} placeholder={t('ac_newPh')} className={FIELD_CLASS} required />
                <input aria-label={t('ac_again')} type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} placeholder={t('ac_again')} className={FIELD_CLASS} required />
                {message && (
                  <p role="status" className={message.ok ? 'text-sm text-emerald-700 dark:text-emerald-400' : 'text-sm text-rose-700 dark:text-rose-400'}>
                    {message.text}
                  </p>
                )}
                <button type="submit" className="ui-btn ui-btn-primary">
                  {t('ac_change')}
                </button>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('ac_everywhere')}</p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
