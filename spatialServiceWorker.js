const CACHE_NAME="spatial-data-cache-v3",API_CACHE_NAME="spatial-api-cache-v3",STATIC_ASSETS=["/index.html","/manifest.json","/favicon.ico"],API_ENDPOINTS=["/results/unified_data.geojson","/results/network_data/flow_maps.csv","/results/spatial_analysis_results.json","/results/choropleth_data/geoBoundaries-YEM-ADM1.geojson","/results/spatial_weights/spatial_weights.json"],limitCacheSize=async(t,e)=>{const a=await caches.open(t),s=await a.keys();s.length>e&&(await a.delete(s[0]),await limitCacheSize(t,e))};async function cacheFirstThenNetwork(t){try{const e=await caches.match(t);if(e)return e;const a=await fetch(t);if(a.ok){const e=await caches.open(API_CACHE_NAME);await e.put(t,a.clone()),await limitCacheSize(API_CACHE_NAME,50)}return a}catch(t){throw t}}async function networkFirstThenCache(t){try{const e=await caches.open(CACHE_NAME);try{const a=await fetch(t);return a.ok&&(await e.put(t,a.clone()),await limitCacheSize(CACHE_NAME,50)),a}catch(a){const s=await e.match(t);if(s)return s;throw a}}catch(t){throw t}}self.addEventListener("install",(t=>{t.waitUntil((async()=>{try{const t=await caches.open(CACHE_NAME);await t.addAll(STATIC_ASSETS)}catch(t){}})()),self.skipWaiting()})),self.addEventListener("activate",(t=>{t.waitUntil((async()=>{try{const t=await caches.keys();await Promise.all(t.filter((t=>t.startsWith("spatial-"))).filter((t=>t!==CACHE_NAME&&t!==API_CACHE_NAME)).map((t=>caches.delete(t)))),await self.clients.claim()}catch(t){}})())})),self.addEventListener("fetch",(t=>{if("GET"!==t.request.method)return;const e=new URL(t.request.url);API_ENDPOINTS.some((t=>e.pathname.includes(t)))?t.respondWith(cacheFirstThenNetwork(t.request)):STATIC_ASSETS.includes(e.pathname)?t.respondWith(networkFirstThenCache(t.request)):t.respondWith(fetch(t.request))})),self.addEventListener("error",(t=>{})),self.addEventListener("unhandledrejection",(t=>{})),self.addEventListener("message",(t=>{t.data&&"SKIP_WAITING"===t.data.type&&self.skipWaiting(),t.data&&"GET_VERSION"===t.data.type&&t.ports[0].postMessage({version:CACHE_NAME})}));