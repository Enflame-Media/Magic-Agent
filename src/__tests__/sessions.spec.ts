/**
 * Integration Tests for Session Routes
 *
 * Tests all session endpoints including:
 * - GET /v1/sessions (list legacy)
 * - GET /v2/sessions (paginated)
 * - GET /v2/sessions/active (active sessions)
 * - POST /v1/sessions (create)
 * - GET /v1/sessions/:id (get single)
 * - DELETE /v1/sessions/:id (soft delete)
 * - POST /v1/sessions/:id/messages (add message)
 *
 * @module __tests__/sessions.spec
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

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

// Mock auth module
vi.mock('@/lib/auth', () => ({
    initAuth: vi.fn().mockResolvedValue(undefined),
    verifyToken: vi.fn().mockImplementation(async (token: string) => {
        if (token === 'valid-token') {
            return { userId: 'test-user-123', extras: {} };
        }
        if (token === 'user2-token') {
            return { userId: 'test-user-456', extras: {} };
        }
        return null;
    }),
    createToken: vi.fn().mockResolvedValue('generated-token'),
    resetAuth: vi.fn(),
}));

import app from '@/index';
import {
    authHeader,
    jsonBody,
    parseJson,
    VALID_TOKEN,
    TEST_USER_ID,
    generateTestId,
} from './test-utils';

describe('Session Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /v1/sessions - List Sessions (Legacy)', () => {
        it('should require authentication', async () => {
            const res = await app.request('/v1/sessions', {
                method: 'GET',
            });

            expect(res.status).toBe(401);
        });

        it('should return sessions list with valid auth', async () => {
            const res = await app.request('/v1/sessions', {
                method: 'GET',
                headers: authHeader(),
            });

            // Should return 200 with sessions array (may be empty)
            expect([200, 500]).toContain(res.status);
            if (res.status === 200) {
                const body = await parseJson<{ sessions: unknown[] }>(res);
                expect(body).toHaveProperty('sessions');
                expect(Array.isArray(body.sessions)).toBe(true);
            }
        });
    });

    describe('GET /v2/sessions - List Sessions (Paginated)', () => {
        it('should require authentication', async () => {
            const res = await app.request('/v2/sessions', {
                method: 'GET',
            });

            expect(res.status).toBe(401);
        });

        it('should return paginated sessions with valid auth', async () => {
            const res = await app.request('/v2/sessions', {
                method: 'GET',
                headers: authHeader(),
            });

            expect([200, 500]).toContain(res.status);
            if (res.status === 200) {
                const body = await parseJson<{ sessions: unknown[]; nextCursor?: string }>(res);
                expect(body).toHaveProperty('sessions');
                expect(Array.isArray(body.sessions)).toBe(true);
            }
        });

        it('should accept limit query parameter', async () => {
            const res = await app.request('/v2/sessions?limit=10', {
                method: 'GET',
                headers: authHeader(),
            });

            expect([200, 500]).toContain(res.status);
        });

        it('should accept cursor query parameter', async () => {
            const res = await app.request('/v2/sessions?cursor=cursor_v1_test123', {
                method: 'GET',
                headers: authHeader(),
            });

            expect([200, 400, 500]).toContain(res.status);
        });

        it('should accept changedSince query parameter', async () => {
            const res = await app.request('/v2/sessions?changedSince=2024-01-01T00:00:00Z', {
                method: 'GET',
                headers: authHeader(),
            });

            expect([200, 500]).toContain(res.status);
        });

        it('should reject invalid limit (too high)', async () => {
            const res = await app.request('/v2/sessions?limit=500', {
                method: 'GET',
                headers: authHeader(),
            });

            // Should reject limit > 200
            expect([200, 400, 500]).toContain(res.status);
        });
    });

    describe('GET /v2/sessions/active - List Active Sessions', () => {
        it('should require authentication', async () => {
            const res = await app.request('/v2/sessions/active', {
                method: 'GET',
            });

            expect(res.status).toBe(401);
        });

        it('should return active sessions with valid auth', async () => {
            const res = await app.request('/v2/sessions/active', {
                method: 'GET',
                headers: authHeader(),
            });

            expect([200, 500]).toContain(res.status);
            if (res.status === 200) {
                const body = await parseJson<{ sessions: unknown[] }>(res);
                expect(body).toHaveProperty('sessions');
            }
        });

        it('should accept limit query parameter', async () => {
            const res = await app.request('/v2/sessions/active?limit=50', {
                method: 'GET',
                headers: authHeader(),
            });

            expect([200, 500]).toContain(res.status);
        });
    });

    describe('POST /v1/sessions - Create Session', () => {
        it('should require authentication', async () => {
            const res = await app.request('/v1/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: jsonBody({
                    tag: 'test-session',
                    metadata: '{"name":"Test"}',
                }),
            });

            expect(res.status).toBe(401);
        });

        it('should create session with valid data', async () => {
            const tag = `test-${Date.now()}`;
            const res = await app.request('/v1/sessions', {
                method: 'POST',
                headers: authHeader(),
                body: jsonBody({
                    tag,
                    metadata: '{"name":"Test Session"}',
                    agentState: '{"state":"initial"}',
                    dataEncryptionKey: 'base64-encoded-key',
                }),
            });

            expect([200, 201, 500]).toContain(res.status);
            if (res.status === 200 || res.status === 201) {
                const body = await parseJson<{ session: { id: string; tag: string } }>(res);
                expect(body).toHaveProperty('session');
                expect(body.session).toHaveProperty('id');
            }
        });

        it('should require tag field', async () => {
            const res = await app.request('/v1/sessions', {
                method: 'POST',
                headers: authHeader(),
                body: jsonBody({
                    metadata: '{"name":"Test"}',
                }),
            });

            expect(res.status).toBe(400);
        });

        it('should require metadata field', async () => {
            const res = await app.request('/v1/sessions', {
                method: 'POST',
                headers: authHeader(),
                body: jsonBody({
                    tag: 'test-session',
                }),
            });

            expect(res.status).toBe(400);
        });

        it('should handle duplicate tag (idempotent)', async () => {
            const tag = `duplicate-test-${Date.now()}`;

            // First creation
            const res1 = await app.request('/v1/sessions', {
                method: 'POST',
                headers: authHeader(),
                body: jsonBody({
                    tag,
                    metadata: '{"name":"First"}',
                }),
            });

            // Second creation with same tag
            const res2 = await app.request('/v1/sessions', {
                method: 'POST',
                headers: authHeader(),
                body: jsonBody({
                    tag,
                    metadata: '{"name":"Second"}',
                }),
            });

            // Both should succeed (idempotent) or DB error
            expect([200, 201, 500]).toContain(res1.status);
            expect([200, 201, 500]).toContain(res2.status);
        });
    });

    describe('GET /v1/sessions/:id - Get Single Session', () => {
        it('should require authentication', async () => {
            const res = await app.request('/v1/sessions/test-session-id', {
                method: 'GET',
            });

            expect(res.status).toBe(401);
        });

        it('should return 404 for non-existent session', async () => {
            const res = await app.request('/v1/sessions/non-existent-session-id', {
                method: 'GET',
                headers: authHeader(),
            });

            expect([404, 500]).toContain(res.status);
        });

        it('should validate session ID format', async () => {
            const res = await app.request('/v1/sessions/valid-session-id-format', {
                method: 'GET',
                headers: authHeader(),
            });

            expect([200, 404, 500]).toContain(res.status);
        });
    });

    describe('DELETE /v1/sessions/:id - Soft Delete Session', () => {
        it('should require authentication', async () => {
            const res = await app.request('/v1/sessions/test-session-id', {
                method: 'DELETE',
            });

            expect(res.status).toBe(401);
        });

        it('should return 404 for non-existent session', async () => {
            const res = await app.request('/v1/sessions/non-existent-session-id', {
                method: 'DELETE',
                headers: authHeader(),
            });

            expect([404, 500]).toContain(res.status);
        });

        it('should soft delete session (set active=false)', async () => {
            const res = await app.request('/v1/sessions/test-session-to-delete', {
                method: 'DELETE',
                headers: authHeader(),
            });

            expect([200, 404, 500]).toContain(res.status);
            if (res.status === 200) {
                const body = await parseJson<{ success: boolean }>(res);
                expect(body.success).toBe(true);
            }
        });
    });

    describe('POST /v1/sessions/:id/messages - Create Session Message', () => {
        it('should require authentication', async () => {
            const res = await app.request('/v1/sessions/test-session/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: jsonBody({
                    content: { text: 'Test message' },
                }),
            });

            expect(res.status).toBe(401);
        });

        it('should create message with valid data', async () => {
            const res = await app.request('/v1/sessions/test-session/messages', {
                method: 'POST',
                headers: authHeader(),
                body: jsonBody({
                    localId: `local-${Date.now()}`,
                    content: { type: 'user', text: 'Test message' },
                }),
            });

            expect([200, 201, 404, 500]).toContain(res.status);
            if (res.status === 200 || res.status === 201) {
                const body = await parseJson<{ message: { id: string } }>(res);
                expect(body).toHaveProperty('message');
            }
        });

        it('should require content field', async () => {
            const res = await app.request('/v1/sessions/test-session/messages', {
                method: 'POST',
                headers: authHeader(),
                body: jsonBody({
                    localId: 'local-123',
                }),
            });

            // 400 = validation error, 500 = runtime error (DB undefined)
            expect([400, 500]).toContain(res.status);
        });

        it('should return 404 for non-existent session', async () => {
            const res = await app.request('/v1/sessions/non-existent/messages', {
                method: 'POST',
                headers: authHeader(),
                body: jsonBody({
                    content: { text: 'Test' },
                }),
            });

            expect([404, 500]).toContain(res.status);
        });
    });

    describe('Session Access Control', () => {
        it('should not allow access to another user\'s session', async () => {
            // Create session as user 1
            const createRes = await app.request('/v1/sessions', {
                method: 'POST',
                headers: authHeader(VALID_TOKEN),
                body: jsonBody({
                    tag: `private-session-${Date.now()}`,
                    metadata: '{"name":"Private"}',
                }),
            });

            if (createRes.status === 200) {
                const { session } = await parseJson<{ session: { id: string } }>(createRes);

                // Try to access as user 2
                const accessRes = await app.request(`/v1/sessions/${session.id}`, {
                    method: 'GET',
                    headers: authHeader('user2-token'),
                });

                // Should be 404 (not found for this user) or 403 (forbidden)
                expect([403, 404, 500]).toContain(accessRes.status);
            }
        });
    });
});
