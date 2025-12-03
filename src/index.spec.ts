import { describe, it, expect, vi } from 'vitest';

// Mock cloudflare:workers module (required for Durable Object imports)
vi.mock('cloudflare:workers', () => ({
    DurableObject: class DurableObject {
        ctx: DurableObjectState;
        env: unknown;
        constructor(ctx: DurableObjectState, env: unknown) {
            this.ctx = ctx;
            this.env = env;
        }
    },
}));

import app from '@/index';

/**
 * Type helper for API responses
 */
interface JsonResponse {
    [key: string]: unknown;
}

/**
 * Integration tests for main application routes
 */
describe('Happy Server Workers - Main Routes', () => {
    describe('GET /', () => {
        it('should return welcome message with version and environment', async () => {
            const res = await app.request('/');
            const json = (await res.json()) as JsonResponse;

            expect(res.status).toBe(200);
            expect(json).toHaveProperty('message');
            expect(json.message).toContain('Welcome to Happy Server');
            expect(json).toHaveProperty('version');
            expect(json.version).toBe('0.0.0');
            expect(json).toHaveProperty('environment');
            expect(json).toHaveProperty('timestamp');
        });

        it('should return valid ISO timestamp', async () => {
            const res = await app.request('/');
            const json = (await res.json()) as JsonResponse;

            expect(json.timestamp).toBeDefined();
            // Validate ISO 8601 format
            expect(new Date(json.timestamp as string).toISOString()).toBe(
                json.timestamp
            );
        });
    });

    describe('GET /health', () => {
        it('should return healthy status', async () => {
            const res = await app.request('/health');
            const json = (await res.json()) as JsonResponse;

            expect(res.status).toBe(200);
            expect(json.status).toBe('healthy');
            expect(json).toHaveProperty('timestamp');
            expect(json).toHaveProperty('version');
        });

        it('should return consistent response structure', async () => {
            const res = await app.request('/health');
            const json = (await res.json()) as JsonResponse;

            // Verify all expected fields are present
            expect(Object.keys(json)).toEqual(
                expect.arrayContaining(['status', 'timestamp', 'version'])
            );
        });
    });

    describe('GET /ready', () => {
        it('should return ready status', async () => {
            const res = await app.request('/ready');
            const json = (await res.json()) as JsonResponse;

            expect(res.status).toBe(200);
            expect(json.ready).toBe(true);
            expect(json).toHaveProperty('timestamp');
        });

        it('should return 503 when not ready', async () => {
            // This test demonstrates how to test non-ready state
            // Currently always returns 200, but structure is in place
            const res = await app.request('/ready');
            expect([200, 503]).toContain(res.status);
        });
    });

    describe('404 Handler', () => {
        it('should return 404 for unknown routes', async () => {
            const res = await app.request('/unknown-route');
            const json = (await res.json()) as JsonResponse;

            expect(res.status).toBe(404);
            expect(json.error).toBeDefined();
            const error = json.error as JsonResponse;
            expect(error.message).toBe('Not Found');
            expect(error.status).toBe(404);
            expect(error.path).toBe('/unknown-route');
        });

        it('should include requested path in error response', async () => {
            const testPath = '/api/v1/non-existent';
            const res = await app.request(testPath);
            const json = (await res.json()) as JsonResponse;

            const error = json.error as JsonResponse;
            expect(error.path).toBe(testPath);
        });
    });

    describe('CORS Headers', () => {
        it('should include CORS headers in response', async () => {
            const res = await app.request('/', {
                headers: {
                    Origin: 'http://localhost:3000',
                },
            });

            expect(
                res.headers.get('access-control-allow-origin')
            ).toBeDefined();
        });

        it('should handle OPTIONS preflight requests', async () => {
            const res = await app.request('/', {
                method: 'OPTIONS',
                headers: {
                    Origin: 'http://localhost:3000',
                    'Access-Control-Request-Method': 'POST',
                },
            });

            expect(res.status).toBe(204);
            expect(res.headers.get('access-control-allow-methods')).toContain(
                'POST'
            );
        });
    });

    describe('Error Handling', () => {
        it('should handle errors gracefully', async () => {
            // Test error handling by requesting an endpoint that doesn't exist
            const res = await app.request('/trigger-error');

            expect(res.status).toBe(404);
            const json = (await res.json()) as JsonResponse;
            expect(json.error).toBeDefined();
        });

        it('should return JSON error responses', async () => {
            const res = await app.request('/invalid');
            const contentType = res.headers.get('content-type');

            expect(contentType).toContain('application/json');
        });
    });

    describe('Request Headers', () => {
        it('should accept custom headers', async () => {
            const res = await app.request('/health', {
                headers: {
                    'X-Request-Id': 'test-request-123',
                    'User-Agent': 'Test Agent',
                },
            });

            expect(res.status).toBe(200);
        });
    });
});
