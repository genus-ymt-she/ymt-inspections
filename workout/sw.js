/* Workout Tracker service worker – scoped to this folder only.
   App shell: cache-first, refreshed in the background (fast and reliable with poor signal).
   programme.json: network-first with a short timeout, so edits show on the next open. */
const C = "workout-v2";
const SHELL = ["./", "./index.html", "./app.css", "./manifest.webmanifest", "./programme.json",
  "./js/app.js", "./js/db.js", "./js/logic.js",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png"];

self.addEventListener("install", e => { e.waitUntil(caches.open(C).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: "reload" }))))); self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x.startsWith("workout-") && x !== C).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});

const put = (req, res) => { if (res && res.ok) { const cp = res.clone(); caches.open(C).then(c => c.put(req, cp)); } return res; };

self.addEventListener("fetch", e => {
  const req = e.request; const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  const cacheKey = req.mode === "navigate" ? "./index.html" : req;

  if (url.pathname.endsWith("/programme.json")) {
    e.respondWith(Promise.race([
      fetch(req.url, { cache: "no-cache" }).then(r => put(req, r)),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 4000)),
    ]).catch(() => caches.match(req, { ignoreSearch: true })));
    return;
  }
  e.respondWith(caches.match(cacheKey, { ignoreSearch: true }).then(hit => {
    const net = fetch(req.mode === "navigate" ? "./index.html" : req.url, { cache: "no-cache" }).then(r => put(cacheKey, r)).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    return net.then(r => r || caches.match("./index.html"));
  }));
});
