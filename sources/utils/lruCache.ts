import { AppError, ErrorCodes } from "@/utils/errors";

/**
 * A node in the doubly-linked list for LRU ordering.
 * Tracks both the key (for O(1) eviction lookup) and value.
 */
class CacheNode<K, V> {
    constructor(
        public key: K,
        public value: V,
        public expiresAt: number | null = null,
        public prev: CacheNode<K, V> | null = null,
        public next: CacheNode<K, V> | null = null
    ) {}
}

/**
 * Cache statistics for monitoring memory usage and hit rates.
 */
export interface CacheStats {
    /** Current number of entries in the cache */
    size: number;
    /** Maximum allowed entries */
    maxSize: number;
    /** Number of cache hits since creation/reset */
    hits: number;
    /** Number of cache misses since creation/reset */
    misses: number;
    /** Hit rate as a percentage (0-100) */
    hitRate: number;
    /** Number of entries evicted due to size limit */
    evictions: number;
    /** Number of entries expired due to TTL */
    expirations: number;
    /** Timestamp of oldest entry (null if empty) */
    oldestEntryAt: number | null;
    /** TTL in milliseconds (null if no TTL) */
    ttlMs: number | null;
}

/**
 * LRU Cache with optional TTL support.
 *
 * Provides O(1) get, set, and delete operations with automatic eviction
 * of least recently used entries when capacity is exceeded.
 *
 * Features:
 * - Size-bounded: Evicts LRU entries when maxSize is reached
 * - Optional TTL: Entries expire after ttlMs milliseconds
 * - Statistics: Tracks hits, misses, evictions for monitoring
 * - O(1) operations: Uses Map + doubly-linked list
 *
 * @example
 * ```typescript
 * // Create cache with max 10,000 entries and 24-hour TTL
 * const cache = new LRUCache<string, TokenData>(10000, 24 * 60 * 60 * 1000);
 *
 * cache.set('token123', { userId: 'user1', extras: {} });
 * const data = cache.get('token123'); // Returns value and moves to front
 *
 * console.log(cache.getStats()); // { size: 1, hits: 1, ... }
 * ```
 */
export class LRUCache<K, V> {
    private readonly map: Map<K, CacheNode<K, V>>;
    private head: CacheNode<K, V> | null = null;
    private tail: CacheNode<K, V> | null = null;

    // Statistics
    private _hits = 0;
    private _misses = 0;
    private _evictions = 0;
    private _expirations = 0;

    /**
     * Creates a new LRU Cache.
     *
     * @param maxSize - Maximum number of entries (must be > 0)
     * @param ttlMs - Optional TTL in milliseconds (null = no expiration)
     * @throws AppError if maxSize <= 0
     */
    constructor(
        private readonly maxSize: number,
        private readonly ttlMs: number | null = null
    ) {
        if (maxSize <= 0) {
            throw new AppError(ErrorCodes.INVALID_INPUT, 'LRUCache maxSize must be greater than 0');
        }
        if (ttlMs !== null && ttlMs <= 0) {
            throw new AppError(ErrorCodes.INVALID_INPUT, 'LRUCache ttlMs must be greater than 0 or null');
        }
        this.map = new Map();
    }

    /**
     * Moves a node to the front of the list (most recently used position).
     */
    private moveToFront(node: CacheNode<K, V>): void {
        if (node === this.head) return;

        // Remove from current position
        if (node.prev) node.prev.next = node.next;
        if (node.next) node.next.prev = node.prev;
        if (node === this.tail) this.tail = node.prev;

        // Move to front
        node.prev = null;
        node.next = this.head;
        if (this.head) this.head.prev = node;
        this.head = node;
        if (!this.tail) this.tail = node;
    }

    /**
     * Removes a node from the linked list.
     */
    private removeNode(node: CacheNode<K, V>): void {
        if (node.prev) node.prev.next = node.next;
        if (node.next) node.next.prev = node.prev;
        if (node === this.head) this.head = node.next;
        if (node === this.tail) this.tail = node.prev;
    }

    /**
     * Checks if a node has expired based on TTL.
     */
    private isExpired(node: CacheNode<K, V>): boolean {
        if (node.expiresAt === null) return false;
        return Date.now() > node.expiresAt;
    }

    /**
     * Gets a value from the cache.
     *
     * If found and not expired, moves the entry to the front (most recently used).
     * Expired entries are automatically removed.
     *
     * @param key - The key to look up
     * @returns The value if found and valid, undefined otherwise
     */
    get(key: K): V | undefined {
        const node = this.map.get(key);

        if (!node) {
            this._misses++;
            return undefined;
        }

        // Check expiration
        if (this.isExpired(node)) {
            this.removeNode(node);
            this.map.delete(key);
            this._misses++;
            this._expirations++;
            return undefined;
        }

        // Move to front (most recently used)
        this.moveToFront(node);
        this._hits++;
        return node.value;
    }

    /**
     * Sets a value in the cache.
     *
     * If the key exists, updates the value and moves to front.
     * If at capacity, evicts the least recently used entry.
     *
     * @param key - The key to store
     * @param value - The value to store
     */
    set(key: K, value: V): void {
        const existingNode = this.map.get(key);

        if (existingNode) {
            // Update existing entry
            existingNode.value = value;
            existingNode.expiresAt = this.ttlMs !== null ? Date.now() + this.ttlMs : null;
            this.moveToFront(existingNode);
            return;
        }

        // Create new node
        const expiresAt = this.ttlMs !== null ? Date.now() + this.ttlMs : null;
        const newNode = new CacheNode(key, value, expiresAt);
        this.map.set(key, newNode);

        // Add to front
        newNode.next = this.head;
        if (this.head) this.head.prev = newNode;
        this.head = newNode;
        if (!this.tail) this.tail = newNode;

        // Evict LRU if over capacity
        if (this.map.size > this.maxSize) {
            this.evictLRU();
        }
    }

    /**
     * Evicts the least recently used entry (tail of list).
     */
    private evictLRU(): void {
        if (this.tail) {
            this.map.delete(this.tail.key);
            this.tail = this.tail.prev;
            if (this.tail) {
                this.tail.next = null;
            } else {
                this.head = null;
            }
            this._evictions++;
        }
    }

    /**
     * Checks if a key exists in the cache (without affecting LRU order).
     *
     * Note: This does NOT move the entry to the front.
     * Use get() if you want to access the value and update LRU position.
     *
     * @param key - The key to check
     * @returns true if the key exists and is not expired
     */
    has(key: K): boolean {
        const node = this.map.get(key);
        if (!node) return false;

        // Check expiration
        if (this.isExpired(node)) {
            this.removeNode(node);
            this.map.delete(key);
            this._expirations++;
            return false;
        }

        return true;
    }

    /**
     * Deletes an entry from the cache.
     *
     * @param key - The key to delete
     * @returns true if the entry existed and was deleted
     */
    delete(key: K): boolean {
        const node = this.map.get(key);
        if (!node) return false;

        this.removeNode(node);
        return this.map.delete(key);
    }

    /**
     * Clears all entries from the cache.
     * Also resets statistics.
     */
    clear(): void {
        this.map.clear();
        this.head = null;
        this.tail = null;
        this._hits = 0;
        this._misses = 0;
        this._evictions = 0;
        this._expirations = 0;
    }

    /**
     * Current number of entries in the cache.
     */
    get size(): number {
        return this.map.size;
    }

    /**
     * Iterates over entries from most to least recently used.
     * Yields [key, value] pairs (expired entries are skipped and removed).
     */
    *entries(): IterableIterator<[K, V]> {
        let current = this.head;
        while (current) {
            const next = current.next; // Save next before potential removal

            if (this.isExpired(current)) {
                this.removeNode(current);
                this.map.delete(current.key);
                this._expirations++;
            } else {
                yield [current.key, current.value];
            }

            current = next;
        }
    }

    /**
     * Iterates over keys from most to least recently used.
     */
    *keys(): IterableIterator<K> {
        for (const [key] of this.entries()) {
            yield key;
        }
    }

    /**
     * Iterates over values from most to least recently used.
     */
    *values(): IterableIterator<V> {
        for (const [, value] of this.entries()) {
            yield value;
        }
    }

    /**
     * Removes all expired entries from the cache.
     * Call this periodically to proactively clean up memory.
     *
     * @returns Number of entries removed
     */
    evictExpired(): number {
        if (this.ttlMs === null) return 0;

        let removed = 0;
        const now = Date.now();

        for (const [key, node] of this.map.entries()) {
            if (node.expiresAt !== null && now > node.expiresAt) {
                this.removeNode(node);
                this.map.delete(key);
                removed++;
                this._expirations++;
            }
        }

        return removed;
    }

    /**
     * Gets cache statistics for monitoring.
     *
     * @returns Statistics object with size, hits, misses, etc.
     */
    getStats(): CacheStats {
        // Find oldest non-expired entry
        let oldestAt: number | null = null;
        let current = this.tail; // Start from tail (oldest)

        while (current) {
            if (!this.isExpired(current)) {
                // For entries with TTL, calculate when they were added
                if (current.expiresAt !== null && this.ttlMs !== null) {
                    oldestAt = current.expiresAt - this.ttlMs;
                }
                break;
            }
            current = current.prev;
        }

        const total = this._hits + this._misses;
        const hitRate = total > 0 ? (this._hits / total) * 100 : 0;

        return {
            size: this.map.size,
            maxSize: this.maxSize,
            hits: this._hits,
            misses: this._misses,
            hitRate: Math.round(hitRate * 100) / 100, // 2 decimal places
            evictions: this._evictions,
            expirations: this._expirations,
            oldestEntryAt: oldestAt,
            ttlMs: this.ttlMs,
        };
    }

    /**
     * Resets cache statistics (hits, misses, evictions, expirations).
     * Does not clear the cache itself.
     */
    resetStats(): void {
        this._hits = 0;
        this._misses = 0;
        this._evictions = 0;
        this._expirations = 0;
    }
}
