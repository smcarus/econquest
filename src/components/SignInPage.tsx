import React, { useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { postAuth, type AuthStatus } from '../utils/authClient';
import { useT } from '../i18n/useLang';
import { MENU } from '../i18n/messages/menu';

/**
 * The page shown instead of the app while sign-in applies and nobody is signed in: a sign-in form,
 * or, before any account exists, the form that creates the first admin account (with the one-time
 * setup code from the server log when the app is open to a network). With OIDC set up on the server, a
 * "Sign in with <provider>" button comes first (src/utils/oidc.ts). See src/utils/auth.ts.
 */

export const FIELD_CLASS =
  'w-full px-2 py-1.5 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white';

function Field(props: { id: string; label: string; type?: string; value: string; onChange: (v: string) => void; autoComplete?: string; hint?: string }) {
  return (
    <label htmlFor={props.id} className="block space-y-1">
      <span className="ui-label">{props.label}</span>
      <input
        id={props.id}
        name={props.id}
        type={props.type || 'text'}
        value={props.value}
        autoComplete={props.autoComplete}
        onChange={(e) => props.onChange(e.target.value)}
        className={FIELD_CLASS}
        required
      />
      {props.hint && <span className="block text-xs text-slate-500 dark:text-slate-400">{props.hint}</span>}
    </label>
  );
}

/** Creates the first admin account. Used here and in Menu > Account while sign-in is off. */
export function FirstAccountForm({ needsCode, onDone }: { needsCode: boolean; onDone: () => void }) {
  const t = useT(MENU);
  const [code, setCode] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== again) return setError(t('su_differ'));
    setBusy(true);
    setError('');
    const r = await postAuth('/api/auth/setup', { code, username, displayName, password });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    onDone();
  };
  return (
    <form onSubmit={submit} className="space-y-3" aria-label={t('su_formAria')}>
      {needsCode && (
        <Field
          id="setup-code"
          label={t('su_code')}
          value={code}
          onChange={setCode}
          autoComplete="one-time-code"
          hint={t('su_codeHint')}
        />
      )}
      <Field id="setup-username" label={t('ac_username')} value={username} onChange={setUsername} autoComplete="username" />
      <Field id="setup-name" label={t('su_shownName')} value={displayName} onChange={setDisplayName} autoComplete="name" />
      <Field id="setup-password" label={t('su_password')} type="password" value={password} onChange={setPassword} autoComplete="new-password" hint={t('su_pwHint')} />
      <Field id="setup-again" label={t('su_again')} type="password" value={again} onChange={setAgain} autoComplete="new-password" />
      {error && <p role="alert" className="text-sm text-rose-700 dark:text-rose-400">{error}</p>}
      <button type="submit" disabled={busy} className="ui-btn ui-btn-primary w-full justify-center">
        {busy ? t('su_creating') : t('su_create')}
      </button>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {t('su_reset')}
        <code className="mx-1">npm run users -- reset-password &lt;username&gt;</code>.
      </p>
    </form>
  );
}

function SignInForm({ onDone }: { onDone: () => void }) {
  const t = useT(MENU);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const r = await postAuth('/api/auth/sign-in', { username, password });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    onDone();
  };
  return (
    <form onSubmit={submit} className="space-y-3" aria-label={t('su_signIn')}>
      <Field id="signin-username" label={t('ac_username')} value={username} onChange={setUsername} autoComplete="username" />
      <Field id="signin-password" label={t('su_password')} type="password" value={password} onChange={setPassword} autoComplete="current-password" />
      {error && <p role="alert" className="text-sm text-rose-700 dark:text-rose-400">{error}</p>}
      <button type="submit" disabled={busy} className="ui-btn ui-btn-primary w-full justify-center">
        {busy ? t('su_signingIn') : t('su_signIn')}
      </button>
    </form>
  );
}

const OIDC_ERROR_KEYS = { not_allowed: 'su_err_not_allowed', no_email: 'su_err_no_email', disabled: 'su_err_disabled', expired: 'su_err_expired', failed: 'su_err_failed' } as const;

/** The reason an OIDC sign-in came back refused (?signin_error=<code>), as a message key. */
function oidcErrorKey(): (typeof OIDC_ERROR_KEYS)[keyof typeof OIDC_ERROR_KEYS] | null {
  if (typeof window === 'undefined') return null;
  const code = new URLSearchParams(window.location.search).get('signin_error');
  if (!code) return null;
  return OIDC_ERROR_KEYS[code as keyof typeof OIDC_ERROR_KEYS] ?? 'su_err_failed';
}

export function SignInPage({ status }: { status: AuthStatus }) {
  const t = useT(MENU);
  const reload = () => window.location.reload();
  const setup = status.mode === 'setup';
  const oidcError = oidcErrorKey();
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <h1 className="ui-title inline-flex items-center gap-2">
          {setup ? <ShieldCheck className="w-4 h-4" aria-hidden /> : <KeyRound className="w-4 h-4" aria-hidden />}
          {setup ? t('su_titleSetup') : t('su_title')}
        </h1>
        {setup && (
          <p className="ui-body">{t('su_setupNote')}</p>
        )}
        {status.oidc && (
          <div className="space-y-2">
            <a href="/api/auth/oidc/start" className="ui-btn ui-btn-primary w-full justify-center" data-oidc-sign-in="true">
              {t('su_oidc', { name: status.oidc.name })}
            </a>
            {oidcError && <p role="alert" className="text-sm text-rose-700 dark:text-rose-400">{t(oidcError)}</p>}
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('su_or')}</p>
          </div>
        )}
        {setup ? <FirstAccountForm needsCode={status.setupNeedsCode} onDone={reload} /> : <SignInForm onDone={reload} />}
        {!setup && <p className="text-xs text-slate-500 dark:text-slate-400">{t('su_idle', { n: status.sessionIdleHours })}</p>}
      </div>
    </main>
  );
}
