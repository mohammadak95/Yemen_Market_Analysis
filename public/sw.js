// public/sw.js

const CACHE_NAME = 'yemen-market-cache-v1';
const urlsToCache = [
  '/', // Cache the root path
  '/index.html',
  '/static/js/bundle.js', // Adjust paths based on your build output
  '/results/choropleth_data/geoBoundaries-YEM-ADM1.geojson',
  '/results/enhanced_unified_data_with_residual.geojson',
  '/results/spatial_weights/transformed_spatial_weights.json',
  '/results/network_data/time_varying_flows.csv',
  '/results/spatial_analysis_results.json',
  // Add other assets as needed
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response; // Serve from cache
      }
      return fetch(event.request).then((networkResponse) => {
        // Optionally cache new requests
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});