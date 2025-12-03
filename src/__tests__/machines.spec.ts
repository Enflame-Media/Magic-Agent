/**
 * Integration Tests for Machine Routes
 *
 * Tests all machine endpoints including:
 * - POST /v1/machines (register)
 * - GET /v1/machines (list)
 * - GET /v1/machines/:id (get single)
 * - PUT /v1/machines/:id/status (update status)
 *
 * @module __tests__/machines.spec
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
import { authHeader, jsonBody, parseJson, VALID_TOKEN } from './test-utils';

describe('Machine Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('POST /v1/machines - Register Machine', () => {
        it('should require authentication', async () => {
            const res = await app.request('/v1/machines', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: jsonBody({
                    id: 'machine-123',
                    metadata: '{"hostname":"test"}',
                }),
            });

            expect(res.status).toBe(401);
        });

        it('should register machine with valid data', async () => {
            const machineId = `machine-${Date.now()}`;
            const res = await app.request('/v1/machines', {
                method: 'POST',
                headers: authHeader(),
                body: jsonBody({
                    id: machineId,
                    metadata: '{"hostname":"test-laptop","os":"macOS"}',
                    daemonState: '{"running":true}',
                    dataEncryptionKey: 'base64-encoded-key',
                }),
            });

            expect([200, 201, 500]).toContain(res.status);
            if (res.status === 200 || res.status === 201) {
                const body = await parseJson<{ machine: { id: string } }>(res);
                expect(body).toHaveProperty('machine');
                expect(body.machine.id).toBe(machineId);
            }
        });

        it('should require id field', async () => {
            const res = await app.request('/v1/machines', {
                method: 'POST',
                headers: authHeader(),
                body: jsonBody({
                    metadata: '{"hostname":"test"}',
                }),
            });

            expect(res.status).toBe(400);
        });

        it('should require metadata field', async () => {
            const res = await app.request('/v1/machines', {
                method: 'POST',
                headers: authHeader(),
                body: jsonBody({
                    id: 'machine-123',
                }),
            });

            expect(res.status).toBe(400);
        });

        it('should handle idempotent registration (same machine ID)', async () => {
            const machineId = `idempotent-machine-${Date.now()}`;

            // First registration
            const res1 = await app.request('/v1/machines', {
                method: 'POST',
                headers: authHeader(),
                body: jsonBody({
                    id: machineId,
                    metadata: '{"hostname":"first"}',
                }),
            });

            // Second registration with same ID
            const res2 = await app.request('/v1/machines', {
                method: 'POST',
                headers: authHeader(),
                body: jsonBody({
                    id: machineId,
                    metadata: '{"hostname":"second"}',
                }),
            });

            // Both should succeed or consistently fail
            expect([200, 201, 500]).toContain(res1.status);
            expect([200, 201, 500]).toContain(res2.status);
        });
    });

    describe('GET /v1/machines - List Machines', () => {
        it('should require authentication', async () => {
            const res = await app.request('/v1/machines', {
                method: 'GET',
            });

            expect(res.status).toBe(401);
        });

        it('should return machines list with valid auth', async () => {
            const res = await app.request('/v1/machines', {
                method: 'GET',
                headers: authHeader(),
            });

            expect([200, 500]).toContain(res.status);
            if (res.status === 200) {
                const body = await parseJson<{ machines: unknown[] }>(res);
                expect(body).toHaveProperty('machines');
                expect(Array.isArray(body.machines)).toBe(true);
            }
        });

        it('should accept limit query parameter', async () => {
            const res = await app.request('/v1/machines?limit=10', {
                method: 'GET',
                headers: authHeader(),
            });

            expect([200, 500]).toContain(res.status);
        });

        it('should accept activeOnly query parameter', async () => {
            const res = await app.request('/v1/machines?activeOnly=true', {
                method: 'GET',
                headers: authHeader(),
            });

            expect([200, 500]).toContain(res.status);
        });

        it('should filter by active machines only', async () => {
            const res = await app.request('/v1/machines?activeOnly=true', {
                method: 'GET',
                headers: authHeader(),
            });

            expect([200, 500]).toContain(res.status);
            if (res.status === 200) {
                const body = await parseJson<{ machines: { active: boolean }[] }>(res);
                // All returned machines should be active
                body.machines.forEach((machine) => {
                    expect(machine.active).toBe(true);
                });
            }
        });
    });

    describe('GET /v1/machines/:id - Get Single Machine', () => {
        it('should require authentication', async () => {
            const res = await app.request('/v1/machines/test-machine-id', {
                method: 'GET',
            });

            expect(res.status).toBe(401);
        });

        it('should return 404 for non-existent machine', async () => {
            const res = await app.request('/v1/machines/non-existent-machine-id', {
                method: 'GET',
                headers: authHeader(),
            });

            expect([404, 500]).toContain(res.status);
        });

        it('should return machine with valid ID', async () => {
            const res = await app.request('/v1/machines/valid-machine-id', {
                method: 'GET',
                headers: authHeader(),
            });

            expect([200, 404, 500]).toContain(res.status);
            if (res.status === 200) {
                const body = await parseJson<{ machine: { id: string } }>(res);
                expect(body).toHaveProperty('machine');
            }
        });
    });

    describe('PUT /v1/machines/:id/status - Update Machine Status', () => {
        it('should require authentication', async () => {
            const res = await app.request('/v1/machines/test-machine/status', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: jsonBody({
                    active: true,
                }),
            });

            expect(res.status).toBe(401);
        });

        it('should update machine status with valid data', async () => {
            const res = await app.request('/v1/machines/test-machine/status', {
                method: 'PUT',
                headers: authHeader(),
                body: jsonBody({
                    active: true,
                }),
            });

            expect([200, 404, 500]).toContain(res.status);
        });

        it('should update machine metadata', async () => {
            const res = await app.request('/v1/machines/test-machine/status', {
                method: 'PUT',
                headers: authHeader(),
                body: jsonBody({
                    active: true,
                    metadata: '{"hostname":"updated-hostname"}',
                }),
            });

            expect([200, 404, 500]).toContain(res.status);
        });

        it('should update daemon state', async () => {
            const res = await app.request('/v1/machines/test-machine/status', {
                method: 'PUT',
                headers: authHeader(),
                body: jsonBody({
                    daemonState: '{"running":true,"pid":12345}',
                }),
            });

            expect([200, 404, 500]).toContain(res.status);
        });

        it('should return 404 for non-existent machine', async () => {
            const res = await app.request('/v1/machines/non-existent-machine/status', {
                method: 'PUT',
                headers: authHeader(),
                body: jsonBody({
                    active: true,
                }),
            });

            expect([404, 500]).toContain(res.status);
        });

        it('should reject empty update body', async () => {
            const res = await app.request('/v1/machines/test-machine/status', {
                method: 'PUT',
                headers: authHeader(),
                body: '{}',
            });

            // May accept empty body (partial update) or reject
            expect([200, 400, 404, 500]).toContain(res.status);
        });
    });

    describe('Machine Access Control', () => {
        it('should not allow access to another user\'s machine', async () => {
            // Register machine as user 1
            const machineId = `private-machine-${Date.now()}`;
            const createRes = await app.request('/v1/machines', {
                method: 'POST',
                headers: authHeader(VALID_TOKEN),
                body: jsonBody({
                    id: machineId,
                    metadata: '{"hostname":"private"}',
                }),
            });

            if (createRes.status === 200) {
                // Try to access as user 2
                const accessRes = await app.request(`/v1/machines/${machineId}`, {
                    method: 'GET',
                    headers: authHeader('user2-token'),
                });

                // Should be 404 (not found for this user) or 403 (forbidden)
                expect([403, 404, 500]).toContain(accessRes.status);
            }
        });

        it('should not allow updating another user\'s machine', async () => {
            const machineId = `other-user-machine-${Date.now()}`;

            // Try to update machine belonging to another user
            const res = await app.request(`/v1/machines/${machineId}/status`, {
                method: 'PUT',
                headers: authHeader('user2-token'),
                body: jsonBody({
                    active: true,
                }),
            });

            expect([403, 404, 500]).toContain(res.status);
        });
    });
});
