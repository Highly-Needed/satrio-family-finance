const CACHE_NAME = 'sff-v3';
const ASSETS = ['./index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // JANGAN intercept request ke Supabase atau CDN eksternal
  const url = new URL(e.request.url);
  if (url.hostname.includes('supabase') || 
      url.hostname.includes('jsdelivr') ||
      url.hostname.includes('supabase.co')) {
    return; // biarkan request langsung ke internet
  }
  
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
