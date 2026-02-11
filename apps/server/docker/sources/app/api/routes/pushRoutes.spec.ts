import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestApp, authHeader, TEST_USER_ID, randomId } from './__test__/testUtils';
import { pushRoutes } from './pushRoutes';
import type { Fastify } from '../types';

// Mock database
vi.mock('@/storage/db', () => ({
    db: {
        accountPushToken: {
            upsert: vi.fn(),
            deleteMany: vi.fn(),
            findMany: vi.fn(),
        },
    },
}));

import { db } from '@/storage/db';

/**
 * Integration tests for pushRoutes
 *
 * Tests the push notification token management endpoints:
 * - POST /v1/push-tokens - Register new push token
 * - DELETE /v1/push-tokens/:token - Delete push token
 * - GET /v1/push-tokens - List user's push tokens
 *
 * Push tokens are used to send notifications to mobile devices.
 * Each user can have multiple tokens (multiple devices).
 */
describe('pushRoutes', () => {
    let app: Fastify;

    beforeEach(async () => {
        app = createTestApp();
        pushRoutes(app);
        await app.ready();
        vi.clearAllMocks();
    });

    afterEach(async () => {
        await app.close();
    });

    describe('POST /v1/push-tokens', () => {
        it('should register new push token', async () => {
            vi.mocked(db.accountPushToken.upsert).mockResolvedValue({
                id: 'pt-123',
                accountId: TEST_USER_ID,
                token: 'expo-push-token-abc123',
                createdAt: new Date(),
                updatedAt: new Date(),
            } as any);

            const response = await app.inject({
                method: 'POST',
                url: '/v1/push-tokens',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    token: 'expo-push-token-abc123'
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(true);
            expect(vi.mocked(db.accountPushToken.upsert)).toHaveBeenCalledWith({
                where: {
                    accountId_token: {
                        accountId: TEST_USER_ID,
                        token: 'expo-push-token-abc123'
                    }
                },
                update: {
                    updatedAt: expect.any(Date)
                },
                create: {
                    accountId: TEST_USER_ID,
                    token: 'expo-push-token-abc123'
                }
            });
        });

        it('should update timestamp for existing token (idempotent)', async () => {
            vi.mocked(db.accountPushToken.upsert).mockResolvedValue({
                id: 'pt-123',
                accountId: TEST_USER_ID,
                token: 'existing-token',
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date(),  // Updated now
            } as any);

            const response = await app.inject({
                method: 'POST',
                url: '/v1/push-tokens',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    token: 'existing-token'
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(true);
        });

        it('should return 500 on database error', async () => {
            vi.mocked(db.accountPushToken.upsert).mockRejectedValue(
                new Error('Database connection failed')
            );

            const response = await app.inject({
                method: 'POST',
                url: '/v1/push-tokens',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    token: 'some-token'
                }
            });

            expect(response.statusCode).toBe(500);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('Failed to register push token');
        });

        it('should return 401 without authorization', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/v1/push-tokens',
                headers: { 'Content-Type': 'application/json' },
                payload: {
                    token: 'some-token'
                }
            });

            expect(response.statusCode).toBe(401);
        });

        it('should return 400 for missing token', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/v1/push-tokens',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {}
            });

            expect(response.statusCode).toBe(400);
        });

        it('should handle long push tokens', async () => {
            const longToken = 'expo-push-token-' + 'x'.repeat(200);
            vi.mocked(db.accountPushToken.upsert).mockResolvedValue({
                id: 'pt-123',
                accountId: TEST_USER_ID,
                token: longToken,
                createdAt: new Date(),
                updatedAt: new Date(),
            } as any);

            const response = await app.inject({
                method: 'POST',
                url: '/v1/push-tokens',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    token: longToken
                }
            });

            expect(response.statusCode).toBe(200);
        });
    });

    describe('DELETE /v1/push-tokens/:token', () => {
        it('should delete push token', async () => {
            vi.mocked(db.accountPushToken.deleteMany).mockResolvedValue({ count: 1 });

            const response = await app.inject({
                method: 'DELETE',
                url: '/v1/push-tokens/expo-push-token-abc123',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(true);
            expect(vi.mocked(db.accountPushToken.deleteMany)).toHaveBeenCalledWith({
                where: {
                    accountId: TEST_USER_ID,
                    token: 'expo-push-token-abc123'
                }
            });
        });

        it('should return success even if token does not exist (idempotent)', async () => {
            vi.mocked(db.accountPushToken.deleteMany).mockResolvedValue({ count: 0 });

            const response = await app.inject({
                method: 'DELETE',
                url: '/v1/push-tokens/non-existent-token',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(true);
        });

        it('should not delete other users tokens', async () => {
            vi.mocked(db.accountPushToken.deleteMany).mockResolvedValue({ count: 0 });

            const response = await app.inject({
                method: 'DELETE',
                url: '/v1/push-tokens/other-user-token',
                headers: authHeader(),
            });

            // Verify the query filters by accountId
            expect(vi.mocked(db.accountPushToken.deleteMany)).toHaveBeenCalledWith({
                where: {
                    accountId: TEST_USER_ID,  // Only deletes tokens for this user
                    token: 'other-user-token'
                }
            });
        });

        it('should return 500 on database error', async () => {
            vi.mocked(db.accountPushToken.deleteMany).mockRejectedValue(
                new Error('Database connection failed')
            );

            const response = await app.inject({
                method: 'DELETE',
                url: '/v1/push-tokens/some-token',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(500);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('Failed to delete push token');
        });

        it('should return 401 without authorization', async () => {
            const response = await app.inject({
                method: 'DELETE',
                url: '/v1/push-tokens/some-token',
            });

            expect(response.statusCode).toBe(401);
        });

        it('should handle URL-encoded tokens', async () => {
            const tokenWithSpecialChars = 'token+with/special=chars';
            vi.mocked(db.accountPushToken.deleteMany).mockResolvedValue({ count: 1 });

            const response = await app.inject({
                method: 'DELETE',
                url: '/v1/push-tokens/' + encodeURIComponent(tokenWithSpecialChars),
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(200);
            expect(vi.mocked(db.accountPushToken.deleteMany)).toHaveBeenCalledWith({
                where: {
                    accountId: TEST_USER_ID,
                    token: tokenWithSpecialChars
                }
            });
        });
    });

    describe('GET /v1/push-tokens', () => {
        it('should return list of push tokens', async () => {
            const now = new Date();
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

            vi.mocked(db.accountPushToken.findMany).mockResolvedValue([
                {
                    id: 'pt-1',
                    accountId: TEST_USER_ID,
                    token: 'token-device-1',
                    createdAt: yesterday,
                    updatedAt: now,
                },
                {
                    id: 'pt-2',
                    accountId: TEST_USER_ID,
                    token: 'token-device-2',
                    createdAt: now,
                    updatedAt: now,
                },
            ] as any);

            const response = await app.inject({
                method: 'GET',
                url: '/v1/push-tokens',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.tokens).toHaveLength(2);
            expect(body.tokens[0].id).toBe('pt-1');
            expect(body.tokens[0].token).toBe('token-device-1');
            expect(body.tokens[0].createdAt).toBe(yesterday.getTime());
            expect(body.tokens[0].updatedAt).toBe(now.getTime());
            expect(body.tokens[1].id).toBe('pt-2');
        });

        it('should return tokens ordered by createdAt desc', async () => {
            vi.mocked(db.accountPushToken.findMany).mockResolvedValue([]);

            await app.inject({
                method: 'GET',
                url: '/v1/push-tokens',
                headers: authHeader(),
            });

            expect(vi.mocked(db.accountPushToken.findMany)).toHaveBeenCalledWith({
                where: {
                    accountId: TEST_USER_ID
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });
        });

        it('should return empty array when no tokens exist', async () => {
            vi.mocked(db.accountPushToken.findMany).mockResolvedValue([]);

            const response = await app.inject({
                method: 'GET',
                url: '/v1/push-tokens',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.tokens).toHaveLength(0);
        });

        it('should return 500 on database error', async () => {
            vi.mocked(db.accountPushToken.findMany).mockRejectedValue(
                new Error('Database connection failed')
            );

            const response = await app.inject({
                method: 'GET',
                url: '/v1/push-tokens',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(500);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('Failed to get push tokens');
        });

        it('should return 401 without authorization', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/v1/push-tokens',
            });

            expect(response.statusCode).toBe(401);
        });

        it('should only return tokens for authenticated user', async () => {
            // First user
            vi.mocked(db.accountPushToken.findMany).mockResolvedValue([
                {
                    id: 'pt-1',
                    accountId: TEST_USER_ID,
                    token: 'user1-token',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ] as any);

            const response = await app.inject({
                method: 'GET',
                url: '/v1/push-tokens',
                headers: authHeader('valid-token'),
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.tokens).toHaveLength(1);
            expect(body.tokens[0].token).toBe('user1-token');

            // Verify the query filters by accountId
            expect(vi.mocked(db.accountPushToken.findMany)).toHaveBeenCalledWith({
                where: {
                    accountId: TEST_USER_ID
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });
        });
    });
});
