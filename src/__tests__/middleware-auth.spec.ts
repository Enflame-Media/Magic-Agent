/**
 * Unit Tests for Auth Middleware
 *
 * Tests authentication middleware functions:
 * - authMiddleware - Requires valid token
 * - optionalAuthMiddleware - Accepts but doesn't require token
 *
 * @module __tests__/middleware-auth.spec
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

// Mock cloudflare:workers module
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

// Mock auth module with controllable behavior
vi.mock('@/lib/auth', () => {
    const mockVerifyToken = vi.fn();
    return {
        initAuth: vi.fn().mockResolvedValue(undefined),
        verifyToken: mockVerifyToken,
        createToken: vi.fn().mockResolvedValue('generated-token'),
        resetAuth: vi.fn(),
        // Export the mock for test access
        __mockVerifyToken: mockVerifyToken,
    };
});

import { authMiddleware, optionalAuthMiddleware, type AuthVariables } from '@/middleware/auth';
import * as authModule from '@/lib/auth';

// Get reference to the mock
const mockVerifyToken = (authModule as unknown as { __mockVerifyToken: ReturnType<typeof vi.fn> }).__mockVerifyToken;

describe('Auth Middleware', () => {
    let app: Hono<{ Variables: AuthVariables }>;

    beforeEach(() => {
        vi.clearAllMocks();
        app = new Hono<{ Variables: AuthVariables }>();
    });

    describe('authMiddleware', () => {
        beforeEach(() => {
            // Set up a test route with required auth
            app.use('/protected/*', authMiddleware());
            app.get('/protected/data', (c) => {
                const userId = c.get('userId');
                const extras = c.get('sessionExtras');
                return c.json({ userId, extras });
            });
        });

        it('should return 401 when Authorization header is missing', async () => {
            const res = await app.request('/protected/data', {
                method: 'GET',
            });

            expect(res.status).toBe(401);
            const data = (await res.json()) as { error: { message: string } };
            expect(data.error.message).toContain('Missing Authorization header');
        });

        it('should return 401 when Authorization format is invalid', async () => {
            const res = await app.request('/protected/data', {
                method: 'GET',
                headers: {
                    Authorization: 'InvalidFormat token123',
                },
            });

            expect(res.status).toBe(401);
            const data = (await res.json()) as { error: { message: string } };
            expect(data.error.message).toContain('Invalid Authorization header format');
        });

        it('should return 401 when Bearer token is empty', async () => {
            const res = await app.request('/protected/data', {
                method: 'GET',
                headers: {
                    Authorization: 'Bearer ',
                },
            });

            expect(res.status).toBe(401);
            const data = (await res.json()) as { error?: { message: string }; userId?: string; extras?: unknown; authenticated?: boolean };
            // Could be "Empty token" or "Invalid Authorization header format" depending on split behavior
            expect(data.error).toBeDefined();
            expect(data.error!.message).toMatch(/Empty token|Invalid Authorization header format/);
        });

        it('should return 401 when token verification fails', async () => {
            mockVerifyToken.mockResolvedValue(null);

            const res = await app.request('/protected/data', {
                method: 'GET',
                headers: {
                    Authorization: 'Bearer invalid-token',
                },
            });

            expect(res.status).toBe(401);
            const data = (await res.json()) as { error?: { message: string }; userId?: string; extras?: unknown; authenticated?: boolean };
            expect(data.error).toBeDefined();
            expect(data.error!.message).toContain('Invalid or expired token');
        });

        it('should set userId when token is valid', async () => {
            mockVerifyToken.mockResolvedValue({
                userId: 'user-123',
                extras: undefined,
            });

            const res = await app.request('/protected/data', {
                method: 'GET',
                headers: {
                    Authorization: 'Bearer valid-token',
                },
            });

            expect(res.status).toBe(200);
            const data = (await res.json()) as { error?: { message: string }; userId?: string; extras?: unknown; authenticated?: boolean };
            expect(data.userId).toBe('user-123');
        });

        it('should set sessionExtras when token includes extras', async () => {
            mockVerifyToken.mockResolvedValue({
                userId: 'user-123',
                extras: { sessionId: 'sess-456', role: 'admin' },
            });

            const res = await app.request('/protected/data', {
                method: 'GET',
                headers: {
                    Authorization: 'Bearer valid-token-with-extras',
                },
            });

            expect(res.status).toBe(200);
            const data = (await res.json()) as { error?: { message: string }; userId?: string; extras?: unknown; authenticated?: boolean };
            expect(data.userId).toBe('user-123');
            expect(data.extras).toEqual({ sessionId: 'sess-456', role: 'admin' });
        });
    });

    describe('optionalAuthMiddleware', () => {
        beforeEach(() => {
            // Set up a test route with optional auth
            app.use('/optional/*', optionalAuthMiddleware());
            app.get('/optional/data', (c) => {
                const userId = c.get('userId');
                const extras = c.get('sessionExtras');
                return c.json({
                    authenticated: !!userId,
                    userId: userId ?? null,
                    extras: extras ?? null,
                });
            });
        });

        it('should proceed without auth header', async () => {
            const res = await app.request('/optional/data', {
                method: 'GET',
            });

            expect(res.status).toBe(200);
            const data = (await res.json()) as { error?: { message: string }; userId?: string; extras?: unknown; authenticated?: boolean };
            expect(data.authenticated).toBe(false);
            expect(data.userId).toBeNull();
        });

        it('should proceed with invalid auth format', async () => {
            const res = await app.request('/optional/data', {
                method: 'GET',
                headers: {
                    Authorization: 'InvalidFormat token123',
                },
            });

            expect(res.status).toBe(200);
            const data = (await res.json()) as { error?: { message: string }; userId?: string; extras?: unknown; authenticated?: boolean };
            expect(data.authenticated).toBe(false);
            expect(data.userId).toBeNull();
        });

        it('should proceed with empty Bearer token', async () => {
            const res = await app.request('/optional/data', {
                method: 'GET',
                headers: {
                    Authorization: 'Bearer ',
                },
            });

            expect(res.status).toBe(200);
            const data = (await res.json()) as { error?: { message: string }; userId?: string; extras?: unknown; authenticated?: boolean };
            expect(data.authenticated).toBe(false);
            expect(data.userId).toBeNull();
        });

        it('should proceed with invalid token (verification fails)', async () => {
            mockVerifyToken.mockResolvedValue(null);

            const res = await app.request('/optional/data', {
                method: 'GET',
                headers: {
                    Authorization: 'Bearer invalid-token',
                },
            });

            expect(res.status).toBe(200);
            const data = (await res.json()) as { error?: { message: string }; userId?: string; extras?: unknown; authenticated?: boolean };
            expect(data.authenticated).toBe(false);
            expect(data.userId).toBeNull();
        });

        it('should set userId when token is valid', async () => {
            mockVerifyToken.mockResolvedValue({
                userId: 'user-123',
                extras: undefined,
            });

            const res = await app.request('/optional/data', {
                method: 'GET',
                headers: {
                    Authorization: 'Bearer valid-token',
                },
            });

            expect(res.status).toBe(200);
            const data = (await res.json()) as { error?: { message: string }; userId?: string; extras?: unknown; authenticated?: boolean };
            expect(data.authenticated).toBe(true);
            expect(data.userId).toBe('user-123');
        });

        it('should set sessionExtras when token includes extras', async () => {
            mockVerifyToken.mockResolvedValue({
                userId: 'user-123',
                extras: { sessionId: 'sess-456' },
            });

            const res = await app.request('/optional/data', {
                method: 'GET',
                headers: {
                    Authorization: 'Bearer valid-token',
                },
            });

            expect(res.status).toBe(200);
            const data = (await res.json()) as { error?: { message: string }; userId?: string; extras?: unknown; authenticated?: boolean };
            expect(data.authenticated).toBe(true);
            expect(data.userId).toBe('user-123');
            expect(data.extras).toEqual({ sessionId: 'sess-456' });
        });

        it('should not set extras when token has no extras', async () => {
            mockVerifyToken.mockResolvedValue({
                userId: 'user-123',
                extras: undefined,
            });

            const res = await app.request('/optional/data', {
                method: 'GET',
                headers: {
                    Authorization: 'Bearer valid-token',
                },
            });

            expect(res.status).toBe(200);
            const data = (await res.json()) as { error?: { message: string }; userId?: string; extras?: unknown; authenticated?: boolean };
            expect(data.authenticated).toBe(true);
            expect(data.extras).toBeNull();
        });
    });

    describe('Edge Cases', () => {
        it('should handle multiple spaces in Authorization header', async () => {
            app.use('/test', authMiddleware());
            app.get('/test', (c) => c.json({ ok: true }));

            const res = await app.request('/test', {
                method: 'GET',
                headers: {
                    Authorization: 'Bearer  token  with  spaces',
                },
            });

            // Should fail due to malformed header
            expect(res.status).toBe(401);
        });

        it('should handle case-sensitive Bearer prefix', async () => {
            app.use('/test', authMiddleware());
            app.get('/test', (c) => c.json({ ok: true }));

            const res = await app.request('/test', {
                method: 'GET',
                headers: {
                    Authorization: 'bearer valid-token', // lowercase
                },
            });

            // Should fail - Bearer must be capitalized
            expect(res.status).toBe(401);
        });

        it('should handle very long tokens', async () => {
            mockVerifyToken.mockResolvedValue({
                userId: 'user-123',
                extras: undefined,
            });

            app.use('/test', authMiddleware());
            app.get('/test', (c) => c.json({ ok: true }));

            const longToken = 'x'.repeat(10000);
            const res = await app.request('/test', {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${longToken}`,
                },
            });

            // Should work if verification passes
            expect(res.status).toBe(200);
        });

        it('should handle tokens with special characters', async () => {
            mockVerifyToken.mockResolvedValue({
                userId: 'user-123',
                extras: undefined,
            });

            app.use('/test', authMiddleware());
            app.get('/test', (c) => c.json({ ok: true }));

            const specialToken = 'token.with-special_chars+/=';
            const res = await app.request('/test', {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${specialToken}`,
                },
            });

            expect(res.status).toBe(200);
        });
    });
});
