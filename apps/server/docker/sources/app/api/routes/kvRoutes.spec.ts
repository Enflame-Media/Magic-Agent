import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestApp, authHeader, TEST_USER_ID } from './__test__/testUtils';
import { kvRoutes } from './kvRoutes';
import type { Fastify } from '../types';

// Mock KV operations
vi.mock('@/app/kv/kvGet', () => ({
    kvGet: vi.fn(),
}));

vi.mock('@/app/kv/kvList', () => ({
    kvList: vi.fn(),
}));

vi.mock('@/app/kv/kvBulkGet', () => ({
    kvBulkGet: vi.fn(),
}));

vi.mock('@/app/kv/kvMutate', () => ({
    kvMutate: vi.fn(),
}));

vi.mock('@/utils/log', () => ({
    log: vi.fn(),
}));

import { kvGet } from '@/app/kv/kvGet';
import { kvList } from '@/app/kv/kvList';
import { kvBulkGet } from '@/app/kv/kvBulkGet';
import { kvMutate } from '@/app/kv/kvMutate';

/**
 * Integration tests for kvRoutes
 *
 * Tests the Key-Value store endpoints:
 * - GET /v1/kv/:key - Get single value
 * - GET /v1/kv - List key-value pairs with optional prefix filter
 * - POST /v1/kv/bulk - Bulk get values
 * - POST /v1/kv - Atomic batch mutation with optimistic locking
 *
 * The KV system uses optimistic locking:
 * - version: -1 for creating new keys
 * - Version mismatch on update returns 409 Conflict
 * - value: null marks a key for deletion
 */
describe('kvRoutes', () => {
    let app: Fastify;

    beforeEach(async () => {
        app = createTestApp();
        kvRoutes(app);
        await app.ready();
        vi.clearAllMocks();
    });

    afterEach(async () => {
        await app.close();
    });

    describe('GET /v1/kv/:key', () => {
        it('should return value for existing key', async () => {
            vi.mocked(kvGet).mockResolvedValue({
                key: 'my-key',
                value: 'my-value',
                version: 1
            });

            const response = await app.inject({
                method: 'GET',
                url: '/v1/kv/my-key',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.key).toBe('my-key');
            expect(body.value).toBe('my-value');
            expect(body.version).toBe(1);
            expect(vi.mocked(kvGet)).toHaveBeenCalledWith({ uid: TEST_USER_ID }, 'my-key');
        });

        it('should return 404 for non-existent key', async () => {
            vi.mocked(kvGet).mockResolvedValue(null);

            const response = await app.inject({
                method: 'GET',
                url: '/v1/kv/missing-key',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('Key not found');
        });

        it('should return 500 on internal error', async () => {
            vi.mocked(kvGet).mockRejectedValue(new Error('Database error'));

            const response = await app.inject({
                method: 'GET',
                url: '/v1/kv/error-key',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(500);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('Failed to get value');
        });

        it('should return 401 without authorization', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/v1/kv/my-key',
            });

            expect(response.statusCode).toBe(401);
        });

        it('should handle URL-encoded keys', async () => {
            vi.mocked(kvGet).mockResolvedValue({
                key: 'path/to/key',
                value: 'nested-value',
                version: 2
            });

            const response = await app.inject({
                method: 'GET',
                url: '/v1/kv/' + encodeURIComponent('path/to/key'),
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.value).toBe('nested-value');
        });
    });

    describe('GET /v1/kv (list)', () => {
        it('should return list of items', async () => {
            vi.mocked(kvList).mockResolvedValue({
                items: [
                    { key: 'key1', value: 'value1', version: 1 },
                    { key: 'key2', value: 'value2', version: 2 },
                ]
            });

            const response = await app.inject({
                method: 'GET',
                url: '/v1/kv',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.items).toHaveLength(2);
            expect(body.items[0].key).toBe('key1');
            expect(body.items[1].key).toBe('key2');
        });

        it('should filter by prefix', async () => {
            vi.mocked(kvList).mockResolvedValue({
                items: [
                    { key: 'settings/theme', value: 'dark', version: 1 },
                    { key: 'settings/lang', value: 'en', version: 1 },
                ]
            });

            const response = await app.inject({
                method: 'GET',
                url: '/v1/kv?prefix=settings/',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(200);
            expect(vi.mocked(kvList)).toHaveBeenCalledWith(
                { uid: TEST_USER_ID },
                { prefix: 'settings/', limit: 100 }
            );
        });

        it('should respect limit parameter', async () => {
            vi.mocked(kvList).mockResolvedValue({ items: [] });

            const response = await app.inject({
                method: 'GET',
                url: '/v1/kv?limit=50',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(200);
            expect(vi.mocked(kvList)).toHaveBeenCalledWith(
                { uid: TEST_USER_ID },
                { prefix: undefined, limit: 50 }
            );
        });

        it('should return empty array when no items exist', async () => {
            vi.mocked(kvList).mockResolvedValue({ items: [] });

            const response = await app.inject({
                method: 'GET',
                url: '/v1/kv',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.items).toHaveLength(0);
        });

        it('should return 500 on internal error', async () => {
            vi.mocked(kvList).mockRejectedValue(new Error('Database error'));

            const response = await app.inject({
                method: 'GET',
                url: '/v1/kv',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(500);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('Failed to list items');
        });

        it('should return 401 without authorization', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/v1/kv',
            });

            expect(response.statusCode).toBe(401);
        });
    });

    describe('POST /v1/kv/bulk', () => {
        it('should return values for multiple keys', async () => {
            vi.mocked(kvBulkGet).mockResolvedValue({
                values: [
                    { key: 'key1', value: 'value1', version: 1 },
                    { key: 'key2', value: 'value2', version: 2 },
                ]
            });

            const response = await app.inject({
                method: 'POST',
                url: '/v1/kv/bulk',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    keys: ['key1', 'key2']
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.values).toHaveLength(2);
            expect(vi.mocked(kvBulkGet)).toHaveBeenCalledWith(
                { uid: TEST_USER_ID },
                ['key1', 'key2']
            );
        });

        it('should return only existing keys', async () => {
            vi.mocked(kvBulkGet).mockResolvedValue({
                values: [
                    { key: 'key1', value: 'value1', version: 1 },
                    // key2 doesn't exist, not returned
                ]
            });

            const response = await app.inject({
                method: 'POST',
                url: '/v1/kv/bulk',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    keys: ['key1', 'key2']
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.values).toHaveLength(1);
        });

        it('should return 400 for empty keys array', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/v1/kv/bulk',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    keys: []
                }
            });

            expect(response.statusCode).toBe(400);
        });

        it('should return 400 for too many keys (>100)', async () => {
            const tooManyKeys = Array(101).fill(null).map((_, i) => `key${i}`);

            const response = await app.inject({
                method: 'POST',
                url: '/v1/kv/bulk',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    keys: tooManyKeys
                }
            });

            expect(response.statusCode).toBe(400);
        });

        it('should return 500 on internal error', async () => {
            vi.mocked(kvBulkGet).mockRejectedValue(new Error('Database error'));

            const response = await app.inject({
                method: 'POST',
                url: '/v1/kv/bulk',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    keys: ['key1']
                }
            });

            expect(response.statusCode).toBe(500);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('Failed to get values');
        });

        it('should return 401 without authorization', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/v1/kv/bulk',
                headers: { 'Content-Type': 'application/json' },
                payload: {
                    keys: ['key1']
                }
            });

            expect(response.statusCode).toBe(401);
        });
    });

    describe('POST /v1/kv (mutate)', () => {
        it('should create new key with version -1', async () => {
            vi.mocked(kvMutate).mockResolvedValue({
                success: true,
                results: [{ key: 'new-key', version: 1 }]
            });

            const response = await app.inject({
                method: 'POST',
                url: '/v1/kv',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    mutations: [{
                        key: 'new-key',
                        value: 'new-value',
                        version: -1  // -1 indicates new key
                    }]
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(true);
            expect(body.results).toHaveLength(1);
            expect(body.results[0].key).toBe('new-key');
            expect(body.results[0].version).toBe(1);
        });

        it('should update key with correct version', async () => {
            vi.mocked(kvMutate).mockResolvedValue({
                success: true,
                results: [{ key: 'existing-key', version: 2 }]
            });

            const response = await app.inject({
                method: 'POST',
                url: '/v1/kv',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    mutations: [{
                        key: 'existing-key',
                        value: 'updated-value',
                        version: 1  // Current version
                    }]
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(true);
            expect(body.results[0].version).toBe(2);  // Incremented
        });

        it('should return 409 for version mismatch', async () => {
            vi.mocked(kvMutate).mockResolvedValue({
                success: false,
                errors: [{
                    key: 'conflict-key',
                    error: 'version-mismatch',
                    version: 3,  // Actual current version
                    value: 'current-value'
                }]
            });

            const response = await app.inject({
                method: 'POST',
                url: '/v1/kv',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    mutations: [{
                        key: 'conflict-key',
                        value: 'stale-update',
                        version: 1  // Wrong version
                    }]
                }
            });

            expect(response.statusCode).toBe(409);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(false);
            expect(body.errors).toHaveLength(1);
            expect(body.errors[0].error).toBe('version-mismatch');
            expect(body.errors[0].version).toBe(3);
        });

        it('should delete key with null value', async () => {
            vi.mocked(kvMutate).mockResolvedValue({
                success: true,
                results: [{ key: 'delete-key', version: 0 }]
            });

            const response = await app.inject({
                method: 'POST',
                url: '/v1/kv',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    mutations: [{
                        key: 'delete-key',
                        value: null,  // null = delete
                        version: 2
                    }]
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(true);
        });

        it('should handle batch mutations', async () => {
            vi.mocked(kvMutate).mockResolvedValue({
                success: true,
                results: [
                    { key: 'key1', version: 1 },
                    { key: 'key2', version: 1 },
                    { key: 'key3', version: 3 },
                ]
            });

            const response = await app.inject({
                method: 'POST',
                url: '/v1/kv',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    mutations: [
                        { key: 'key1', value: 'value1', version: -1 },
                        { key: 'key2', value: 'value2', version: -1 },
                        { key: 'key3', value: 'updated3', version: 2 },
                    ]
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.results).toHaveLength(3);
        });

        it('should return 400 for empty mutations array', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/v1/kv',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    mutations: []
                }
            });

            expect(response.statusCode).toBe(400);
        });

        it('should return 400 for too many mutations (>100)', async () => {
            const tooManyMutations = Array(101).fill(null).map((_, i) => ({
                key: `key${i}`,
                value: `value${i}`,
                version: -1
            }));

            const response = await app.inject({
                method: 'POST',
                url: '/v1/kv',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    mutations: tooManyMutations
                }
            });

            expect(response.statusCode).toBe(400);
        });

        it('should return 500 on internal error', async () => {
            vi.mocked(kvMutate).mockRejectedValue(new Error('Database error'));

            const response = await app.inject({
                method: 'POST',
                url: '/v1/kv',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    mutations: [{
                        key: 'error-key',
                        value: 'error-value',
                        version: -1
                    }]
                }
            });

            expect(response.statusCode).toBe(500);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('Failed to mutate values');
        });

        it('should return 401 without authorization', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/v1/kv',
                headers: { 'Content-Type': 'application/json' },
                payload: {
                    mutations: [{
                        key: 'key',
                        value: 'value',
                        version: -1
                    }]
                }
            });

            expect(response.statusCode).toBe(401);
        });
    });
});
