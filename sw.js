/* Service worker Aplikasi CLR Peneleh.
   Tugas: (1) aplikasi bisa dipasang di HP, (2) layar aplikasi tetap terbuka saat sinyal putus.
   Data TIDAK disimpan di sini: semua panggilan ke Google (script.google.com) langsung lewat, tidak pernah dicatat.
   Setiap berkas aplikasi selalu diambil dari internet lebih dulu supaya pembaruan langsung terpakai;
   salinan di HP hanya dipakai bila internet tidak ada (atau lebih dari 4 detik tidak menjawab). */
var VER = 'clr-pwa-v7-1';
var SHELL = ['./', 'index.html', 'config.js', 'pwa.js', 'manifest.json',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-48.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(VER).then(function (c) {
      return Promise.all(SHELL.map(function (u) { return c.add(new Request(u, { cache: 'reload' })).catch(function () {}); }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.filter(function (k) { return k !== VER && k.indexOf('clr-pwa-') === 0; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

function dariCache(req) {
  return caches.match(req, { ignoreSearch: true }).then(function (m) {
    if (m) return m;
    if (req.mode === 'navigate') return caches.match(new URL('index.html', self.registration.scope).href);
    return undefined;
  });
}

function internetDulu(req) {
  return new Promise(function (resolve) {
    var selesai = false;
    var tunggu = setTimeout(function () {
      dariCache(req).then(function (m) { if (m && !selesai) { selesai = true; resolve(m); } });
    }, 4000);
    fetch(req, { cache: 'no-cache' }).then(function (res) {
      clearTimeout(tunggu);
      if (res && res.ok && res.type === 'basic') { var salin = res.clone(); caches.open(VER).then(function (c) { c.put(req, salin); }); }
      if (!selesai) { selesai = true; resolve(res); }
    }).catch(function () {
      clearTimeout(tunggu);
      dariCache(req).then(function (m) { if (!selesai) { selesai = true; resolve(m || Response.error()); } });
    });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var u = new URL(req.url);
  if (u.origin !== self.location.origin) return;            /* Google Apps Script dan situs lain: jangan disentuh */
  if (u.pathname.indexOf(new URL(self.registration.scope).pathname) !== 0) return;
  e.respondWith(internetDulu(req));
});

self.addEventListener('message', function (e) { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });
