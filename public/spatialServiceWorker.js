// public/spatialServiceWorker.js

const CACHE_VERSION = 'spatial-analysis-cache-v1';
const STATIC_CACHE = `static-cache-${CACHE_VERSION}`;
const DATA_CACHE = `data-cache-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/', // Ensure the root is cached
  '/index.html',
  '/static/js/main.js',
  '/static/css/main.css',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png',
  // Add other specific static asset files as needed
];

// Function to limit cache size
const limitCacheSize = (cacheName, maxItems) => {
  caches.open(cacheName).then((cache) => {
    cache.keys().then((keys) => {
      if (keys.length > maxItems) {
        cache.delete(keys[0]).then(() => limitCacheSize(cacheName, maxItems));
      }
    });
  });
};

// During the install phase, cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[Service Worker] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      // Force the waiting service worker to become the active service worker
      return self.skipWaiting();
    })
  );
});

// During the activate phase, clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DATA_CACHE) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
          return null;
        })
      );
    }).then(() => {
      // Claim clients so that the service worker starts controlling them immediately
      return self.clients.claim();
    })
  );
});

// Fetch event handler
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Handle API/data requests differently
  if (url.pathname.startsWith('/data/')) {
    event.respondWith(
      caches.open(DATA_CACHE).then((cache) => {
        return fetch(request)
          .then((response) => {
            // If the response is good, clone it and store it in the cache.
            if (response.status === 200) {
              cache.put(request, response.clone());
              limitCacheSize(DATA_CACHE, 100); // Example limit
            }
            return response;
          })
          .catch(() => {
            // If the network request failed, try to get it from the cache.
            return cache.match(request);
          });
      })
    );
    return;
  }

  // For other requests, use Cache First strategy
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // Return cached response if found
      if (cachedResponse) {
        return cachedResponse;
      }

      // Else, fetch from network
      return fetch(request).then((networkResponse) => {
        // Check if we received a valid response
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        // Clone the response to add to cache
        const responseToCache = networkResponse.clone();

        caches.open(STATIC_CACHE).then((cache) => {
          cache.put(request, responseToCache);
          limitCacheSize(STATIC_CACHE, 50); // Example limit
        });

        return networkResponse;
      }).catch(() => {
        // Optional: Return a fallback page or asset if fetch fails
        if (request.destination === 'document') {
          return caches.match('/index.html');
        }
        return new Response('You are offline', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({ 'Content-Type': 'text/plain' }),
        });
      });
    })
  );
});
