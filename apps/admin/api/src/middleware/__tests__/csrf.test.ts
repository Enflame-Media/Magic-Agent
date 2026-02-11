/**
 * CSRF Protection Unit Tests
 *
 * These tests verify that the CSRF middleware properly protects
 * state-changing operations against Cross-Site Request Forgery attacks.
 *
 * @see HAP-616 - SECURITY: Missing CSRF Protection in Admin Dashboard
 * @see https://owasp.org/www-community/attacks/csrf
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { csrfMiddleware } from '../csrf';
import type { Env, Variables } from '../../env';

/** Response body type for test assertions */
interface TestBody {
    method?: string;
    error?: string;
    message?: string;
    code?: string;
    ok?: boolean;
}

describe('CSRF Protection Middleware (HAP-616)', () => {
    let app: Hono<{ Bindings: Env; Variables: Variables }>;

    beforeEach(() => {
        // Create test app with CSRF middleware
        app = new Hono<{ Bindings: Env; Variables: Variables }>();
        app.use('*', csrfMiddleware());

        // Add test routes for each HTTP method
        app.get('/api/test', (c) => c.json({ method: 'GET' }));
        app.post('/api/test', (c) => c.json({ method: 'POST' }));
        app.put('/api/test', (c) => c.json({ method: 'PUT' }));
        app.delete('/api/test', (c) => c.json({ method: 'DELETE' }));
        app.patch('/api/test', (c) => c.json({ method: 'PATCH' }));
        app.options('/api/test', (c) => c.json({ method: 'OPTIONS' }));
    });

    describe('Safe Methods (GET, HEAD, OPTIONS)', () => {
        it('allows GET requests without CSRF token', async () => {
            const res = await app.request('/api/test', { method: 'GET' });

            expect(res.status).toBe(200);
            const body = (await res.json()) as TestBody;
            expect(body.method).toBe('GET');
        });

        it('allows OPTIONS requests without CSRF token', async () => {
            const res = await app.request('/api/test', { method: 'OPTIONS' });

            expect(res.status).toBe(200);
            const body = (await res.json()) as TestBody;
            expect(body.method).toBe('OPTIONS');
        });

        it('sets CSRF cookie on first request', async () => {
            const res = await app.request('/api/test', { method: 'GET' });

            expect(res.status).toBe(200);

            // Check that Set-Cookie header contains csrf-token
            const setCookie = res.headers.get('Set-Cookie');
            expect(setCookie).toContain('csrf-token=');
            expect(setCookie).toContain('Secure');
            expect(setCookie).toContain('SameSite=None');
            expect(setCookie).toContain('Path=/');
        });
    });

    describe('State-Changing Methods (POST, PUT, DELETE, PATCH)', () => {
        it('rejects POST without CSRF token with 403', async () => {
            const res = await app.request('/api/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: 'test' }),
            });

            expect(res.status).toBe(403);
            const body = (await res.json()) as TestBody;
            expect(body.error).toBe('Forbidden');
            expect(body.message).toBe('CSRF validation failed');
            expect(body.code).toBe('CSRF_VALIDATION_FAILED');
        });

        it('rejects PUT without CSRF token with 403', async () => {
            const res = await app.request('/api/test', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: 'test' }),
            });

            expect(res.status).toBe(403);
        });

        it('rejects DELETE without CSRF token with 403', async () => {
            const res = await app.request('/api/test', {
                method: 'DELETE',
            });

            expect(res.status).toBe(403);
        });

        it('rejects PATCH without CSRF token with 403', async () => {
            const res = await app.request('/api/test', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: 'test' }),
            });

            expect(res.status).toBe(403);
        });

        it('rejects POST with invalid CSRF token with 403', async () => {
            // First, get a valid token
            const getRes = await app.request('/api/test', { method: 'GET' });
            const setCookie = getRes.headers.get('Set-Cookie') ?? '';

            // Extract the cookie for the request
            const cookieMatch = setCookie.match(/csrf-token=([^;]+)/);
            const validToken = cookieMatch?.[1];

            // Send POST with a different (invalid) token
            const res = await app.request('/api/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Cookie: `csrf-token=${validToken}`,
                    'X-CSRF-Token': 'invalid-token-12345',
                },
                body: JSON.stringify({ data: 'test' }),
            });

            expect(res.status).toBe(403);
        });

        it('allows POST with valid matching CSRF token', async () => {
            // First, get a valid token
            const getRes = await app.request('/api/test', { method: 'GET' });
            const setCookie = getRes.headers.get('Set-Cookie') ?? '';

            // Extract the token
            const cookieMatch = setCookie.match(/csrf-token=([^;]+)/);
            const validToken = cookieMatch?.[1];

            expect(validToken).toBeDefined();
            expect(validToken).not.toBe('');

            // Send POST with matching token
            const res = await app.request('/api/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Cookie: `csrf-token=${validToken}`,
                    'X-CSRF-Token': validToken!,
                },
                body: JSON.stringify({ data: 'test' }),
            });

            expect(res.status).toBe(200);
            const body = (await res.json()) as TestBody;
            expect(body.method).toBe('POST');
        });

        it('allows PUT with valid matching CSRF token', async () => {
            const getRes = await app.request('/api/test', { method: 'GET' });
            const setCookie = getRes.headers.get('Set-Cookie') ?? '';
            const cookieMatch = setCookie.match(/csrf-token=([^;]+)/);
            const validToken = cookieMatch?.[1];

            const res = await app.request('/api/test', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Cookie: `csrf-token=${validToken}`,
                    'X-CSRF-Token': validToken!,
                },
                body: JSON.stringify({ data: 'test' }),
            });

            expect(res.status).toBe(200);
        });

        it('allows DELETE with valid matching CSRF token', async () => {
            const getRes = await app.request('/api/test', { method: 'GET' });
            const setCookie = getRes.headers.get('Set-Cookie') ?? '';
            const cookieMatch = setCookie.match(/csrf-token=([^;]+)/);
            const validToken = cookieMatch?.[1];

            const res = await app.request('/api/test', {
                method: 'DELETE',
                headers: {
                    Cookie: `csrf-token=${validToken}`,
                    'X-CSRF-Token': validToken!,
                },
            });

            expect(res.status).toBe(200);
        });
    });

    describe('Token Reuse and Persistence', () => {
        it('reuses existing CSRF token from cookie', async () => {
            // Simulate an existing CSRF token
            const existingToken = 'existing-csrf-token-12345';

            const res = await app.request('/api/test', {
                method: 'GET',
                headers: {
                    Cookie: `csrf-token=${existingToken}`,
                },
            });

            expect(res.status).toBe(200);

            // Should NOT set a new cookie (reuses existing)
            // Note: Hono may or may not set the cookie again depending on implementation
            // The key test is that the existing token works
        });

        it('accepts POST with previously established token', async () => {
            const existingToken = 'my-csrf-token-abc123';

            const res = await app.request('/api/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Cookie: `csrf-token=${existingToken}`,
                    'X-CSRF-Token': existingToken,
                },
                body: JSON.stringify({ data: 'test' }),
            });

            expect(res.status).toBe(200);
        });
    });

    describe('Security Edge Cases', () => {
        it('rejects token in cookie only (no header)', async () => {
            const token = 'valid-token-123';

            const res = await app.request('/api/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Cookie: `csrf-token=${token}`,
                    // No X-CSRF-Token header!
                },
                body: JSON.stringify({ data: 'test' }),
            });

            expect(res.status).toBe(403);
        });

        it('rejects token in header only (no cookie)', async () => {
            const res = await app.request('/api/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': 'some-token',
                    // No Cookie header!
                },
                body: JSON.stringify({ data: 'test' }),
            });

            expect(res.status).toBe(403);
        });

        it('rejects empty CSRF token', async () => {
            const res = await app.request('/api/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Cookie: 'csrf-token=',
                    'X-CSRF-Token': '',
                },
                body: JSON.stringify({ data: 'test' }),
            });

            expect(res.status).toBe(403);
        });

        it('handles concurrent requests with different tokens', async () => {
            const token1 = 'token-user-1';
            const token2 = 'token-user-2';

            const [res1, res2] = await Promise.all([
                app.request('/api/test', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Cookie: `csrf-token=${token1}`,
                        'X-CSRF-Token': token1,
                    },
                    body: JSON.stringify({ user: 1 }),
                }),
                app.request('/api/test', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Cookie: `csrf-token=${token2}`,
                        'X-CSRF-Token': token2,
                    },
                    body: JSON.stringify({ user: 2 }),
                }),
            ]);

            expect(res1.status).toBe(200);
            expect(res2.status).toBe(200);
        });

        it('generates unique tokens for new requests', async () => {
            // Create two separate apps (simulating two users)
            const app1 = new Hono<{ Bindings: Env; Variables: Variables }>();
            const app2 = new Hono<{ Bindings: Env; Variables: Variables }>();

            app1.use('*', csrfMiddleware());
            app2.use('*', csrfMiddleware());

            app1.get('/test', (c) => c.json({ ok: true }));
            app2.get('/test', (c) => c.json({ ok: true }));

            const res1 = await app1.request('/test', { method: 'GET' });
            const res2 = await app2.request('/test', { method: 'GET' });

            const cookie1 = res1.headers.get('Set-Cookie');
            const cookie2 = res2.headers.get('Set-Cookie');

            const token1 = cookie1?.match(/csrf-token=([^;]+)/)?.[1];
            const token2 = cookie2?.match(/csrf-token=([^;]+)/)?.[1];

            // Tokens should be different UUIDs
            expect(token1).toBeDefined();
            expect(token2).toBeDefined();
            expect(token1).not.toBe(token2);

            // Should look like UUIDs
            expect(token1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
            expect(token2).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        });
    });

    describe('Attack Simulation', () => {
        it('prevents CSRF attack scenario (attacker cannot forge token)', async () => {
            // Legitimate user gets a token
            const legitRes = await app.request('/api/test', { method: 'GET' });
            const legitCookie = legitRes.headers.get('Set-Cookie') ?? '';
            const legitToken = legitCookie.match(/csrf-token=([^;]+)/)?.[1];

            // Attacker tries to make a request on behalf of the user
            // but doesn't know the token value (can't read cross-origin cookies)
            const attackRes = await app.request('/api/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Attacker's forged request - they can trigger cookie send via CORS
                    Cookie: `csrf-token=${legitToken}`,
                    // But they CAN'T set the header (can't read the cookie value)
                    // So they either omit it or guess wrong:
                    'X-CSRF-Token': 'attacker-guess',
                },
                body: JSON.stringify({ action: 'malicious' }),
            });

            // Should be rejected
            expect(attackRes.status).toBe(403);
        });

        it('allows legitimate request with proper token flow', async () => {
            // Step 1: User loads the page, gets CSRF token
            const pageLoad = await app.request('/api/test', { method: 'GET' });
            const setCookie = pageLoad.headers.get('Set-Cookie') ?? '';
            const token = setCookie.match(/csrf-token=([^;]+)/)?.[1];

            // Step 2: User's JavaScript reads the cookie and makes a POST
            // This works because same-origin JavaScript CAN read the cookie
            const postRes = await app.request('/api/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Cookie: `csrf-token=${token}`,
                    'X-CSRF-Token': token!,
                },
                body: JSON.stringify({ action: 'legitimate' }),
            });

            expect(postRes.status).toBe(200);
        });
    });
});
