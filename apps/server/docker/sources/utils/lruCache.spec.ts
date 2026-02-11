import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LRUCache } from './lruCache';

describe('LRUCache', () => {
    describe('constructor', () => {
        it('should throw error when maxSize is 0 or negative', () => {
            expect(() => new LRUCache(0)).toThrow('LRUCache maxSize must be greater than 0');
            expect(() => new LRUCache(-1)).toThrow('LRUCache maxSize must be greater than 0');
        });

        it('should throw error when ttlMs is 0 or negative', () => {
            expect(() => new LRUCache(10, 0)).toThrow('LRUCache ttlMs must be greater than 0 or null');
            expect(() => new LRUCache(10, -1)).toThrow('LRUCache ttlMs must be greater than 0 or null');
        });

        it('should create LRUCache with valid maxSize', () => {
            const cache = new LRUCache(3);
            expect(cache.size).toBe(0);
        });

        it('should create LRUCache with valid maxSize and ttlMs', () => {
            const cache = new LRUCache(3, 1000);
            expect(cache.size).toBe(0);
        });
    });

    describe('basic operations', () => {
        let cache: LRUCache<string, number>;

        beforeEach(() => {
            cache = new LRUCache<string, number>(3);
        });

        it('should set and get values', () => {
            cache.set('a', 1);
            cache.set('b', 2);
            cache.set('c', 3);

            expect(cache.get('a')).toBe(1);
            expect(cache.get('b')).toBe(2);
            expect(cache.get('c')).toBe(3);
        });

        it('should return undefined for non-existent keys', () => {
            cache.set('a', 1);
            expect(cache.get('nonexistent')).toBeUndefined();
        });

        it('should update existing keys', () => {
            cache.set('a', 1);
            cache.set('a', 100);
            expect(cache.get('a')).toBe(100);
            expect(cache.size).toBe(1);
        });

        it('should check if key exists with has()', () => {
            cache.set('a', 1);
            expect(cache.has('a')).toBe(true);
            expect(cache.has('b')).toBe(false);
        });

        it('should delete entries', () => {
            cache.set('a', 1);
            cache.set('b', 2);

            expect(cache.delete('a')).toBe(true);
            expect(cache.get('a')).toBeUndefined();
            expect(cache.size).toBe(1);

            expect(cache.delete('a')).toBe(false); // Already deleted
        });

        it('should clear all entries', () => {
            cache.set('a', 1);
            cache.set('b', 2);
            cache.set('c', 3);

            cache.clear();

            expect(cache.size).toBe(0);
            expect(cache.get('a')).toBeUndefined();
            expect(cache.get('b')).toBeUndefined();
            expect(cache.get('c')).toBeUndefined();
        });
    });

    describe('LRU eviction', () => {
        it('should evict least recently used when at capacity', () => {
            const cache = new LRUCache<string, number>(3);
            cache.set('a', 1);
            cache.set('b', 2);
            cache.set('c', 3);
            cache.set('d', 4); // Should evict 'a'

            expect(cache.size).toBe(3);
            expect(cache.get('a')).toBeUndefined();
            expect(cache.get('b')).toBe(2);
            expect(cache.get('c')).toBe(3);
            expect(cache.get('d')).toBe(4);
        });

        it('should move accessed items to front', () => {
            const cache = new LRUCache<string, number>(3);
            cache.set('a', 1);
            cache.set('b', 2);
            cache.set('c', 3);

            // Access 'a', moving it to front
            cache.get('a');

            // Add 'd', should evict 'b' (now least recently used)
            cache.set('d', 4);

            expect(cache.get('a')).toBe(1);
            expect(cache.get('b')).toBeUndefined();
            expect(cache.get('c')).toBe(3);
            expect(cache.get('d')).toBe(4);
        });

        it('should move updated items to front', () => {
            const cache = new LRUCache<string, number>(3);
            cache.set('a', 1);
            cache.set('b', 2);
            cache.set('c', 3);

            // Update 'a', moving it to front
            cache.set('a', 100);

            // Add 'd', should evict 'b'
            cache.set('d', 4);

            expect(cache.get('a')).toBe(100);
            expect(cache.get('b')).toBeUndefined();
            expect(cache.get('c')).toBe(3);
            expect(cache.get('d')).toBe(4);
        });

        it('should handle single item capacity', () => {
            const cache = new LRUCache<string, number>(1);
            cache.set('a', 1);
            cache.set('b', 2);

            expect(cache.size).toBe(1);
            expect(cache.get('a')).toBeUndefined();
            expect(cache.get('b')).toBe(2);
        });
    });

    describe('TTL expiration', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('should expire entries after TTL', () => {
            const cache = new LRUCache<string, number>(10, 1000); // 1 second TTL
            cache.set('a', 1);

            expect(cache.get('a')).toBe(1);

            // Advance time past TTL
            vi.advanceTimersByTime(1500);

            expect(cache.get('a')).toBeUndefined();
        });

        it('should return undefined for expired entries in has()', () => {
            const cache = new LRUCache<string, number>(10, 1000);
            cache.set('a', 1);

            expect(cache.has('a')).toBe(true);

            vi.advanceTimersByTime(1500);

            expect(cache.has('a')).toBe(false);
        });

        it('should refresh TTL on update', () => {
            const cache = new LRUCache<string, number>(10, 1000);
            cache.set('a', 1);

            // Advance time but not past TTL
            vi.advanceTimersByTime(800);

            // Update the entry, refreshing TTL
            cache.set('a', 2);

            // Advance time to where original would have expired
            vi.advanceTimersByTime(500);

            // Should still be valid because TTL was refreshed
            expect(cache.get('a')).toBe(2);

            // Advance past new TTL
            vi.advanceTimersByTime(600);

            expect(cache.get('a')).toBeUndefined();
        });

        it('should not expire entries without TTL', () => {
            const cache = new LRUCache<string, number>(10); // No TTL
            cache.set('a', 1);

            vi.advanceTimersByTime(100000000); // Advance time significantly

            expect(cache.get('a')).toBe(1);
        });

        it('should evict expired entries with evictExpired()', () => {
            const cache = new LRUCache<string, number>(10, 1000);
            cache.set('a', 1);
            cache.set('b', 2);
            cache.set('c', 3);

            vi.advanceTimersByTime(500);
            cache.set('d', 4); // Added later, will expire later

            vi.advanceTimersByTime(600); // a, b, c should now be expired

            const removed = cache.evictExpired();

            expect(removed).toBe(3);
            expect(cache.size).toBe(1);
            expect(cache.get('d')).toBe(4);
        });

        it('should return 0 from evictExpired() when no TTL', () => {
            const cache = new LRUCache<string, number>(10);
            cache.set('a', 1);

            expect(cache.evictExpired()).toBe(0);
        });
    });

    describe('iteration', () => {
        it('should iterate entries in MRU order', () => {
            const cache = new LRUCache<string, number>(4);
            cache.set('a', 1);
            cache.set('b', 2);
            cache.set('c', 3);
            cache.set('d', 4);

            const entries = Array.from(cache.entries());
            expect(entries).toEqual([
                ['d', 4],
                ['c', 3],
                ['b', 2],
                ['a', 1],
            ]);
        });

        it('should iterate keys in MRU order', () => {
            const cache = new LRUCache<string, number>(4);
            cache.set('a', 1);
            cache.set('b', 2);
            cache.set('c', 3);

            const keys = Array.from(cache.keys());
            expect(keys).toEqual(['c', 'b', 'a']);
        });

        it('should iterate values in MRU order', () => {
            const cache = new LRUCache<string, number>(4);
            cache.set('a', 1);
            cache.set('b', 2);
            cache.set('c', 3);

            const values = Array.from(cache.values());
            expect(values).toEqual([3, 2, 1]);
        });

        it('should skip expired entries during iteration', () => {
            vi.useFakeTimers();
            const cache = new LRUCache<string, number>(10, 1000);
            cache.set('a', 1);
            cache.set('b', 2);

            vi.advanceTimersByTime(500);
            cache.set('c', 3);

            vi.advanceTimersByTime(600); // a, b expired, c still valid

            const entries = Array.from(cache.entries());
            expect(entries).toEqual([['c', 3]]);
            expect(cache.size).toBe(1); // Expired entries were removed

            vi.useRealTimers();
        });
    });

    describe('statistics', () => {
        it('should track hits and misses', () => {
            const cache = new LRUCache<string, number>(10);
            cache.set('a', 1);

            cache.get('a'); // hit
            cache.get('a'); // hit
            cache.get('b'); // miss

            const stats = cache.getStats();
            expect(stats.hits).toBe(2);
            expect(stats.misses).toBe(1);
            expect(stats.hitRate).toBeCloseTo(66.67, 1);
        });

        it('should track evictions', () => {
            const cache = new LRUCache<string, number>(2);
            cache.set('a', 1);
            cache.set('b', 2);
            cache.set('c', 3); // evicts 'a'
            cache.set('d', 4); // evicts 'b'

            const stats = cache.getStats();
            expect(stats.evictions).toBe(2);
        });

        it('should track expirations', () => {
            vi.useFakeTimers();
            const cache = new LRUCache<string, number>(10, 1000);
            cache.set('a', 1);
            cache.set('b', 2);

            vi.advanceTimersByTime(1500);

            cache.get('a'); // miss due to expiration
            cache.get('b'); // miss due to expiration

            const stats = cache.getStats();
            expect(stats.expirations).toBe(2);
            expect(stats.misses).toBe(2);

            vi.useRealTimers();
        });

        it('should report correct maxSize and ttlMs', () => {
            const cache = new LRUCache<string, number>(100, 5000);
            const stats = cache.getStats();

            expect(stats.maxSize).toBe(100);
            expect(stats.ttlMs).toBe(5000);
        });

        it('should report null ttlMs when no TTL', () => {
            const cache = new LRUCache<string, number>(100);
            const stats = cache.getStats();

            expect(stats.ttlMs).toBeNull();
        });

        it('should reset statistics', () => {
            const cache = new LRUCache<string, number>(10);
            cache.set('a', 1);
            cache.get('a');
            cache.get('b');

            cache.resetStats();

            const stats = cache.getStats();
            expect(stats.hits).toBe(0);
            expect(stats.misses).toBe(0);
            expect(stats.evictions).toBe(0);
            expect(stats.expirations).toBe(0);
            expect(stats.size).toBe(1); // Cache still has data
        });

        it('should handle hitRate with no operations', () => {
            const cache = new LRUCache<string, number>(10);
            const stats = cache.getStats();

            expect(stats.hitRate).toBe(0);
        });
    });

    describe('edge cases', () => {
        it('should handle operations on empty cache', () => {
            const cache = new LRUCache<string, number>(3);

            expect(cache.size).toBe(0);
            expect(cache.get('a')).toBeUndefined();
            expect(cache.has('a')).toBe(false);
            expect(cache.delete('a')).toBe(false);
            expect(Array.from(cache.entries())).toEqual([]);
        });

        it('should work with object keys', () => {
            const cache = new LRUCache<object, string>(2);
            const key1 = { id: 1 };
            const key2 = { id: 2 };
            const key3 = { id: 3 };

            cache.set(key1, 'one');
            cache.set(key2, 'two');
            cache.set(key3, 'three'); // evicts key1

            expect(cache.get(key1)).toBeUndefined();
            expect(cache.get(key2)).toBe('two');
            expect(cache.get(key3)).toBe('three');
        });

        it('should handle delete of head node', () => {
            const cache = new LRUCache<string, number>(3);
            cache.set('a', 1);
            cache.set('b', 2);
            cache.set('c', 3); // 'c' is head

            expect(cache.delete('c')).toBe(true);
            expect(cache.size).toBe(2);

            const keys = Array.from(cache.keys());
            expect(keys).toEqual(['b', 'a']);
        });

        it('should handle delete of tail node', () => {
            const cache = new LRUCache<string, number>(3);
            cache.set('a', 1); // 'a' is tail
            cache.set('b', 2);
            cache.set('c', 3);

            expect(cache.delete('a')).toBe(true);
            expect(cache.size).toBe(2);

            const keys = Array.from(cache.keys());
            expect(keys).toEqual(['c', 'b']);
        });

        it('should handle delete of middle node', () => {
            const cache = new LRUCache<string, number>(3);
            cache.set('a', 1);
            cache.set('b', 2); // 'b' is middle
            cache.set('c', 3);

            expect(cache.delete('b')).toBe(true);
            expect(cache.size).toBe(2);

            const keys = Array.from(cache.keys());
            expect(keys).toEqual(['c', 'a']);
        });

        it('should handle rapid set/get cycles', () => {
            const cache = new LRUCache<number, number>(100);

            // Simulate rapid access pattern
            for (let i = 0; i < 1000; i++) {
                cache.set(i % 150, i); // Some evictions will occur
                cache.get(i % 100);
            }

            expect(cache.size).toBeLessThanOrEqual(100);
            const stats = cache.getStats();
            expect(stats.evictions).toBeGreaterThan(0);
        });

        it('should handle clear and reuse', () => {
            const cache = new LRUCache<string, number>(3);
            cache.set('a', 1);
            cache.set('b', 2);

            cache.clear();

            cache.set('c', 3);
            cache.set('d', 4);

            expect(cache.size).toBe(2);
            expect(cache.get('c')).toBe(3);
            expect(cache.get('d')).toBe(4);
        });
    });

    describe('memory leak prevention (the original issue)', () => {
        it('should maintain bounded size under continuous load', () => {
            const maxSize = 100;
            const cache = new LRUCache<string, { data: string }>(maxSize, 60000);

            // Simulate 10,000 unique tokens being cached
            for (let i = 0; i < 10000; i++) {
                cache.set(`token_${i}`, { data: `user_${i}` });
            }

            // Size should never exceed maxSize
            expect(cache.size).toBe(maxSize);

            // Most recent entries should still be accessible
            expect(cache.get('token_9999')).toEqual({ data: 'user_9999' });
            expect(cache.get('token_9900')).toEqual({ data: 'user_9900' });

            // Old entries should have been evicted
            expect(cache.get('token_0')).toBeUndefined();
            expect(cache.get('token_100')).toBeUndefined();
        });

        it('should evict entries after TTL even without access', () => {
            vi.useFakeTimers();
            const cache = new LRUCache<string, { userId: string }>(10000, 24 * 60 * 60 * 1000); // 24 hour TTL

            // Add some tokens
            cache.set('old_token', { userId: 'user1' });

            // Advance time past TTL
            vi.advanceTimersByTime(25 * 60 * 60 * 1000); // 25 hours

            // Proactive cleanup
            const removed = cache.evictExpired();
            expect(removed).toBe(1);
            expect(cache.size).toBe(0);

            vi.useRealTimers();
        });
    });
});
