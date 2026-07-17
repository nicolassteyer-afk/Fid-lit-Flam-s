const CACHE_NAME = "flams-fidelite-v6";
const APP_SHELL = [
  "./",
  "./index.html",
  "./carte.html",
  "./restaurant-login.html",
  "./restaurant.html",
  "./admin-login.html",
  "./admin.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./assets/brand/2025-09-FLAMS-Valise-Logo_LOGO-BDX.svg",
  "./assets/brand/2025-09-FLAMS-Valise-Logo_ILLU-BIERE-JAUNE.svg",
  "./assets/brand/2025-09-FLAMS-Valise-Logo_ILLU-DRAGON-BEIGE.svg",
  "./assets/brand/2025-09-FLAMS-Valise-Logo_ILLU-DRAGON-JAUNE.svg",
  "./assets/brand/2025-09-FLAMS-Valise-Logo_ILLU-DRAGON-ROUGE.svg",
  "./assets/brand/2025-09-FLAMS-Valise-Logo_ILLU-FLAMME-BDX.svg",
  "./assets/brand/2025-09-FLAMS-Valise-Logo_ILLU-FLAMME-JAUNE.svg",
  "./assets/brand/2025-09-FLAMS-Valise-Logo_ILLU-FLAMME-ROUGE.svg",
  "./assets/brand/2025-09-FLAMS-Valise-Logo_ILLU-FUT-JAUNE.svg",
  "./assets/brand/2025-09-FLAMS-Valise-Logo_ILLU-PLANCHE-ROUGE.svg",
  "./assets/brand/2025-09-FLAMS-Valise-Logo_ILLU-VIN-BEIGE.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
