// public/sw.js
const CACHE_NAME = 'pos-offline-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/offline.html',
];

// Install service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// Fetch with network-first strategy for API, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // API requests - network first with fallback
  if (url.pathname.startsWith('/store/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful response
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Return cached response if available
          return caches.match(event.request);
        })
    );
  } 
  // Static assets - cache first
  else {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          return response || fetch(event.request);
        })
    );
  }
});

// Sync pending operations when back online
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pos-data') {
    event.waitUntil(syncPOSData());
  }
});

async function syncPOSData() {
  const cache = await caches.open(CACHE_NAME);
  const pendingRequests = await cache.keys();
  
  for (const request of pendingRequests) {
    if (request.url.includes('/api/orders')) {
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.delete(request);
        }
      } catch (error) {
        console.error('Failed to sync:', error);
      }
    }
  }
}