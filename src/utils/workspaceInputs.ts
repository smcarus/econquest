/**
 * Workspace > Your inputs: everything the user sets that changes what Workspace shows, one chip each,
 * with its state and the panels it feeds. Replaces the four-step Getting started card: a step that is
 * not done shows here as "Needs setup" with the fix, and stays visible once done so the link from
 * input to output never disappears.
 */

import { translate } from '../i18n/lang';
import { WORKSPACE } from '../i18n/messages/workspace';

/** Words for the chips, in the chosen language (English when none is passed, as in the tests). */
export type WorkspaceT = (key: keyof typeof WORKSPACE.en, vars?: Record<string, string | number>) => string;
const english: WorkspaceT = (key, vars) => translate(WORKSPACE, 'en', key, vars);

export type InputId = 'watchlist' | 'country' | 'holdings' | 'feeds' | 'keys' | 'ai' | 'research';
export type PanelId = 'digest' | 'watchlist' | 'calendar' | 'council' | 'alerts';

export const PANEL_KEY = {
  digest: 'panelDigest',
  watchlist: 'inWatchlist',
  calendar: 'nextTwoWeeks',
  council: 'panelCouncil',
  alerts: 'panelAlerts',
} as const satisfies Record<PanelId, keyof typeof WORKSPACE.en>;

export const PANEL_LABEL: Record<PanelId, string> = Object.fromEntries(
  Object.entries(PANEL_KEY).map(([id, key]) => [id, english(key)]),
) as Record<PanelId, string>;

/** ok = set and working; setup = the user has to do something; empty = optional and not used yet. */
export type InputState = 'ok' | 'setup' | 'empty';

export interface InputChip {
  id: InputId;
  label: string;
  value: string;
  state: InputState;
  /** One line on what the state means, e.g. why it needs setup. */
  note: string;
  /** Workspace panels this input changes. */
  drives: PanelId[];
  /** Other pages it feeds, in words. */
  alsoFeeds?: string;
  action: string;
}

export interface WorkspaceInputsState {
  watchlistName: string;
  watchlistCount: number;
  /** The country open in Country Research (the full council runs on it). */
  countryName: string;
  holdingsCount: number;
  /** Watchlist countries with at least one feed that answered on the last pull. */
  liveCount: number;
  /** Where each key comes from, from /api/settings/keys. Undefined while loading or unreadable. */
  keys?: { id: string; label?: string; source: 'app' | 'env' | 'none'; section?: string }[];
  /** Menu > Settings > AI model choice. */
  aiProvider?: string;
  /** Saved council briefs and policy documents (data/local/research.json). Undefined while loading. */
  research?: { briefs: number; docs: number };
}

const AI_KEY: Record<string, 'aiOllama' | 'aiHybrid' | 'aiOwnServer'> = {
  ollama: 'aiOllama',
  hybrid: 'aiHybrid',
  openai_compatible: 'aiOwnServer',
};

export function hasAiModel(aiProvider: string | undefined, keys: WorkspaceInputsState['keys']): boolean {
  if (aiProvider === 'ollama' || aiProvider === 'hybrid' || aiProvider === 'openai_compatible') return true;
  return Boolean(keys?.some((k) => k.id === 'GEMINI_API_KEY' && k.source !== 'none'));
}

export function workspaceInputs(s: WorkspaceInputsState, t: WorkspaceT = english): InputChip[] {
  const count = (n: number, one: Parameters<WorkspaceT>[0], many: Parameters<WorkspaceT>[0]) => (n === 1 ? t(one) : t(many, { n }));
  const aiLabel = (p: string) => (p === 'gemini' ? 'Gemini' : AI_KEY[p] ? t(AI_KEY[p]!) : t('aiChosen'));
  const freeKeys = (s.keys || []).filter((k) => (k.section || 'free_key') === 'free_key' && k.id !== 'GEMINI_API_KEY');
  const keysSet = freeKeys.filter((k) => k.source !== 'none').length;
  const fred = s.keys?.find((k) => k.id === 'FRED_API_KEY');
  const fredSet = Boolean(fred && fred.source !== 'none');
  const ai = hasAiModel(s.aiProvider, s.keys);
  const research = s.research;
  const researchCount = research ? research.briefs + research.docs : 0;

  return [
    {
      id: 'watchlist',
      label: t('inWatchlist'),
      value: s.watchlistCount ? count(s.watchlistCount, 'countryOne', 'countryMany') : t('noCountries'),
      state: s.watchlistCount ? 'ok' : 'setup',
      note: s.watchlistCount ? t('watchlistOk', { name: s.watchlistName }) : t('watchlistMissing'),
      drives: ['digest', 'watchlist', 'calendar', 'council', 'alerts'],
      alsoFeeds: t('alsoCompare'),
      action: t('editWatchlist'),
    },
    {
      id: 'country',
      label: t('openCountry'),
      value: s.countryName || t('none'),
      state: s.countryName ? 'ok' : 'empty',
      note: t('openCountryNote'),
      drives: ['watchlist', 'council'],
      alsoFeeds: t('alsoOneCountry'),
      action: t('openOneCountry'),
    },
    {
      id: 'feeds',
      label: t('dataFeeds'),
      value: s.watchlistCount ? t('liveFor', { live: s.liveCount, total: s.watchlistCount }) : t('noCountries'),
      state: s.liveCount > 0 ? 'ok' : 'setup',
      note:
        s.liveCount > 0
          ? t('feedsOk')
          : t('feedsMissing'),
      drives: ['digest', 'watchlist', 'council', 'alerts'],
      action: t('openConnections'),
    },
    {
      id: 'keys',
      label: t('freeKeys'),
      value: s.keys ? t('keysSet', { set: keysSet, total: freeKeys.length }) : t('missing'),
      state: !s.keys ? 'setup' : fredSet ? 'ok' : 'setup',
      note: !s.keys
        ? t('noServer')
        : fredSet
          ? t('fredSet')
          : t('fredMissing'),
      drives: ['digest', 'watchlist', 'council'],
      action: t('openSettings'),
    },
    {
      id: 'ai',
      label: t('aiModel'),
      value: ai ? aiLabel(s.aiProvider || '') : t('aiNotChosen'),
      state: ai ? 'ok' : 'setup',
      note: ai
        ? t('aiOk')
        : t('aiMissing'),
      drives: ['council'],
      action: t('chooseAi'),
    },
    {
      id: 'holdings',
      label: t('holdings'),
      value: s.holdingsCount ? count(s.holdingsCount, 'positionOne', 'positionMany') : t('noneYet'),
      state: s.holdingsCount ? 'ok' : 'empty',
      note: s.holdingsCount ? t('holdingsOk') : t('holdingsEmpty'),
      drives: ['watchlist'],
      alsoFeeds: t('alsoPortfolio'),
      action: t('openHoldings'),
    },
    {
      id: 'research',
      label: t('savedResearch'),
      value: !research ? t('missing') : researchCount ? `${count(research.briefs, 'briefOne', 'briefMany')} · ${count(research.docs, 'documentOne', 'documentMany')}` : t('noneYet'),
      state: !research ? 'setup' : researchCount ? 'ok' : 'empty',
      note: !research
        ? t('noServer')
        : researchCount
          ? t('researchOk')
          : t('researchEmpty'),
      drives: ['council'],
      alsoFeeds: t('alsoReports'),
      action: t('showInChat'),
    },
  ];
}

/** The inputs each panel uses, for the "Uses:" line on the panel. */
export function panelUses(chips: InputChip[], panel: PanelId): InputChip[] {
  return chips.filter((c) => c.drives.includes(panel));
}
