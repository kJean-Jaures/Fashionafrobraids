const CACHE = "fab-static-v2";
const ASSETS = ["/offline.html", "/icons/icon-192.png", "/icons/icon-512.png"];
self.addEventListener("install", event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener("activate", event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("fab-static-") && key !== CACHE).map(key => caches.delete(key))))); self.clients.claim(); });
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin") || url.pathname.startsWith("/reservation/") || url.pathname.startsWith("/commande/") || url.pathname.startsWith("/mes-rendez-vous")) return;
  if (event.request.mode === "navigate") event.respondWith(fetch(event.request).catch(() => caches.match("/offline.html")));
  else if (ASSETS.includes(url.pathname)) event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
