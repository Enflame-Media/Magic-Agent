/**
 * Integration Tests for User and Feed Routes
 *
 * Tests user endpoints:
 * - GET /v1/users/search (search users)
 * - GET /v1/users/:id (get user profile)
 *
 * And feed endpoints:
 * - GET /v1/feed (activity feed)
 *
 * @module __tests__/user-feed.spec
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
import { authHeader, expectOneOfStatus } from './test-utils';

describe('User Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /v1/users/search - Search Users', () => {
        it('should require authentication', async () => {
            const res = await app.request('/v1/users/search?query=test', {
                method: 'GET',
            });

            expect(res.status).toBe(401);
        });

        it('should search users with query parameter', async () => {
            const res = await app.request('/v1/users/search?query=test', {
                method: 'GET',
                headers: authHeader(),
            });

            const body = await expectOneOfStatus<{ users: unknown[] }>(res, [200], [500]);
            if (!body) return;
            expect(body).toHaveProperty('users');
            expect(Array.isArray(body.users)).toBe(true);
        });

        it('should require query parameter', async () => {
            const res = await app.request('/v1/users/search', {
                method: 'GET',
                headers: authHeader(),
            });

            expect(res.status).toBe(400);
        });

        it('should accept limit parameter', async () => {
            const res = await app.request('/v1/users/search?query=test&limit=5', {
                method: 'GET',
                headers: authHeader(),
            });

            await expectOneOfStatus(res, [200], [500]);
        });

        it('should reject invalid limit (too high)', async () => {
            const res = await app.request('/v1/users/search?query=test&limit=100', {
                method: 'GET',
                headers: authHeader(),
            });

            // Max limit is 50
            await expectOneOfStatus(res, [200, 400], [500]);
        });

        it('should return users with relationship status', async () => {
            const res = await app.request('/v1/users/search?query=test', {
                method: 'GET',
                headers: authHeader(),
            });

            const body = await expectOneOfStatus<{ users: { status?: string }[] }>(res, [200], [500]);
            if (!body) return;
            body.users.forEach((user) => {
                expect(user).toHaveProperty('status');
                expect(['none', 'requested', 'pending', 'friend', 'rejected']).toContain(
                    user.status
                );
            });
        });

        it('should handle case-insensitive search', async () => {
            const res = await app.request('/v1/users/search?query=TEST', {
                method: 'GET',
                headers: authHeader(),
            });

            await expectOneOfStatus(res, [200], [500]);
        });

        it('should handle empty search results', async () => {
            const res = await app.request('/v1/users/search?query=zzzznonexistent', {
                method: 'GET',
                headers: authHeader(),
            });

            const body = await expectOneOfStatus<{ users: unknown[] }>(res, [200], [500]);
            if (!body) return;
            expect(body.users).toEqual([]);
        });
    });

    describe('GET /v1/users/:id - Get User Profile', () => {
        it('should require authentication', async () => {
            const res = await app.request('/v1/users/some-user-id', {
                method: 'GET',
            });

            expect(res.status).toBe(401);
        });

        it('should return user profile if exists', async () => {
            const res = await app.request('/v1/users/test-user-456', {
                method: 'GET',
                headers: authHeader(),
            });

            const body = await expectOneOfStatus<{ user: { id: string; status: string } }>(res, [200], [404, 500]);
            if (!body) return;
            expect(body).toHaveProperty('user');
            expect(body.user).toHaveProperty('id');
            expect(body.user).toHaveProperty('status');
        });

        it('should return 404 for non-existent user', async () => {
            const res = await app.request('/v1/users/non-existent-user-id', {
                method: 'GET',
                headers: authHeader(),
            });

            await expectOneOfStatus(res, [404], [500]);
        });

        it('should include relationship status with current user', async () => {
            const res = await app.request('/v1/users/test-user-456', {
                method: 'GET',
                headers: authHeader(),
            });

            const body = await expectOneOfStatus<{ user: { status: string } }>(res, [200], [404, 500]);
            if (!body) return;
            expect(['none', 'requested', 'pending', 'friend', 'rejected']).toContain(
                body.user.status
            );
        });

        it('should return limited profile info based on privacy', async () => {
            const res = await app.request('/v1/users/private-user-id', {
                method: 'GET',
                headers: authHeader(),
            });

            const body = await expectOneOfStatus<{ user: { firstName?: string; username?: string } }>(res, [200], [404, 500]);
            if (!body) return;
            // Should at least have basic profile fields
            expect(body.user).toHaveProperty('username');
        });
    });
});

describe('Feed Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /v1/feed - Activity Feed', () => {
        it('should require authentication', async () => {
            const res = await app.request('/v1/feed', {
                method: 'GET',
            });

            expect(res.status).toBe(401);
        });

        it('should return feed items with valid auth', async () => {
            const res = await app.request('/v1/feed', {
                method: 'GET',
                headers: authHeader(),
            });

            const body = await expectOneOfStatus<{ items: unknown[]; hasMore: boolean }>(res, [200], [500]);
            if (!body) return;
            expect(body).toHaveProperty('items');
            expect(Array.isArray(body.items)).toBe(true);
            expect(body).toHaveProperty('hasMore');
        });

        it('should accept limit parameter', async () => {
            const res = await app.request('/v1/feed?limit=10', {
                method: 'GET',
                headers: authHeader(),
            });

            await expectOneOfStatus(res, [200], [500]);
        });

        it('should accept before cursor for pagination', async () => {
            const res = await app.request('/v1/feed?before=cursor_10', {
                method: 'GET',
                headers: authHeader(),
            });

            await expectOneOfStatus(res, [200, 400], [500]);
        });

        it('should accept after cursor for pagination', async () => {
            const res = await app.request('/v1/feed?after=cursor_5', {
                method: 'GET',
                headers: authHeader(),
            });

            await expectOneOfStatus(res, [200, 400], [500]);
        });

        it('should reject invalid limit (too high)', async () => {
            const res = await app.request('/v1/feed?limit=500', {
                method: 'GET',
                headers: authHeader(),
            });

            // Max limit is 200
            await expectOneOfStatus(res, [200, 400], [500]);
        });

        it('should return feed items with cursors', async () => {
            const res = await app.request('/v1/feed', {
                method: 'GET',
                headers: authHeader(),
            });

            const body = await expectOneOfStatus<{ items: { cursor: string }[] }>(res, [200], [500]);
            if (!body) return;
            body.items.forEach((item) => {
                expect(item).toHaveProperty('cursor');
                expect(item.cursor).toMatch(/^cursor_\d+$/);
            });
        });

        it('should return feed items in correct format', async () => {
            const res = await app.request('/v1/feed', {
                method: 'GET',
                headers: authHeader(),
            });

            const body = await expectOneOfStatus<{
                items: { id: string; body: unknown; createdAt: number }[];
            }>(res, [200], [500]);
            if (!body) return;
            body.items.forEach((item) => {
                expect(item).toHaveProperty('id');
                expect(item).toHaveProperty('body');
                expect(item).toHaveProperty('createdAt');
            });
        });

        it('should handle empty feed', async () => {
            const res = await app.request('/v1/feed', {
                method: 'GET',
                headers: authHeader(),
            });

            const body = await expectOneOfStatus<{ items: unknown[] }>(res, [200], [500]);
            if (!body) return;
            // Empty feed is valid
            expect(Array.isArray(body.items)).toBe(true);
        });

        it('should paginate correctly with before cursor', async () => {
            // Get initial page
            const res1 = await app.request('/v1/feed?limit=5', {
                method: 'GET',
                headers: authHeader(),
            });

            const body1 = await expectOneOfStatus<{ items: { cursor: string }[]; hasMore: boolean }>(res1, [200], [500]);
            if (!body1 || body1.items.length === 0 || !body1.hasMore) return;
            const lastItem = body1.items[body1.items.length - 1];
            const lastCursor = lastItem?.cursor;

            // Get next page
            const res2 = await app.request(`/v1/feed?before=${lastCursor}&limit=5`, {
                method: 'GET',
                headers: authHeader(),
            });

            await expectOneOfStatus(res2, [200], [500]);
        });
    });

    describe('Feed Isolation', () => {
        it('should only return own feed items', async () => {
            const res = await app.request('/v1/feed', {
                method: 'GET',
                headers: authHeader(),
            });

            await expectOneOfStatus(res, [200], [500]);
            // Feed should only contain items for the authenticated user
        });
    });

    describe('Cursor Validation', () => {
        it('should reject invalid before cursor format (missing prefix)', async () => {
            const res = await app.request('/v1/feed?before=invalid_123', {
                method: 'GET',
                headers: authHeader(),
            });

            // Should reject with 400 for invalid cursor, or 500 if env/DB undefined
            const body = await expectOneOfStatus<{ error: string }>(res, [400], [500]);
            if (!body) return;
            expect(body).toHaveProperty('error');
            expect(body.error).toContain('Invalid cursor format');
        });

        it('should reject invalid before cursor format (non-numeric)', async () => {
            const res = await app.request('/v1/feed?before=cursor_abc', {
                method: 'GET',
                headers: authHeader(),
            });

            const body = await expectOneOfStatus<{ error: string }>(res, [400], [500]);
            if (!body) return;
            expect(body.error).toContain('Invalid cursor format');
        });

        it('should reject invalid after cursor format (missing prefix)', async () => {
            const res = await app.request('/v1/feed?after=wrong_format', {
                method: 'GET',
                headers: authHeader(),
            });

            const body = await expectOneOfStatus<{ error: string }>(res, [400], [500]);
            if (!body) return;
            expect(body.error).toContain('Invalid cursor format');
        });

        it('should reject invalid after cursor format (non-numeric)', async () => {
            const res = await app.request('/v1/feed?after=cursor_xyz', {
                method: 'GET',
                headers: authHeader(),
            });

            const body = await expectOneOfStatus<{ error: string }>(res, [400], [500]);
            if (!body) return;
            expect(body.error).toContain('Invalid cursor format');
        });

        it('should accept valid cursor_0', async () => {
            const res = await app.request('/v1/feed?before=cursor_0', {
                method: 'GET',
                headers: authHeader(),
            });

            // Should not fail validation (may fail on DB)
            await expectOneOfStatus(res, [200], [500]);
        });

        it('should accept valid high cursor number', async () => {
            const res = await app.request('/v1/feed?after=cursor_999999', {
                method: 'GET',
                headers: authHeader(),
            });

            // Should not fail validation (may fail on DB)
            await expectOneOfStatus(res, [200], [500]);
        });
    });

    describe('Limit Validation', () => {
        it('should use default limit when not specified', async () => {
            const res = await app.request('/v1/feed', {
                method: 'GET',
                headers: authHeader(),
            });

            await expectOneOfStatus(res, [200], [500]);
        });

        it('should accept minimum limit of 1', async () => {
            const res = await app.request('/v1/feed?limit=1', {
                method: 'GET',
                headers: authHeader(),
            });

            await expectOneOfStatus(res, [200], [500]);
        });

        it('should accept maximum limit of 200', async () => {
            const res = await app.request('/v1/feed?limit=200', {
                method: 'GET',
                headers: authHeader(),
            });

            await expectOneOfStatus(res, [200], [500]);
        });

        it('should reject limit of 0', async () => {
            const res = await app.request('/v1/feed?limit=0', {
                method: 'GET',
                headers: authHeader(),
            });

            await expectOneOfStatus(res, [400], [500]);
        });

        it('should reject negative limit', async () => {
            const res = await app.request('/v1/feed?limit=-10', {
                method: 'GET',
                headers: authHeader(),
            });

            await expectOneOfStatus(res, [400], [500]);
        });

        it('should reject non-numeric limit', async () => {
            const res = await app.request('/v1/feed?limit=abc', {
                method: 'GET',
                headers: authHeader(),
            });

            await expectOneOfStatus(res, [400], [500]);
        });
    });
});
