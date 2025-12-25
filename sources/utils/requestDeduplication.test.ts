import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    generateCacheKey,
    deduplicatedFetch,
    getInFlightRequestCount,
    clearInFlightRequests,
} from './requestDeduplication';

// Mock fetchWithTimeout
vi.mock('./fetchWithTimeout', () => ({
    fetchWithTimeout: vi.fn(),
}));

import { fetchWithTimeout } from './fetchWithTimeout';

const mockFetchWithTimeout = vi.mocked(fetchWithTimeout);

/**
 * Creates a mock Response object that can be cloned.
 * Each clone maintains independent body consumption state.
 */
function createMockResponse(body: unknown, options: ResponseInit = {}): Response {
    const bodyString = typeof body === 'string' ? body : JSON.stringify(body);

    const createResponse = (): Response => {
        let consumed = false;
        const response = {
            ok: true,
            status: options.status ?? 200,
            statusText: options.statusText ?? 'OK',
            headers: new Headers(options.headers),
            redirected: false,
            type: 'basic' as ResponseType,
            url: '',
            body: null,
            bodyUsed: false,
            clone: vi.fn(() => {
                return createResponse();
            }),
            arrayBuffer: vi.fn(async () => {
                if (consumed) throw new Error('Body already consumed');
                consumed = true;
                return new TextEncoder().encode(bodyString).buffer;
            }),
            blob: vi.fn(async () => {
                if (consumed) throw new Error('Body already consumed');
                consumed = true;
                return new Blob([bodyString]);
            }),
            formData: vi.fn(async () => {
                if (consumed) throw new Error('Body already consumed');
                consumed = true;
                return new FormData();
            }),
            json: vi.fn(async () => {
                if (consumed) throw new Error('Body already consumed');
                consumed = true;
                return JSON.parse(bodyString);
            }),
            text: vi.fn(async () => {
                if (consumed) throw new Error('Body already consumed');
                consumed = true;
                return bodyString;
            }),
            bytes: vi.fn(async () => {
                if (consumed) throw new Error('Body already consumed');
                consumed = true;
                return new TextEncoder().encode(bodyString);
            }),
        } as unknown as Response;
        return response;
    };

    return createResponse();
}

describe('requestDeduplication', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        clearInFlightRequests();
    });

    afterEach(() => {
        clearInFlightRequests();
    });

    describe('generateCacheKey', () => {
        describe('basic key generation', () => {
            it('should generate key with default GET method', () => {
                const key = generateCacheKey('/api/users');
                expect(key).toBe('GET:/api/users');
            });

            it('should generate key with explicit GET method', () => {
                const key = generateCacheKey('/api/users', { method: 'GET' });
                expect(key).toBe('GET:/api/users');
            });

            it('should normalize method to uppercase', () => {
                const key = generateCacheKey('/api/users', { method: 'get' });
                expect(key).toBe('GET:/api/users');
            });

            it('should handle different HTTP methods', () => {
                expect(generateCacheKey('/api/users', { method: 'POST' })).toBe('POST:/api/users');
                expect(generateCacheKey('/api/users', { method: 'PUT' })).toBe('PUT:/api/users');
                expect(generateCacheKey('/api/users', { method: 'DELETE' })).toBe('DELETE:/api/users');
                expect(generateCacheKey('/api/users', { method: 'PATCH' })).toBe('PATCH:/api/users');
                expect(generateCacheKey('/api/users', { method: 'HEAD' })).toBe('HEAD:/api/users');
                expect(generateCacheKey('/api/users', { method: 'OPTIONS' })).toBe('OPTIONS:/api/users');
            });

            it('should handle complex URLs', () => {
                const key = generateCacheKey('https://api.example.com/v1/users?page=1&limit=10');
                expect(key).toBe('GET:https://api.example.com/v1/users?page=1&limit=10');
            });
        });

        describe('string body handling', () => {
            it('should include string body in key', () => {
                const key = generateCacheKey('/api/users', {
                    method: 'POST',
                    body: JSON.stringify({ name: 'John' }),
                });
                expect(key).toBe('POST:/api/users:{"name":"John"}');
            });

            it('should produce different keys for different bodies', () => {
                const key1 = generateCacheKey('/api/users', {
                    method: 'POST',
                    body: JSON.stringify({ name: 'John' }),
                });
                const key2 = generateCacheKey('/api/users', {
                    method: 'POST',
                    body: JSON.stringify({ name: 'Jane' }),
                });
                expect(key1).not.toBe(key2);
            });

            it('should produce same key for identical requests', () => {
                const key1 = generateCacheKey('/api/data', { method: 'GET' });
                const key2 = generateCacheKey('/api/data', { method: 'GET' });
                expect(key1).toBe(key2);
            });
        });

        describe('URLSearchParams body handling', () => {
            it('should include URLSearchParams body in key', () => {
                const params = new URLSearchParams();
                params.append('name', 'John');
                params.append('age', '30');

                const key = generateCacheKey('/api/form', {
                    method: 'POST',
                    body: params,
                });
                expect(key).toBe('POST:/api/form:name=John&age=30');
            });
        });

        describe('uncomparable body types', () => {
            it('should generate unique key for FormData (includes timestamp)', () => {
                const formData = new FormData();
                formData.append('file', 'test');

                const key1 = generateCacheKey('/api/upload', {
                    method: 'POST',
                    body: formData,
                });
                expect(key1).toMatch(/^POST:\/api\/upload:formdata:\d+$/);
            });

            it('should generate timestamp-based key for FormData (ensuring uniqueness)', () => {
                // The implementation uses Date.now() which returns milliseconds
                // Multiple calls within the same millisecond may produce the same key
                // This is intentional - the test verifies the format, not guaranteed uniqueness
                const formData = new FormData();

                const key = generateCacheKey('/api/upload', {
                    method: 'POST',
                    body: formData,
                });

                // Verify format: should contain timestamp digits after formdata:
                expect(key).toMatch(/^POST:\/api\/upload:formdata:\d+$/);

                // Verify it's a valid timestamp (within reasonable range)
                const timestampMatch = key.match(/:formdata:(\d+)$/);
                expect(timestampMatch).not.toBeNull();
                const timestamp = parseInt(timestampMatch![1], 10);
                const now = Date.now();
                // Timestamp should be within last second
                expect(timestamp).toBeLessThanOrEqual(now);
                expect(timestamp).toBeGreaterThan(now - 1000);
            });

            it('should generate unique key for Blob body', () => {
                const blob = new Blob(['test']);

                const key = generateCacheKey('/api/upload', {
                    method: 'POST',
                    body: blob,
                });
                expect(key).toMatch(/^POST:\/api\/upload:blob:\d+$/);
            });

            it('should generate unique key for ArrayBuffer body', () => {
                const buffer = new ArrayBuffer(8);

                const key = generateCacheKey('/api/binary', {
                    method: 'POST',
                    body: buffer,
                });
                expect(key).toMatch(/^POST:\/api\/binary:binary:\d+$/);
            });

            it('should generate unique key for Uint8Array body', () => {
                const typedArray = new Uint8Array([1, 2, 3, 4]);

                const key = generateCacheKey('/api/binary', {
                    method: 'POST',
                    body: typedArray,
                });
                expect(key).toMatch(/^POST:\/api\/binary:binary:\d+$/);
            });

            it('should generate unique key for ReadableStream body', () => {
                const stream = new ReadableStream({
                    start(controller) {
                        controller.enqueue(new TextEncoder().encode('test'));
                        controller.close();
                    },
                });

                const key = generateCacheKey('/api/stream', {
                    method: 'POST',
                    body: stream,
                });
                expect(key).toMatch(/^POST:\/api\/stream:stream:\d+$/);
            });
        });
    });

    describe('deduplicatedFetch', () => {
        describe('basic functionality', () => {
            it('should call fetchWithTimeout for a single request', async () => {
                const mockResponse = createMockResponse({ data: 'test' });
                mockFetchWithTimeout.mockResolvedValueOnce(mockResponse);

                const response = await deduplicatedFetch('/api/users');

                expect(mockFetchWithTimeout).toHaveBeenCalledTimes(1);
                expect(mockFetchWithTimeout).toHaveBeenCalledWith('/api/users', {});
                expect(response).toBeDefined();
            });

            it('should return cloned response', async () => {
                const mockResponse = createMockResponse({ data: 'test' });
                mockFetchWithTimeout.mockResolvedValueOnce(mockResponse);

                const response = await deduplicatedFetch('/api/users');

                // The returned response should be a clone, not the original
                expect(mockResponse.clone).toHaveBeenCalled();
                expect(response).toBeDefined();
            });

            it('should pass through options to fetchWithTimeout', async () => {
                const mockResponse = createMockResponse({ data: 'test' });
                mockFetchWithTimeout.mockResolvedValueOnce(mockResponse);

                await deduplicatedFetch('/api/users', {
                    headers: { 'Authorization': 'Bearer token' },
                    timeoutMs: 5000,
                });

                expect(mockFetchWithTimeout).toHaveBeenCalledWith('/api/users', {
                    headers: { 'Authorization': 'Bearer token' },
                    timeoutMs: 5000,
                });
            });
        });

        describe('concurrent request deduplication', () => {
            it('should deduplicate concurrent identical GET requests', async () => {
                const mockResponse = createMockResponse({ data: 'test' });
                mockFetchWithTimeout.mockImplementation(() => {
                    return new Promise(resolve => {
                        setTimeout(() => resolve(mockResponse), 100);
                    });
                });

                // Make 3 concurrent identical requests
                const [response1, response2, response3] = await Promise.all([
                    deduplicatedFetch('/api/users'),
                    deduplicatedFetch('/api/users'),
                    deduplicatedFetch('/api/users'),
                ]);

                // Should only make ONE network request
                expect(mockFetchWithTimeout).toHaveBeenCalledTimes(1);

                // All should receive responses
                expect(response1).toBeDefined();
                expect(response2).toBeDefined();
                expect(response3).toBeDefined();
            });

            it('should track in-flight request count', async () => {
                const mockResponse = createMockResponse({ data: 'test' });
                let resolveRequest: (value: Response) => void;
                const pendingPromise = new Promise<Response>(resolve => {
                    resolveRequest = resolve;
                });

                mockFetchWithTimeout.mockReturnValueOnce(pendingPromise);

                expect(getInFlightRequestCount()).toBe(0);

                // Start request but don't await
                const fetchPromise = deduplicatedFetch('/api/users');

                // Give it a tick to register
                await new Promise(resolve => setTimeout(resolve, 0));

                expect(getInFlightRequestCount()).toBe(1);

                // Resolve the request
                resolveRequest!(mockResponse);
                await fetchPromise;

                expect(getInFlightRequestCount()).toBe(0);
            });

            it('should not deduplicate requests with different URLs', async () => {
                const mockResponse1 = createMockResponse({ id: 1 });
                const mockResponse2 = createMockResponse({ id: 2 });

                mockFetchWithTimeout
                    .mockResolvedValueOnce(mockResponse1)
                    .mockResolvedValueOnce(mockResponse2);

                const [response1, response2] = await Promise.all([
                    deduplicatedFetch('/api/users/1'),
                    deduplicatedFetch('/api/users/2'),
                ]);

                expect(mockFetchWithTimeout).toHaveBeenCalledTimes(2);
                expect(response1).toBeDefined();
                expect(response2).toBeDefined();
            });

            it('should deduplicate HEAD requests', async () => {
                const mockResponse = createMockResponse('');
                mockFetchWithTimeout.mockImplementation(() => {
                    return new Promise(resolve => {
                        setTimeout(() => resolve(mockResponse), 100);
                    });
                });

                await Promise.all([
                    deduplicatedFetch('/api/health', { method: 'HEAD' }),
                    deduplicatedFetch('/api/health', { method: 'HEAD' }),
                ]);

                expect(mockFetchWithTimeout).toHaveBeenCalledTimes(1);
            });

            it('should deduplicate OPTIONS requests', async () => {
                const mockResponse = createMockResponse('');
                mockFetchWithTimeout.mockImplementation(() => {
                    return new Promise(resolve => {
                        setTimeout(() => resolve(mockResponse), 100);
                    });
                });

                await Promise.all([
                    deduplicatedFetch('/api/cors', { method: 'OPTIONS' }),
                    deduplicatedFetch('/api/cors', { method: 'OPTIONS' }),
                ]);

                expect(mockFetchWithTimeout).toHaveBeenCalledTimes(1);
            });
        });

        describe('non-idempotent method bypass', () => {
            it('should NOT deduplicate POST requests', async () => {
                const mockResponse = createMockResponse({ created: true });
                mockFetchWithTimeout.mockResolvedValue(mockResponse);

                await Promise.all([
                    deduplicatedFetch('/api/users', { method: 'POST', body: '{}' }),
                    deduplicatedFetch('/api/users', { method: 'POST', body: '{}' }),
                ]);

                // Each POST should make a separate request
                expect(mockFetchWithTimeout).toHaveBeenCalledTimes(2);
            });

            it('should NOT deduplicate PUT requests', async () => {
                const mockResponse = createMockResponse({ updated: true });
                mockFetchWithTimeout.mockResolvedValue(mockResponse);

                await Promise.all([
                    deduplicatedFetch('/api/users/1', { method: 'PUT', body: '{}' }),
                    deduplicatedFetch('/api/users/1', { method: 'PUT', body: '{}' }),
                ]);

                expect(mockFetchWithTimeout).toHaveBeenCalledTimes(2);
            });

            it('should NOT deduplicate DELETE requests', async () => {
                const mockResponse = createMockResponse({ deleted: true });
                mockFetchWithTimeout.mockResolvedValue(mockResponse);

                await Promise.all([
                    deduplicatedFetch('/api/users/1', { method: 'DELETE' }),
                    deduplicatedFetch('/api/users/1', { method: 'DELETE' }),
                ]);

                expect(mockFetchWithTimeout).toHaveBeenCalledTimes(2);
            });

            it('should NOT deduplicate PATCH requests', async () => {
                const mockResponse = createMockResponse({ patched: true });
                mockFetchWithTimeout.mockResolvedValue(mockResponse);

                await Promise.all([
                    deduplicatedFetch('/api/users/1', { method: 'PATCH', body: '{}' }),
                    deduplicatedFetch('/api/users/1', { method: 'PATCH', body: '{}' }),
                ]);

                expect(mockFetchWithTimeout).toHaveBeenCalledTimes(2);
            });
        });

        describe('response cloning for multiple callers', () => {
            it('should provide independent response bodies to each caller', async () => {
                const mockResponse = createMockResponse({ user: 'John', age: 30 });
                mockFetchWithTimeout.mockImplementation(() => {
                    return new Promise(resolve => {
                        setTimeout(() => resolve(mockResponse), 100);
                    });
                });

                const [response1, response2, response3] = await Promise.all([
                    deduplicatedFetch('/api/users'),
                    deduplicatedFetch('/api/users'),
                    deduplicatedFetch('/api/users'),
                ]);

                // Each caller should be able to independently consume the body
                const data1 = await response1.json();
                const data2 = await response2.json();
                const data3 = await response3.json();

                expect(data1).toEqual({ user: 'John', age: 30 });
                expect(data2).toEqual({ user: 'John', age: 30 });
                expect(data3).toEqual({ user: 'John', age: 30 });
            });

            it('should allow different body consumption methods', async () => {
                const mockResponse = createMockResponse({ data: 'test' });
                mockFetchWithTimeout.mockImplementation(() => {
                    return new Promise(resolve => {
                        setTimeout(() => resolve(mockResponse), 100);
                    });
                });

                const [response1, response2] = await Promise.all([
                    deduplicatedFetch('/api/data'),
                    deduplicatedFetch('/api/data'),
                ]);

                // One uses json(), other uses text()
                const json = await response1.json();
                const text = await response2.text();

                expect(json).toEqual({ data: 'test' });
                expect(text).toBe('{"data":"test"}');
            });
        });

        describe('skipDeduplication option', () => {
            it('should skip deduplication when option is set', async () => {
                const mockResponse = createMockResponse({ data: 'test' });
                mockFetchWithTimeout.mockResolvedValue(mockResponse);

                await Promise.all([
                    deduplicatedFetch('/api/data', { skipDeduplication: true }),
                    deduplicatedFetch('/api/data', { skipDeduplication: true }),
                ]);

                // Each request should be independent
                expect(mockFetchWithTimeout).toHaveBeenCalledTimes(2);
            });

            it('should not include skipDeduplication in fetch options', async () => {
                const mockResponse = createMockResponse({ data: 'test' });
                mockFetchWithTimeout.mockResolvedValue(mockResponse);

                await deduplicatedFetch('/api/data', {
                    skipDeduplication: true,
                    headers: { 'Content-Type': 'application/json' },
                });

                // skipDeduplication should be stripped from the options
                expect(mockFetchWithTimeout).toHaveBeenCalledWith('/api/data', {
                    headers: { 'Content-Type': 'application/json' },
                });
            });
        });

        describe('uncomparable body bypass', () => {
            it('should skip deduplication for FormData body', async () => {
                const mockResponse = createMockResponse({ uploaded: true });
                mockFetchWithTimeout.mockResolvedValue(mockResponse);

                const formData1 = new FormData();
                const formData2 = new FormData();

                await Promise.all([
                    deduplicatedFetch('/api/upload', { method: 'POST', body: formData1 }),
                    deduplicatedFetch('/api/upload', { method: 'POST', body: formData2 }),
                ]);

                // FormData requests are always bypassed (POST + uncomparable)
                expect(mockFetchWithTimeout).toHaveBeenCalledTimes(2);
            });

            it('should skip deduplication for Blob body', async () => {
                const mockResponse = createMockResponse({ uploaded: true });
                mockFetchWithTimeout.mockResolvedValue(mockResponse);

                const blob1 = new Blob(['test']);
                const blob2 = new Blob(['test']);

                await Promise.all([
                    deduplicatedFetch('/api/upload', { method: 'POST', body: blob1 }),
                    deduplicatedFetch('/api/upload', { method: 'POST', body: blob2 }),
                ]);

                expect(mockFetchWithTimeout).toHaveBeenCalledTimes(2);
            });

            it('should skip deduplication for ReadableStream body', async () => {
                const mockResponse = createMockResponse({ streamed: true });
                mockFetchWithTimeout.mockResolvedValue(mockResponse);

                const createStream = () => new ReadableStream({
                    start(controller) {
                        controller.enqueue(new TextEncoder().encode('test'));
                        controller.close();
                    },
                });

                await Promise.all([
                    deduplicatedFetch('/api/stream', { method: 'POST', body: createStream() }),
                    deduplicatedFetch('/api/stream', { method: 'POST', body: createStream() }),
                ]);

                expect(mockFetchWithTimeout).toHaveBeenCalledTimes(2);
            });
        });

        describe('cleanup after completion', () => {
            it('should remove completed request from in-flight map', async () => {
                const mockResponse = createMockResponse({ data: 'test' });
                mockFetchWithTimeout.mockResolvedValueOnce(mockResponse);

                expect(getInFlightRequestCount()).toBe(0);

                await deduplicatedFetch('/api/users');

                expect(getInFlightRequestCount()).toBe(0);

                // Second request should create a new entry
                mockFetchWithTimeout.mockResolvedValueOnce(mockResponse);
                await deduplicatedFetch('/api/users');

                expect(mockFetchWithTimeout).toHaveBeenCalledTimes(2);
            });

            it('should cleanup on request failure', async () => {
                const error = new Error('Network error');
                mockFetchWithTimeout.mockRejectedValueOnce(error);

                expect(getInFlightRequestCount()).toBe(0);

                await expect(deduplicatedFetch('/api/users')).rejects.toThrow('Network error');

                // Entry should be cleaned up even on failure
                expect(getInFlightRequestCount()).toBe(0);
            });

            it('should allow new request after previous completed', async () => {
                const mockResponse1 = createMockResponse({ id: 1 });
                const mockResponse2 = createMockResponse({ id: 2 });

                mockFetchWithTimeout
                    .mockResolvedValueOnce(mockResponse1)
                    .mockResolvedValueOnce(mockResponse2);

                // First request
                const response1 = await deduplicatedFetch('/api/users');
                const data1 = await response1.json();

                // Second request (after first completed)
                const response2 = await deduplicatedFetch('/api/users');
                const data2 = await response2.json();

                expect(mockFetchWithTimeout).toHaveBeenCalledTimes(2);
                expect(data1).toEqual({ id: 1 });
                expect(data2).toEqual({ id: 2 });
            });
        });

        describe('error propagation', () => {
            it('should propagate errors to all waiting callers', async () => {
                const networkError = new Error('Network failed');
                mockFetchWithTimeout.mockImplementation(() => {
                    return new Promise((_, reject) => {
                        setTimeout(() => reject(networkError), 100);
                    });
                });

                const promises = [
                    deduplicatedFetch('/api/users'),
                    deduplicatedFetch('/api/users'),
                    deduplicatedFetch('/api/users'),
                ];

                const results = await Promise.allSettled(promises);

                // All should fail with the same error
                expect(results).toHaveLength(3);
                for (const result of results) {
                    expect(result.status).toBe('rejected');
                }

                // Verify error messages using type guard
                const rejectedResults = results.filter(
                    (r): r is PromiseRejectedResult => r.status === 'rejected'
                );
                expect(rejectedResults).toHaveLength(3);
                expect(rejectedResults.map(r => r.reason.message)).toEqual([
                    'Network failed',
                    'Network failed',
                    'Network failed',
                ]);

                // Only one network request was made
                expect(mockFetchWithTimeout).toHaveBeenCalledTimes(1);
            });
        });
    });

    describe('getInFlightRequestCount', () => {
        it('should return 0 when no requests are in flight', () => {
            expect(getInFlightRequestCount()).toBe(0);
        });

        it('should accurately track multiple in-flight requests', async () => {
            let resolve1: (value: Response) => void;
            let resolve2: (value: Response) => void;

            mockFetchWithTimeout
                .mockReturnValueOnce(new Promise<Response>(r => { resolve1 = r; }))
                .mockReturnValueOnce(new Promise<Response>(r => { resolve2 = r; }));

            // Start two different requests
            const promise1 = deduplicatedFetch('/api/users');
            const promise2 = deduplicatedFetch('/api/posts');

            await new Promise(resolve => setTimeout(resolve, 0));

            expect(getInFlightRequestCount()).toBe(2);

            // Resolve first
            resolve1!(createMockResponse({ users: [] }));
            await promise1;

            expect(getInFlightRequestCount()).toBe(1);

            // Resolve second
            resolve2!(createMockResponse({ posts: [] }));
            await promise2;

            expect(getInFlightRequestCount()).toBe(0);
        });
    });

    describe('clearInFlightRequests', () => {
        it('should clear all in-flight requests', async () => {
            let resolveRequest: (value: Response) => void;
            mockFetchWithTimeout.mockReturnValueOnce(
                new Promise<Response>(r => { resolveRequest = r; })
            );

            // Start request but don't await
            const fetchPromise = deduplicatedFetch('/api/users');
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(getInFlightRequestCount()).toBe(1);

            clearInFlightRequests();

            expect(getInFlightRequestCount()).toBe(0);

            // Cleanup - resolve the pending promise to avoid unhandled rejection
            resolveRequest!(createMockResponse({}));
            await fetchPromise.catch(() => {});
        });

        it('should be safe to call when no requests are in flight', () => {
            expect(getInFlightRequestCount()).toBe(0);
            expect(() => clearInFlightRequests()).not.toThrow();
            expect(getInFlightRequestCount()).toBe(0);
        });
    });
});
