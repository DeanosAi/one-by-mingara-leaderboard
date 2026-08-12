import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App.jsx';
import { serviceWorkerConfig } from './base-path.js';
import './styles.css';

ReactDOM.createRoot(document.getElementById('one-leaderboard-root')).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    const worker = serviceWorkerConfig();
    navigator.serviceWorker.register(worker.url, worker.scope ? { scope: worker.scope } : undefined).catch(() => {
      // The app remains fully usable when a host or security plugin blocks service workers.
    });
  });
}
