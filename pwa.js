/* Aplikasi CLR Peneleh - pendukung "aplikasi HP" (PWA).
   1) Mendaftarkan service worker (syarat agar bisa dipasang dan tetap terbuka saat sinyal putus).
   2) Kotak "Pasang di HP" di layar masuk: Android = tombol PASANG, iPhone/iPad = petunjuk 3 langkah.
   3) iPhone/iPad (aplikasi sudah terpasang): unduhan CSV/cadangan dibuka lewat menu Bagikan,
      karena aplikasi layar penuh di iOS tidak punya tombol Kembali. */
(function () {
  'use strict';
  var KEY_X = 'clr_pwa_x';                 /* kapan kotak terakhir ditutup (disembunyikan 7 hari) */
  var ua = navigator.userAgent || '';
  var iOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var android = /Android/i.test(ua);
  var tunda = null;                        /* event beforeinstallprompt (Android/Chrome) */
  var lewat = false;                       /* sudah menunggu event pemasangan beberapa detik */

  function mandiri() {
    try { return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true; } catch (e) { return false; }
  }
  function ditutup() {
    try { var t = +localStorage.getItem(KEY_X) || 0; return !!t && (Date.now() - t) < 7 * 864e5; } catch (e) { return false; }
  }
  function hapusKotak() { var b = document.getElementById('pwabar'); if (b && b.parentNode) b.parentNode.removeChild(b); }
  function tutup() { try { localStorage.setItem(KEY_X, String(Date.now())); } catch (e) {} hapusKotak(); }

  /* ---------- 1. service worker ---------- */
  var aman = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if ('serviceWorker' in navigator && aman) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js', { scope: './' }).then(function (r) { try { var u = r.update(); if (u && u.catch) u.catch(function () {}); } catch (e) {} }).catch(function () {});
    });
  }

  /* ---------- 2. kotak "Pasang di HP" ---------- */
  function isiKotak() {
    if (tunda) {
      return '<b>📲 Pasang di HP</b><span>Ikon di layar utama dan tampil layar penuh, seperti aplikasi biasa.</span>' +
        '<div class="two"><button type="button" class="btn btn-blue" id="pwago">PASANG</button><button type="button" class="btn btn-light" id="pwano">Nanti</button></div>';
    }
    if (iOS) {
      return '<b>📲 Pasang di iPhone / iPad</b>' +
        '<ol><li>Ketuk tombol <b>Bagikan</b> (kotak dengan panah ke atas; di iOS terbaru ada di menu <b>⋯</b>).</li>' +
        '<li>Pilih <b>Tambahkan ke Layar Utama</b> (Add to Home Screen).</li>' +
        '<li>Nyalakan <b>Buka sebagai Aplikasi Web</b> bila ada, lalu ketuk <b>Tambah</b>.</li></ol>' +
        '<button type="button" class="btn btn-light block" id="pwano">Mengerti</button>';
    }
    if (android && lewat) {
      return '<b>📲 Pasang di HP</b><span>Buka menu browser (<b>⋮</b>), lalu pilih <b>Instal aplikasi</b> atau <b>Tambahkan ke layar utama</b>.</span>' +
        '<button type="button" class="btn btn-light block" id="pwano" style="margin-top:10px">Mengerti</button>';
    }
    return '';
  }
  function tampil() {
    if (mandiri() || ditutup()) { hapusKotak(); return; }
    var panel = document.querySelector('.login .panel');
    if (!panel) return;
    var ada = document.getElementById('pwabar'), html = isiKotak();
    if (!html) { if (ada) hapusKotak(); return; }
    if (ada) { if (ada.getAttribute('data-m') === (tunda ? 'a' : 'b')) return; hapusKotak(); }
    var d = document.createElement('div');
    d.id = 'pwabar'; d.className = 'pwab'; d.setAttribute('data-m', tunda ? 'a' : 'b'); d.innerHTML = html;
    var ver = panel.querySelector('.ver');
    if (ver) panel.insertBefore(d, ver); else panel.appendChild(d);
  }

  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); tunda = e; tampil(); });
  window.addEventListener('appinstalled', function () { tunda = null; tutup(); });
  document.addEventListener('click', function (e) {
    var t = e.target;
    while (t && t !== document) {
      if (t.id === 'pwago') {
        if (tunda) {
          var p = tunda; tunda = null;
          try { p.prompt(); p.userChoice.then(function (c) { if (c && c.outcome === 'accepted') tutup(); else tampil(); }); } catch (x) {}
        }
        return;
      }
      if (t.id === 'pwano') { tutup(); return; }
      t = t.parentNode;
    }
  });
  var app = document.getElementById('app');
  if (app && window.MutationObserver) new MutationObserver(function () { tampil(); }).observe(app, { childList: true });
  setTimeout(function () { lewat = true; tampil(); }, 3500);
  tampil();

  /* ---------- 3. unduhan di iPhone/iPad (aplikasi terpasang) ---------- */
  var asli = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    var a = this;
    try {
      if (iOS && mandiri() && a.hasAttribute('download') && /^blob:/.test(a.href) && navigator.share && window.File) {
        var nama = a.getAttribute('download') || 'berkas.csv';
        fetch(a.href).then(function (r) { return r.blob(); }).then(function (b) {
          var f = new File([b], nama, { type: b.type || 'text/csv' });
          if (navigator.canShare && !navigator.canShare({ files: [f] })) throw new Error('tidak didukung');
          return navigator.share({ files: [f], title: nama });
        }).catch(function (x) { if (x && x.name === 'AbortError') return; try { asli.call(a); } catch (y) {} });
        return;
      }
    } catch (e) {}
    return asli.apply(this, arguments);
  };
})();
