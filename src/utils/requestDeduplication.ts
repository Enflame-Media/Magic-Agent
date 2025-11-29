/**
 * Request Deduplication Utility
 *
 * Provides request coalescing for identical concurrent async operations.
 * When multiple callers request the same operation simultaneously, only
 * one actual request is made and the result is shared among all callers.
 *
 * Key features:
 * - Deduplicates concurrent requests by key
 * - Automatically clears cache after response (success or failure)
 * - Configurable timeout window for stale requests
 * - Type-safe generic implementation
 * - Thread-safe: handles race conditions in concurrent environments
 *
 * Error Handling:
 * - If the deduplicated request fails, ALL waiting callers receive the same error
 * - Each caller must handle the error independently
 * - Failed requests are immediately removed from cache, allowing retry
 *
 * Performance:
 * - Zero overhead for unique requests
 * - O(1) lookup and cleanup operations
 * - Minimal memory footprint (only stores pending promises)
 */

/**
 * Configuration options for request deduplication
 */
export interface DeduplicationOptions {
  /**
   * Optional timeout in milliseconds after which a pending request is
   * considered stale and removed from the cache. This is a safety net
   * for requests that never complete. Default: no timeout (undefined).
   *
   * Recommended: Set to 2-3x your expected maximum request duration.
   * Too low: May trigger false positives and duplicate requests.
   * Too high: Memory leaks if requests hang indefinitely.
   */
  timeoutMs?: number;

  /**
   * Called when a request is deduplicated (reusing an existing pending request).
   * Useful for debugging and metrics.
   */
  onDeduplicated?: (key: string) => void;
}

interface PendingRequest<T> {
  promise: Promise<T>;
  timeoutId?: ReturnType<typeof setTimeout>;
}

/**
 * Create a request deduplicator instance.
 *
 * This creates a scoped deduplicator with its own pending request map.
 * Use this when you want to manage deduplication for a specific domain
 * of operations separately from others.
 *
 * @example
 * ```typescript
 * const sessionDeduplicator = createDeduplicator<Session>();
 *
 * // Both calls will return the same promise
 * const session1 = sessionDeduplicator.request('session-123', () => fetchSession('123'));
 * const session2 = sessionDeduplicator.request('session-123', () => fetchSession('123'));
 *
 * // With timeout for stale requests
 * const dedup = createDeduplicator<ApiResponse>({ timeoutMs: 30000 });
 * ```
 */
export function createDeduplicator<T>(options: DeduplicationOptions = {}) {
  const pendingRequests = new Map<string, PendingRequest<T>>();

  /**
   * Execute an async operation with deduplication.
   *
   * If a request with the same key is already in flight, the existing
   * promise is returned. Otherwise, a new request is initiated.
   *
   * Thread-safety: This function handles race conditions where multiple
   * callers check for an existing request simultaneously. The first caller
   * to set the pending request wins, others will reuse it.
   *
   * @param key - Unique identifier for this request (used for deduplication)
   * @param fn - The async function to execute
   * @returns Promise that resolves with the result (or rejects with the error)
   */
  function request(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = pendingRequests.get(key);
    if (existing) {
      options.onDeduplicated?.(key);
      return existing.promise;
    }

    // Thread-safe cleanup: always check if the timeout still exists before clearing
    const cleanup = () => {
      const pending = pendingRequests.get(key);
      if (pending?.timeoutId) {
        clearTimeout(pending.timeoutId);
      }
      pendingRequests.delete(key);
    };

    // Execute request and cleanup on completion (success or failure)
    const promise = fn().finally(cleanup);

    const pendingRequest: PendingRequest<T> = { promise };

    // Set up optional timeout for stale request cleanup
    if (options.timeoutMs !== undefined && options.timeoutMs > 0) {
      pendingRequest.timeoutId = setTimeout(() => {
        // Double-check the entry still exists and hasn't been cleaned up
        const current = pendingRequests.get(key);
        if (current === pendingRequest) {
          pendingRequests.delete(key);
        }
      }, options.timeoutMs);
    }

    pendingRequests.set(key, pendingRequest);
    return promise;
  }

  /**
   * Check if a request with the given key is currently pending
   */
  function hasPending(key: string): boolean {
    return pendingRequests.has(key);
  }

  /**
   * Get the number of currently pending requests
   */
  function pendingCount(): number {
    return pendingRequests.size;
  }

  /**
   * Clear all pending requests.
   * Note: This does not cancel the actual requests, only removes them
   * from the deduplication cache.
   */
  function clear(): void {
    for (const [, pending] of pendingRequests) {
      if (pending.timeoutId) {
        clearTimeout(pending.timeoutId);
      }
    }
    pendingRequests.clear();
  }

  return {
    request,
    hasPending,
    pendingCount,
    clear,
  };
}

/**
 * Type for a deduplicator instance
 */
export type Deduplicator<T> = ReturnType<typeof createDeduplicator<T>>;

/**
 * Execute an async function with request deduplication using a shared global cache.
 *
 * This is a simpler alternative to createDeduplicator when you don't need
 * separate deduplication scopes. All calls share the same pending request map.
 *
 * **Important**: Custom options are NOT supported with the global deduplicator.
 * If you need custom timeouts or callbacks, use createDeduplicator() instead.
 *
 * @param key - Unique identifier for this request
 * @param fn - The async function to execute
 * @returns Promise that resolves with the result
 *
 * @example
 * ```typescript
 * // Multiple concurrent calls with the same key will share one request
 * const [result1, result2] = await Promise.all([
 *   deduplicatedRequest('user-123', () => fetchUser('123')),
 *   deduplicatedRequest('user-123', () => fetchUser('123')),
 * ]);
 * // result1 === result2 (same object reference)
 *
 * // Different keys execute independently
 * const [userA, userB] = await Promise.all([
 *   deduplicatedRequest('user-a', () => fetchUser('a')),
 *   deduplicatedRequest('user-b', () => fetchUser('b')),
 * ]);
 *
 * // For custom options, create a dedicated deduplicator:
 * const dedup = createDeduplicator<User>({ timeoutMs: 5000 });
 * const user = await dedup.request('user-123', () => fetchUser('123'));
 * ```
 */
const globalDeduplicatorMap = new Map<string, PendingRequest<unknown>>();

export function deduplicatedRequest<T>(
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  const existing = globalDeduplicatorMap.get(key);
  if (existing) {
    return existing.promise as Promise<T>;
  }

  const cleanup = () => {
    const pending = globalDeduplicatorMap.get(key);
    if (pending?.timeoutId) {
      clearTimeout(pending.timeoutId);
    }
    globalDeduplicatorMap.delete(key);
  };

  const promise = fn().finally(cleanup);
  const pendingRequest: PendingRequest<T> = { promise };
  globalDeduplicatorMap.set(key, pendingRequest as PendingRequest<unknown>);

  return promise;
}


/**
 * Clear all pending requests in the global deduplicator.
 *
 * This is useful for memory pressure cleanup - it removes all cached
 * pending requests but does not cancel the underlying operations.
 *
 * Note: Any callers waiting on deduplicated requests will still receive
 * their results; this only clears the deduplication cache for new requests.
 */
export function clearGlobalDeduplicator(): void {
  for (const [, pending] of globalDeduplicatorMap) {
    if (pending.timeoutId) {
      clearTimeout(pending.timeoutId);
    }
  }
  globalDeduplicatorMap.clear();
}

/**
 * Get the number of currently pending requests in the global deduplicator.
 * Useful for monitoring and debugging memory usage.
 */
export function getGlobalDeduplicatorSize(): number {
  return globalDeduplicatorMap.size;
}
