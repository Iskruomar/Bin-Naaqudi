const CACHE = "iskaashato-v2";
const SHELL = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "assets/css/app.css",
  "assets/icons/icon.svg",
  "assets/js/app.js",
  "assets/js/portal.js",
  "assets/js/admin.js",
  "assets/js/open.js",
  "assets/js/auth-ui.js",
  "assets/js/common.js",
  "assets/js/config.js",
  "assets/js/data.js",
  "assets/js/firebase.js",
  "assets/js/publish.js",
  "assets/js/reports.js",
  "xubin/index.html",
  "dadweyne/index.html",
  "admin/index.html"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Prefer fresh same-origin HTML and JavaScript so deployments cannot get stuck
// using a cached Firebase config. Keep a cached copy for offline fallback.
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    } catch {
      const cached = await cache.match(request);
      return cached || Response.error();
    }
  })());
});
