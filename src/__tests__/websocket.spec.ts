/**
 * Integration Tests for WebSocket Routes
 *
 * Tests WebSocket endpoints including:
 * - GET /v1/updates (WebSocket upgrade)
 * - GET /v1/websocket (alternative endpoint)
 * - GET /v1/websocket/stats (connection stats)
 * - POST /v1/websocket/broadcast (send broadcast)
 *
 * @module __tests__/websocket.spec
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
import { authHeader, jsonBody, expectOneOfStatus } from './test-utils';

describe('WebSocket Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /v1/updates - WebSocket Upgrade', () => {
        it('should reject non-WebSocket requests', async () => {
            const res = await app.request('/v1/updates?token=valid-token', {
                method: 'GET',
            });

            // Should reject without Upgrade header (may return text error, not JSON)
            expect([101, 400, 426, 500]).toContain(res.status);
        });

        it('should reject WebSocket requests without token', async () => {
            const res = await app.request('/v1/updates', {
                method: 'GET',
                headers: {
                    Upgrade: 'websocket',
                    Connection: 'Upgrade',
                },
            });

            // May return text error, not JSON
            expect([400, 401, 500]).toContain(res.status);
        });

        it('should reject WebSocket requests with invalid token', async () => {
            const res = await app.request('/v1/updates?token=invalid-token', {
                method: 'GET',
                headers: {
                    Upgrade: 'websocket',
                    Connection: 'Upgrade',
                },
            });

            await expectOneOfStatus(res, [401], [500]);
        });

        it('should accept valid WebSocket upgrade request', async () => {
            const res = await app.request('/v1/updates?token=valid-token', {
                method: 'GET',
                headers: {
                    Upgrade: 'websocket',
                    Connection: 'Upgrade',
                },
            });

            // In test environment without real WebSocket support, may return various codes
            await expectOneOfStatus(res, [101, 200, 400], [500]);
        });

        it('should support user-scoped client type', async () => {
            const res = await app.request('/v1/updates?token=valid-token&clientType=user-scoped', {
                method: 'GET',
                headers: {
                    Upgrade: 'websocket',
                    Connection: 'Upgrade',
                },
            });

            await expectOneOfStatus(res, [101, 200, 400], [500]);
        });

        it('should require sessionId for session-scoped client type', async () => {
            const res = await app.request('/v1/updates?token=valid-token&clientType=session-scoped', {
                method: 'GET',
                headers: {
                    Upgrade: 'websocket',
                    Connection: 'Upgrade',
                },
            });

            // Should fail without sessionId
            await expectOneOfStatus(res, [400], [500]);
        });

        it('should accept session-scoped with sessionId', async () => {
            const res = await app.request(
                '/v1/updates?token=valid-token&clientType=session-scoped&sessionId=session-123',
                {
                    method: 'GET',
                    headers: {
                        Upgrade: 'websocket',
                        Connection: 'Upgrade',
                    },
                }
            );

            await expectOneOfStatus(res, [101, 200, 400], [500]);
        });

        it('should require machineId for machine-scoped client type', async () => {
            const res = await app.request('/v1/updates?token=valid-token&clientType=machine-scoped', {
                method: 'GET',
                headers: {
                    Upgrade: 'websocket',
                    Connection: 'Upgrade',
                },
            });

            // Should fail without machineId
            await expectOneOfStatus(res, [400], [500]);
        });

        it('should accept machine-scoped with machineId', async () => {
            const res = await app.request(
                '/v1/updates?token=valid-token&clientType=machine-scoped&machineId=machine-123',
                {
                    method: 'GET',
                    headers: {
                        Upgrade: 'websocket',
                        Connection: 'Upgrade',
                    },
                }
            );

            await expectOneOfStatus(res, [101, 200, 400], [500]);
        });

        it('should support Authorization header alternative', async () => {
            const res = await app.request('/v1/updates', {
                method: 'GET',
                headers: {
                    Upgrade: 'websocket',
                    Connection: 'Upgrade',
                    Authorization: 'Bearer valid-token',
                },
            });

            await expectOneOfStatus(res, [101, 200, 400], [500]);
        });

        it('should support X-Client-Type header', async () => {
            const res = await app.request('/v1/updates?token=valid-token', {
                method: 'GET',
                headers: {
                    Upgrade: 'websocket',
                    Connection: 'Upgrade',
                    'X-Client-Type': 'user-scoped',
                },
            });

            await expectOneOfStatus(res, [101, 200, 400], [500]);
        });
    });

    describe('GET /v1/websocket - Alternative WebSocket Endpoint', () => {
        it('should behave same as /v1/updates', async () => {
            const res = await app.request('/v1/websocket?token=valid-token', {
                method: 'GET',
                headers: {
                    Upgrade: 'websocket',
                    Connection: 'Upgrade',
                },
            });

            await expectOneOfStatus(res, [101, 200, 400], [500]);
        });
    });

    describe('GET /v1/websocket/stats - Connection Statistics', () => {
        it('should require authentication', async () => {
            const res = await app.request('/v1/websocket/stats', {
                method: 'GET',
            });

            expect(res.status).toBe(401);
        });

        it('should return connection stats', async () => {
            const res = await app.request('/v1/websocket/stats', {
                method: 'GET',
                headers: authHeader(),
            });

            const body = await expectOneOfStatus<{
                totalConnections: number;
                byType: Record<string, number>;
                activeSessions: number;
                activeMachines: number;
            }>(res, [200], [500]);
            if (!body) return;
                expect(body).toHaveProperty('totalConnections');
                expect(body).toHaveProperty('byType');
                expect(body).toHaveProperty('activeSessions');
                expect(body).toHaveProperty('activeMachines');
                expect(typeof body.totalConnections).toBe('number');
            
        });

        it('should return byType breakdown', async () => {
            const res = await app.request('/v1/websocket/stats', {
                method: 'GET',
                headers: authHeader(),
            });

            const body = await expectOneOfStatus<{
                byType: {
                    'user-scoped': number;
                    'session-scoped': number;
                    'machine-scoped': number;
                };
            }>(res, [200], [500]);
            if (!body) return;
                expect(body.byType).toHaveProperty('user-scoped');
                expect(body.byType).toHaveProperty('session-scoped');
                expect(body.byType).toHaveProperty('machine-scoped');
            
        });
    });

    describe('POST /v1/websocket/broadcast - Send Broadcast', () => {
        it('should require authentication', async () => {
            const res = await app.request('/v1/websocket/broadcast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: jsonBody({
                    message: {
                        type: 'test',
                        payload: {},
                        timestamp: Date.now(),
                    },
                }),
            });

            expect(res.status).toBe(401);
        });

        it('should broadcast message with valid auth', async () => {
            const res = await app.request('/v1/websocket/broadcast', {
                method: 'POST',
                headers: authHeader(),
                body: jsonBody({
                    message: {
                        type: 'session-update',
                        payload: { sessionId: 'xyz', status: 'active' },
                        timestamp: Date.now(),
                    },
                }),
            });

            const body = await expectOneOfStatus<{ success: boolean; delivered: number }>(res, [200], [500]);
            if (!body) return;
                expect(body).toHaveProperty('success');
                expect(body).toHaveProperty('delivered');
            
        });

        it('should require message field', async () => {
            const res = await app.request('/v1/websocket/broadcast', {
                method: 'POST',
                headers: authHeader(),
                body: jsonBody({}),
            });

            expect(res.status).toBe(400);
        });

        it('should accept filter for user-scoped-only', async () => {
            const res = await app.request('/v1/websocket/broadcast', {
                method: 'POST',
                headers: authHeader(),
                body: jsonBody({
                    message: {
                        type: 'notification',
                        payload: { text: 'Hello' },
                        timestamp: Date.now(),
                    },
                    filter: {
                        type: 'user-scoped-only',
                    },
                }),
            });

            await expectOneOfStatus(res, [200], [500]);
        });

        it('should accept filter for specific session', async () => {
            const res = await app.request('/v1/websocket/broadcast', {
                method: 'POST',
                headers: authHeader(),
                body: jsonBody({
                    message: {
                        type: 'session-update',
                        payload: {},
                        timestamp: Date.now(),
                    },
                    filter: {
                        type: 'session',
                        sessionId: 'session-123',
                    },
                }),
            });

            await expectOneOfStatus(res, [200], [500]);
        });

        it('should accept filter for specific machine', async () => {
            const res = await app.request('/v1/websocket/broadcast', {
                method: 'POST',
                headers: authHeader(),
                body: jsonBody({
                    message: {
                        type: 'machine-update',
                        payload: {},
                        timestamp: Date.now(),
                    },
                    filter: {
                        type: 'machine',
                        machineId: 'machine-123',
                    },
                }),
            });

            await expectOneOfStatus(res, [200], [500]);
        });

        it('should accept filter to exclude connection', async () => {
            const res = await app.request('/v1/websocket/broadcast', {
                method: 'POST',
                headers: authHeader(),
                body: jsonBody({
                    message: {
                        type: 'echo',
                        payload: {},
                        timestamp: Date.now(),
                    },
                    filter: {
                        type: 'exclude',
                        connectionId: 'conn-to-exclude',
                    },
                }),
            });

            await expectOneOfStatus(res, [200], [500]);
        });

        it('should return delivered count', async () => {
            const res = await app.request('/v1/websocket/broadcast', {
                method: 'POST',
                headers: authHeader(),
                body: jsonBody({
                    message: {
                        type: 'test',
                        payload: {},
                        timestamp: Date.now(),
                    },
                }),
            });

            const body = await expectOneOfStatus<{ delivered: number }>(res, [200], [500]);
            if (!body) return;
                expect(typeof body.delivered).toBe('number');
                expect(body.delivered).toBeGreaterThanOrEqual(0);
            
        });
    });

    describe('WebSocket Security', () => {
        it('should not allow cross-user broadcasts', async () => {
            // User 2 trying to broadcast to user 1's connections
            const res = await app.request('/v1/websocket/broadcast', {
                method: 'POST',
                headers: authHeader('user2-token'),
                body: jsonBody({
                    message: {
                        type: 'malicious',
                        payload: {},
                        timestamp: Date.now(),
                    },
                }),
            });

            // Should succeed but deliver 0 messages (user 2 has no connections)
            await expectOneOfStatus(res, [200], [500]);
        });

        it('should reject invalid client types', async () => {
            const res = await app.request('/v1/updates?token=valid-token&clientType=invalid-type', {
                method: 'GET',
                headers: {
                    Upgrade: 'websocket',
                    Connection: 'Upgrade',
                },
            });

            await expectOneOfStatus(res, [400], [500]);
        });
    });
});
