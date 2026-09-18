// Service worker: lets the installed game open and play without a network.
// What the parent downloaded for offline mode is in OFFLINE_CACHE (filled by services/offline.ts, which also
// keeps only the word of each 教育部 recording). While online, small files (the page, scripts, fonts, stroke data)
// are also kept in RUNTIME_CACHE so the game opens quickly; audio isn't, the offline download covers that.
const OFFLINE_CACHE = 'offline-content';
const RUNTIME_CACHE = 'runtime-v2';
const NETWORK_TIMEOUT_MS = 4000;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil((async () => {
  // Older runtime caches (runtime-v1 kept whole recordings) are dropped
  for (const name of await caches.keys()) {
    if (name !== OFFLINE_CACHE && name !== RUNTIME_CACHE) await caches.delete(name);
  }
  await self.clients.claim();
})()));

/** The offline download first: it holds the trimmed recordings. */
const fromCache = async request =>
  (await (await caches.open(OFFLINE_CACHE)).match(request, { ignoreVary: true })) ||
  (await (await caches.open(RUNTIME_CACHE)).match(request, { ignoreVary: true }));

const remember = (request, response) => {
  // Opaque responses (Tailwind's script) can be kept too; errors can't
  if (response && (response.ok || response.type === 'opaque')) {
    const copy = response.clone();
    caches.open(RUNTIME_CACHE).then(cache => cache.put(request, copy)).catch(() => {});
  }
  return response;
};

// The offline downloader asks with cache: 'no-store': it saves the file itself, so no second copy here
const downloading = request => request.cache === 'no-store';

/** Network first (so online players get updates), the saved copy when offline or the network hangs. */
const networkFirst = async (request, { keep, fallbackUrl } = {}) => {
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), NETWORK_TIMEOUT_MS)),
    ]);
    return keep && !downloading(request) ? remember(request, response) : response;
  } catch (e) {
    const cached = (await fromCache(request)) || (fallbackUrl && (await fromCache(fallbackUrl)));
    if (cached) return cached;
    throw e;
  }
};

/** Saved copy first: files whose content never changes under the same address. */
const cacheFirst = async request => {
  if (downloading(request)) return fetch(request);
  const cached = await fromCache(request);
  // A copy saved from a <link> or <script> is opaque, and a request that reads the content (the font list) can't use it
  if (cached && !(cached.type === 'opaque' && request.mode === 'cors')) return cached;
  return remember(request, await fetch(request));
};

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    // AI features always need the network
    if (url.pathname.startsWith('/api/generate')) return;
    if (request.mode === 'navigate') {
      event.respondWith(networkFirst(request, { keep: true, fallbackUrl: '/index.html' }));
      return;
    }
    // Built JavaScript and CSS have their content hash in the name
    if (url.pathname.startsWith('/assets/')) {
      event.respondWith(cacheFirst(request));
      return;
    }
    // Audio and everything else: from the offline download when there is no network
    event.respondWith(networkFirst(request, { keep: !url.pathname.startsWith('/audio/') && !url.pathname.startsWith('/api/') }));
    return;
  }

  // Fonts, Tailwind and stroke data: fixed versions, so the saved copy is fine
  if (/^(fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.tailwindcss\.com|cdn\.jsdelivr\.net)$/.test(url.hostname)) {
    event.respondWith(cacheFirst(request));
  }
});
