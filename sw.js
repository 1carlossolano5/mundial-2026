/* =====================================================================
   Mundial 2026 — Service Worker (PWA)
   ---------------------------------------------------------------------
   Estrategia por tipo de petición:
   - APIs de datos (FIFA / TheSportsDB / /api)  -> network-first
       (siempre lo más fresco; si no hay red, sirve lo último cacheado.
        NUNCA devuelve marcadores viejos estando online.)
   - Navegación HTML                            -> network-first + respaldo offline
   - Imágenes (escudos, estadios, fotos)        -> cache-first (no cambian)
   - CSS / JS / fuentes                          -> stale-while-revalidate
   ===================================================================== */

const VERSION = "v3";
const PRECACHE = `mundial2026-precache-${VERSION}`;
const RUNTIME = `mundial2026-runtime-${VERSION}`;

// Shell de la app: lo mínimo para que cargue (y abra offline).
const SHELL = [
  "/index.html",
  "/manifest.json",
  "/css/styles.css",
  "/js/data.js",
  "/js/nav.js",
  "/js/api.js",
  "/js/format.js",
  "/js/leaders.js",
  "/js/groups.js",
  "/js/teams.js",
  "/js/stadiums.js",
  "/js/calendar.js",
  "/js/modals.js",
  "/js/team-detail.js",
  "/js/player-detail.js",
  "/js/pitch.js",
  "/js/youtube.js",
  "/js/match-detail.js",
  "/js/notify.js",
  "/js/simulator.js",
  "/js/pwa.js",
  "/img/logo2026.png",
  "/img/icons/icon-192.png",
  "/img/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE)
      // addAll falla entero si UNA falla; cacheamos una a una y toleramos fallos.
      .then((cache) => Promise.allSettled(SHELL.map((u) => cache.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== PRECACHE && k !== RUNTIME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Permite que la página pida activar de inmediato una versión nueva.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

// --- Estrategias ---
async function networkFirst(req) {
  try {
    const fresh = await fetch(req);
    if (fresh && fresh.ok) {
      const cache = await caches.open(RUNTIME);
      cache.put(req, fresh.clone());
    }
    return fresh;
  } catch {
    const cached = await caches.match(req);
    if (cached) return cached;
    throw new Error("sin red y sin caché");
  }
}

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  const fresh = await fetch(req);
  if (fresh && (fresh.ok || fresh.type === "opaque")) {
    const cache = await caches.open(RUNTIME);
    cache.put(req, fresh.clone());
  }
  return fresh;
}

async function staleWhileRevalidate(req) {
  const cached = await caches.match(req);
  const fetching = fetch(req)
    .then((fresh) => {
      if (fresh && fresh.ok) {
        caches.open(RUNTIME).then((c) => c.put(req, fresh.clone()));
      }
      return fresh;
    })
    .catch(() => null);
  return cached || (await fetching) || Response.error();
}

async function navigationHandler(req) {
  try {
    return await fetch(req);
  } catch {
    return (
      (await caches.match(req)) ||
      (await caches.match("/index.html")) ||
      Response.error()
    );
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // POST/etc. pasan directo a la red
  const url = new URL(req.url);

  // 1) APIs de datos en vivo -> network-first
  const isApi =
    url.pathname.startsWith("/api/") ||
    /(^|\.)fifa\.com$/.test(url.hostname) ||
    /(^|\.)thesportsdb\.com$/.test(url.hostname);
  if (isApi) return event.respondWith(networkFirst(req));

  // 2) Navegación (documento HTML) -> network-first + respaldo offline
  if (req.mode === "navigate") return event.respondWith(navigationHandler(req));

  // 3) Fuentes de Google -> SWR (quedan disponibles offline)
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com")
    return event.respondWith(staleWhileRevalidate(req));

  // 4) Imágenes (escudos, estadios, fotos de jugadores, miniaturas) -> cache-first
  if (req.destination === "image") return event.respondWith(cacheFirst(req));

  // 5) Otro origen (reproductor de YouTube, etc.) -> no interceptar
  if (url.origin !== self.location.origin) return;

  // 6) Estáticos del propio sitio (css/js) -> SWR
  event.respondWith(staleWhileRevalidate(req));
});
