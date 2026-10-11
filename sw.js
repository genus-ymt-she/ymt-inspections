/* PARRON service worker – network first, falls back to the cached copy so the app works with no signal. */
const C = "parron-v2.7.0";
const FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./config.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png",
  "./assets/genus-logo-white.svg",
  "./assets/icon-any.svg",
  "./css/app.css",
  "./assets/logo.png",
  "./js/vendor/jspdf.umd.min.js",
  "./js/vendor/jspdf.plugin.autotable.min.js",
  "./js/data/assets.js",
  "./js/data/templates.js",
  "./js/app/config.js",
  "./js/app/core.js",
  "./js/app/model.js",
  "./js/app/views.js",
  "./js/app/form.js",
  "./js/app/report.js",
  "./js/app/register.js",
  "./js/app/actions.js",
  "./js/app/observe.js",
  "./js/app/dashboard.js",
  "./js/app/monthly.js",
  "./js/app/records.js",
  "./js/app/pdf.js",
  "./js/app/send.js",
  "./js/app/voice.js",
  "./js/app/boot.js"
];
self.addEventListener("install", e => { e.waitUntil(caches.open(C).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x))))); self.clients.claim(); });
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || !e.request.url.startsWith(self.location.origin)) return;
  // "no-cache" makes the browser check GitHub for a newer file every time (a quick 304 when unchanged),
  // so a published update shows on the next open instead of up to 10 minutes later
  e.respondWith(fetch(e.request.url, { cache: "no-cache", credentials: "same-origin" }).then(r => { if (r.ok) { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match("./index.html"))));
});
