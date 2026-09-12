/* Service worker mínimo: cachea el shell para que la app abra sin conexión.
   Al cambiar archivos, subí el número de CACHE para forzar la actualización. */
var CACHE = "balance-mensual-v1";
var ASSETS = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/data.js",
  "./js/store.js",
  "./js/table.js",
  "./js/app.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
                             .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  var url = new URL(e.request.url);
  /* Las fuentes de Google se piden a la red y se cachean al vuelo */
  if (url.origin !== location.origin) {
    e.respondWith(
      caches.match(e.request).then(function (hit) {
        return hit || fetch(e.request).then(function (res) {
          var copia = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copia); });
          return res;
        }).catch(function () { return hit; });
      })
    );
    return;
  }
  /* Propio: red primero, cache como respaldo, para no quedar con versiones viejas */
  e.respondWith(
    fetch(e.request).then(function (res) {
      var copia = res.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copia); });
      return res;
    }).catch(function () {
      return caches.match(e.request).then(function (hit) { return hit || caches.match("./index.html"); });
    })
  );
});
