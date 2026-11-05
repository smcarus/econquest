/**
 * First-run guide on Workspace. A fresh install shows every figure as a dash until a feed answers,
 * which looks broken. These steps say what to do, and each ticks itself off from the app's own state.
 */
export type FirstRunStepId = 'connections' | 'fred' | 'ai' | 'watchlist';

export interface FirstRunStep {
  id: FirstRunStepId;
  title: string;
  why: string;
  done: boolean;
  action: string;
}

export interface FirstRunInput {
  /** Countries on the watchlist with at least one live feed. */
  liveCount: number;
  /** Where each key comes from, from /api/settings/keys ('none' = not set). Undefined while loading. */
  keySources?: Record<string, 'app' | 'env' | 'none'>;
  /** Menu > AI model choice. */
  aiProvider?: string;
  /** The user has opened the watchlist editor or changed lists at least once. */
  watchlistTouched: boolean;
}

export function firstRunSteps(input: FirstRunInput): FirstRunStep[] {
  const has = (id: string) => Boolean(input.keySources && input.keySources[id] && input.keySources[id] !== 'none');
  const ai = input.aiProvider === 'ollama' || input.aiProvider === 'hybrid' || input.aiProvider === 'openai_compatible' || has('GEMINI_API_KEY');
  return [
    {
      id: 'connections',
      title: 'See which data sources answer from this computer',
      why: 'Figures read Missing until a source answers. The check lists every source, with the fix for each one that does not.',
      done: input.liveCount > 0,
      action: 'Open Data connections',
    },
    {
      id: 'fred',
      title: 'Add a free FRED key',
      why: 'Official 10Y yields for the US, Mexico, South Africa, Japan, the UK, Poland and Chile. Free in two minutes at fred.stlouisfed.org.',
      done: has('FRED_API_KEY'),
      action: 'Open Settings',
    },
    {
      id: 'ai',
      title: 'Choose an AI model',
      why: 'Needed for the council summary, the debate and agent picks. Ollama runs on this computer; Gemini needs a key.',
      done: ai,
      action: 'Choose AI model',
    },
    {
      id: 'watchlist',
      title: 'Pick the countries you follow',
      why: 'Workspace, Compare and Ask the council all work from your watchlist.',
      done: input.watchlistTouched,
      action: 'Edit watchlist',
    },
  ];
}

/** Show the guide until every step is done or the user hides it. */
export function showFirstRun(steps: FirstRunStep[], dismissed: boolean): boolean {
  return !dismissed && steps.some((s) => !s.done);
}

export const FIRST_RUN_DISMISSED_KEY = 'econquest.firstRunDismissed.v1';
export const WATCHLIST_TOUCHED_KEY = 'econquest.watchlistTouched.v1';
