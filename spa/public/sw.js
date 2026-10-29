// Service worker de Athenaeum: guarda la web para abrirla sin conexión.
// La página es un único archivo, así que basta con guardar index.html y los iconos.
const CACHE = "athenaeum-v1";
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // Solo nuestra propia web; el servidor del club (Supabase) y las fuentes van siempre por la red
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  // Primero la red (para tener siempre la última versión); si no hay conexión, la copia guardada
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("./index.html"))),
  );
});
