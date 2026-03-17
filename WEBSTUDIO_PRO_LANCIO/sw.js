const CACHE_NAME = 'webstudio-v3';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './core.js',
  './primanota.js',
  './manifest.json',
  './logo.png',
  './logo-agenda.png',
  './logo-fatture.png',
  './logo-magazzino.png',
  './logo-preventivi.png',
  './logo-primanota.png',
  './logo-rubrica.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
