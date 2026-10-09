const CACHE = "fab-static-v4";
const ASSETS = ["/offline.html", "/icon.svg", "/icons/logo-maskable.svg", "/images/logo-fashion-afro-braids.png"];
const LOCAL = ["localhost", "127.0.0.1", "[::1]"].includes(self.location.hostname) || self.location.hostname.endsWith(".localhost");
self.addEventListener("install", event => { if (!LOCAL) event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith("fab-static-") && (LOCAL || key !== CACHE)).map(key => caches.delete(key)));
    if (LOCAL) await self.registration.unregister();
    else await self.clients.claim();
  })());
});
self.addEventListener("fetch", event => {
  if (LOCAL) return;
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin") || url.pathname.startsWith("/reservation/") || url.pathname.startsWith("/commande/") || url.pathname.startsWith("/mes-rendez-vous")) return;
  if (event.request.mode === "navigate") event.respondWith(fetch(event.request).catch(() => caches.match("/offline.html")));
  else if (ASSETS.includes(url.pathname)) event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
