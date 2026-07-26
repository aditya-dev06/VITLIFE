// Request Deduplicator and In-Memory Cache for VIT Life
const pendingRequests = new Map();
const cache = new Map();

/**
 * Perform a cached and deduplicated fetch request.
 * @param {string} url - Request URL
 * @param {RequestInit} [options] - Fetch options
 * @param {number} [ttlMs=60000] - Cache Time-To-Live in ms (default 1 min)
 */
export async function cachedFetch(url, options = {}, ttlMs = 60000) {
  const method = (options.method || 'GET').toUpperCase();
  
  // Non-GET requests should bypass cache & clear cache for affected route
  if (method !== 'GET') {
    cache.clear(); // Clear cache on mutation (POST/PUT/DELETE)
    return fetch(url, options);
  }

  const cacheKey = url;
  const now = Date.now();

  // 1. Return fresh cached data if available
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (now - cached.timestamp < ttlMs) {
      return cached.response.clone();
    } else {
      cache.delete(cacheKey);
    }
  }

  // 2. Return in-flight pending request if already requested (Deduplication)
  if (pendingRequests.has(cacheKey)) {
    const res = await pendingRequests.get(cacheKey);
    return res.clone();
  }

  // 3. Dispatch fresh request and share promise with concurrent callers
  const requestPromise = (async () => {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        cache.set(cacheKey, {
          timestamp: Date.now(),
          response: response.clone()
        });
      }
      return response;
    } finally {
      pendingRequests.delete(cacheKey);
    }
  })();

  pendingRequests.set(cacheKey, requestPromise);
  const res = await requestPromise;
  return res.clone();
}

/**
 * Clear client-side API cache manually.
 */
export function clearApiCache() {
  cache.clear();
  pendingRequests.clear();
}
