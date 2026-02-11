/**
 * Rate Limiting Middleware Unit Tests
 *
 * These tests verify that the rate limiting middleware properly protects
 * authentication endpoints against brute force, credential stuffing, and DoS attacks.
 *
 * @see HAP-617 - SECURITY: No Rate Limiting on Admin API Authentication Endpoints
 * @see https://owasp.org/www-community/controls/Blocking_Brute_Force_Attacks
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import {
    rateLimitMiddleware,
    authRateLimitMiddleware,
    rateLimits,
} from '../rateLimit';
import type { Env, Variables } from '../../env';

/** Response body type for test assertions */
interface TestBody {
    method?: string;
    path?: string;
    error?: string;
    message?: string;
    code?: string;
    retryAfter?: number;
    ok?: boolean;
}

/**
 * Mock KV Namespace for testing
 * Simulates Cloudflare KV behavior in unit tests
 */
function createMockKV() {
    const store = new Map<string, { value: string; expiresAt: number }>();

    return {
        get: vi.fn(async (key: string) => {
            const entry = store.get(key);
            if (!entry) return null;
            if (Date.now() > entry.expiresAt) {
                store.delete(key);
                return null;
            }
            return entry.value;
        }),
        put: vi.fn(async (key: string, value: string, options?: { expirationTtl?: number }) => {
            const expiresAt = options?.expirationTtl
                ? Date.now() + options.expirationTtl * 1000
                : Infinity;
            store.set(key, { value, expiresAt });
        }),
        delete: vi.fn(async (key: string) => {
            store.delete(key);
        }),
        list: vi.fn(),
        getWithMetadata: vi.fn(),
        clear: () => store.clear(),
    } as unknown as KVNamespace & { clear: () => void };
}

describe('Rate Limiting Middleware (HAP-617)', () => {
    let app: Hono<{ Bindings: Env; Variables: Variables }>;
    let mockKV: ReturnType<typeof createMockKV>;

    beforeEach(() => {
        // Create fresh mock KV for each test
        mockKV = createMockKV();

        // Create test app with mock environment
        app = new Hono<{ Bindings: Env; Variables: Variables }>();

        // Mock the environment binding
        app.use('*', async (c, next) => {
            c.env = { RATE_LIMIT_KV: mockKV } as unknown as Env;
            await next();
        });
    });

    describe('Basic Rate Limiting', () => {
        beforeEach(() => {
            // Add rate limited endpoint
            app.use(
                '/api/test',
                rateLimitMiddleware({ limit: 3, windowSeconds: 60, keyPrefix: 'test' })
            );
            app.post('/api/test', (c) => c.json({ method: 'POST', ok: true }));
        });

        it('allows requests within limit', async () => {
            for (let i = 0; i < 3; i++) {
                const res = await app.request('/api/test', {
                    method: 'POST',
                    headers: { 'CF-Connecting-IP': '192.168.1.1' },
                });

                expect(res.status).toBe(200);
                const body = (await res.json()) as TestBody;
                expect(body.ok).toBe(true);
            }
        });

        it('blocks requests exceeding limit with 429', async () => {
            // Make 3 requests (at limit)
            for (let i = 0; i < 3; i++) {
                const res = await app.request('/api/test', {
                    method: 'POST',
                    headers: { 'CF-Connecting-IP': '192.168.1.1' },
                });
                expect(res.status).toBe(200);
            }

            // 4th request should be blocked
            const res = await app.request('/api/test', {
                method: 'POST',
                headers: { 'CF-Connecting-IP': '192.168.1.1' },
            });

            expect(res.status).toBe(429);
            const body = (await res.json()) as TestBody;
            expect(body.error).toBe('Too Many Requests');
            expect(body.code).toBe('RATE_LIMIT_EXCEEDED');
            expect(body.retryAfter).toBeDefined();
            expect(body.retryAfter).toBeGreaterThan(0);
        });

        it('includes Retry-After header when rate limited', async () => {
            // Exceed limit
            for (let i = 0; i < 4; i++) {
                await app.request('/api/test', {
                    method: 'POST',
                    headers: { 'CF-Connecting-IP': '192.168.1.1' },
                });
            }

            const res = await app.request('/api/test', {
                method: 'POST',
                headers: { 'CF-Connecting-IP': '192.168.1.1' },
            });

            expect(res.status).toBe(429);
            expect(res.headers.get('Retry-After')).toBeDefined();
            expect(Number(res.headers.get('Retry-After'))).toBeGreaterThan(0);
        });

        it('includes X-RateLimit headers on successful requests', async () => {
            const res = await app.request('/api/test', {
                method: 'POST',
                headers: { 'CF-Connecting-IP': '192.168.1.1' },
            });

            expect(res.status).toBe(200);
            expect(res.headers.get('X-RateLimit-Limit')).toBe('3');
            expect(res.headers.get('X-RateLimit-Remaining')).toBe('2');
            expect(res.headers.get('X-RateLimit-Reset')).toBeDefined();
        });

        it('tracks different IPs separately', async () => {
            // IP 1: Use up all requests
            for (let i = 0; i < 3; i++) {
                await app.request('/api/test', {
                    method: 'POST',
                    headers: { 'CF-Connecting-IP': '192.168.1.1' },
                });
            }

            // IP 1 should be blocked
            const res1 = await app.request('/api/test', {
                method: 'POST',
                headers: { 'CF-Connecting-IP': '192.168.1.1' },
            });
            expect(res1.status).toBe(429);

            // IP 2 should still work
            const res2 = await app.request('/api/test', {
                method: 'POST',
                headers: { 'CF-Connecting-IP': '192.168.1.2' },
            });
            expect(res2.status).toBe(200);
        });
    });

    describe('Auth Rate Limit Tiers', () => {
        beforeEach(() => {
            // Set up routes with auth rate limiting
            app.use('/api/auth/*', authRateLimitMiddleware());
            app.post('/api/auth/sign-in/email', (c) => c.json({ path: '/sign-in' }));
            app.post('/api/auth/sign-up/email', (c) => c.json({ path: '/sign-up' }));
            app.post('/api/auth/forgot-password', (c) => c.json({ path: '/forgot-password' }));
            app.get('/api/auth/session', (c) => c.json({ path: '/session' }));
        });

        it('sign-in endpoint allows 5 requests per minute', async () => {
            // Should allow 5 requests
            for (let i = 0; i < 5; i++) {
                const res = await app.request('/api/auth/sign-in/email', {
                    method: 'POST',
                    headers: { 'CF-Connecting-IP': '10.0.0.1' },
                });
                expect(res.status).toBe(200);
            }

            // 6th should be blocked
            const res = await app.request('/api/auth/sign-in/email', {
                method: 'POST',
                headers: { 'CF-Connecting-IP': '10.0.0.1' },
            });
            expect(res.status).toBe(429);
        });

        it('sign-up endpoint allows 3 requests per minute', async () => {
            // Should allow 3 requests
            for (let i = 0; i < 3; i++) {
                const res = await app.request('/api/auth/sign-up/email', {
                    method: 'POST',
                    headers: { 'CF-Connecting-IP': '10.0.0.2' },
                });
                expect(res.status).toBe(200);
            }

            // 4th should be blocked
            const res = await app.request('/api/auth/sign-up/email', {
                method: 'POST',
                headers: { 'CF-Connecting-IP': '10.0.0.2' },
            });
            expect(res.status).toBe(429);
        });

        it('forgot-password endpoint allows 3 requests per 5 minutes', async () => {
            // Should allow 3 requests
            for (let i = 0; i < 3; i++) {
                const res = await app.request('/api/auth/forgot-password', {
                    method: 'POST',
                    headers: { 'CF-Connecting-IP': '10.0.0.3' },
                });
                expect(res.status).toBe(200);
            }

            // 4th should be blocked
            const res = await app.request('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'CF-Connecting-IP': '10.0.0.3' },
            });
            expect(res.status).toBe(429);
        });

        it('session endpoint (GET) allows 10 requests per minute (general tier)', async () => {
            // Should allow 10 requests
            for (let i = 0; i < 10; i++) {
                const res = await app.request('/api/auth/session', {
                    method: 'GET',
                    headers: { 'CF-Connecting-IP': '10.0.0.4' },
                });
                expect(res.status).toBe(200);
            }

            // 11th should be blocked
            const res = await app.request('/api/auth/session', {
                method: 'GET',
                headers: { 'CF-Connecting-IP': '10.0.0.4' },
            });
            expect(res.status).toBe(429);
        });
    });

    describe('Metrics Rate Limiting', () => {
        beforeEach(() => {
            app.use('/api/metrics/*', rateLimits.metrics());
            app.get('/api/metrics/summary', (c) => c.json({ data: 'metrics' }));
        });

        it('allows 60 requests per minute', async () => {
            // Should allow 60 requests
            for (let i = 0; i < 60; i++) {
                const res = await app.request('/api/metrics/summary', {
                    method: 'GET',
                    headers: { 'CF-Connecting-IP': '172.16.0.1' },
                });
                expect(res.status).toBe(200);
            }

            // 61st should be blocked
            const res = await app.request('/api/metrics/summary', {
                method: 'GET',
                headers: { 'CF-Connecting-IP': '172.16.0.1' },
            });
            expect(res.status).toBe(429);
        });
    });

    describe('Graceful Degradation', () => {
        it('allows requests when KV is not configured', async () => {
            // Create app without KV binding
            const appWithoutKV = new Hono<{ Bindings: Env; Variables: Variables }>();
            appWithoutKV.use('*', async (c, next) => {
                c.env = {} as Env; // No RATE_LIMIT_KV
                await next();
            });
            appWithoutKV.use(
                '/api/test',
                rateLimitMiddleware({ limit: 1, windowSeconds: 60 })
            );
            appWithoutKV.post('/api/test', (c) => c.json({ ok: true }));

            // Should allow multiple requests (rate limiting disabled)
            const res1 = await appWithoutKV.request('/api/test', { method: 'POST' });
            const res2 = await appWithoutKV.request('/api/test', { method: 'POST' });

            expect(res1.status).toBe(200);
            expect(res2.status).toBe(200);
        });

        it('allows requests when KV operation fails', async () => {
            // Create failing mock KV
            const failingKV = {
                get: vi.fn().mockRejectedValue(new Error('KV unavailable')),
                put: vi.fn().mockRejectedValue(new Error('KV unavailable')),
            } as unknown as KVNamespace;

            const appWithFailingKV = new Hono<{ Bindings: Env; Variables: Variables }>();
            appWithFailingKV.use('*', async (c, next) => {
                c.env = { RATE_LIMIT_KV: failingKV } as unknown as Env;
                await next();
            });
            appWithFailingKV.use(
                '/api/test',
                rateLimitMiddleware({ limit: 1, windowSeconds: 60 })
            );
            appWithFailingKV.post('/api/test', (c) => c.json({ ok: true }));

            // Should allow request despite KV failure
            const res = await appWithFailingKV.request('/api/test', { method: 'POST' });
            expect(res.status).toBe(200);
        });
    });

    describe('Skip Functionality', () => {
        it('respects skip option', async () => {
            const appWithSkip = new Hono<{ Bindings: Env; Variables: Variables }>();
            appWithSkip.use('*', async (c, next) => {
                c.env = { RATE_LIMIT_KV: mockKV } as unknown as Env;
                await next();
            });
            appWithSkip.use(
                '/api/test',
                rateLimitMiddleware({
                    limit: 1,
                    windowSeconds: 60,
                    skip: (c) => c.req.header('X-Skip-Rate-Limit') === 'true',
                })
            );
            appWithSkip.post('/api/test', (c) => c.json({ ok: true }));

            // First request without skip header - should count
            const res1 = await appWithSkip.request('/api/test', {
                method: 'POST',
                headers: { 'CF-Connecting-IP': '1.2.3.4' },
            });
            expect(res1.status).toBe(200);

            // Second request without skip - should be blocked
            const res2 = await appWithSkip.request('/api/test', {
                method: 'POST',
                headers: { 'CF-Connecting-IP': '1.2.3.4' },
            });
            expect(res2.status).toBe(429);

            // Request with skip header - should be allowed
            const res3 = await appWithSkip.request('/api/test', {
                method: 'POST',
                headers: {
                    'CF-Connecting-IP': '1.2.3.4',
                    'X-Skip-Rate-Limit': 'true',
                },
            });
            expect(res3.status).toBe(200);
        });
    });

    describe('IP Extraction', () => {
        beforeEach(() => {
            app.use(
                '/api/test',
                rateLimitMiddleware({ limit: 1, windowSeconds: 60, keyPrefix: 'test' })
            );
            app.post('/api/test', (c) => c.json({ ok: true }));
        });

        it('uses CF-Connecting-IP header when available', async () => {
            await app.request('/api/test', {
                method: 'POST',
                headers: { 'CF-Connecting-IP': '1.1.1.1' },
            });

            // Different CF-Connecting-IP should have separate limit
            const res = await app.request('/api/test', {
                method: 'POST',
                headers: { 'CF-Connecting-IP': '2.2.2.2' },
            });
            expect(res.status).toBe(200);
        });

        it('falls back to X-Forwarded-For when CF-Connecting-IP is not available', async () => {
            await app.request('/api/test', {
                method: 'POST',
                headers: { 'X-Forwarded-For': '3.3.3.3, 4.4.4.4' },
            });

            // Same first IP in X-Forwarded-For chain should hit limit
            const res = await app.request('/api/test', {
                method: 'POST',
                headers: { 'X-Forwarded-For': '3.3.3.3, 5.5.5.5' },
            });
            expect(res.status).toBe(429);
        });

        it('uses "unknown" when no IP headers available', async () => {
            await app.request('/api/test', { method: 'POST' });

            // Without any IP headers, should share "unknown" bucket
            const res = await app.request('/api/test', { method: 'POST' });
            expect(res.status).toBe(429);
        });
    });

    describe('Attack Simulation', () => {
        beforeEach(() => {
            app.use('/api/auth/*', authRateLimitMiddleware());
            app.post('/api/auth/sign-in/email', (c) => c.json({ success: true }));
        });

        it('prevents brute force password attack', async () => {
            const attackerIP = '203.0.113.1';
            let blocked = false;
            let attemptCount = 0;

            // Simulate brute force attack
            for (let i = 0; i < 100 && !blocked; i++) {
                const res = await app.request('/api/auth/sign-in/email', {
                    method: 'POST',
                    headers: {
                        'CF-Connecting-IP': attackerIP,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email: 'victim@example.com', password: `attempt${i}` }),
                });

                attemptCount++;
                if (res.status === 429) {
                    blocked = true;
                }
            }

            expect(blocked).toBe(true);
            // Should be blocked after 5 attempts (sign-in limit)
            expect(attemptCount).toBe(6); // 5 successful + 1 blocked
        });

        it('prevents credential stuffing attack', async () => {
            const attackerIP = '198.51.100.1';

            // Simulate credential stuffing with leaked database
            const leakedCredentials = [
                { email: 'user1@example.com', password: 'password123' },
                { email: 'user2@example.com', password: 'qwerty' },
                { email: 'user3@example.com', password: 'letmein' },
                { email: 'user4@example.com', password: '123456' },
                { email: 'user5@example.com', password: 'admin' },
                { email: 'user6@example.com', password: 'password' },
            ];

            const results: number[] = [];
            for (const cred of leakedCredentials) {
                const res = await app.request('/api/auth/sign-in/email', {
                    method: 'POST',
                    headers: {
                        'CF-Connecting-IP': attackerIP,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(cred),
                });
                results.push(res.status);
            }

            // First 5 should succeed, 6th should be rate limited
            expect(results.slice(0, 5).every((s) => s === 200)).toBe(true);
            expect(results[5]).toBe(429);
        });

        it('allows legitimate users to retry after window resets', async () => {
            const userIP = '192.0.2.1';

            // User exceeds rate limit
            for (let i = 0; i < 6; i++) {
                await app.request('/api/auth/sign-in/email', {
                    method: 'POST',
                    headers: { 'CF-Connecting-IP': userIP },
                });
            }

            // Should be blocked
            const blockedRes = await app.request('/api/auth/sign-in/email', {
                method: 'POST',
                headers: { 'CF-Connecting-IP': userIP },
            });
            expect(blockedRes.status).toBe(429);

            // Simulate window reset by clearing KV
            mockKV.clear();

            // Should be allowed again
            const newRes = await app.request('/api/auth/sign-in/email', {
                method: 'POST',
                headers: { 'CF-Connecting-IP': userIP },
            });
            expect(newRes.status).toBe(200);
        });
    });

    describe('Pre-configured Tier Functions', () => {
        it('rateLimits.signIn returns middleware with correct config', async () => {
            const testApp = new Hono<{ Bindings: Env; Variables: Variables }>();
            testApp.use('*', async (c, next) => {
                c.env = { RATE_LIMIT_KV: mockKV } as unknown as Env;
                await next();
            });
            testApp.use('/test', rateLimits.signIn());
            testApp.post('/test', (c) => c.json({ ok: true }));

            // Should allow 5 requests
            for (let i = 0; i < 5; i++) {
                const res = await testApp.request('/test', {
                    method: 'POST',
                    headers: { 'CF-Connecting-IP': '1.1.1.1' },
                });
                expect(res.status).toBe(200);
            }

            // 6th should be blocked
            const res = await testApp.request('/test', {
                method: 'POST',
                headers: { 'CF-Connecting-IP': '1.1.1.1' },
            });
            expect(res.status).toBe(429);
        });

        it('rateLimits.signUp returns middleware with correct config', async () => {
            const testApp = new Hono<{ Bindings: Env; Variables: Variables }>();
            testApp.use('*', async (c, next) => {
                c.env = { RATE_LIMIT_KV: mockKV } as unknown as Env;
                await next();
            });
            testApp.use('/test', rateLimits.signUp());
            testApp.post('/test', (c) => c.json({ ok: true }));

            // Should allow 3 requests
            for (let i = 0; i < 3; i++) {
                const res = await testApp.request('/test', {
                    method: 'POST',
                    headers: { 'CF-Connecting-IP': '2.2.2.2' },
                });
                expect(res.status).toBe(200);
            }

            // 4th should be blocked
            const res = await testApp.request('/test', {
                method: 'POST',
                headers: { 'CF-Connecting-IP': '2.2.2.2' },
            });
            expect(res.status).toBe(429);
        });

        it('rateLimits.forgotPassword returns middleware with correct config', async () => {
            const testApp = new Hono<{ Bindings: Env; Variables: Variables }>();
            testApp.use('*', async (c, next) => {
                c.env = { RATE_LIMIT_KV: mockKV } as unknown as Env;
                await next();
            });
            testApp.use('/test', rateLimits.forgotPassword());
            testApp.post('/test', (c) => c.json({ ok: true }));

            // Should allow 3 requests
            for (let i = 0; i < 3; i++) {
                const res = await testApp.request('/test', {
                    method: 'POST',
                    headers: { 'CF-Connecting-IP': '3.3.3.3' },
                });
                expect(res.status).toBe(200);
            }

            // 4th should be blocked
            const res = await testApp.request('/test', {
                method: 'POST',
                headers: { 'CF-Connecting-IP': '3.3.3.3' },
            });
            expect(res.status).toBe(429);
        });
    });
});
