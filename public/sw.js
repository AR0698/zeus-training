/**
 * Zeus Training service worker.
 *
 * Goal: the app opens and works in a basement gym with no signal.
 *
 * - navigations  → network first, fall back to the cached shell
 * - static files → stale-while-revalidate (instant, refreshed in background)
 * - fonts        → cache first (they never change within a version)
 *
 * No build-time manifest is required: everything is cached the first time it is
 * requested, which keeps the worker correct whatever Vite names the bundles.
 */

const VERSION = "v2";
const SHELL_CACHE = `zeus-shell-${VERSION}`;
const ASSET_CACHE = `zeus-assets-${VERSION}`;
const FONT_CACHE = `zeus-fonts-${VERSION}`;
const KEEP = new Set([SHELL_CACHE, ASSET_CACHE, FONT_CACHE]);

const SHELL_URL = new URL("./", self.registration.scope).toString();

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await cache.addAll([SHELL_URL, new URL("./manifest.webmanifest", SHELL_URL).toString()]);
      await self.skipWaiting();
    })().catch(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => !KEEP.has(name)).map((name) => caches.delete(name)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isFont =
    url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isFont) {
    event.respondWith(cacheFirst(request, FONT_CACHE));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request, ASSET_CACHE));
  }
});

async function networkFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(SHELL_URL, response.clone());
    return response;
  } catch {
    const cached = (await cache.match(SHELL_URL)) ?? (await cache.match(request));
    if (cached) return cached;
    return new Response("Hors ligne et aucune version en cache.", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === "opaque") cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached ?? network;
}
