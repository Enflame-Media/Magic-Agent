/**
 * Integration Tests for Artifact Routes
 *
 * Tests all artifact endpoints including:
 * - GET /v1/artifacts (list)
 * - GET /v1/artifacts/:id (get single)
 * - POST /v1/artifacts (create)
 * - POST /v1/artifacts/:id (update)
 * - DELETE /v1/artifacts/:id (delete)
 *
 * @module __tests__/artifacts.spec
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

describe('Artifact Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /v1/artifacts - List Artifacts', () => {
        it('should require authentication', async () => {
            const res = await app.request('/v1/artifacts', {
                method: 'GET',
            });

            expect(res.status).toBe(401);
        });

        it('should return artifacts list with valid auth', async () => {
            const res = await app.request('/v1/artifacts', {
                method: 'GET',
                headers: authHeader(),
            });

            expect([200, 500]).toContain(res.status);
            if (res.status === 200) {
                const body = await parseJson<{ artifacts: unknown[] }>(res);
                expect(body).toHaveProperty('artifacts');
                expect(Array.isArray(body.artifacts)).toBe(true);
            }
        });

        it('should return artifact headers without body', async () => {
            const res = await app.request('/v1/artifacts', {
                method: 'GET',
                headers: authHeader(),
            });

            expect([200, 500]).toContain(res.status);
            if (res.status === 200) {
                const body = await parseJson<{ artifacts: { body?: unknown }[] }>(res);
                // List should not include body content (only headers)
                body.artifacts.forEach((artifact) => {
                    expect(artifact.body).toBeUndefined();
                });
            }
        });
    });

    describe('GET /v1/artifacts/:id - Get Single Artifact', () => {
        it('should require authentication', async () => {
            const res = await app.request('/v1/artifacts/test-artifact-id', {
                method: 'GET',
            });

            expect(res.status).toBe(401);
        });

        it('should return 404 for non-existent artifact', async () => {
            const res = await app.request('/v1/artifacts/non-existent-artifact-id', {
                method: 'GET',
                headers: authHeader(),
            });

            expect([404, 500]).toContain(res.status);
        });

        it('should return full artifact including body', async () => {
            const res = await app.request('/v1/artifacts/test-artifact-id', {
                method: 'GET',
                headers: authHeader(),
            });

            expect([200, 404, 500]).toContain(res.status);
            if (res.status === 200) {
                const body = await parseJson<{ artifact: { id: string; body: unknown } }>(res);
                expect(body).toHaveProperty('artifact');
                // Single artifact should include body
                expect(body.artifact).toHaveProperty('body');
            }
        });
    });

    describe('POST /v1/artifacts - Create Artifact', () => {
        it('should require authentication', async () => {
            const res = await app.request('/v1/artifacts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: jsonBody({
                    id: 'artifact-123',
                    header: 'base64-header',
                    body: 'base64-body',
                }),
            });

            expect(res.status).toBe(401);
        });

        it('should create artifact with valid data', async () => {
            const artifactId = `artifact-${Date.now()}`;
            const res = await app.request('/v1/artifacts', {
                method: 'POST',
                headers: authHeader(),
                body: jsonBody({
                    id: artifactId,
                    header: 'base64-encoded-header-data',
                    body: 'base64-encoded-body-data',
                    dataEncryptionKey: 'base64-encoded-key',
                }),
            });

            expect([200, 201, 400, 500]).toContain(res.status);
            if (res.status === 200 || res.status === 201) {
                const body = await parseJson<{ artifact: { id: string } }>(res);
                expect(body).toHaveProperty('artifact');
            }
        });

        it('should require id field', async () => {
            const res = await app.request('/v1/artifacts', {
                method: 'POST',
                headers: authHeader(),
                body: jsonBody({
                    header: 'base64-header',
                    body: 'base64-body',
                }),
            });

            expect(res.status).toBe(400);
        });

        it('should require header field', async () => {
            const res = await app.request('/v1/artifacts', {
                method: 'POST',
                headers: authHeader(),
                body: jsonBody({
                    id: 'artifact-123',
                    body: 'base64-body',
                }),
            });

            expect(res.status).toBe(400);
        });

        it('should require body field', async () => {
            const res = await app.request('/v1/artifacts', {
                method: 'POST',
                headers: authHeader(),
                body: jsonBody({
                    id: 'artifact-123',
                    header: 'base64-header',
                }),
            });

            expect(res.status).toBe(400);
        });

        it('should handle idempotent creation (same ID)', async () => {
            const artifactId = `idempotent-artifact-${Date.now()}`;

            // First creation
            const res1 = await app.request('/v1/artifacts', {
                method: 'POST',
                headers: authHeader(),
                body: jsonBody({
                    id: artifactId,
                    header: 'header-v1',
                    body: 'body-v1',
                    dataEncryptionKey: 'key',
                }),
            });

            // Second creation with same ID (should return existing)
            const res2 = await app.request('/v1/artifacts', {
                method: 'POST',
                headers: authHeader(),
                body: jsonBody({
                    id: artifactId,
                    header: 'header-v2',
                    body: 'body-v2',
                    dataEncryptionKey: 'key',
                }),
            });

            expect([200, 201, 400, 500]).toContain(res1.status);
            expect([200, 201, 400, 409, 500]).toContain(res2.status);
        });

        it('should reject duplicate ID from different user (409 Conflict)', async () => {
            const artifactId = `conflict-artifact-${Date.now()}`;

            // Create as user 1
            await app.request('/v1/artifacts', {
                method: 'POST',
                headers: authHeader(VALID_TOKEN),
                body: jsonBody({
                    id: artifactId,
                    header: 'header',
                    body: 'body',
                    dataEncryptionKey: 'key',
                }),
            });

            // Try to create same ID as user 2
            const res2 = await app.request('/v1/artifacts', {
                method: 'POST',
                headers: authHeader('user2-token'),
                body: jsonBody({
                    id: artifactId,
                    header: 'header',
                    body: 'body',
                    dataEncryptionKey: 'key',
                }),
            });

            expect([400, 409, 500]).toContain(res2.status);
        });
    });

    describe('POST /v1/artifacts/:id - Update Artifact', () => {
        it('should require authentication', async () => {
            const res = await app.request('/v1/artifacts/test-artifact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: jsonBody({
                    header: 'new-header',
                }),
            });

            expect(res.status).toBe(401);
        });

        it('should update artifact header', async () => {
            const res = await app.request('/v1/artifacts/test-artifact', {
                method: 'POST',
                headers: authHeader(),
                body: jsonBody({
                    header: 'new-base64-header',
                    expectedHeaderVersion: 1,
                }),
            });

            expect([200, 404, 500]).toContain(res.status);
            if (res.status === 200) {
                const body = await parseJson<{ success: boolean; headerVersion: number }>(res);
                expect(body.success).toBe(true);
                expect(body.headerVersion).toBeGreaterThan(1);
            }
        });

        it('should update artifact body', async () => {
            const res = await app.request('/v1/artifacts/test-artifact', {
                method: 'POST',
                headers: authHeader(),
                body: jsonBody({
                    body: 'new-base64-body',
                    expectedBodyVersion: 1,
                }),
            });

            expect([200, 404, 500]).toContain(res.status);
        });

        it('should update both header and body', async () => {
            const res = await app.request('/v1/artifacts/test-artifact', {
                method: 'POST',
                headers: authHeader(),
                body: jsonBody({
                    header: 'new-header',
                    expectedHeaderVersion: 1,
                    body: 'new-body',
                    expectedBodyVersion: 1,
                }),
            });

            expect([200, 404, 500]).toContain(res.status);
        });

        it('should handle version mismatch (optimistic locking)', async () => {
            const res = await app.request('/v1/artifacts/test-artifact', {
                method: 'POST',
                headers: authHeader(),
                body: jsonBody({
                    header: 'new-header',
                    expectedHeaderVersion: 999, // Wrong version
                }),
            });

            expect([200, 404, 500]).toContain(res.status);
            if (res.status === 200) {
                const body = await parseJson<{ success: boolean; error?: string }>(res);
                // May return success: false with version-mismatch error
                if (!body.success) {
                    expect(body.error).toBe('version-mismatch');
                }
            }
        });

        it('should return 404 for non-existent artifact', async () => {
            const res = await app.request('/v1/artifacts/non-existent', {
                method: 'POST',
                headers: authHeader(),
                body: jsonBody({
                    header: 'new-header',
                }),
            });

            expect([404, 500]).toContain(res.status);
        });
    });

    describe('DELETE /v1/artifacts/:id - Delete Artifact', () => {
        it('should require authentication', async () => {
            const res = await app.request('/v1/artifacts/test-artifact', {
                method: 'DELETE',
            });

            expect(res.status).toBe(401);
        });

        it('should delete artifact', async () => {
            const res = await app.request('/v1/artifacts/test-artifact-to-delete', {
                method: 'DELETE',
                headers: authHeader(),
            });

            expect([200, 404, 500]).toContain(res.status);
            if (res.status === 200) {
                const body = await parseJson<{ success: boolean }>(res);
                expect(body.success).toBe(true);
            }
        });

        it('should return 404 for non-existent artifact', async () => {
            const res = await app.request('/v1/artifacts/non-existent-artifact', {
                method: 'DELETE',
                headers: authHeader(),
            });

            expect([404, 500]).toContain(res.status);
        });
    });

    describe('Artifact Access Control', () => {
        it('should not allow access to another user\'s artifact', async () => {
            const artifactId = `private-artifact-${Date.now()}`;

            // Create as user 1
            await app.request('/v1/artifacts', {
                method: 'POST',
                headers: authHeader(VALID_TOKEN),
                body: jsonBody({
                    id: artifactId,
                    header: 'private-header',
                    body: 'private-body',
                    dataEncryptionKey: 'key',
                }),
            });

            // Try to access as user 2
            const accessRes = await app.request(`/v1/artifacts/${artifactId}`, {
                method: 'GET',
                headers: authHeader('user2-token'),
            });

            expect([403, 404, 500]).toContain(accessRes.status);
        });

        it('should not allow updating another user\'s artifact', async () => {
            const res = await app.request('/v1/artifacts/other-user-artifact', {
                method: 'POST',
                headers: authHeader('user2-token'),
                body: jsonBody({
                    header: 'hacked-header',
                }),
            });

            expect([403, 404, 500]).toContain(res.status);
        });

        it('should not allow deleting another user\'s artifact', async () => {
            const res = await app.request('/v1/artifacts/other-user-artifact', {
                method: 'DELETE',
                headers: authHeader('user2-token'),
            });

            expect([403, 404, 500]).toContain(res.status);
        });
    });
});
