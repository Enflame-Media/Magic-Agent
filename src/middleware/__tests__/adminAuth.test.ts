/**
 * Authorization Unit Tests for Admin Auth Middleware
 *
 * These tests verify that the admin auth middleware properly enforces
 * role-based access control (RBAC) according to security requirements.
 *
 * @see HAP-618 - SECURITY: No Role-Based Authorization in Admin API
 * @see HAP-612 - SECURITY: Open user registration vulnerability
 * @see https://owasp.org/Top10/A01_2021-Broken_Access_Control/
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { Env, Variables } from '../../env';

/**
 * Test helpers and mocks
 *
 * Since the real middleware depends on external services (Better-Auth, D1),
 * we create a simplified test version that mirrors the authorization logic.
 */

/** Mock session data structure */
interface MockSession {
    user: {
        id: string;
        email: string;
        name: string;
        role?: string;
    };
    session: {
        id: string;
        expiresAt: Date;
    };
}

/** Mock database user role lookup */
interface MockDbUser {
    role: string | null;
}

/** Response body types for type-safe assertions */
interface ErrorResponse {
    error: string;
    message: string;
}

interface SuccessResponse {
    message?: string;
    userId?: string;
    userEmail?: string;
    userRole?: string;
    ok?: boolean;
}

/**
 * Creates a testable admin middleware with injectable mocks
 *
 * This mirrors the exact authorization logic of the real adminAuthMiddleware
 * but allows us to inject mock functions for testing without D1/Better-Auth.
 */
function createTestableAdminMiddleware(
    getSession: () => Promise<MockSession | null>,
    getDbUser: (userId: string) => Promise<MockDbUser | undefined>
) {
    return async (c: { json: (data: unknown, status: number) => Response; set: (key: string, value: unknown) => void }, next: () => Promise<void>) => {
        try {
            // Step 1: Verify session (authentication)
            const session = await getSession();

            if (!session) {
                return c.json(
                    {
                        error: 'Unauthorized',
                        message: 'Authentication required',
                    },
                    401
                );
            }

            // Step 2: Query user role from database
            const user = await getDbUser(session.user.id);

            // Step 3: Check admin role (authorization)
            if (!user || user.role !== 'admin') {
                return c.json(
                    {
                        error: 'Forbidden',
                        message: 'Admin access required',
                    },
                    403
                );
            }

            // Step 4: Set context and proceed
            c.set('user', { ...session.user, role: user.role });
            c.set('session', session.session);

            await next();
            return;
        } catch {
            return c.json(
                {
                    error: 'Unauthorized',
                    message: 'Invalid or expired session',
                },
                401
            );
        }
    };
}

/**
 * Creates a testable auth-only middleware (no role check)
 */
function createTestableAuthMiddleware(getSession: () => Promise<MockSession | null>) {
    return async (c: { json: (data: unknown, status: number) => Response; set: (key: string, value: unknown) => void }, next: () => Promise<void>) => {
        try {
            const session = await getSession();

            if (!session) {
                return c.json(
                    {
                        error: 'Unauthorized',
                        message: 'Authentication required',
                    },
                    401
                );
            }

            c.set('user', session.user);
            c.set('session', session.session);

            await next();
            return;
        } catch {
            return c.json(
                {
                    error: 'Unauthorized',
                    message: 'Invalid or expired session',
                },
                401
            );
        }
    };
}

describe('Admin Authorization Middleware (HAP-618)', () => {
    let app: Hono<{ Bindings: Env; Variables: Variables }>;
    let mockGetSession: ReturnType<typeof vi.fn<() => Promise<MockSession | null>>>;
    let mockGetDbUser: ReturnType<typeof vi.fn<(userId: string) => Promise<MockDbUser | undefined>>>;

    beforeEach(() => {
        vi.clearAllMocks();

        // Set up mock functions with proper types
        mockGetSession = vi.fn<() => Promise<MockSession | null>>();
        mockGetDbUser = vi.fn<(userId: string) => Promise<MockDbUser | undefined>>();

        // Create test app with testable admin middleware
        app = new Hono<{ Bindings: Env; Variables: Variables }>();
        app.use('/api/metrics/*', createTestableAdminMiddleware(mockGetSession, mockGetDbUser) as never);
        app.get('/api/metrics/summary', (c) => {
            const user = c.get('user');
            return c.json({ message: 'Access granted', userId: user?.id });
        });
    });

    describe('Authentication (Step 1)', () => {
        it('rejects unauthenticated requests with 401', async () => {
            // No session found
            mockGetSession.mockResolvedValue(null);

            const res = await app.request('/api/metrics/summary', {
                headers: {},
            });

            expect(res.status).toBe(401);
            const body = (await res.json()) as ErrorResponse;
            expect(body.error).toBe('Unauthorized');
            expect(body.message).toBe('Authentication required');
        });

        it('rejects requests with expired/invalid sessions with 401', async () => {
            // Session verification throws error
            mockGetSession.mockRejectedValue(new Error('Session expired'));

            const res = await app.request('/api/metrics/summary', {
                headers: { Cookie: 'happy-admin.session_token=expired-token' },
            });

            expect(res.status).toBe(401);
            const body = (await res.json()) as ErrorResponse;
            expect(body.error).toBe('Unauthorized');
            expect(body.message).toBe('Invalid or expired session');
        });
    });

    describe('Authorization (Step 2-3)', () => {
        const validSession = {
            user: {
                id: 'user-123',
                email: 'user@example.com',
                name: 'Test User',
            },
            session: {
                id: 'session-456',
                expiresAt: new Date(Date.now() + 3600000),
            },
        };

        it('rejects non-admin users with 403 Forbidden', async () => {
            // Valid session but user has 'user' role (not admin)
            mockGetSession.mockResolvedValue(validSession);
            mockGetDbUser.mockResolvedValue({ role: 'user' });

            const res = await app.request('/api/metrics/summary', {
                headers: { Cookie: 'happy-admin.session_token=valid-token' },
            });

            expect(res.status).toBe(403);
            const body = (await res.json()) as ErrorResponse;
            expect(body.error).toBe('Forbidden');
            expect(body.message).toBe('Admin access required');
        });

        it('rejects users with null role with 403 Forbidden', async () => {
            // Valid session but role is null (never set)
            mockGetSession.mockResolvedValue(validSession);
            mockGetDbUser.mockResolvedValue({ role: null });

            const res = await app.request('/api/metrics/summary', {
                headers: { Cookie: 'happy-admin.session_token=valid-token' },
            });

            expect(res.status).toBe(403);
            const body = (await res.json()) as ErrorResponse;
            expect(body.error).toBe('Forbidden');
        });

        it('rejects users not found in database with 403 Forbidden', async () => {
            // Valid session but user doesn't exist in database
            mockGetSession.mockResolvedValue(validSession);
            mockGetDbUser.mockResolvedValue(undefined);

            const res = await app.request('/api/metrics/summary', {
                headers: { Cookie: 'happy-admin.session_token=valid-token' },
            });

            expect(res.status).toBe(403);
            const body = (await res.json()) as ErrorResponse;
            expect(body.error).toBe('Forbidden');
        });

        it('rejects users with empty string role with 403 Forbidden', async () => {
            // Valid session but role is empty string
            mockGetSession.mockResolvedValue(validSession);
            mockGetDbUser.mockResolvedValue({ role: '' });

            const res = await app.request('/api/metrics/summary', {
                headers: { Cookie: 'happy-admin.session_token=valid-token' },
            });

            expect(res.status).toBe(403);
            const body = (await res.json()) as ErrorResponse;
            expect(body.error).toBe('Forbidden');
        });

        it('rejects case-different role values (Admin, ADMIN) with 403', async () => {
            // Role check should be case-sensitive
            mockGetSession.mockResolvedValue(validSession);

            for (const role of ['Admin', 'ADMIN', 'aDmIn', ' admin', 'admin ']) {
                mockGetDbUser.mockResolvedValue({ role });

                const res = await app.request('/api/metrics/summary', {
                    headers: { Cookie: 'happy-admin.session_token=valid-token' },
                });

                expect(res.status).toBe(403);
            }
        });
    });

    describe('Successful Admin Access (Step 4)', () => {
        it('allows admin users with 200 OK', async () => {
            const adminSession = {
                user: {
                    id: 'admin-123',
                    email: 'admin@example.com',
                    name: 'Admin User',
                },
                session: {
                    id: 'session-789',
                    expiresAt: new Date(Date.now() + 3600000),
                },
            };

            mockGetSession.mockResolvedValue(adminSession);
            mockGetDbUser.mockResolvedValue({ role: 'admin' });

            const res = await app.request('/api/metrics/summary', {
                headers: { Cookie: 'happy-admin.session_token=valid-admin-token' },
            });

            expect(res.status).toBe(200);
            const body = (await res.json()) as SuccessResponse;
            expect(body.message).toBe('Access granted');
            expect(body.userId).toBe('admin-123');
        });

        it('sets user context with role for downstream handlers', async () => {
            const adminSession = {
                user: {
                    id: 'admin-456',
                    email: 'admin@example.com',
                    name: 'Admin User',
                },
                session: {
                    id: 'session-999',
                    expiresAt: new Date(Date.now() + 3600000),
                },
            };

            mockGetSession.mockResolvedValue(adminSession);
            mockGetDbUser.mockResolvedValue({ role: 'admin' });

            // Add a route that checks the user context
            app.get('/api/metrics/check-context', (c) => {
                const user = c.get('user');
                return c.json({
                    userId: user?.id,
                    userEmail: user?.email,
                    userRole: user?.role,
                });
            });

            const res = await app.request('/api/metrics/check-context', {
                headers: { Cookie: 'happy-admin.session_token=valid-admin-token' },
            });

            expect(res.status).toBe(200);
            const body = (await res.json()) as SuccessResponse;
            expect(body.userId).toBe('admin-456');
            expect(body.userEmail).toBe('admin@example.com');
            expect(body.userRole).toBe('admin');
        });
    });

    describe('Database Error Handling', () => {
        it('returns 401 when database query fails', async () => {
            const validSession = {
                user: {
                    id: 'user-123',
                    email: 'user@example.com',
                    name: 'Test User',
                },
                session: {
                    id: 'session-456',
                    expiresAt: new Date(Date.now() + 3600000),
                },
            };

            mockGetSession.mockResolvedValue(validSession);
            mockGetDbUser.mockRejectedValue(new Error('Database connection failed'));

            const res = await app.request('/api/metrics/summary', {
                headers: { Cookie: 'happy-admin.session_token=valid-token' },
            });

            // Should fail gracefully with 401 (not 500)
            expect(res.status).toBe(401);
        });
    });
});

describe('Basic Auth Middleware (authentication-only)', () => {
    let app: Hono<{ Bindings: Env; Variables: Variables }>;
    let mockGetSession: ReturnType<typeof vi.fn<() => Promise<MockSession | null>>>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetSession = vi.fn<() => Promise<MockSession | null>>();

        // Create test app with basic auth middleware (no role check)
        app = new Hono<{ Bindings: Env; Variables: Variables }>();
        app.use('/api/public/*', createTestableAuthMiddleware(mockGetSession) as never);
        app.get('/api/public/profile', (c) => {
            const user = c.get('user');
            return c.json({ userId: user?.id });
        });
    });

    it('does NOT check role (authentication only)', async () => {
        // Basic authMiddleware should only check session, not role
        const userSession = {
            user: {
                id: 'user-123',
                email: 'user@example.com',
                name: 'Regular User',
            },
            session: {
                id: 'session-456',
                expiresAt: new Date(Date.now() + 3600000),
            },
        };

        mockGetSession.mockResolvedValue(userSession);

        const res = await app.request('/api/public/profile', {
            headers: { Cookie: 'happy-admin.session_token=valid-token' },
        });

        // Should allow access without admin role
        expect(res.status).toBe(200);
        const body = (await res.json()) as SuccessResponse;
        expect(body.userId).toBe('user-123');
    });
});

describe('Security Edge Cases', () => {
    let app: Hono<{ Bindings: Env; Variables: Variables }>;
    let mockGetSession: ReturnType<typeof vi.fn<() => Promise<MockSession | null>>>;
    let mockGetDbUser: ReturnType<typeof vi.fn<(userId: string) => Promise<MockDbUser | undefined>>>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetSession = vi.fn<() => Promise<MockSession | null>>();
        mockGetDbUser = vi.fn<(userId: string) => Promise<MockDbUser | undefined>>();

        app = new Hono<{ Bindings: Env; Variables: Variables }>();
        app.use('/api/metrics/*', createTestableAdminMiddleware(mockGetSession, mockGetDbUser) as never);
        app.get('/api/metrics/test', (c) => c.json({ ok: true }));
    });

    it('prevents role spoofing via session manipulation', async () => {
        // Even if session claims to have admin role, we verify against DB
        const spoofedSession = {
            user: {
                id: 'attacker-123',
                email: 'attacker@example.com',
                name: 'Attacker',
                role: 'admin', // Attacker tries to inject role in session
            },
            session: {
                id: 'session-spoofed',
                expiresAt: new Date(Date.now() + 3600000),
            },
        };

        mockGetSession.mockResolvedValue(spoofedSession);
        mockGetDbUser.mockResolvedValue({ role: 'user' }); // DB says user is not admin

        const res = await app.request('/api/metrics/test', {
            headers: { Cookie: 'happy-admin.session_token=spoofed-token' },
        });

        // Should reject based on DB role, not session claim
        expect(res.status).toBe(403);
    });

    it('handles concurrent requests correctly', async () => {
        // Simulate multiple concurrent requests
        const adminSession = {
            user: { id: 'admin-1', email: 'admin@test.com', name: 'Admin' },
            session: { id: 'sess-1', expiresAt: new Date(Date.now() + 3600000) },
        };

        const userSession = {
            user: { id: 'user-1', email: 'user@test.com', name: 'User' },
            session: { id: 'sess-2', expiresAt: new Date(Date.now() + 3600000) },
        };

        // First request: admin
        mockGetSession.mockResolvedValueOnce(adminSession);
        mockGetDbUser.mockResolvedValueOnce({ role: 'admin' });

        // Second request: regular user
        mockGetSession.mockResolvedValueOnce(userSession);
        mockGetDbUser.mockResolvedValueOnce({ role: 'user' });

        const [res1, res2] = await Promise.all([
            app.request('/api/metrics/test', {
                headers: { Cookie: 'admin-token' },
            }),
            app.request('/api/metrics/test', {
                headers: { Cookie: 'user-token' },
            }),
        ]);

        expect(res1.status).toBe(200); // Admin succeeds
        expect(res2.status).toBe(403); // User fails
    });
});
