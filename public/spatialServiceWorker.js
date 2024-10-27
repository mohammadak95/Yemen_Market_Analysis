// spatialServiceWorker.js

const CACHE_NAME = 'spatial-analysis-cache-v1';
const STATIC_CACHE = 'static-cache-v1';

const STATIC_ASSETS = [
  '/static/js/',
  '/static/css/',
  '/data/'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME),
      caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS))
    ])
  );
  // Immediately take control
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME && name !== STATIC_CACHE)
            .map(name => caches.delete(name))
        );
      }),
      // Immediately take control of all pages
      clients.claim()
    ])
  );
});

self.addEventListener('fetch', (event) => {
  // Don't cache API requests
  if (event.request.url.includes('/data/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Clone the response before using it
          const responseClone = response.clone();
          
          // Only cache successful responses
          if (response.ok) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          
          return response;
        })
        .catch(() => {
          // If network request fails, try to get from cache
          return caches.match(event.request);
        })
    );
    return;
  }

  // For other requests, try cache first, then network
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});