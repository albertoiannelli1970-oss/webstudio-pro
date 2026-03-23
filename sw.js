const CACHE_NAME = 'studio-pro-v2-vibrant';
const ASSETS = [
  'index.html',
  'nebula.css',
  'nexus.js',
  'icon-512.png',
  'https://cdn.jsdelivr.net/npm/lucide@latest/dist/umd/lucide.js',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;700;900&display=swap'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});
