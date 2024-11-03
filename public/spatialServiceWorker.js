// public/spatialServiceWorker.js

const CACHE_NAME = 'spatial-data-cache-v2';
const API_CACHE_NAME = 'spatial-api-cache-v2';

// Only cache local assets
const STATIC_ASSETS = [
  '/index.html',
  '/manifest.json',
  '/favicon.ico'
];

// Define API endpoints that should be cached
const API_ENDPOINTS = [
  '/results/unified_data.geojson',
  '/results/network_data/time_varying_flows.csv',
  '/results/spatial_analysis_results.json',
  '/results/choropleth_data/geoBoundaries-YEM-ADM1.geojson',
  '/results/spatial_weights/transformed_spatial_weights.json'
];

// Cache first, then network strategy for API requests
async function cacheFirstThenNetwork(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(API_CACHE_NAME);
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache-first strategy failed:', error);
    throw error;
  }
}

// Network first, then cache strategy for static assets
async function networkFirstThenCache(request) {
  try {
    const cache = await caches.open(CACHE_NAME);
    try {
      const networkResponse = await fetch(request);
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    } catch (error) {
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      throw error;
    }
  } catch (error) {
    console.error('[SW] Network-first strategy failed:', error);
    throw error;
  }
}

// Install event handler
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install');
  
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        console.log('[Service Worker] Caching static assets');
        
        // Cache static assets one by one
        for (const asset of STATIC_ASSETS) {
          try {
            await cache.add(new Request(asset, { 
              credentials: 'same-origin',
              mode: 'no-cors'
            }));
            console.log(`[SW] Cached: ${asset}`);
          } catch (error) {
            console.warn(`[SW] Failed to cache ${asset}:`, error);
          }
        }

        // Don't pre-cache API endpoints, they'll be cached on first use
        console.log('[Service Worker] Installation complete');
      } catch (error) {
        console.error('[SW] Installation failed:', error);
      }
    })()
  );
  
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event handler
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate');
  
  event.waitUntil(
    (async () => {
      try {
        // Clear old caches
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames
            .filter(name => name.startsWith('spatial-'))
            .filter(name => name !== CACHE_NAME && name !== API_CACHE_NAME)
            .map(name => caches.delete(name))
        );

        // Take control of all clients
        await clients.claim();
        console.log('[Service Worker] Activation complete');
      } catch (error) {
        console.error('[SW] Activation failed:', error);
      }
    })()
  );
});

// Fetch event handler
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Handle API requests
  if (API_ENDPOINTS.some(endpoint => url.pathname.includes(endpoint))) {
    event.respondWith(cacheFirstThenNetwork(event.request));
    return;
  }

  // Handle static assets
  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(networkFirstThenCache(event.request));
    return;
  }

  // Pass through all other requests
  event.respondWith(fetch(event.request));
});

// Error handlers
self.addEventListener('error', (event) => {
  console.error('[Service Worker] Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[Service Worker] Unhandled rejection:', event.reason);
});

// Message handler for debugging
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Helper function to log cache contents (for debugging)
async function logCacheContents() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    console.log('[SW] Cache contents:', keys.map(key => key.url));
  } catch (error) {
    console.error('[SW] Failed to log cache contents:', error);
  }
}