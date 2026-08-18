/* VoiceAtlas service worker.
 *
 * Caching policy, and the reason for it:
 *
 *   This app handles 要配慮個人情報 (medical history, and names and addresses
 *   for research participation). Cache Storage is written to disk and survives
 *   logout, so anything cached here is readable later on a shared or lost
 *   device. Therefore ONLY the application shell -- markup, styles, script,
 *   icons -- is ever cached. Every /api/* response goes straight to the
 *   network and is never stored.
 *
 *   If a future change needs offline access to user data, it must come with an
 *   explicit erase-on-logout path; do not relax the rule below quietly.
 *
 * Fetch strategy is network-first with the cache as an offline fallback, so a
 * prototype under active development never serves a stale build.
 */

const CACHE = "voiceatlas-shell-v1";

const SHELL = [
  "/",
  "/styles/01-base.css",
  "/styles/02-account.css",
  "/styles/03-research.css",
  "/styles/04-notifications.css",
  "/styles/05-checkin.css",
  "/styles/06-modal.css",
  "/styles/07-page.css",
  "/styles/08-studies.css",
  "/js/main.js",
  "/js/state.js",
  "/js/util.js",
  "/js/api.js",
  "/js/mock-api.js",
  "/js/mock-data.js",
  "/js/render-bus.js",
  "/js/session.js",
  "/js/router.js",
  "/js/data.js",
  "/js/pwa.js",
  "/js/views/shell.js",
  "/js/views/auth.js",
  "/js/views/today.js",
  "/js/views/account.js",
  "/js/views/research.js",
  "/manifest.webmanifest",
  "/assets/logo.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/assets/research-consent.pdf"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // A single missing entry must not fail the whole install.
      .then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function isPersonalData(url) {
  return url.pathname.startsWith("/api/");
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isPersonalData(url)) return; // network only, never stored

  event.respondWith(
    fetch(request)
      .then((response) => {
        // ES module imports are CORS requests even same-origin, so their
        // responses are type "cors" rather than "basic"; the origin check above
        // is what keeps this to our own files.
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        // Deep links land on the SPA shell when offline.
        if (request.mode === "navigate") {
          const shell = await caches.match("/");
          if (shell) return shell;
        }
        return Response.error();
      })
  );
});
