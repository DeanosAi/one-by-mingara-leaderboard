const runtimeConfig = typeof window !== 'undefined' ? window.ONE_LEADERBOARD_CONFIG || {} : {};

function withoutTrailingSlash(value = '') {
  return String(value).replace(/\/$/, '');
}

export const basePath = import.meta.env.BASE_URL === '/'
  ? ''
  : withoutTrailingSlash(import.meta.env.BASE_URL);

export const platform = runtimeConfig.platform || 'standalone';
export const liveRefreshInterval = Math.max(Number(runtimeConfig.liveRefreshInterval) || 4000, 2000);
export const adminLoginNote = runtimeConfig.adminLoginNote || 'Use the Team testing password supplied with this preview.';

export function appPath(path = '/') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${basePath}${normalizedPath}`;
}

export function assetPath(path = '/') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return runtimeConfig.assetBase
    ? `${withoutTrailingSlash(runtimeConfig.assetBase)}${normalizedPath}`
    : appPath(normalizedPath);
}

export function apiPath(path = '/') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (!runtimeConfig.apiBase) return appPath(normalizedPath);
  const restPath = normalizedPath.replace(/^\/api(?=\/|$)/, '');
  return `${withoutTrailingSlash(runtimeConfig.apiBase)}${restPath || '/'}`;
}

export function serviceWorkerConfig() {
  return {
    url: runtimeConfig.serviceWorkerUrl || appPath('/sw.js'),
    scope: runtimeConfig.serviceWorkerScope || undefined,
  };
}
