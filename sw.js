// Service Worker for Newsroom Studio - Offline Support
// v11: Network-first strategy (fixes stale cache issue)
const CACHE_NAME = 'wqzm-v11';
const PAGE_URL = './';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(PAGE_URL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// Network-first: always try network first, fall back to cache when offline
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).then((response) => {
      // Cache same-origin responses for offline use
      if (response.ok && event.request.url.startsWith(self.location.origin)) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
      }
      return response;
    }).catch(() => {
      // Network failed - return cached version
      return caches.match(event.request).then((cached) => {
        return cached || caches.match(PAGE_URL);
      });
    })
  );
});
