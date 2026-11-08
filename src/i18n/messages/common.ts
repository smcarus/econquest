/**
 * Small shared pieces used across the app at start-up: "Show the numbers" under a chart, the
 * loading note for a desk, and the note when a panel fails to draw. Kept short because it loads
 * with the first screen.
 */
import { defineMessages } from '../lang';

export const COMMON = defineMessages('common', {
  showNumbers: 'Show the numbers',
  loadingDesk: 'Loading desk…',
  panelFailed: '{name} could not be drawn. The rest of the app still works.',
  tryAgain: 'Try again',
  appFailed: 'Something went wrong drawing the app',
  appFailedBody: 'Your saved data is safe. Reload to try again. If it keeps happening, the error below helps find the cause.',
  reload: 'Reload',
  badgeTitle: '{name}: {label}. {more} Click for the register.',
  stricterFail: 'Passed, fails stricter check',
});
