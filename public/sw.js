const CACHE_NAME = 'cds-hub-static-cache-v3';
const API_CACHE_NAME = 'cds-hub-api-cache-v3';

// Sensitive API paths that must NEVER be cached
const SENSITIVE_API_PATHS = [
  '/api/user/',
  '/api/auth/',
  '/api/admin/',
  '/api/health/',
  '/api/db-status',
  '/api/cron/'
];

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/icons.svg',
  '/manifest.json'
];

// Listen for cache purge messages (e.g., on logout)
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'PURGE_API_CACHE') {
    caches.delete(API_CACHE_NAME).then(() => {
      console.log('[Service Worker] API cache purged on logout.');
    });
  }
});

// Install Event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] Pre-caching offline page shell');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME && key !== API_CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener('fetch', event => {
  // Only intercept and cache GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);

  // Handle Backend API JSON requests
  if (requestUrl.pathname.startsWith('/api/')) {
    // Skip caching for sensitive API paths
    const isSensitive = SENSITIVE_API_PATHS.some(p => requestUrl.pathname.startsWith(p));
    if (isSensitive) {
      return; // Let the browser handle it directly — no caching
    }

    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(API_CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            return new Response(
              JSON.stringify({ 
                error: 'You are currently offline. Showing cached offline data.',
                offline: true,
                opportunities: [],
                events: [],
                clubs: [],
                recruitments: []
              }),
              { headers: { 'Content-Type': 'application/json' } }
            );
          });
        })
    );
    return;
  }

  // Handle static assets (Stale-While-Revalidate for local resources)
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        fetch(event.request)
          .then(networkResponse => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        return networkResponse;
      });
    })
  );
});
