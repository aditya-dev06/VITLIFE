import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  cachedFetch,
  clearApiCache,
  mutateCache,
  getCacheStats,
  prefetch,
  getCacheKey
} from '../src/utils/apiClient.js';

describe('apiClient - Audit & Optimization Suite', () => {
  let originalFetch;
  let originalNavigatorDescriptor;
  let fetchCalls = [];

  function setMockNavigator(navObj) {
    Object.defineProperty(globalThis, 'navigator', {
      value: navObj,
      configurable: true,
      writable: true
    });
  }

  beforeEach(() => {
    clearApiCache();
    fetchCalls = [];
    originalFetch = globalThis.fetch;
    originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

    // Default mock fetch
    globalThis.fetch = async (url, options = {}) => {
      fetchCalls.push({ url, options });
      return new Response(JSON.stringify({ url, text: 'success', timestamp: Date.now() }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    // Default mock online navigator
    setMockNavigator({ onLine: true });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalNavigatorDescriptor) {
      Object.defineProperty(globalThis, 'navigator', originalNavigatorDescriptor);
    }
    clearApiCache();
  });

  describe('Cache Key Generation', () => {
    test('generates consistent keys for URL and method', () => {
      const key1 = getCacheKey('https://api.example.com/data');
      const key2 = getCacheKey('https://api.example.com/data', { method: 'GET' });
      assert.equal(key1, key2);
    });

    test('differentiates keys based on query/headers', () => {
      const key1 = getCacheKey('https://api.example.com/data', { headers: { Authorization: 'Bearer A' } });
      const key2 = getCacheKey('https://api.example.com/data', { headers: { Authorization: 'Bearer B' } });
      assert.notEqual(key1, key2);
    });
  });

  describe('Basic Caching & Fresh Hits', () => {
    test('caches fresh GET request and returns clone on second call', async () => {
      const res1 = await cachedFetch('https://api.example.com/items', {}, 60000);
      const data1 = await res1.json();

      assert.equal(fetchCalls.length, 1);
      assert.equal(data1.text, 'success');

      const res2 = await cachedFetch('https://api.example.com/items', {}, 60000);
      const data2 = await res2.json();

      assert.equal(fetchCalls.length, 1, 'Should use cached response without second network call');
      assert.deepEqual(data1, data2);
      assert.equal(res2.headers.get('X-Cache-Status'), 'HIT');
    });

    test('bypasses cache for non-GET requests and invalidates cache', async () => {
      await cachedFetch('https://api.example.com/items', { method: 'GET' });
      assert.equal(fetchCalls.length, 1);

      // POST request
      const postRes = await cachedFetch('https://api.example.com/items', {
        method: 'POST',
        body: JSON.stringify({ name: 'New Item' })
      });
      assert.equal(postRes.status, 200);
      assert.equal(fetchCalls.length, 2);

      // Subsequent GET should refetch because POST cleared/invalidated cache
      await cachedFetch('https://api.example.com/items', { method: 'GET' });
      assert.equal(fetchCalls.length, 3);
    });
  });

  describe('Stale-While-Revalidate (SWR)', () => {
    test('serves stale cache immediately and revalidates in background', async () => {
      // 1. Initial fetch with short TTL (100ms) and long stale TTL (2000ms)
      const res1 = await cachedFetch('https://api.example.com/swr-test', {}, { ttlMs: 100, staleTtlMs: 2000 });
      const data1 = await res1.json();
      assert.equal(fetchCalls.length, 1);

      // 2. Wait 120ms so cache becomes stale (age > 100ms, < 2000ms)
      await new Promise((resolve) => setTimeout(resolve, 120));

      // Mock updated response for revalidation
      globalThis.fetch = async (url, options = {}) => {
        fetchCalls.push({ url, options });
        return new Response(JSON.stringify({ url, text: 'revalidated', timestamp: Date.now() }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      };

      // 3. Second call returns STALE cached data immediately
      const res2 = await cachedFetch('https://api.example.com/swr-test', {}, { ttlMs: 500, staleTtlMs: 2000 });
      const data2 = await res2.json();

      assert.equal(data2.text, data1.text, 'Should return stale data instantly');
      assert.equal(res2.headers.get('X-Cache-Status'), 'STALE');

      // 4. Wait for background revalidation to finish
      await new Promise((resolve) => setTimeout(resolve, 50));

      // 5. Subsequent call returns revalidated fresh data (since ttlMs is now 500ms)
      const res3 = await cachedFetch('https://api.example.com/swr-test', {}, { ttlMs: 500, staleTtlMs: 2000 });
      const data3 = await res3.json();
      assert.equal(data3.text, 'revalidated');
      assert.equal(res3.headers.get('X-Cache-Status'), 'HIT');
    });
  });

  describe('In-Flight Request Deduplication', () => {
    test('deduplicates concurrent requests to the same endpoint', async () => {
      // Mock fetch with slight delay to ensure concurrency window
      globalThis.fetch = async (url, options = {}) => {
        fetchCalls.push({ url, options });
        await new Promise((resolve) => setTimeout(resolve, 50));
        return new Response(JSON.stringify({ url, count: fetchCalls.length }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      };

      // Fire 5 concurrent requests
      const promises = Array.from({ length: 5 }, () =>
        cachedFetch('https://api.example.com/dedup-test')
      );

      const responses = await Promise.all(promises);
      const dataArray = await Promise.all(responses.map((r) => r.json()));

      assert.equal(fetchCalls.length, 1, 'Only 1 network request should be dispatched for 5 concurrent calls');
      dataArray.forEach((d) => {
        assert.equal(d.count, 1);
      });
    });
  });

  describe('Timeout Handling', () => {
    test('aborts network fetch when timeoutMs is exceeded and throws or falls back', async () => {
      // Mock hanging fetch
      globalThis.fetch = (url, options = {}) => {
        return new Promise((_, reject) => {
          options.signal?.addEventListener('abort', () => {
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        });
      };

      // Should abort due to short timeout
      const startTime = Date.now();
      try {
        await cachedFetch('https://api.example.com/timeout-test', {}, { timeoutMs: 50 });
        assert.fail('Should have thrown timeout error');
      } catch (err) {
        const elapsed = Date.now() - startTime;
        assert.ok(elapsed < 300, `Expected fast timeout, took ${elapsed}ms`);
        assert.ok(err.name === 'AbortError' || err.message.includes('timeout') || err.name === 'TimeoutError');
      }
    });

    test('falls back to stale cache if network request times out when forceRefresh is requested', async () => {
      // First populate cache
      await cachedFetch('https://api.example.com/fallback-timeout', {}, 10);
      await new Promise((r) => setTimeout(r, 20)); // Expire TTL

      // Next fetch hangs
      globalThis.fetch = (url, options = {}) => {
        return new Promise((_, reject) => {
          options.signal?.addEventListener('abort', () => {
            const err = new Error('Timeout');
            err.name = 'AbortError';
            reject(err);
          });
        });
      };

      // Force refresh with timeout
      const res = await cachedFetch(
        'https://api.example.com/fallback-timeout',
        {},
        { timeoutMs: 50, forceRefresh: true }
      );
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('X-Cache-Status'), 'FALLBACK');
      const data = await res.json();
      assert.equal(data.text, 'success');
    });
  });

  describe('Fast Offline Fallback Logic', () => {
    test('returns cached data immediately when offline without network call', async () => {
      // Populate cache while online
      await cachedFetch('https://api.example.com/offline-test');
      assert.equal(fetchCalls.length, 1);

      // Switch to offline
      setMockNavigator({ onLine: false });

      const res = await cachedFetch('https://api.example.com/offline-test');
      assert.equal(fetchCalls.length, 1, 'Should NOT attempt fetch while offline');
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('X-Cache-Status'), 'OFFLINE_FALLBACK');
      const data = await res.json();
      assert.equal(data.text, 'success');
    });

    test('returns 503 synthetic response when offline and no cache exists', async () => {
      setMockNavigator({ onLine: false });

      const res = await cachedFetch('https://api.example.com/uncached-offline');
      assert.equal(fetchCalls.length, 0);
      assert.equal(res.status, 503);
      const data = await res.json();
      assert.equal(data.offline, true);
    });

    test('falls back to cache when network fetch throws NetworkError on forceRefresh', async () => {
      // Populate cache
      await cachedFetch('https://api.example.com/net-err-test', {}, 10);
      await new Promise((r) => setTimeout(r, 20));

      // Mock network failure
      globalThis.fetch = async () => {
        throw new TypeError('Failed to fetch');
      };

      const res = await cachedFetch('https://api.example.com/net-err-test', {}, { forceRefresh: true });
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('X-Cache-Status'), 'FALLBACK');
    });
  });

  describe('Cache Management Utilities', () => {
    test('mutateCache allows manually setting cache entry', async () => {
      mutateCache('https://api.example.com/manual', { custom: 'value' });

      const res = await cachedFetch('https://api.example.com/manual');
      const data = await res.json();
      assert.equal(data.custom, 'value');
      assert.equal(fetchCalls.length, 0);
    });

    test('prefetch populates cache in background', async () => {
      await prefetch('https://api.example.com/prefetch');
      assert.equal(fetchCalls.length, 1);

      const stats = getCacheStats();
      assert.equal(stats.size, 1);

      const res = await cachedFetch('https://api.example.com/prefetch');
      assert.equal(fetchCalls.length, 1);
      assert.equal(res.headers.get('X-Cache-Status'), 'HIT');
    });

    test('clearApiCache wipes cache and statistics', async () => {
      await cachedFetch('https://api.example.com/item1');
      await cachedFetch('https://api.example.com/item2');
      assert.equal(getCacheStats().size, 2);

      clearApiCache();
      assert.equal(getCacheStats().size, 0);
    });
  });
});
