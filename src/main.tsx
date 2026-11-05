import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { WatchlistWindow } from './components/WatchlistWindow';
import { PanelBoundary } from './components/PanelBoundary';
import './index.css';

// /?view=watchlist is the watchlist popped out into its own window or tab.
const popOut = new URLSearchParams(window.location.search).get('view') === 'watchlist';

createRoot(document.getElementById('root')!).render(
  <PanelBoundary page name={popOut ? 'The watchlist' : 'The app'}>{popOut ? <WatchlistWindow /> : <App />}</PanelBoundary>
);
