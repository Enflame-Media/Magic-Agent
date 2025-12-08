/**
 * Tests for CORS Middleware
 *
 * Tests the CORS configuration including origin validation logic
 * for localhost, production domains, and environment-aware handling.
 *
 * @module middleware/cors.spec
 */

import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';

// Import the cors middleware
import { cors } from './cors';

describe('CORS Middleware', () => {
    function createApp(env: { ENVIRONMENT?: string } = {}) {
        const app = new Hono<{ Bindings: { ENVIRONMENT?: string } }>();

        // Apply CORS middleware
        app.use('*', cors());

        // Test route
        app.get('/test', (c) => {
            // Set env if provided
            if (env.ENVIRONMENT) {
                (c.env as Record<string, unknown>).ENVIRONMENT = env.ENVIRONMENT;
            }
            return c.json({ ok: true });
        });

        return app;
    }

    describe('No Origin Header', () => {
        it('should allow requests with no origin header', async () => {
            const app = createApp();

            const res = await app.request('/test', {
                method: 'GET',
            });

            expect(res.status).toBe(200);
            // Should return * for missing origin
            expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
        });
    });

    describe('Localhost Origins', () => {
        it('should allow localhost origins', async () => {
            const app = createApp();

            const res = await app.request('/test', {
                method: 'GET',
                headers: {
                    Origin: 'http://localhost:3000',
                },
            });

            expect(res.status).toBe(200);
            expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
                'http://localhost:3000'
            );
        });

        it('should allow 127.0.0.1 origins', async () => {
            const app = createApp();

            const res = await app.request('/test', {
                method: 'GET',
                headers: {
                    Origin: 'http://127.0.0.1:8080',
                },
            });

            expect(res.status).toBe(200);
            expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
                'http://127.0.0.1:8080'
            );
        });

        it('should allow localhost on different ports', async () => {
            const app = createApp();

            const origins = [
                'http://localhost:5173',
                'http://localhost:19006',
                'http://localhost',
            ];

            for (const origin of origins) {
                const res = await app.request('/test', {
                    method: 'GET',
                    headers: { Origin: origin },
                });

                expect(res.status).toBe(200);
                expect(res.headers.get('Access-Control-Allow-Origin')).toBe(origin);
            }
        });
    });

    describe('Production Domains', () => {
        it('should allow happy.enflamemedia.com', async () => {
            const app = createApp();

            const res = await app.request('/test', {
                method: 'GET',
                headers: {
                    Origin: 'https://happy.enflamemedia.com',
                },
            });

            expect(res.status).toBe(200);
            expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
                'https://happy.enflamemedia.com'
            );
        });

        it('should allow happy-dev.enflamemedia.com', async () => {
            const app = createApp();

            const res = await app.request('/test', {
                method: 'GET',
                headers: {
                    Origin: 'https://happy-dev.enflamemedia.com',
                },
            });

            expect(res.status).toBe(200);
            expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
                'https://happy-dev.enflamemedia.com'
            );
        });

        it('should allow future happy.app domains', async () => {
            const app = createApp();

            const domains = [
                'https://happy.app',
                'https://www.happy.app',
                'https://api.happy.app',
            ];

            for (const origin of domains) {
                const res = await app.request('/test', {
                    method: 'GET',
                    headers: { Origin: origin },
                });

                expect(res.status).toBe(200);
                expect(res.headers.get('Access-Control-Allow-Origin')).toBe(origin);
            }
        });
    });

    describe('Preflight Requests', () => {
        it('should handle OPTIONS preflight requests', async () => {
            const app = createApp();

            const res = await app.request('/test', {
                method: 'OPTIONS',
                headers: {
                    Origin: 'http://localhost:3000',
                    'Access-Control-Request-Method': 'POST',
                    'Access-Control-Request-Headers': 'Content-Type, Authorization',
                },
            });

            expect(res.status).toBe(204);
            expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
                'http://localhost:3000'
            );
            expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
            expect(res.headers.get('Access-Control-Allow-Headers')).toContain(
                'Content-Type'
            );
        });

        it('should include all allowed methods in preflight response', async () => {
            const app = createApp();

            const res = await app.request('/test', {
                method: 'OPTIONS',
                headers: {
                    Origin: 'http://localhost:3000',
                    'Access-Control-Request-Method': 'DELETE',
                },
            });

            const allowedMethods = res.headers.get('Access-Control-Allow-Methods');
            expect(allowedMethods).toContain('GET');
            expect(allowedMethods).toContain('POST');
            expect(allowedMethods).toContain('PUT');
            expect(allowedMethods).toContain('DELETE');
            expect(allowedMethods).toContain('PATCH');
            expect(allowedMethods).toContain('OPTIONS');
        });

        it('should include all allowed headers in preflight response', async () => {
            const app = createApp();

            const res = await app.request('/test', {
                method: 'OPTIONS',
                headers: {
                    Origin: 'http://localhost:3000',
                    'Access-Control-Request-Headers': 'Authorization',
                },
            });

            const allowedHeaders = res.headers.get('Access-Control-Allow-Headers');
            expect(allowedHeaders).toContain('Content-Type');
            expect(allowedHeaders).toContain('Authorization');
            expect(allowedHeaders).toContain('X-Requested-With');
            expect(allowedHeaders).toContain('X-Request-Id');
            expect(allowedHeaders).toContain('X-Client-Version');
        });

        it('should set max-age for preflight caching', async () => {
            const app = createApp();

            const res = await app.request('/test', {
                method: 'OPTIONS',
                headers: {
                    Origin: 'http://localhost:3000',
                    'Access-Control-Request-Method': 'GET',
                },
            });

            expect(res.headers.get('Access-Control-Max-Age')).toBe('86400');
        });
    });

    describe('Credentials', () => {
        it('should allow credentials', async () => {
            const app = createApp();

            const res = await app.request('/test', {
                method: 'GET',
                headers: {
                    Origin: 'http://localhost:3000',
                },
            });

            expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true');
        });
    });

    describe('Exposed Headers', () => {
        it('should expose configured headers', async () => {
            const app = createApp();

            const res = await app.request('/test', {
                method: 'GET',
                headers: {
                    Origin: 'http://localhost:3000',
                },
            });

            const exposedHeaders = res.headers.get('Access-Control-Expose-Headers');
            expect(exposedHeaders).toContain('Content-Length');
            expect(exposedHeaders).toContain('X-Request-Id');
            expect(exposedHeaders).toContain('X-RateLimit-Limit');
        });
    });
});
