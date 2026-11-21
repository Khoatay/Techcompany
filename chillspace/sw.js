/* Service worker: lưu sẵn giao diện để mở nhanh & dùng offline (YouTube vẫn cần mạng) */
const CACHE = 'chillspace-v57';
const ASSETS = ['./', 'index.html', 'css/style.css', 'css/theme.css', 'js/config.js', 'js/spaces.js', 'js/room.js', 'js/pro.js', 'js/audio.js', 'js/noise-worklet.js', 'js/tools.js', 'js/atmos.js', 'js/vip.js', 'js/music.js', 'js/myapps.js', 'music.json', 'sounds/index.json', 'js/live.js', 'js/sprites.js', 'js/app.js', 'icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'manifest.webmanifest'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  // mạng trước, lỗi mạng thì dùng bản lưu
  e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(CACHE).then((x) => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
});
