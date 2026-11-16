// Cache simples: páginas pela rede (com reserva offline), imagens e dados pelo cache.
const V = 'bene-v3';
const CORE = ['/', '/index.html', '/data.js', '/img/logo.webp', '/img/bene.webp', '/img/icon-192.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  const fresh = u.pathname === '/' || u.pathname.endsWith('.html') || u.pathname.endsWith('.js');
  if (fresh) e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(V).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match('/index.html'))));
  else e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(n => { if (n.ok) { const c = n.clone(); caches.open(V).then(x => x.put(e.request, c)); } return n; })));
});
