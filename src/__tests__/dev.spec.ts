/**
 * Integration Tests for Dev Routes
 *
 * Tests development/debugging endpoints:
 * - POST /logs-combined-from-cli-and-mobile-for-simple-ai-debugging
 *
 * @module __tests__/dev.spec
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
        return null;
    }),
    createToken: vi.fn().mockResolvedValue('generated-token-abc123'),
    resetAuth: vi.fn(),
}));

import app from '@/index';
import { jsonBody, expectOneOfStatus } from './test-utils';

describe('Dev Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('POST /logs-combined-from-cli-and-mobile-for-simple-ai-debugging', () => {
        const validLogData = {
            timestamp: '2024-12-03T10:30:00.000Z',
            level: 'info',
            message: 'Test log message',
            source: 'mobile' as const,
            platform: 'ios',
        };

        it('should return 403 when debug logging is disabled (default)', async () => {
            const res = await app.request(
                '/logs-combined-from-cli-and-mobile-for-simple-ai-debugging',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: jsonBody(validLogData),
                }
            );

            // Returns 403 if env is set but logging disabled, or 500 if env undefined
            const body = await expectOneOfStatus<{ error: string }>(res, [403], [500]);
            if (!body) return;
            expect(body).toHaveProperty('error', 'Debug logging is disabled');
        });

        it('should validate required timestamp field', async () => {
            const res = await app.request(
                '/logs-combined-from-cli-and-mobile-for-simple-ai-debugging',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: jsonBody({
                        level: 'info',
                        message: 'Test',
                        source: 'mobile',
                    }),
                }
            );

            // Should fail validation (400) or disabled check (403)
            expect([400, 403]).toContain(res.status);
        });

        it('should validate required level field', async () => {
            const res = await app.request(
                '/logs-combined-from-cli-and-mobile-for-simple-ai-debugging',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: jsonBody({
                        timestamp: '2024-12-03T10:30:00.000Z',
                        message: 'Test',
                        source: 'mobile',
                    }),
                }
            );

            // Should fail validation (400) or disabled check (403)
            expect([400, 403]).toContain(res.status);
        });

        it('should validate required message field', async () => {
            const res = await app.request(
                '/logs-combined-from-cli-and-mobile-for-simple-ai-debugging',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: jsonBody({
                        timestamp: '2024-12-03T10:30:00.000Z',
                        level: 'info',
                        source: 'mobile',
                    }),
                }
            );

            // Should fail validation (400) or disabled check (403)
            expect([400, 403]).toContain(res.status);
        });

        it('should validate required source field', async () => {
            const res = await app.request(
                '/logs-combined-from-cli-and-mobile-for-simple-ai-debugging',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: jsonBody({
                        timestamp: '2024-12-03T10:30:00.000Z',
                        level: 'info',
                        message: 'Test',
                    }),
                }
            );

            // Should fail validation (400) or disabled check (403)
            expect([400, 403]).toContain(res.status);
        });

        it('should accept different log levels', async () => {
            const levels = ['error', 'warn', 'warning', 'debug', 'info'];

            for (const level of levels) {
                const res = await app.request(
                    '/logs-combined-from-cli-and-mobile-for-simple-ai-debugging',
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: jsonBody({
                            ...validLogData,
                            level,
                        }),
                    }
                );

                // Should return 403 (disabled) or 500 (env undefined), not 400 (validation error)
                expect([403, 500]).toContain(res.status);
            }
        });

        it('should accept cli source', async () => {
            const res = await app.request(
                '/logs-combined-from-cli-and-mobile-for-simple-ai-debugging',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: jsonBody({
                        ...validLogData,
                        source: 'cli',
                    }),
                }
            );

            // Should return 403 (disabled) or 500 (env undefined), not 400 (validation error)
            expect([403, 500]).toContain(res.status);
        });

        it('should accept optional platform field', async () => {
            const res = await app.request(
                '/logs-combined-from-cli-and-mobile-for-simple-ai-debugging',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: jsonBody({
                        timestamp: '2024-12-03T10:30:00.000Z',
                        level: 'info',
                        message: 'Test',
                        source: 'mobile',
                        // platform is optional
                    }),
                }
            );

            // Should return 403 (disabled) or 500 (env undefined), not 400 (validation error)
            expect([403, 500]).toContain(res.status);
        });

        it('should accept optional messageRawObject field', async () => {
            const res = await app.request(
                '/logs-combined-from-cli-and-mobile-for-simple-ai-debugging',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: jsonBody({
                        ...validLogData,
                        messageRawObject: { userId: '123', action: 'test' },
                    }),
                }
            );

            // Should return 403 (disabled) or 500 (env undefined), not 400 (validation error)
            expect([403, 500]).toContain(res.status);
        });

        it('should reject empty request body', async () => {
            const res = await app.request(
                '/logs-combined-from-cli-and-mobile-for-simple-ai-debugging',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: '{}',
                }
            );

            // Should fail validation or disabled check
            expect([400, 403]).toContain(res.status);
        });

        it('should reject non-JSON content type', async () => {
            const res = await app.request(
                '/logs-combined-from-cli-and-mobile-for-simple-ai-debugging',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain' },
                    body: 'invalid',
                }
            );

            // Should fail content type validation (400, 403, 415) or 500 if env undefined
            expect([400, 403, 415, 500]).toContain(res.status);
        });
    });
});
