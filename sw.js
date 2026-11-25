const V = "iskaashato-v1";
const SHELL = ["./", "index.html", "manifest.webmanifest", "assets/css/app.css", "assets/icons/icon.svg", "assets/js/app.js", "assets/js/portal.js", "assets/js/auth-ui.js", "xubin/index.html", "dadweyne/index.html", "assets/js/open.js", "assets/js/common.js", "assets/js/config.js", "assets/js/data.js", "assets/js/firebase.js", "assets/js/reports.js"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== V).map((x) => caches.delete(x)))).then(() => self.clients.claim())); });
// Stale-while-revalidate for same-origin files; Firebase traffic is never intercepted.
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(caches.open(V).then(async (c) => {
    const hit = await c.match(e.request);
    const net = fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
