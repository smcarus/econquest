import React from 'react';
import { readLang, translate, translateText } from '../i18n/lang';
import { COMMON } from '../i18n/messages/common';
import { problemIssueUrl, problemText, type ProblemDetails } from '../utils/problemReport';

/**
 * Crash guard. Before this, one panel throwing while it drew (the #54 "missing figures" note, for
 * example) blanked the whole app to a white screen. Now the panel that failed shows a short note
 * with the error and a Try again button, and everything else keeps working.
 *
 * `name` says which panel it is. `resetKey` clears the error when it changes (another country,
 * another desk), so the panel gets a fresh try.
 *
 * Both notes offer Copy details (version, where, the error and the first lines of the component
 * stack; no figures or saved data) and Report this problem, a GitHub issue link with those details
 * filled in that the person reads and sends themselves (src/utils/problemReport.ts).
 */
interface Props {
  name: string;
  resetKey?: string | number;
  /** The whole app: a full-page note with Reload instead of an inline card. */
  page?: boolean;
  children: React.ReactNode;
}

interface State {
  error: Error | null;
  resetKey?: string | number;
  stack?: string;
  copied?: boolean;
  reportUrl?: string;
}

/** The version comes from the citation module, loaded only when someone asks, to keep start-up small. */
async function detailsFor(name: string, error: Error | null, stack: string | undefined, lang: string): Promise<ProblemDetails> {
  const [{ APP_CITATION }, { versionWithCommit }] = await Promise.all([import('../utils/citation'), import('../utils/buildInfo')]);
  return {
    version: versionWithCommit(APP_CITATION.version),
    where: name,
    message: String(error?.message || error),
    stack,
    path: typeof window !== 'undefined' ? window.location.pathname : undefined,
    lang,
  };
}

export class PanelBoundary extends React.Component<Props, State> {
  state: State = { error: null, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    if (props.resetKey !== state.resetKey) return { error: null, resetKey: props.resetKey, stack: undefined, copied: false, reportUrl: undefined };
    return null;
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[panel-error] ${this.props.name}: ${error?.message || error}`, info.componentStack);
    this.setState({ stack: info.componentStack ?? undefined });
    void detailsFor(this.props.name, error, info.componentStack ?? undefined, readLang())
      .then((d) => this.setState({ reportUrl: problemIssueUrl(d) }))
      .catch(() => undefined);
  }

  private copy = async () => {
    try {
      const d = await detailsFor(this.props.name, this.state.error, this.state.stack, readLang());
      await navigator.clipboard.writeText(problemText(d));
      this.setState({ copied: true });
    } catch {
      this.setState({ copied: false });
    }
  };

  private actions(t: (key: keyof typeof COMMON.en) => string) {
    return (
      <>
        <button type="button" className="ui-btn" onClick={this.copy} data-copy-details>
          {this.state.copied ? t('copied') : t('copyDetails')}
        </button>
        {this.state.reportUrl && (
          <a href={this.state.reportUrl} target="_blank" rel="noopener noreferrer" className="ui-btn ui-btn-ghost" data-report-problem>
            {t('reportProblem')}
          </a>
        )}
      </>
    );
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const message = String(error?.message || error).slice(0, 300);
    // A class component cannot use the language hook; the saved choice is read directly.
    const lang = readLang();
    const t = (key: keyof typeof COMMON.en, vars?: Record<string, string>) => translate(COMMON, lang, key, vars);
    if (this.props.page) {
      return (
        <div role="alert" data-panel-error={this.props.name} className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950 p-6">
          <div className="ui-panel max-w-lg p-5 space-y-3">
            <h1 className="text-lg text-slate-900 dark:text-white">{t('appFailed')}</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">{t('appFailedBody')}</p>
            <pre className="text-xs whitespace-pre-wrap bg-slate-50 dark:bg-slate-900 p-2 border border-slate-200 dark:border-slate-700 text-rose-700 dark:text-rose-300">{message}</pre>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="ui-btn ui-btn-primary" onClick={() => window.location.reload()}>
                {t('reload')}
              </button>
              {this.actions(t)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('reportNote')}</p>
          </div>
        </div>
      );
    }
    return (
      <div role="alert" data-panel-error={this.props.name} className="ui-panel p-4 border-rose-200 dark:border-rose-900 space-y-2">
        <p className="text-sm text-slate-900 dark:text-white">
          {t('panelFailed', { name: translateText(this.props.name, lang) })}
        </p>
        <p className="text-xs text-rose-700 dark:text-rose-300 break-words">{message}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="ui-btn" onClick={() => this.setState({ error: null, copied: false })}>
            {t('tryAgain')}
          </button>
          {this.actions(t)}
        </div>
      </div>
    );
  }
}
