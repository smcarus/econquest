/**
 * Council chat. The conversation itself lives in CouncilChatState.tsx, above the pages, so a
 * question keeps running while you move. The screens that draw it (CouncilChatView.tsx) are
 * fetched the first time the chat or the Agents panel is shown, which keeps them out of the
 * code every visitor downloads at start.
 */
import React, { Suspense } from 'react';
import { lazyNamed } from './LazyDesk';
import { useT } from '../i18n/useLang';
import { COUNCIL } from '../i18n/messages/council';

export { CouncilChatProvider, useCouncilHasQuestion, type FullCouncilStep } from './CouncilChatState';

const load = () => import('./CouncilChatView');
const AskCouncilPanelView = lazyNamed(load, 'AskCouncilPanel');
const CouncilAgentsPanelView = lazyNamed(load, 'CouncilAgentsPanel');

/** Shown for the moment the chat's screens are downloading. */
const ChatLoading: React.FC = () => {
  const tr = useT(COUNCIL);
  return (
    <p className="text-sm text-slate-500 dark:text-slate-400 p-3" role="status" aria-live="polite" data-council-loading="true">
      {tr('loadingChat')}
    </p>
  );
};

export const AskCouncilPanel: React.FC<React.ComponentProps<typeof AskCouncilPanelView>> = (props) => (
  <Suspense fallback={<ChatLoading />}>
    <AskCouncilPanelView {...props} />
  </Suspense>
);

export const CouncilAgentsPanel: React.FC<React.ComponentProps<typeof CouncilAgentsPanelView>> = (props) => (
  <Suspense fallback={<ChatLoading />}>
    <CouncilAgentsPanelView {...props} />
  </Suspense>
);
