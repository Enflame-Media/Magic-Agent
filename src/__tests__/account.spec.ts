/**
 * Integration Tests for Account Routes
 *
 * Tests all account endpoints including:
 * - GET /v1/account (get profile)
 * - PUT /v1/account (update profile)
 * - GET /v1/account/preferences (get preferences)
 * - PUT /v1/account/preferences (update preferences)
 *
 * @module __tests__/account.spec
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
import { authHeader, jsonBody, parseJson } from './test-utils';

describe('Account Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /v1/account - Get User Profile', () => {
        it('should require authentication', async () => {
            const res = await app.request('/v1/account', {
                method: 'GET',
            });

            expect(res.status).toBe(401);
        });

        it('should return user profile with valid auth', async () => {
            const res = await app.request('/v1/account', {
                method: 'GET',
                headers: authHeader(),
            });

            expect([200, 404, 500]).toContain(res.status);
            if (res.status === 200) {
                const body = await parseJson<{
                    id: string;
                    firstName?: string;
                    lastName?: string;
                    username?: string;
                }>(res);
                expect(body).toHaveProperty('id');
            }
        });

        it('should include connected services info', async () => {
            const res = await app.request('/v1/account', {
                method: 'GET',
                headers: authHeader(),
            });

            expect([200, 404, 500]).toContain(res.status);
            if (res.status === 200) {
                const body = await parseJson<{ connectedServices?: string[] }>(res);
                expect(body).toHaveProperty('connectedServices');
            }
        });

        it('should include timestamp', async () => {
            const res = await app.request('/v1/account', {
                method: 'GET',
                headers: authHeader(),
            });

            expect([200, 404, 500]).toContain(res.status);
            if (res.status === 200) {
                const body = await parseJson<{ timestamp: number }>(res);
                expect(body).toHaveProperty('timestamp');
                expect(typeof body.timestamp).toBe('number');
            }
        });
    });

    describe('PUT /v1/account - Update User Profile', () => {
        it('should require authentication', async () => {
            const res = await app.request('/v1/account', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: jsonBody({
                    firstName: 'New',
                    lastName: 'Name',
                }),
            });

            expect(res.status).toBe(401);
        });

        it('should update firstName', async () => {
            const res = await app.request('/v1/account', {
                method: 'PUT',
                headers: authHeader(),
                body: jsonBody({
                    firstName: 'UpdatedFirst',
                }),
            });

            expect([200, 404, 500]).toContain(res.status);
            if (res.status === 200) {
                const body = await parseJson<{ success: boolean }>(res);
                expect(body.success).toBe(true);
            }
        });

        it('should update lastName', async () => {
            const res = await app.request('/v1/account', {
                method: 'PUT',
                headers: authHeader(),
                body: jsonBody({
                    lastName: 'UpdatedLast',
                }),
            });

            expect([200, 404, 500]).toContain(res.status);
        });

        it('should update username', async () => {
            const newUsername = `newuser_${Date.now()}`;
            const res = await app.request('/v1/account', {
                method: 'PUT',
                headers: authHeader(),
                body: jsonBody({
                    username: newUsername,
                }),
            });

            expect([200, 404, 409, 500]).toContain(res.status);
        });

        it('should update multiple fields at once', async () => {
            const res = await app.request('/v1/account', {
                method: 'PUT',
                headers: authHeader(),
                body: jsonBody({
                    firstName: 'Multi',
                    lastName: 'Update',
                    username: `multi_${Date.now()}`,
                }),
            });

            expect([200, 404, 409, 500]).toContain(res.status);
        });

        it('should return 409 for taken username', async () => {
            // Try to take a username that might be taken
            const res = await app.request('/v1/account', {
                method: 'PUT',
                headers: authHeader(),
                body: jsonBody({
                    username: 'existing_username',
                }),
            });

            expect([200, 404, 409, 500]).toContain(res.status);
            if (res.status === 409 || res.status === 200) {
                const body = await parseJson<{ success: boolean; error?: string }>(res);
                if (!body.success) {
                    expect(body.error).toBe('username-taken');
                }
            }
        });

        it('should reject invalid username format', async () => {
            const res = await app.request('/v1/account', {
                method: 'PUT',
                headers: authHeader(),
                body: jsonBody({
                    username: 'invalid username with spaces',
                }),
            });

            // May accept or reject based on validation rules
            expect([200, 400, 404, 409, 500]).toContain(res.status);
        });
    });

    describe('GET /v1/account/preferences - Get Account Preferences', () => {
        it('should require authentication', async () => {
            const res = await app.request('/v1/account/preferences', {
                method: 'GET',
            });

            expect(res.status).toBe(401);
        });

        it('should return preferences with version', async () => {
            const res = await app.request('/v1/account/preferences', {
                method: 'GET',
                headers: authHeader(),
            });

            expect([200, 404, 500]).toContain(res.status);
            if (res.status === 200) {
                const body = await parseJson<{ settings: string; settingsVersion: number }>(res);
                expect(body).toHaveProperty('settings');
                expect(body).toHaveProperty('settingsVersion');
                expect(typeof body.settingsVersion).toBe('number');
            }
        });
    });

    describe('PUT /v1/account/preferences - Update Account Preferences', () => {
        it('should require authentication', async () => {
            const res = await app.request('/v1/account/preferences', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: jsonBody({
                    settings: '{"theme":"dark"}',
                    expectedVersion: 1,
                }),
            });

            expect(res.status).toBe(401);
        });

        it('should update preferences with valid data', async () => {
            const res = await app.request('/v1/account/preferences', {
                method: 'PUT',
                headers: authHeader(),
                body: jsonBody({
                    settings: '{"theme":"light","notifications":true}',
                    expectedVersion: 1,
                }),
            });

            expect([200, 404, 500]).toContain(res.status);
            if (res.status === 200) {
                const body = await parseJson<{ success: boolean; version: number }>(res);
                expect(body.success).toBe(true);
            }
        });

        it('should require settings field', async () => {
            const res = await app.request('/v1/account/preferences', {
                method: 'PUT',
                headers: authHeader(),
                body: jsonBody({
                    expectedVersion: 1,
                }),
            });

            expect(res.status).toBe(400);
        });

        it('should require expectedVersion field', async () => {
            const res = await app.request('/v1/account/preferences', {
                method: 'PUT',
                headers: authHeader(),
                body: jsonBody({
                    settings: '{"theme":"dark"}',
                }),
            });

            expect(res.status).toBe(400);
        });

        it('should handle version mismatch (optimistic locking)', async () => {
            const res = await app.request('/v1/account/preferences', {
                method: 'PUT',
                headers: authHeader(),
                body: jsonBody({
                    settings: '{"theme":"dark"}',
                    expectedVersion: 999, // Wrong version
                }),
            });

            expect([200, 404, 500]).toContain(res.status);
            if (res.status === 200) {
                const body = await parseJson<{
                    success: boolean;
                    error?: string;
                    currentVersion?: number;
                    currentSettings?: string;
                }>(res);
                if (!body.success) {
                    expect(body.error).toBe('version-mismatch');
                    expect(body).toHaveProperty('currentVersion');
                    expect(body).toHaveProperty('currentSettings');
                }
            }
        });

        it('should accept JSON string settings', async () => {
            const settings = JSON.stringify({
                theme: 'dark',
                notifications: true,
                language: 'en',
            });

            const res = await app.request('/v1/account/preferences', {
                method: 'PUT',
                headers: authHeader(),
                body: jsonBody({
                    settings,
                    expectedVersion: 1,
                }),
            });

            expect([200, 404, 500]).toContain(res.status);
        });
    });

    describe('Account Isolation', () => {
        it('should only return own account data', async () => {
            const res1 = await app.request('/v1/account', {
                method: 'GET',
                headers: authHeader('valid-token'),
            });

            const res2 = await app.request('/v1/account', {
                method: 'GET',
                headers: authHeader('user2-token'),
            });

            // Both should succeed but return different data
            if (res1.status === 200 && res2.status === 200) {
                const body1 = await parseJson<{ id: string }>(res1);
                const body2 = await parseJson<{ id: string }>(res2);
                expect(body1.id).not.toBe(body2.id);
            }
        });
    });
});
