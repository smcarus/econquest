import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { WatchlistWindow } from './components/WatchlistWindow';
import { PanelBoundary } from './components/PanelBoundary';
import './index.css';
import { mirrorSavesToDisk, startWorkspaceSync } from './utils/workspaceSync';

// /?view=watchlist is the watchlist popped out into its own window or tab.
const popOut = new URLSearchParams(window.location.search).get('view') === 'watchlist';

// Holdings, watchlists, added countries and AI settings live in data/local/workspace.json, so the
// app shows the same ones at any address (Docker or npm run dev). Load them before the first draw.
const draw = () =>
  createRoot(document.getElementById('root')!).render(
    <PanelBoundary page name={popOut ? 'The watchlist' : 'The app'}>{popOut ? <WatchlistWindow /> : <App />}</PanelBoundary>
  );

let storage: Storage | null = null;
try {
  storage = window.localStorage;
} catch {
  storage = null; // storage blocked: the app runs for this session only
}
if (storage) {
  const target = storage;
  void startWorkspaceSync({ storage: target, fetchFn: window.fetch.bind(window) }).finally(() => {
    mirrorSavesToDisk(Storage.prototype, target, window.fetch.bind(window));
    draw();
  });
} else {
  draw();
}
