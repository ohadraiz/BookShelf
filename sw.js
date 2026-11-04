/* BookShelf service worker - shared by app.html and beta.html (same folder, same scope).
   Network first: when online you always get the latest version from GitHub Pages;
   when offline, the last copy that was loaded is served from the cache.
   Change CACHE only to drop every old copy at once. */
'use strict';
const CACHE = 'bookshelf-cache-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('bookshelf-cache-') && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

const sameOrigin = (u) => { try { return new URL(u, self.location).origin === self.location.origin; } catch (e) { return false; } };

// The page sends the files it loaded, so the first visit is enough to work offline.
self.addEventListener('message', (e) => {
  const d = e.data || {};
  if (d.type !== 'cache' || !Array.isArray(d.urls)) return;
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(
    d.urls.filter(sameOrigin).map((u) => fetch(u, { cache: 'no-cache' })
      .then((r) => (r.ok ? c.put(u, r) : null)).catch(() => null))
  )));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || !sameOrigin(req.url)) return;
  e.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    } catch (err) {
      const hit = await caches.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === 'navigate') {
        const page = await caches.match('app.html', { ignoreSearch: true });
        if (page) return page;
      }
      return Response.error();
    }
  })());
});
