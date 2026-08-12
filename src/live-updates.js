import { apiPath, liveRefreshInterval, platform } from './base-path.js';

export function subscribeToResultUpdates(callback) {
  if (platform !== 'wordpress') {
    const events = new EventSource(apiPath('/api/events'));
    events.addEventListener('result-created', callback);
    events.addEventListener('result-deleted', callback);
    events.addEventListener('monthly-workout-updated', callback);
    events.addEventListener('monthly-workout-clicked', callback);
    return () => events.close();
  }

  let stopped = false;
  let lastVersion = null;
  let polling = false;

  async function poll() {
    if (stopped || polling || document.visibilityState === 'hidden') return;
    polling = true;
    try {
      const response = await fetch(apiPath('/api/updates'), { cache: 'no-store' });
      if (!response.ok) return;
      const payload = await response.json();
      const nextVersion = Number(payload.version);
      if (lastVersion !== null && nextVersion !== lastVersion) callback({ data: JSON.stringify(payload) });
      lastVersion = nextVersion;
    } catch {
      // A later poll will retry without interrupting the page.
    } finally {
      polling = false;
    }
  }

  const visibilityListener = () => {
    if (document.visibilityState === 'visible') poll();
  };
  document.addEventListener('visibilitychange', visibilityListener);
  poll();
  const timer = window.setInterval(poll, liveRefreshInterval);

  return () => {
    stopped = true;
    window.clearInterval(timer);
    document.removeEventListener('visibilitychange', visibilityListener);
  };
}
