const CACHE_NAME = 'vit-life-static-cache-v6';
const API_CACHE_NAME = 'vit-life-api-cache-v6';
const INDEXED_DB_NAME = 'vit-life-offline-sync-db';
const INDEXED_DB_VERSION = 1;
const QUEUE_STORE_NAME = 'offline_queue';

// Sensitive API paths that must NEVER be cached by the service worker
const SENSITIVE_API_PATHS = [
  '/api/user/',
  '/api/auth/',
  '/api/admin/',
  '/api/health/',
  '/api/db-status',
  '/api/cron/'
];

// Core static assets for fast precaching
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-192.webp',
  '/icon-512.webp',
  '/icons.svg',
  '/manifest.json',
  '/store_icon.png',
  '/store_icon.webp',
  '/vtop-timetable-guide.png',
  '/vtop-timetable-guide.webp'
];

// --- IndexedDB Helper Routines for Background Sync ---
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(INDEXED_DB_NAME, INDEXED_DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(QUEUE_STORE_NAME)) {
        const store = db.createObjectStore(QUEUE_STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('tag', 'tag', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getQueuedRequests(tagFilter) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE_NAME, 'readonly');
      const store = tx.objectStore(QUEUE_STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        let results = req.result || [];
        if (tagFilter && tagFilter !== 'sync-offline-requests') {
          results = results.filter(item => item.tag === tagFilter);
        }
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  });
}

function removeQueuedRequest(id) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE_NAME, 'readwrite');
      const store = tx.objectStore(QUEUE_STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

function addRequestToQueue(payload) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE_NAME, 'readwrite');
      const store = tx.objectStore(QUEUE_STORE_NAME);
      const item = {
        url: payload.url,
        method: payload.method || 'POST',
        headers: payload.headers || {},
        body: payload.body || null,
        timestamp: Date.now(),
        retryCount: 0,
        tag: payload.tag || 'sync-offline-requests'
      };
      const req = store.add(item);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  });
}

// Background Sync Queue Processor
async function processOfflineQueue(syncTag) {
  try {
    const queue = await getQueuedRequests(syncTag);
    if (!queue || queue.length === 0) return;

    console.log(`[Service Worker] Background Sync: Processing ${queue.length} items (tag: ${syncTag})`);

    for (const item of queue) {
      try {
        const fetchOptions = {
          method: item.method,
          headers: item.headers,
        };
        if (item.body && ['POST', 'PUT', 'PATCH'].includes(item.method.toUpperCase())) {
          fetchOptions.body = typeof item.body === 'string' ? item.body : JSON.stringify(item.body);
        }

        const response = await fetch(item.url, fetchOptions);

        if (response.ok || (response.status >= 200 && response.status < 300)) {
          console.log(`[Service Worker] Background Sync: Request replay succeeded for ${item.url}`);
          await removeQueuedRequest(item.id);

          const clientsList = await self.clients.matchAll({ type: 'window' });
          for (const client of clientsList) {
            client.postMessage({
              type: 'BACKGROUND_SYNC_SUCCESS',
              url: item.url,
              id: item.id,
              tag: item.tag
            });
          }
        } else if (response.status >= 400 && response.status < 500) {
          console.warn(`[Service Worker] Background Sync: Non-retriable client error ${response.status} for ${item.url}`);
          await removeQueuedRequest(item.id);
        }
      } catch (err) {
        console.error(`[Service Worker] Background Sync: Network replay error for ${item.url}:`, err);
      }
    }
  } catch (err) {
    console.error('[Service Worker] Background Sync routine failed:', err);
  }
}

// --- Service Worker Lifecycle Events ---

// 1. Install Event: Fast Static Asset Precaching
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Fast precaching offline static assets shell');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// 2. Activate Event: Cache Migration & Client Claiming
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => {
        return Promise.all(
          keys.map(key => {
            if (key !== CACHE_NAME && key !== API_CACHE_NAME) {
              console.log('[Service Worker] Clearing stale cache store:', key);
              return caches.delete(key);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// 3. Background Sync Events
self.addEventListener('sync', event => {
  console.log('[Service Worker] Sync event received for tag:', event.tag);
  event.waitUntil(processOfflineQueue(event.tag));
});

self.addEventListener('periodicsync', event => {
  console.log('[Service Worker] Periodic sync event received for tag:', event.tag);
  event.waitUntil(processOfflineQueue(event.tag));
});

// 4. Message Event: Inter-process Communication with Client Window
self.addEventListener('message', event => {
  if (!event.data) return;

  if (event.data.type === 'PURGE_API_CACHE') {
    caches.delete(API_CACHE_NAME).then(() => {
      console.log('[Service Worker] API cache purged successfully.');
    });
  } else if (event.data.type === 'QUEUE_OFFLINE_REQUEST') {
    addRequestToQueue(event.data.payload)
      .then(() => {
        if ('sync' in self.registration) {
          return self.registration.sync.register('sync-offline-requests');
        } else {
          return processOfflineQueue('sync-offline-requests');
        }
      })
      .catch(err => console.error('[Service Worker] Failed to register background sync request:', err));
  } else if (event.data.type === 'FLUSH_OFFLINE_QUEUE') {
    event.waitUntil(processOfflineQueue('sync-offline-requests'));
  } else if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 5. Fetch Event Routine
self.addEventListener('fetch', event => {
  // Only handle GET requests with HTTP/HTTPS protocols
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  const requestUrl = new URL(event.request.url);

  // Bypass Service Worker for SEO assets, sitemaps, robots.txt, and verification files
  if (
    requestUrl.pathname === '/sitemap.xml' ||
    requestUrl.pathname === '/robots.txt' ||
    requestUrl.pathname === '/llms.txt' ||
    requestUrl.pathname.startsWith('/google') ||
    requestUrl.pathname.endsWith('.xml')
  ) {
    return;
  }

  // Routine A: Network-First Strategy for Backend API Requests (/api/)
  if (requestUrl.pathname.startsWith('/api/')) {
    const isSensitive = SENSITIVE_API_PATHS.some(p => requestUrl.pathname.startsWith(p));
    if (isSensitive) {
      return; // Direct network execution for auth, profile, and admin endpoints
    }

    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(API_CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone).catch(() => {});
            }).catch(() => {});
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
              {
                headers: {
                  'Content-Type': 'application/json',
                  'X-VITLife-Offline': 'true'
                }
              }
            );
          });
        })
    );
    return;
  }

  // Routine B: Stale-While-Revalidate / Cache-First for Static Assets
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        const isCrossOrigin = requestUrl.origin !== self.location.origin;
        const isFontRequest = event.request.destination === 'font';

        // Background revalidate same-origin non-font resources
        if (!isCrossOrigin && !isFontRequest) {
          fetch(event.request)
            .then(networkResponse => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse)).catch(() => {});
              }
            })
            .catch(() => {});
        }
        return cachedResponse;
      }

      return fetch(event.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200 || (networkResponse.type !== 'basic' && networkResponse.type !== 'cors')) {
          return networkResponse;
        }
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse)).catch(() => {});
        return networkResponse;
      }).catch(() => {
        // HTML Navigation offline fallback
        if (event.request.mode === 'navigate' || (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html'))) {
          return caches.match('/index.html') || caches.match('/');
        }
        return new Response('Network error occurred and no cached asset available.', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain' }
        });
      });
    })
  );
});
