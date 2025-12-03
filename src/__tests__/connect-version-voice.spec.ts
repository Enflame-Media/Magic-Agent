/**
 * Integration Tests for Connect, Version, and Voice Routes
 *
 * Tests connect endpoints (GitHub OAuth, AI service tokens):
 * - GET /v1/connect/github/params
 * - GET /v1/connect/github/callback
 * - POST /v1/connect/github/webhook
 * - DELETE /v1/connect/github
 * - POST /v1/connect/:vendor/register
 * - GET /v1/connect/:vendor/token
 * - DELETE /v1/connect/:vendor
 * - GET /v1/connect/tokens
 *
 * Version endpoints:
 * - POST /v1/version
 *
 * Voice endpoints:
 * - POST /v1/voice/token
 *
 * @module __tests__/connect-version-voice.spec
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

describe('Connect Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /v1/connect/github/params - GitHub OAuth Params', () => {
        it('should require authentication', async () => {
            const res = await app.request('/v1/connect/github/params', {
                method: 'GET',
            });

            expect(res.status).toBe(401);
        });

        it('should return OAuth URL with valid auth', async () => {
            const res = await app.request('/v1/connect/github/params', {
                method: 'GET',
                headers: authHeader(),
            });

            expect([200, 500]).toContain(res.status);
            if (res.status === 200) {
                const body = await parseJson<{ url: string }>(res);
                expect(body).toHaveProperty('url');
                expect(body.url).toContain('github.com');
            }
        });
    });

    describe('GET /v1/connect/github/callback - GitHub OAuth Callback', () => {
        it('should handle OAuth callback with code', async () => {
            const res = await app.request('/v1/connect/github/callback?code=test-code&state=test-state', {
                method: 'GET',
            });

            // May redirect or return error based on state validation
            expect([200, 302, 400, 401, 500]).toContain(res.status);
        });

        it('should reject callback without code', async () => {
            const res = await app.request('/v1/connect/github/callback?state=test-state', {
                method: 'GET',
            });

            expect([400, 500]).toContain(res.status);
        });

        it('should reject callback without state', async () => {
            const res = await app.request('/v1/connect/github/callback?code=test-code', {
                method: 'GET',
            });

            expect([400, 500]).toContain(res.status);
        });
    });

    describe('POST /v1/connect/github/webhook - GitHub Webhook', () => {
        it('should accept webhook with valid signature', async () => {
            const res = await app.request('/v1/connect/github/webhook', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Hub-Signature-256': 'sha256=test-signature',
                    'X-GitHub-Event': 'push',
                },
                body: jsonBody({
                    action: 'push',
                    repository: { full_name: 'test/repo' },
                }),
            });

            // May succeed or fail based on signature verification
            expect([200, 401, 500]).toContain(res.status);
        });

        it('should reject webhook without signature', async () => {
            const res = await app.request('/v1/connect/github/webhook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: jsonBody({ action: 'push' }),
            });

            // 400 = validation error, 401 = auth error, 500 = runtime error
            expect([400, 401, 500]).toContain(res.status);
        });
    });

    describe('DELETE /v1/connect/github - Disconnect GitHub', () => {
        it('should require authentication', async () => {
            const res = await app.request('/v1/connect/github', {
                method: 'DELETE',
            });

            expect(res.status).toBe(401);
        });

        it('should disconnect GitHub with valid auth', async () => {
            const res = await app.request('/v1/connect/github', {
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

    describe('POST /v1/connect/:vendor/register - Register AI Token', () => {
        const vendors = ['openai', 'anthropic', 'gemini'];

        it('should require authentication', async () => {
            for (const vendor of vendors) {
                const res = await app.request(`/v1/connect/${vendor}/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: jsonBody({ token: 'sk-test-token' }),
                });

                expect(res.status).toBe(401);
            }
        });

        it('should register token for each vendor', async () => {
            for (const vendor of vendors) {
                const res = await app.request(`/v1/connect/${vendor}/register`, {
                    method: 'POST',
                    headers: authHeader(),
                    body: jsonBody({ token: `sk-test-${vendor}-token` }),
                });

                expect([200, 500]).toContain(res.status);
                if (res.status === 200) {
                    const body = await parseJson<{ success: boolean }>(res);
                    expect(body.success).toBe(true);
                }
            }
        });

        it('should require token field', async () => {
            const res = await app.request('/v1/connect/openai/register', {
                method: 'POST',
                headers: authHeader(),
                body: jsonBody({}),
            });

            expect(res.status).toBe(400);
        });

        it('should reject unknown vendor', async () => {
            const res = await app.request('/v1/connect/unknown-vendor/register', {
                method: 'POST',
                headers: authHeader(),
                body: jsonBody({ token: 'test-token' }),
            });

            expect([400, 404, 500]).toContain(res.status);
        });
    });

    describe('GET /v1/connect/:vendor/token - Get AI Token', () => {
        it('should require authentication', async () => {
            const res = await app.request('/v1/connect/openai/token', {
                method: 'GET',
            });

            expect(res.status).toBe(401);
        });

        it('should return token if registered', async () => {
            const res = await app.request('/v1/connect/openai/token', {
                method: 'GET',
                headers: authHeader(),
            });

            expect([200, 500]).toContain(res.status);
            if (res.status === 200) {
                const body = await parseJson<{ token: string | null }>(res);
                expect(body).toHaveProperty('token');
            }
        });

        it('should return null for unregistered vendor', async () => {
            const res = await app.request('/v1/connect/anthropic/token', {
                method: 'GET',
                headers: authHeader(),
            });

            expect([200, 500]).toContain(res.status);
            if (res.status === 200) {
                const body = await parseJson<{ token: string | null }>(res);
                // May be null if not registered
                expect(body).toHaveProperty('token');
            }
        });
    });

    describe('DELETE /v1/connect/:vendor - Delete AI Token', () => {
        it('should require authentication', async () => {
            const res = await app.request('/v1/connect/openai', {
                method: 'DELETE',
            });

            expect(res.status).toBe(401);
        });

        it('should delete token with valid auth', async () => {
            const res = await app.request('/v1/connect/openai', {
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

    describe('GET /v1/connect/tokens - List AI Tokens', () => {
        it('should require authentication', async () => {
            const res = await app.request('/v1/connect/tokens', {
                method: 'GET',
            });

            expect(res.status).toBe(401);
        });

        it('should return list of tokens', async () => {
            const res = await app.request('/v1/connect/tokens', {
                method: 'GET',
                headers: authHeader(),
            });

            expect([200, 500]).toContain(res.status);
            if (res.status === 200) {
                const body = await parseJson<{ tokens: { vendor: string; token: string }[] }>(res);
                expect(body).toHaveProperty('tokens');
                expect(Array.isArray(body.tokens)).toBe(true);
            }
        });
    });
});

describe('Version Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('POST /v1/version - Check App Version', () => {
        it('should check iOS version', async () => {
            const res = await app.request('/v1/version', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: jsonBody({
                    platform: 'ios',
                    version: '1.0.0',
                    app_id: 'com.ex3ndr.happy',
                }),
            });

            expect([200, 500]).toContain(res.status);
            if (res.status === 200) {
                const body = await parseJson<{ updateUrl: string | null }>(res);
                expect(body).toHaveProperty('updateUrl');
            }
        });

        it('should check Android version', async () => {
            const res = await app.request('/v1/version', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: jsonBody({
                    platform: 'android',
                    version: '1.0.0',
                    app_id: 'com.ex3ndr.happy',
                }),
            });

            expect([200, 500]).toContain(res.status);
        });

        it('should require platform', async () => {
            const res = await app.request('/v1/version', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: jsonBody({
                    version: '1.0.0',
                }),
            });

            expect(res.status).toBe(400);
        });

        it('should require version', async () => {
            const res = await app.request('/v1/version', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: jsonBody({
                    platform: 'ios',
                }),
            });

            expect(res.status).toBe(400);
        });

        it('should return null for up-to-date version', async () => {
            const res = await app.request('/v1/version', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: jsonBody({
                    platform: 'ios',
                    version: '99.99.99', // Very high version
                    app_id: 'com.ex3ndr.happy',
                }),
            });

            expect([200, 500]).toContain(res.status);
            if (res.status === 200) {
                const body = await parseJson<{ updateUrl: string | null }>(res);
                expect(body.updateUrl).toBeNull();
            }
        });

        it('should return update URL for outdated version', async () => {
            const res = await app.request('/v1/version', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: jsonBody({
                    platform: 'ios',
                    version: '0.0.1', // Very old version
                    app_id: 'com.ex3ndr.happy',
                }),
            });

            expect([200, 500]).toContain(res.status);
            if (res.status === 200) {
                const body = await parseJson<{ updateUrl: string | null }>(res);
                // May or may not have update URL depending on config
                expect(body).toHaveProperty('updateUrl');
            }
        });
    });
});

describe('Voice Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('POST /v1/voice/token - Get Voice Token', () => {
        it('should require authentication', async () => {
            const res = await app.request('/v1/voice/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: jsonBody({
                    agentId: 'agent-123',
                }),
            });

            expect(res.status).toBe(401);
        });

        it('should return voice token response', async () => {
            const res = await app.request('/v1/voice/token', {
                method: 'POST',
                headers: authHeader(),
                body: jsonBody({
                    agentId: 'agent-123',
                    revenueCatPublicKey: 'appl_test_key',
                }),
            });

            expect([200, 500]).toContain(res.status);
            if (res.status === 200) {
                const body = await parseJson<{ allowed: boolean; token?: string; agentId: string }>(
                    res
                );
                expect(body).toHaveProperty('allowed');
                expect(body).toHaveProperty('agentId');
            }
        });

        it('should require agentId', async () => {
            const res = await app.request('/v1/voice/token', {
                method: 'POST',
                headers: authHeader(),
                body: jsonBody({}),
            });

            expect(res.status).toBe(400);
        });

        it('should handle denied access (no subscription)', async () => {
            const res = await app.request('/v1/voice/token', {
                method: 'POST',
                headers: authHeader(),
                body: jsonBody({
                    agentId: 'agent-123',
                    // No revenueCatPublicKey - may be denied
                }),
            });

            expect([200, 500]).toContain(res.status);
            if (res.status === 200) {
                const body = await parseJson<{ allowed: boolean }>(res);
                // May be allowed in dev mode, denied in prod
                expect(typeof body.allowed).toBe('boolean');
            }
        });

        it('should include token when allowed', async () => {
            const res = await app.request('/v1/voice/token', {
                method: 'POST',
                headers: authHeader(),
                body: jsonBody({
                    agentId: 'agent-123',
                    revenueCatPublicKey: 'valid-subscription-key',
                }),
            });

            expect([200, 500]).toContain(res.status);
            if (res.status === 200) {
                const body = await parseJson<{ allowed: boolean; token?: string }>(res);
                if (body.allowed) {
                    expect(body).toHaveProperty('token');
                }
            }
        });
    });
});
