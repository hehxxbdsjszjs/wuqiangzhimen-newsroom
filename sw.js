// Service Worker 自注销脚本 - v14
// 彻底移除 SW 系统，此文件仅用于清理旧版残留
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.registration.unregister().then(() => {
      return caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
    }).then(() => self.clients.claim())
  );
});

// 不拦截任何请求，全部直通网络
self.addEventListener('fetch', () => {});
