self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Wortwinkel", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Wortwinkel";
  const options = {
    body: data.body || "",
    icon: "/icon-192",
    badge: "/icon-192",
    data: { url: data.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        const clientUrl = new URL(client.url);
        if (clientUrl.pathname === url && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});

// ---------------------------------------------------------------------------
// Offline-Lesen und schnelleres Laden
// ---------------------------------------------------------------------------
const VERSION = "v2";
const PAGES = `pages-${VERSION}`;
const STATIC = `static-${VERSION}`;
const IMAGES = `images-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const MAX_PAGES = 60;
const MAX_IMAGES = 200;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC).then((c) => c.add(OFFLINE_URL)).catch(() => {}));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => ![PAGES, STATIC, IMAGES].includes(k)).map((k) => caches.delete(k))),
    ),
  );
});

// Beim Abmelden alles Gespeicherte löschen (auf gemeinsam genutzten Geräten).
self.addEventListener("message", (event) => {
  if (event.data === "clear-caches") {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).then(() => caches.open(STATIC)).then((c) => c.add(OFFLINE_URL)).catch(() => {}),
    );
  }
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > max) await Promise.all(keys.slice(0, keys.length - max).map((k) => cache.delete(k)));
}

// Netz zuerst (mit Zeitlimit), sonst die zuletzt gespeicherte Fassung.
async function networkFirst(request, cacheName, timeoutMs) {
  const cache = await caches.open(cacheName);
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), timeoutMs)),
    ]);
    if (response && response.ok && !response.redirected) {
      cache.put(request, response.clone()).then(() => trim(cacheName, MAX_PAGES));
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

async function staleWhileRevalidate(request, cacheName, max) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetching = fetch(request)
    .then((response) => {
      if (response && (response.ok || response.type === "opaque")) {
        cache.put(request, response.clone()).then(() => trim(cacheName, max));
      }
      return response;
    })
    .catch(() => null);
  return cached || (await fetching) || Response.error();
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) cache.put(request, response.clone());
  return response;
}

const SKIP_PATHS = [/^\/api\//, /^\/login/, /^\/signup/, /^\/switch-character/, /\/epub$/];

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Bilder aus dem Speicher (Supabase Storage): erst gespeichert, im Hintergrund erneuern.
  if (request.destination === "image" && /\.supabase\.co$/.test(url.hostname)) {
    event.respondWith(staleWhileRevalidate(request, IMAGES, MAX_IMAGES));
    return;
  }

  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC));
    return;
  }
  if (SKIP_PATHS.some((re) => re.test(url.pathname))) return;

  const isPage = request.mode === "navigate" || (request.headers.get("RSC") === "1" && !request.headers.get("Next-Router-Prefetch"));
  if (isPage) {
    event.respondWith(
      networkFirst(request, PAGES, 4000).catch(async () => {
        if (request.mode === "navigate") {
          const offline = await caches.match(OFFLINE_URL);
          if (offline) return offline;
        }
        return Response.error();
      }),
    );
  }
});
