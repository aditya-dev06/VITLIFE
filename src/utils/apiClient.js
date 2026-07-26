// Request Deduplicator and In-Memory Cache for VIT Life
const pendingRequests = new Map();
const cache = new Map();

/**
 * Perform a cached and deduplicated fetch request.
 * Safely parses and caches JSON data to prevent "Response body is already used" stream errors.
 * @param {string} url - Request URL
 * @param {RequestInit} [options] - Fetch options
 * @param {number} [ttlMs=60000] - Cache Time-To-Live in ms (default 1 min)
 */
export async function cachedFetch(url, options = {}, ttlMs = 60000) {
  const method = (options.method || 'GET').toUpperCase();
  
  // Non-GET requests bypass cache & clear cache on mutation
  if (method !== 'GET') {
    cache.clear();
    return fetch(url, options);
  }

  const cacheKey = url;
  const now = Date.now();

  // 1. Return fresh cached response if available
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (now - cached.timestamp < ttlMs) {
      return new Response(JSON.stringify(cached.data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      cache.delete(cacheKey);
    }
  }

  // 2. Return in-flight pending request promise if already requested (Deduplication)
  if (pendingRequests.has(cacheKey)) {
    try {
      const data = await pendingRequests.get(cacheKey);
      if (data !== null && data !== undefined) {
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } catch (err) {
      console.warn('Pending request resolution failed, falling back to network fetch:', err);
    }
  }

  // 3. Dispatch fresh request and store parsed JSON payload
  const requestPromise = (async () => {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        const clone = response.clone();
        const data = await clone.json();
        cache.set(cacheKey, {
          timestamp: Date.now(),
          data
        });
        return data;
      }
      return null;
    } catch {
      return null;
    } finally {
      pendingRequests.delete(cacheKey);
    }
  })();

  pendingRequests.set(cacheKey, requestPromise);
  const data = await requestPromise;

  if (data !== null && data !== undefined) {
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Fallback to direct network fetch if JSON parsing or caching failed
  return fetch(url, options);
}

/**
 * Clear client-side API cache manually.
 */
export function clearApiCache() {
  cache.clear();
  pendingRequests.clear();
}
