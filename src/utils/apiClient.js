// Request Deduplicator, In-Memory Cache, SWR, Timeout & Offline Fallback for VIT Life
const pendingRequests = new Map();
const cache = new Map();

// Global cache statistics
const stats = {
  hitCount: 0,
  missCount: 0,
  revalidateCount: 0
};

/**
 * Generate a deterministic cache key based on URL, method, headers, and body.
 * @param {string} url - Request URL
 * @param {RequestInit} [options={}] - Fetch options
 * @returns {string} Normalized cache key
 */
export function getCacheKey(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = options.headers
    ? Object.entries(options.headers)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k.toLowerCase()}:${v}`)
        .join('|')
    : '';
  const body = options.body
    ? typeof options.body === 'string'
      ? options.body
      : JSON.stringify(options.body)
    : '';
  return `${method}:${url}:${headers}:${body}`;
}

/**
 * Create a new Response object from cached data.
 * @param {any} data - Parsed response payload
 * @param {number} [status=200] - HTTP status code
 * @param {Record<string, string>} [headers={}] - Response headers
 * @param {string} cacheStatus - X-Cache-Status header value
 * @returns {Response}
 */
function createResponse(data, status = 200, headers = {}, cacheStatus = 'HIT') {
  const mergedHeaders = new Headers({
    'Content-Type': 'application/json',
    ...headers,
    'X-Cache-Status': cacheStatus
  });

  return new Response(JSON.stringify(data), {
    status,
    headers: mergedHeaders
  });
}

/**
 * Parse config parameter flexibly (supports number ttlMs or config object).
 */
function parseConfig(config) {
  if (typeof config === 'number') {
    return {
      ttlMs: config,
      staleTtlMs: 86400000, // 24 hours default stale TTL
      timeoutMs: 8000,
      revalidate: true,
      forceRefresh: false
    };
  }
  return {
    ttlMs: config?.ttlMs ?? 60000,
    staleTtlMs: config?.staleTtlMs ?? 86400000,
    timeoutMs: config?.timeoutMs ?? 8000,
    revalidate: config?.revalidate ?? true,
    forceRefresh: config?.forceRefresh ?? false
  };
}

/**
 * Dispatch network fetch with AbortController timeout and signal merging.
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  let timer;

  if (timeoutMs > 0) {
    timer = setTimeout(() => {
      controller.abort(new Error(`Request timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  }

  // Merge external signal if provided
  let onExternalAbort;
  if (options.signal) {
    if (options.signal.aborted) {
      controller.abort(options.signal.reason);
    } else {
      onExternalAbort = () => controller.abort(options.signal.reason);
      options.signal.addEventListener('abort', onExternalAbort);
    }
  }

  try {
    const targetUrl = typeof url === 'string' && (url.startsWith('/') || url.startsWith(window.location.origin)) ? url : String(url);
    const fetchOptions = { ...options, signal: controller.signal };
    return await fetch(targetUrl, fetchOptions);
  } finally {
    if (timer) clearTimeout(timer);
    if (options.signal && onExternalAbort) {
      options.signal.removeEventListener('abort', onExternalAbort);
    }
  }
}

/**
 * Revalidate cache in background (Stale-While-Revalidate).
 */
function triggerBackgroundRevalidation(cacheKey, url, options, parsedConfig) {
  if (pendingRequests.has(cacheKey)) return;

  stats.revalidateCount++;
  const revalidatePromise = (async () => {
    try {
      const response = await fetchWithTimeout(url, options, parsedConfig.timeoutMs);
      if (response.ok) {
        const clone = response.clone();
        const data = await clone.json();
        cache.set(cacheKey, {
          timestamp: Date.now(),
          ttlMs: parsedConfig.ttlMs,
          staleTtlMs: parsedConfig.staleTtlMs,
          data,
          status: response.status,
          headers: Object.fromEntries(response.headers.entries())
        });
      }
    } catch (err) {
      console.warn('[apiClient] Background revalidation failed:', String(err && err.message ? err.message : err));
    } finally {
      pendingRequests.delete(cacheKey);
    }
  })();

  pendingRequests.set(cacheKey, revalidatePromise);
}

/**
 * Perform a cached, deduplicated, and resilient fetch request.
 * Supports Stale-While-Revalidate, fast offline fallback, and timeout handling.
 *
 * @param {string} url - Request URL
 * @param {RequestInit} [options={}] - Fetch options
 * @param {number|Object} [config=60000] - Cache TTL in ms or config object
 * @returns {Promise<Response>}
 */
export async function cachedFetch(url, options = {}, config = 60000) {
  const parsedConfig = parseConfig(config);
  const method = (options.method || 'GET').toUpperCase();

  // Non-GET requests bypass cache & clear cache on mutation
  if (method !== 'GET') {
    cache.clear();
    return fetchWithTimeout(url, options, parsedConfig.timeoutMs);
  }

  const cacheKey = getCacheKey(url, options);
  const now = Date.now();
  const cached = cache.get(cacheKey);

  // 1. Check Offline Status (Fast Offline Fallback)
  const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;

  if (isOffline) {
    if (cached) {
      stats.hitCount++;
      return createResponse(cached.data, cached.status, cached.headers, 'OFFLINE_FALLBACK');
    }
    return createResponse(
      { error: 'Offline', message: 'No network connection available', offline: true },
      503,
      {},
      'OFFLINE_MISS'
    );
  }

  // 2. Cache Hit Logic (Fresh vs Stale vs Forced Refresh)
  if (cached && !parsedConfig.forceRefresh) {
    const age = now - cached.timestamp;

    // 2a. Fresh Cache Hit
    if (age < cached.ttlMs) {
      stats.hitCount++;
      return createResponse(cached.data, cached.status, cached.headers, 'HIT');
    }

    // 2b. Stale-While-Revalidate Hit (If revalidation is enabled)
    if (age < cached.staleTtlMs && parsedConfig.revalidate) {
      stats.hitCount++;
      triggerBackgroundRevalidation(cacheKey, url, options, parsedConfig);
      return createResponse(cached.data, cached.status, cached.headers, 'STALE');
    }
  }

  // 3. In-flight Request Deduplication
  if (pendingRequests.has(cacheKey)) {
    try {
      const data = await pendingRequests.get(cacheKey);
      if (data !== null && data !== undefined) {
        stats.hitCount++;
        const cachedItem = cache.get(cacheKey);
        return createResponse(
          data,
          cachedItem ? cachedItem.status : 200,
          cachedItem ? cachedItem.headers : {},
          'DEDUPED'
        );
      }
    } catch {
      // Fall through to retry network fetch if pending request failed
    }
  }

  // 4. Dispatch Fresh Network Request
  stats.missCount++;
  const requestPromise = (async () => {
    try {
      const response = await fetchWithTimeout(url, options, parsedConfig.timeoutMs);

      if (response.ok) {
        const clone = response.clone();
        const data = await clone.json();
        cache.set(cacheKey, {
          timestamp: Date.now(),
          ttlMs: parsedConfig.ttlMs,
          staleTtlMs: parsedConfig.staleTtlMs,
          data,
          status: response.status,
          headers: Object.fromEntries(response.headers.entries())
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

  try {
    const data = await requestPromise;

    if (data !== null && data !== undefined) {
      const cachedItem = cache.get(cacheKey);
      return createResponse(
        data,
        cachedItem ? cachedItem.status : 200,
        cachedItem ? cachedItem.headers : {},
        'MISS'
      );
    }
  } catch {
    // Catch timeout or network errors
  }

  // 5. Network Failure / Timeout / Non-OK Fallback to Stale Cache
  if (cached) {
    return createResponse(cached.data, cached.status, cached.headers, 'FALLBACK');
  }

  // 6. Direct network retry if no cache exists
  return fetchWithTimeout(url, options, parsedConfig.timeoutMs);
}

/**
 * Manually mutate or set an entry in the client-side API cache.
 * @param {string} url - Target URL or cache key
 * @param {any} data - Data to cache
 * @param {Object} [options={}] - Request options if key depends on headers/method
 */
export function mutateCache(url, data, options = {}) {
  const cacheKey = getCacheKey(url, options);
  cache.set(cacheKey, {
    timestamp: Date.now(),
    ttlMs: 60000,
    staleTtlMs: 86400000,
    data,
    status: 200,
    headers: {}
  });
}

/**
 * Pre-warm the cache in the background.
 * @param {string} url - URL to prefetch
 * @param {RequestInit} [options={}] - Fetch options
 * @param {number|Object} [config=60000] - Cache config
 */
export async function prefetch(url, options = {}, config = 60000) {
  await cachedFetch(url, options, config);
}

/**
 * Retrieve cache statistics and metrics.
 * @returns {{ size: number, hitCount: number, missCount: number, revalidateCount: number }}
 */
export function getCacheStats() {
  return {
    size: cache.size,
    hitCount: stats.hitCount,
    missCount: stats.missCount,
    revalidateCount: stats.revalidateCount
  };
}

/**
 * Clear client-side API cache manually.
 * @param {string|RegExp} [pattern=null] - Optional URL or key pattern to selectively clear
 */
export function clearApiCache(pattern = null) {
  if (!pattern) {
    cache.clear();
    pendingRequests.clear();
    stats.hitCount = 0;
    stats.missCount = 0;
    stats.revalidateCount = 0;
    return;
  }

  for (const key of cache.keys()) {
    if (typeof pattern === 'string' && key.includes(pattern)) {
      cache.delete(key);
    } else if (pattern instanceof RegExp && pattern.test(key)) {
      cache.delete(key);
    }
  }
}
