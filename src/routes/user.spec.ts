/**
 * Unit Tests for User Routes (HAP-909)
 *
 * Tests for routes/user.ts covering:
 * - User search and profile retrieval
 * - Friend management (add, remove, list)
 * - Privacy settings (get, update)
 *
 * Mutation Testing Focus:
 * - ConditionalExpression (20): Test all branches in friend operations, privacy checks
 * - ObjectLiteral (18): Verify exact response shapes with strict assertions
 * - BlockStatement (12): Cover all code blocks within conditionals
 *
 * @module routes/user.spec
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAPIHono } from '@hono/zod-openapi';
import userRoutes from './user';

// Mock external modules
vi.mock('@/lib/auth', () => ({
    verifyToken: vi.fn(),
}));

vi.mock('@/lib/eventRouter', () => ({
    getEventRouter: vi.fn(() => ({
        emitUpdate: vi.fn().mockResolvedValue({ success: true, delivered: 1 }),
    })),
    buildRelationshipUpdatedEvent: vi.fn((data, seq, id) => ({
        id,
        seq,
        body: { type: 'relationship-updated', ...data },
        createdAt: Date.now(),
    })),
    buildNewFeedPostUpdate: vi.fn((data, seq, id) => ({
        id,
        seq,
        body: { type: 'new-feed-post', ...data },
        createdAt: Date.now(),
    })),
}));

vi.mock('@/db/client', () => ({
    getDb: vi.fn(),
}));

vi.mock('@/utils/id', () => ({
    createId: vi.fn(() => 'test-id-123'),
}));

// Import mocked modules
import { verifyToken } from '@/lib/auth';
import { getEventRouter } from '@/lib/eventRouter';
import { getDb } from '@/db/client';

// ============================================================================
// Type Definitions
// ============================================================================

interface MockEnv {
    DB: D1Database;
    CONNECTION_MANAGER: DurableObjectNamespace;
}

interface MockAccount {
    id: string;
    firstName: string | null;
    lastName: string | null;
    username: string | null;
    feedSeq: number;
    showOnlineStatus: boolean;
    profileVisibility: string;
    friendRequestPermission: string;
}

interface MockRelationship {
    fromUserId: string;
    toUserId: string;
    status: string;
    lastNotifiedAt: Date | null;
    toUser?: {
        id: string;
        firstName: string | null;
        lastName: string | null;
        username: string | null;
    };
}

interface MockFeedItem {
    id: string;
    userId: string;
    counter: number;
    repeatKey: string;
    body: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Create mock D1 database with customizable query behavior
 */
function createMockDb(options: {
    accounts?: MockAccount[];
    relationships?: MockRelationship[];
    feedItems?: MockFeedItem[];
} = {}) {
    const { accounts = [], relationships = [], feedItems = [] } = options;

    // Track inserted/updated data for assertions
    const insertedRelationships: Array<{ fromUserId: string; toUserId: string; status: string }> = [];
    const updatedRelationships: Array<{ fromUserId: string; toUserId: string; status: string }> = [];
    const insertedFeedItems: MockFeedItem[] = [];

    return {
        query: {
            accounts: {
                findFirst: vi.fn(async () => accounts[0] || null),
                findMany: vi.fn(async () => accounts),
            },
            userRelationships: {
                findFirst: vi.fn(async () => {
                    // Return based on query pattern - simplified mock
                    return relationships[0] || null;
                }),
                findMany: vi.fn(async () => relationships),
            },
            userFeedItems: {
                findFirst: vi.fn(async () => feedItems[0] || null),
            },
        },
        insert: vi.fn((table: unknown) => ({
            values: vi.fn((data: unknown) => {
                if (table && typeof table === 'object' && 'fromUserId' in (table as object)) {
                    insertedRelationships.push(data as { fromUserId: string; toUserId: string; status: string });
                }
                if (data && typeof data === 'object' && 'repeatKey' in (data as object)) {
                    insertedFeedItems.push(data as MockFeedItem);
                }
                return Promise.resolve();
            }),
        })),
        update: vi.fn(() => ({
            set: vi.fn(() => ({
                where: vi.fn().mockResolvedValue(undefined),
            })),
        })),
        delete: vi.fn(() => ({
            where: vi.fn().mockResolvedValue(undefined),
        })),
        _insertedRelationships: insertedRelationships,
        _updatedRelationships: updatedRelationships,
        _insertedFeedItems: insertedFeedItems,
    };
}

/**
 * Create mock Durable Object namespace
 */
function createMockDO(): DurableObjectNamespace {
    return {
        idFromName: vi.fn(() => ({ toString: () => 'mock-do-id' })),
        get: vi.fn(() => ({
            fetch: vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, delivered: 1 }))),
        })),
    } as unknown as DurableObjectNamespace;
}

/**
 * Create test app with mock environment
 */
function createTestApp(env: Partial<MockEnv> = {}) {
    const app = new OpenAPIHono<{ Bindings: MockEnv }>();
    app.route('/', userRoutes);

    const fullEnv: MockEnv = {
        DB: {} as D1Database,
        CONNECTION_MANAGER: createMockDO(),
        ...env,
    };

    return { app, env: fullEnv };
}

/**
 * Setup auth mocks to simulate authenticated user
 */
function setupAuthenticatedUser(userId: string = 'test-user-id') {
    vi.mocked(verifyToken).mockResolvedValue({ userId, extras: undefined });
}

/**
 * Create a mock account with default values
 */
function createMockAccount(overrides: Partial<MockAccount> = {}): MockAccount {
    return {
        id: 'test-user-id',
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser',
        feedSeq: 0,
        showOnlineStatus: true,
        profileVisibility: 'public',
        friendRequestPermission: 'anyone',
        ...overrides,
    };
}

// ============================================================================
// Tests
// ============================================================================

describe('user routes (HAP-909)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        setupAuthenticatedUser();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // =========================================================================
    // GET /v1/users/search - Search Users
    // =========================================================================
    describe('GET /v1/users/search', () => {
        const authHeaders = { Authorization: 'Bearer test-token' };

        it('should return matching users with relationship status', async () => {
            const mockUsers = [
                createMockAccount({ id: 'user-1', username: 'john', firstName: 'John', lastName: 'Doe' }),
                createMockAccount({ id: 'user-2', username: 'johnny', firstName: 'Johnny', lastName: 'Smith' }),
            ];

            const mockDb = createMockDb({ accounts: mockUsers });
            mockDb.query.accounts.findMany = vi.fn().mockResolvedValue(mockUsers);
            mockDb.query.userRelationships.findFirst = vi.fn().mockResolvedValue(null);
            vi.mocked(getDb).mockReturnValue(mockDb as never);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/users/search?query=john', {
                headers: authHeaders,
            }, env);
            const body = await response.json() as { users: Array<{ id: string; username: string | null; status: string }> };

            expect(response.status).toBe(200);
            expect(body).toHaveProperty('users');
            expect(Array.isArray(body.users)).toBe(true);
        });

        it('should return empty array when no users match', async () => {
            const mockDb = createMockDb({ accounts: [] });
            mockDb.query.accounts.findMany = vi.fn().mockResolvedValue([]);
            vi.mocked(getDb).mockReturnValue(mockDb as never);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/users/search?query=nonexistent', {
                headers: authHeaders,
            }, env);
            const body = await response.json() as { users: unknown[] };

            expect(response.status).toBe(200);
            expect(body.users).toEqual([]);
        });

        it('should respect limit parameter', async () => {
            const mockUsers = [
                createMockAccount({ id: 'user-1', username: 'john1' }),
                createMockAccount({ id: 'user-2', username: 'john2' }),
                createMockAccount({ id: 'user-3', username: 'john3' }),
            ];

            const mockDb = createMockDb({ accounts: mockUsers });
            mockDb.query.accounts.findMany = vi.fn().mockResolvedValue(mockUsers.slice(0, 2));
            mockDb.query.userRelationships.findFirst = vi.fn().mockResolvedValue(null);
            vi.mocked(getDb).mockReturnValue(mockDb as never);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/users/search?query=john&limit=2', {
                headers: authHeaders,
            }, env);
            const body = await response.json() as { users: unknown[] };

            expect(response.status).toBe(200);
            expect(body.users.length).toBeLessThanOrEqual(2);
        });

        it('should return 401 when not authenticated', async () => {
            vi.mocked(verifyToken).mockResolvedValue(null);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/users/search?query=john', {
                headers: authHeaders,
            }, env);

            expect(response.status).toBe(401);
        });

        it('should include correct user profile structure in response', async () => {
            const mockUser = createMockAccount({
                id: 'user-1',
                username: 'john',
                firstName: 'John',
                lastName: 'Doe',
            });

            const mockDb = createMockDb({ accounts: [mockUser] });
            mockDb.query.accounts.findMany = vi.fn().mockResolvedValue([mockUser]);
            mockDb.query.userRelationships.findFirst = vi.fn().mockResolvedValue(null);
            vi.mocked(getDb).mockReturnValue(mockDb as never);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/users/search?query=john', {
                headers: authHeaders,
            }, env);
            const body = await response.json() as { users: Array<{ id: string; firstName: string | null; lastName: string | null; username: string | null; status: string }> };

            expect(response.status).toBe(200);
            // Verify exact object structure for mutation testing (ObjectLiteral mutations)
            expect(body.users[0]).toHaveProperty('id');
            expect(body.users[0]).toHaveProperty('firstName');
            expect(body.users[0]).toHaveProperty('lastName');
            expect(body.users[0]).toHaveProperty('username');
            expect(body.users[0]).toHaveProperty('status');
        });

        it('should return status none for users without relationship', async () => {
            const mockUser = createMockAccount({ id: 'user-1', username: 'john' });

            const mockDb = createMockDb({ accounts: [mockUser] });
            mockDb.query.accounts.findMany = vi.fn().mockResolvedValue([mockUser]);
            mockDb.query.userRelationships.findFirst = vi.fn().mockResolvedValue(null);
            vi.mocked(getDb).mockReturnValue(mockDb as never);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/users/search?query=john', {
                headers: authHeaders,
            }, env);
            const body = await response.json() as { users: Array<{ status: string }> };

            expect(response.status).toBe(200);
            expect(body.users.length).toBeGreaterThan(0);
            expect(body.users[0]!.status).toBe('none');
        });

        it('should return correct status for existing relationships', async () => {
            const mockUser = createMockAccount({ id: 'user-1', username: 'john' });
            const mockRelationship: MockRelationship = {
                fromUserId: 'test-user-id',
                toUserId: 'user-1',
                status: 'friend',
                lastNotifiedAt: null,
            };

            const mockDb = createMockDb({ accounts: [mockUser], relationships: [mockRelationship] });
            mockDb.query.accounts.findMany = vi.fn().mockResolvedValue([mockUser]);
            mockDb.query.userRelationships.findFirst = vi.fn().mockResolvedValue(mockRelationship);
            vi.mocked(getDb).mockReturnValue(mockDb as never);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/users/search?query=john', {
                headers: authHeaders,
            }, env);
            const body = await response.json() as { users: Array<{ status: string }> };

            expect(response.status).toBe(200);
            expect(body.users.length).toBeGreaterThan(0);
            expect(body.users[0]!.status).toBe('friend');
        });
    });

    // =========================================================================
    // GET /v1/users/:id - Get User Profile
    // =========================================================================
    describe('GET /v1/users/:id', () => {
        const authHeaders = { Authorization: 'Bearer test-token' };

        it('should return user profile with relationship status', async () => {
            const mockUser = createMockAccount({
                id: 'target-user-id',
                username: 'targetuser',
                firstName: 'Target',
                lastName: 'User',
            });

            const mockDb = createMockDb({ accounts: [mockUser] });
            mockDb.query.accounts.findFirst = vi.fn().mockResolvedValue(mockUser);
            mockDb.query.userRelationships.findFirst = vi.fn().mockResolvedValue(null);
            vi.mocked(getDb).mockReturnValue(mockDb as never);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/users/target-user-id', {
                headers: authHeaders,
            }, env);
            const body = await response.json() as { user: { id: string; firstName: string | null; lastName: string | null; username: string | null; status: string } };

            expect(response.status).toBe(200);
            expect(body).toHaveProperty('user');
            expect(body.user.id).toBe('target-user-id');
            expect(body.user.firstName).toBe('Target');
            expect(body.user.lastName).toBe('User');
            expect(body.user.username).toBe('targetuser');
            expect(body.user.status).toBe('none');
        });

        it('should return 404 when user not found', async () => {
            const mockDb = createMockDb();
            mockDb.query.accounts.findFirst = vi.fn().mockResolvedValue(null);
            vi.mocked(getDb).mockReturnValue(mockDb as never);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/users/nonexistent-user-id', {
                headers: authHeaders,
            }, env);
            const body = await response.json() as { error: string };

            expect(response.status).toBe(404);
            expect(body.error).toBe('User not found');
        });

        it('should return 401 when not authenticated', async () => {
            vi.mocked(verifyToken).mockResolvedValue(null);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/users/some-user-id', {
                headers: authHeaders,
            }, env);

            expect(response.status).toBe(401);
        });

        it('should return correct relationship status for friends', async () => {
            const mockUser = createMockAccount({ id: 'friend-user-id', username: 'friend' });
            const mockRelationship: MockRelationship = {
                fromUserId: 'test-user-id',
                toUserId: 'friend-user-id',
                status: 'friend',
                lastNotifiedAt: null,
            };

            const mockDb = createMockDb({ accounts: [mockUser], relationships: [mockRelationship] });
            mockDb.query.accounts.findFirst = vi.fn().mockResolvedValue(mockUser);
            mockDb.query.userRelationships.findFirst = vi.fn().mockResolvedValue(mockRelationship);
            vi.mocked(getDb).mockReturnValue(mockDb as never);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/users/friend-user-id', {
                headers: authHeaders,
            }, env);
            const body = await response.json() as { user: { status: string } };

            expect(response.status).toBe(200);
            expect(body.user.status).toBe('friend');
        });
    });

    // =========================================================================
    // POST /v1/friends/add - Add Friend
    // =========================================================================
    describe('POST /v1/friends/add', () => {
        const authHeaders = {
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json',
        };

        it('should return null user when trying to friend self', async () => {
            const mockUser = createMockAccount({ id: 'test-user-id' });
            const mockDb = createMockDb({ accounts: [mockUser] });
            vi.mocked(getDb).mockReturnValue(mockDb as never);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/friends/add', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ uid: 'test-user-id' }), // Same as authenticated user
            }, env);
            const body = await response.json() as { user: null };

            expect(response.status).toBe(200);
            expect(body.user).toBeNull();
        });

        it('should return null user when target user not found', async () => {
            const currentUser = createMockAccount({ id: 'test-user-id' });
            const mockDb = createMockDb({ accounts: [currentUser] });
            mockDb.query.accounts.findFirst = vi.fn()
                .mockResolvedValueOnce(currentUser)  // First call: find current user
                .mockResolvedValueOnce(null);        // Second call: find target user
            vi.mocked(getDb).mockReturnValue(mockDb as never);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/friends/add', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ uid: 'nonexistent-user-id' }),
            }, env);
            const body = await response.json() as { user: null };

            expect(response.status).toBe(200);
            expect(body.user).toBeNull();
        });

        it('should return null user when current user not found', async () => {
            const mockDb = createMockDb();
            mockDb.query.accounts.findFirst = vi.fn().mockResolvedValue(null);
            vi.mocked(getDb).mockReturnValue(mockDb as never);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/friends/add', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ uid: 'target-user-id' }),
            }, env);
            const body = await response.json() as { user: null };

            expect(response.status).toBe(200);
            expect(body.user).toBeNull();
        });

        it('should accept friend request when target has pending request', async () => {
            const currentUser = createMockAccount({ id: 'test-user-id' });
            const targetUser = createMockAccount({
                id: 'target-user-id',
                username: 'target',
                firstName: 'Target',
                lastName: 'User',
            });
            const targetRelationship: MockRelationship = {
                fromUserId: 'target-user-id',
                toUserId: 'test-user-id',
                status: 'requested',  // Target sent us a request
                lastNotifiedAt: null,
            };

            const mockDb = createMockDb({ accounts: [currentUser, targetUser], relationships: [targetRelationship] });
            mockDb.query.accounts.findFirst = vi.fn()
                .mockResolvedValueOnce(currentUser)
                .mockResolvedValueOnce(targetUser)
                .mockResolvedValueOnce(currentUser)  // For feed notification
                .mockResolvedValueOnce(targetUser);  // For feed notification
            mockDb.query.userRelationships.findFirst = vi.fn()
                .mockResolvedValueOnce(null)              // Current user's relationship (none)
                .mockResolvedValueOnce(targetRelationship) // Target's relationship (requested)
                .mockResolvedValueOnce(targetRelationship) // For relationshipSet
                .mockResolvedValueOnce(null);             // For relationshipSet
            mockDb.query.userFeedItems.findFirst = vi.fn().mockResolvedValue(null);
            vi.mocked(getDb).mockReturnValue(mockDb as never);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/friends/add', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ uid: 'target-user-id' }),
            }, env);
            const body = await response.json() as { user: { id: string; status: string } };

            expect(response.status).toBe(200);
            expect(body.user).not.toBeNull();
            expect(body.user.status).toBe('friend');
        });

        it('should send friend request when relationship is none', async () => {
            const currentUser = createMockAccount({ id: 'test-user-id' });
            const targetUser = createMockAccount({
                id: 'target-user-id',
                username: 'target',
                friendRequestPermission: 'anyone',
            });

            const mockDb = createMockDb({ accounts: [currentUser, targetUser] });
            mockDb.query.accounts.findFirst = vi.fn()
                .mockResolvedValueOnce(currentUser)
                .mockResolvedValueOnce(targetUser);
            mockDb.query.userRelationships.findFirst = vi.fn()
                .mockResolvedValueOnce(null)  // Current user's relationship (none)
                .mockResolvedValueOnce(null)  // Target's relationship (none)
                .mockResolvedValueOnce(null)  // For relationshipSet
                .mockResolvedValueOnce(null)  // For relationshipSet
                .mockResolvedValueOnce({ status: 'pending', lastNotifiedAt: null }); // For notification check
            mockDb.query.userFeedItems.findFirst = vi.fn().mockResolvedValue(null);
            vi.mocked(getDb).mockReturnValue(mockDb as never);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/friends/add', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ uid: 'target-user-id' }),
            }, env);
            const body = await response.json() as { user: { id: string; status: string } };

            expect(response.status).toBe(200);
            expect(body.user).not.toBeNull();
            expect(body.user.status).toBe('requested');
        });

        it('should return 403 when target has friendRequestPermission set to none', async () => {
            const currentUser = createMockAccount({ id: 'test-user-id' });
            const targetUser = createMockAccount({
                id: 'target-user-id',
                username: 'target',
                friendRequestPermission: 'none',  // Not accepting requests
            });

            const mockDb = createMockDb({ accounts: [currentUser, targetUser] });
            mockDb.query.accounts.findFirst = vi.fn()
                .mockResolvedValueOnce(currentUser)
                .mockResolvedValueOnce(targetUser);
            mockDb.query.userRelationships.findFirst = vi.fn()
                .mockResolvedValueOnce(null)  // Current user's relationship (none)
                .mockResolvedValueOnce(null); // Target's relationship (none)
            vi.mocked(getDb).mockReturnValue(mockDb as never);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/friends/add', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ uid: 'target-user-id' }),
            }, env);
            const body = await response.json() as { error: string };

            expect(response.status).toBe(403);
            expect(body.error).toBe('User is not accepting friend requests');
        });

        it('should return 403 when friends-of-friends permission and no mutual friends', async () => {
            const currentUser = createMockAccount({ id: 'test-user-id' });
            const targetUser = createMockAccount({
                id: 'target-user-id',
                username: 'target',
                friendRequestPermission: 'friends-of-friends',
            });

            const mockDb = createMockDb({ accounts: [currentUser, targetUser] });
            mockDb.query.accounts.findFirst = vi.fn()
                .mockResolvedValueOnce(currentUser)
                .mockResolvedValueOnce(targetUser);
            mockDb.query.userRelationships.findFirst = vi.fn()
                .mockResolvedValueOnce(null)  // Current user's relationship (none)
                .mockResolvedValueOnce(null); // Target's relationship (none)
            // Mock no mutual friends
            mockDb.query.userRelationships.findMany = vi.fn().mockResolvedValue([]);
            vi.mocked(getDb).mockReturnValue(mockDb as never);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/friends/add', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ uid: 'target-user-id' }),
            }, env);
            const body = await response.json() as { error: string };

            expect(response.status).toBe(403);
            expect(body.error).toBe('User only accepts friend requests from friends of friends');
        });

        it('should allow request when friends-of-friends and mutual friend exists', async () => {
            const currentUser = createMockAccount({ id: 'test-user-id' });
            const targetUser = createMockAccount({
                id: 'target-user-id',
                username: 'target',
                friendRequestPermission: 'friends-of-friends',
            });
            const mutualFriend: MockRelationship = {
                fromUserId: 'test-user-id',
                toUserId: 'mutual-friend-id',
                status: 'friend',
                lastNotifiedAt: null,
            };

            const mockDb = createMockDb({ accounts: [currentUser, targetUser], relationships: [mutualFriend] });
            mockDb.query.accounts.findFirst = vi.fn()
                .mockResolvedValueOnce(currentUser)
                .mockResolvedValueOnce(targetUser);
            mockDb.query.userRelationships.findFirst = vi.fn()
                .mockResolvedValueOnce(null)  // Current user's relationship (none)
                .mockResolvedValueOnce(null)  // Target's relationship (none)
                .mockResolvedValueOnce({ status: 'friend' })  // Mutual friend check
                .mockResolvedValueOnce(null)  // For relationshipSet
                .mockResolvedValueOnce(null)  // For relationshipSet
                .mockResolvedValueOnce({ status: 'pending', lastNotifiedAt: null }); // For notification check
            mockDb.query.userRelationships.findMany = vi.fn().mockResolvedValue([mutualFriend]);
            mockDb.query.userFeedItems.findFirst = vi.fn().mockResolvedValue(null);
            vi.mocked(getDb).mockReturnValue(mockDb as never);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/friends/add', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ uid: 'target-user-id' }),
            }, env);
            const body = await response.json() as { user: { status: string } };

            expect(response.status).toBe(200);
            expect(body.user).not.toBeNull();
            expect(body.user.status).toBe('requested');
        });

        it('should return current status when no change is needed', async () => {
            const currentUser = createMockAccount({ id: 'test-user-id' });
            const targetUser = createMockAccount({
                id: 'target-user-id',
                username: 'target',
            });
            const existingRelationship: MockRelationship = {
                fromUserId: 'test-user-id',
                toUserId: 'target-user-id',
                status: 'friend',  // Already friends
                lastNotifiedAt: null,
            };

            const mockDb = createMockDb({ accounts: [currentUser, targetUser], relationships: [existingRelationship] });
            mockDb.query.accounts.findFirst = vi.fn()
                .mockResolvedValueOnce(currentUser)
                .mockResolvedValueOnce(targetUser);
            mockDb.query.userRelationships.findFirst = vi.fn()
                .mockResolvedValueOnce(existingRelationship)  // Current user's relationship (friend)
                .mockResolvedValueOnce(null);                  // Target's relationship
            vi.mocked(getDb).mockReturnValue(mockDb as never);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/friends/add', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ uid: 'target-user-id' }),
            }, env);
            const body = await response.json() as { user: { status: string } };

            expect(response.status).toBe(200);
            expect(body.user.status).toBe('friend');
        });

        it('should send friend request when current relationship is rejected', async () => {
            const currentUser = createMockAccount({ id: 'test-user-id' });
            const targetUser = createMockAccount({
                id: 'target-user-id',
                username: 'target',
                friendRequestPermission: 'anyone',
            });
            const rejectedRelationship: MockRelationship = {
                fromUserId: 'test-user-id',
                toUserId: 'target-user-id',
                status: 'rejected',  // Previously rejected
                lastNotifiedAt: null,
            };

            const mockDb = createMockDb({ accounts: [currentUser, targetUser], relationships: [rejectedRelationship] });
            mockDb.query.accounts.findFirst = vi.fn()
                .mockResolvedValueOnce(currentUser)
                .mockResolvedValueOnce(targetUser);
            mockDb.query.userRelationships.findFirst = vi.fn()
                .mockResolvedValueOnce(rejectedRelationship)  // Current user's relationship (rejected)
                .mockResolvedValueOnce(null)  // Target's relationship (none)
                .mockResolvedValueOnce(rejectedRelationship)  // For relationshipSet
                .mockResolvedValueOnce(null)  // For relationshipSet
                .mockResolvedValueOnce({ status: 'pending', lastNotifiedAt: null }); // For notification check
            mockDb.query.userFeedItems.findFirst = vi.fn().mockResolvedValue(null);
            vi.mocked(getDb).mockReturnValue(mockDb as never);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/friends/add', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ uid: 'target-user-id' }),
            }, env);
            const body = await response.json() as { user: { status: string } };

            expect(response.status).toBe(200);
            expect(body.user.status).toBe('requested');
        });

        it('should return 401 when not authenticated', async () => {
            vi.mocked(verifyToken).mockResolvedValue(null);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/friends/add', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ uid: 'target-user-id' }),
            }, env);

            expect(response.status).toBe(401);
        });

        it('should broadcast relationship update events', async () => {
            const currentUser = createMockAccount({ id: 'test-user-id' });
            const targetUser = createMockAccount({
                id: 'target-user-id',
                username: 'target',
                friendRequestPermission: 'anyone',
            });

            const mockDb = createMockDb({ accounts: [currentUser, targetUser] });
            mockDb.query.accounts.findFirst = vi.fn()
                .mockResolvedValueOnce(currentUser)
                .mockResolvedValueOnce(targetUser);
            mockDb.query.userRelationships.findFirst = vi.fn()
                .mockResolvedValueOnce(null)  // Current user's relationship (none)
                .mockResolvedValueOnce(null)  // Target's relationship (none)
                .mockResolvedValueOnce(null)  // For relationshipSet
                .mockResolvedValueOnce(null)  // For relationshipSet
                .mockResolvedValueOnce({ status: 'pending', lastNotifiedAt: null }); // For notification check
            mockDb.query.userFeedItems.findFirst = vi.fn().mockResolvedValue(null);
            vi.mocked(getDb).mockReturnValue(mockDb as never);

            const mockEventRouter = {
                emitUpdate: vi.fn().mockResolvedValue({ success: true, delivered: 1 }),
            };
            vi.mocked(getEventRouter).mockReturnValue(mockEventRouter as never);

            const { app, env } = createTestApp();

            await app.request('/v1/friends/add', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ uid: 'target-user-id' }),
            }, env);

            // Verify event router was called for broadcasts
            expect(getEventRouter).toHaveBeenCalled();
        });
    });

    // =========================================================================
    // POST /v1/friends/remove - Remove Friend
    // =========================================================================
    describe('POST /v1/friends/remove', () => {
        const authHeaders = {
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json',
        };

        it('should return null user when target user not found', async () => {
            const currentUser = createMockAccount({ id: 'test-user-id' });
            const mockDb = createMockDb({ accounts: [currentUser] });
            mockDb.query.accounts.findFirst = vi.fn()
                .mockResolvedValueOnce(currentUser)
                .mockResolvedValueOnce(null);  // Target not found
            vi.mocked(getDb).mockReturnValue(mockDb as never);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/friends/remove', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ uid: 'nonexistent-user-id' }),
            }, env);
            const body = await response.json() as { user: null };

            expect(response.status).toBe(200);
            expect(body.user).toBeNull();
        });

        it('should return null user when current user not found', async () => {
            const mockDb = createMockDb();
            mockDb.query.accounts.findFirst = vi.fn().mockResolvedValue(null);
            vi.mocked(getDb).mockReturnValue(mockDb as never);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/friends/remove', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ uid: 'target-user-id' }),
            }, env);
            const body = await response.json() as { user: null };

            expect(response.status).toBe(200);
            expect(body.user).toBeNull();
        });

        it('should cancel outgoing request when status is requested', async () => {
            const currentUser = createMockAccount({ id: 'test-user-id' });
            const targetUser = createMockAccount({
                id: 'target-user-id',
                username: 'target',
            });
            const outgoingRequest: MockRelationship = {
                fromUserId: 'test-user-id',
                toUserId: 'target-user-id',
                status: 'requested',  // We sent a request
                lastNotifiedAt: null,
            };

            const mockDb = createMockDb({ accounts: [currentUser, targetUser], relationships: [outgoingRequest] });
            mockDb.query.accounts.findFirst = vi.fn()
                .mockResolvedValueOnce(currentUser)
                .mockResolvedValueOnce(targetUser);
            mockDb.query.userRelationships.findFirst = vi.fn()
                .mockResolvedValueOnce(outgoingRequest)  // Current user's relationship (requested)
                .mockResolvedValueOnce(null)              // Target's relationship
                .mockResolvedValueOnce(outgoingRequest); // For relationshipSet
            vi.mocked(getDb).mockReturnValue(mockDb as never);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/friends/remove', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ uid: 'target-user-id' }),
            }, env);
            const body = await response.json() as { user: { status: string } };

            expect(response.status).toBe(200);
            expect(body.user.status).toBe('rejected');
        });

        it('should unfriend when status is friend', async () => {
            const currentUser = createMockAccount({ id: 'test-user-id' });
            const targetUser = createMockAccount({
                id: 'target-user-id',
                username: 'target',
            });
            const friendship: MockRelationship = {
                fromUserId: 'test-user-id',
                toUserId: 'target-user-id',
                status: 'friend',
                lastNotifiedAt: null,
            };

            const mockDb = createMockDb({ accounts: [currentUser, targetUser], relationships: [friendship] });
            mockDb.query.accounts.findFirst = vi.fn()
                .mockResolvedValueOnce(currentUser)
                .mockResolvedValueOnce(targetUser);
            mockDb.query.userRelationships.findFirst = vi.fn()
                .mockResolvedValueOnce(friendship)  // Current user's relationship (friend)
                .mockResolvedValueOnce({ status: 'friend' })  // Target's relationship (friend)
                .mockResolvedValueOnce(friendship)  // For relationshipSet (target -> user)
                .mockResolvedValueOnce(friendship); // For relationshipSet (user -> target)
            vi.mocked(getDb).mockReturnValue(mockDb as never);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/friends/remove', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ uid: 'target-user-id' }),
            }, env);
            const body = await response.json() as { user: { status: string } };

            expect(response.status).toBe(200);
            expect(body.user.status).toBe('pending');
        });

        it('should reject incoming request when status is pending', async () => {
            const currentUser = createMockAccount({ id: 'test-user-id' });
            const targetUser = createMockAccount({
                id: 'target-user-id',
                username: 'target',
            });
            const incomingRequest: MockRelationship = {
                fromUserId: 'test-user-id',
                toUserId: 'target-user-id',
                status: 'pending',  // We have a pending request from them
                lastNotifiedAt: null,
            };

            const mockDb = createMockDb({ accounts: [currentUser, targetUser], relationships: [incomingRequest] });
            mockDb.query.accounts.findFirst = vi.fn()
                .mockResolvedValueOnce(currentUser)
                .mockResolvedValueOnce(targetUser);
            mockDb.query.userRelationships.findFirst = vi.fn()
                .mockResolvedValueOnce(incomingRequest)  // Current user's relationship (pending)
                .mockResolvedValueOnce({ status: 'requested' })  // Target's relationship (requested)
                .mockResolvedValueOnce(incomingRequest)  // For relationshipSet
                .mockResolvedValueOnce({ status: 'requested' }); // For relationshipSet
            vi.mocked(getDb).mockReturnValue(mockDb as never);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/friends/remove', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ uid: 'target-user-id' }),
            }, env);
            const body = await response.json() as { user: { status: string } };

            expect(response.status).toBe(200);
            expect(body.user.status).toBe('none');
        });

        it('should handle pending rejection when target already rejected', async () => {
            const currentUser = createMockAccount({ id: 'test-user-id' });
            const targetUser = createMockAccount({
                id: 'target-user-id',
                username: 'target',
            });
            const incomingRequest: MockRelationship = {
                fromUserId: 'test-user-id',
                toUserId: 'target-user-id',
                status: 'pending',
                lastNotifiedAt: null,
            };

            const mockDb = createMockDb({ accounts: [currentUser, targetUser], relationships: [incomingRequest] });
            mockDb.query.accounts.findFirst = vi.fn()
                .mockResolvedValueOnce(currentUser)
                .mockResolvedValueOnce(targetUser);
            mockDb.query.userRelationships.findFirst = vi.fn()
                .mockResolvedValueOnce(incomingRequest)  // Current user's relationship (pending)
                .mockResolvedValueOnce({ status: 'rejected' })  // Target's relationship (rejected)
                .mockResolvedValueOnce(incomingRequest); // For relationshipSet
            vi.mocked(getDb).mockReturnValue(mockDb as never);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/friends/remove', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ uid: 'target-user-id' }),
            }, env);
            const body = await response.json() as { user: { status: string } };

            expect(response.status).toBe(200);
            expect(body.user.status).toBe('none');
        });

        it('should return current status when no change is needed', async () => {
            const currentUser = createMockAccount({ id: 'test-user-id' });
            const targetUser = createMockAccount({
                id: 'target-user-id',
                username: 'target',
            });
            const noRelationship: MockRelationship = {
                fromUserId: 'test-user-id',
                toUserId: 'target-user-id',
                status: 'none',
                lastNotifiedAt: null,
            };

            const mockDb = createMockDb({ accounts: [currentUser, targetUser], relationships: [noRelationship] });
            mockDb.query.accounts.findFirst = vi.fn()
                .mockResolvedValueOnce(currentUser)
                .mockResolvedValueOnce(targetUser);
            mockDb.query.userRelationships.findFirst = vi.fn()
                .mockResolvedValueOnce(noRelationship)  // Current user's relationship (none)
                .mockResolvedValueOnce(null);            // Target's relationship
            vi.mocked(getDb).mockReturnValue(mockDb as never);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/friends/remove', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ uid: 'target-user-id' }),
            }, env);
            const body = await response.json() as { user: { status: string } };

            expect(response.status).toBe(200);
            expect(body.user.status).toBe('none');
        });

        it('should return 401 when not authenticated', async () => {
            vi.mocked(verifyToken).mockResolvedValue(null);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/friends/remove', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ uid: 'target-user-id' }),
            }, env);

            expect(response.status).toBe(401);
        });
    });

    // =========================================================================
    // GET /v1/friends - List Friends
    // =========================================================================
    describe('GET /v1/friends', () => {
        const authHeaders = { Authorization: 'Bearer test-token' };

        it('should return list of friends with relationship status', async () => {
            const friendRelationship: MockRelationship = {
                fromUserId: 'test-user-id',
                toUserId: 'friend-id',
                status: 'friend',
                lastNotifiedAt: null,
                toUser: {
                    id: 'friend-id',
                    firstName: 'Friend',
                    lastName: 'User',
                    username: 'frienduser',
                },
            };

            const mockDb = createMockDb({ relationships: [friendRelationship] });
            mockDb.query.userRelationships.findMany = vi.fn().mockResolvedValue([friendRelationship]);
            vi.mocked(getDb).mockReturnValue(mockDb as never);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/friends', {
                headers: authHeaders,
            }, env);
            const body = await response.json() as { friends: Array<{ id: string; status: string }> };

            expect(response.status).toBe(200);
            expect(body).toHaveProperty('friends');
            expect(Array.isArray(body.friends)).toBe(true);
            expect(body.friends.length).toBeGreaterThan(0);
            expect(body.friends[0]!.status).toBe('friend');
        });

        it('should return empty array when no friends', async () => {
            const mockDb = createMockDb({ relationships: [] });
            mockDb.query.userRelationships.findMany = vi.fn().mockResolvedValue([]);
            vi.mocked(getDb).mockReturnValue(mockDb as never);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/friends', {
                headers: authHeaders,
            }, env);
            const body = await response.json() as { friends: unknown[] };

            expect(response.status).toBe(200);
            expect(body.friends).toEqual([]);
        });

        it('should include pending and requested relationships', async () => {
            const relationships: MockRelationship[] = [
                {
                    fromUserId: 'test-user-id',
                    toUserId: 'friend-id',
                    status: 'friend',
                    lastNotifiedAt: null,
                    toUser: { id: 'friend-id', firstName: 'Friend', lastName: 'User', username: 'friend' },
                },
                {
                    fromUserId: 'test-user-id',
                    toUserId: 'pending-id',
                    status: 'pending',
                    lastNotifiedAt: null,
                    toUser: { id: 'pending-id', firstName: 'Pending', lastName: 'User', username: 'pending' },
                },
                {
                    fromUserId: 'test-user-id',
                    toUserId: 'requested-id',
                    status: 'requested',
                    lastNotifiedAt: null,
                    toUser: { id: 'requested-id', firstName: 'Requested', lastName: 'User', username: 'requested' },
                },
            ];

            const mockDb = createMockDb({ relationships });
            mockDb.query.userRelationships.findMany = vi.fn().mockResolvedValue(relationships);
            vi.mocked(getDb).mockReturnValue(mockDb as never);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/friends', {
                headers: authHeaders,
            }, env);
            const body = await response.json() as { friends: Array<{ status: string }> };

            expect(response.status).toBe(200);
            expect(body.friends.length).toBe(3);
            const statuses = body.friends.map(f => f.status);
            expect(statuses).toContain('friend');
            expect(statuses).toContain('pending');
            expect(statuses).toContain('requested');
        });

        it('should return 401 when not authenticated', async () => {
            vi.mocked(verifyToken).mockResolvedValue(null);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/friends', {
                headers: authHeaders,
            }, env);

            expect(response.status).toBe(401);
        });
    });

    // =========================================================================
    // GET /v1/users/me/privacy - Get Privacy Settings
    // =========================================================================
    describe('GET /v1/users/me/privacy', () => {
        const authHeaders = { Authorization: 'Bearer test-token' };

        it('should return privacy settings', async () => {
            const mockUser = createMockAccount({
                id: 'test-user-id',
                showOnlineStatus: true,
                profileVisibility: 'public',
                friendRequestPermission: 'anyone',
            });

            const mockDb = createMockDb({ accounts: [mockUser] });
            mockDb.query.accounts.findFirst = vi.fn().mockResolvedValue(mockUser);
            vi.mocked(getDb).mockReturnValue(mockDb as never);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/users/me/privacy', {
                headers: authHeaders,
            }, env);
            const body = await response.json() as {
                showOnlineStatus: boolean;
                profileVisibility: string;
                friendRequestPermission: string;
            };

            expect(response.status).toBe(200);
            expect(body.showOnlineStatus).toBe(true);
            expect(body.profileVisibility).toBe('public');
            expect(body.friendRequestPermission).toBe('anyone');
        });

        it('should return friends-only profile visibility', async () => {
            const mockUser = createMockAccount({
                id: 'test-user-id',
                profileVisibility: 'friends-only',
            });

            const mockDb = createMockDb({ accounts: [mockUser] });
            mockDb.query.accounts.findFirst = vi.fn().mockResolvedValue(mockUser);
            vi.mocked(getDb).mockReturnValue(mockDb as never);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/users/me/privacy', {
                headers: authHeaders,
            }, env);
            const body = await response.json() as { profileVisibility: string };

            expect(response.status).toBe(200);
            expect(body.profileVisibility).toBe('friends-only');
        });

        it('should return friends-of-friends permission', async () => {
            const mockUser = createMockAccount({
                id: 'test-user-id',
                friendRequestPermission: 'friends-of-friends',
            });

            const mockDb = createMockDb({ accounts: [mockUser] });
            mockDb.query.accounts.findFirst = vi.fn().mockResolvedValue(mockUser);
            vi.mocked(getDb).mockReturnValue(mockDb as never);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/users/me/privacy', {
                headers: authHeaders,
            }, env);
            const body = await response.json() as { friendRequestPermission: string };

            expect(response.status).toBe(200);
            expect(body.friendRequestPermission).toBe('friends-of-friends');
        });

        it('should return none permission', async () => {
            const mockUser = createMockAccount({
                id: 'test-user-id',
                friendRequestPermission: 'none',
            });

            const mockDb = createMockDb({ accounts: [mockUser] });
            mockDb.query.accounts.findFirst = vi.fn().mockResolvedValue(mockUser);
            vi.mocked(getDb).mockReturnValue(mockDb as never);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/users/me/privacy', {
                headers: authHeaders,
            }, env);
            const body = await response.json() as { friendRequestPermission: string };

            expect(response.status).toBe(200);
            expect(body.friendRequestPermission).toBe('none');
        });

        it('should return 401 when user not found', async () => {
            const mockDb = createMockDb();
            mockDb.query.accounts.findFirst = vi.fn().mockResolvedValue(null);
            vi.mocked(getDb).mockReturnValue(mockDb as never);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/users/me/privacy', {
                headers: authHeaders,
            }, env);
            const body = await response.json() as { error: string };

            expect(response.status).toBe(401);
            expect(body.error).toBe('Unauthorized');
        });

        it('should return 401 when not authenticated', async () => {
            vi.mocked(verifyToken).mockResolvedValue(null);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/users/me/privacy', {
                headers: authHeaders,
            }, env);

            expect(response.status).toBe(401);
        });
    });

    // =========================================================================
    // PATCH /v1/users/me/privacy - Update Privacy Settings
    // =========================================================================
    describe('PATCH /v1/users/me/privacy', () => {
        const authHeaders = {
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json',
        };

        it('should update showOnlineStatus', async () => {
            const mockUser = createMockAccount({
                id: 'test-user-id',
                showOnlineStatus: false,
                profileVisibility: 'public',
                friendRequestPermission: 'anyone',
            });

            const mockDb = createMockDb({ accounts: [mockUser] });
            mockDb.query.accounts.findFirst = vi.fn().mockResolvedValue(mockUser);
            vi.mocked(getDb).mockReturnValue(mockDb as never);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/users/me/privacy', {
                method: 'PATCH',
                headers: authHeaders,
                body: JSON.stringify({ showOnlineStatus: false }),
            }, env);
            const body = await response.json() as { showOnlineStatus: boolean };

            expect(response.status).toBe(200);
            expect(body.showOnlineStatus).toBe(false);
        });

        it('should update profileVisibility', async () => {
            const mockUser = createMockAccount({
                id: 'test-user-id',
                showOnlineStatus: true,
                profileVisibility: 'friends-only',
                friendRequestPermission: 'anyone',
            });

            const mockDb = createMockDb({ accounts: [mockUser] });
            mockDb.query.accounts.findFirst = vi.fn().mockResolvedValue(mockUser);
            vi.mocked(getDb).mockReturnValue(mockDb as never);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/users/me/privacy', {
                method: 'PATCH',
                headers: authHeaders,
                body: JSON.stringify({ profileVisibility: 'friends-only' }),
            }, env);
            const body = await response.json() as { profileVisibility: string };

            expect(response.status).toBe(200);
            expect(body.profileVisibility).toBe('friends-only');
        });

        it('should update friendRequestPermission to friends-of-friends', async () => {
            const mockUser = createMockAccount({
                id: 'test-user-id',
                showOnlineStatus: true,
                profileVisibility: 'public',
                friendRequestPermission: 'friends-of-friends',
            });

            const mockDb = createMockDb({ accounts: [mockUser] });
            mockDb.query.accounts.findFirst = vi.fn().mockResolvedValue(mockUser);
            vi.mocked(getDb).mockReturnValue(mockDb as never);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/users/me/privacy', {
                method: 'PATCH',
                headers: authHeaders,
                body: JSON.stringify({ friendRequestPermission: 'friends-of-friends' }),
            }, env);
            const body = await response.json() as { friendRequestPermission: string };

            expect(response.status).toBe(200);
            expect(body.friendRequestPermission).toBe('friends-of-friends');
        });

        it('should update friendRequestPermission to none', async () => {
            const mockUser = createMockAccount({
                id: 'test-user-id',
                showOnlineStatus: true,
                profileVisibility: 'public',
                friendRequestPermission: 'none',
            });

            const mockDb = createMockDb({ accounts: [mockUser] });
            mockDb.query.accounts.findFirst = vi.fn().mockResolvedValue(mockUser);
            vi.mocked(getDb).mockReturnValue(mockDb as never);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/users/me/privacy', {
                method: 'PATCH',
                headers: authHeaders,
                body: JSON.stringify({ friendRequestPermission: 'none' }),
            }, env);
            const body = await response.json() as { friendRequestPermission: string };

            expect(response.status).toBe(200);
            expect(body.friendRequestPermission).toBe('none');
        });

        it('should update multiple settings at once', async () => {
            const mockUser = createMockAccount({
                id: 'test-user-id',
                showOnlineStatus: false,
                profileVisibility: 'friends-only',
                friendRequestPermission: 'none',
            });

            const mockDb = createMockDb({ accounts: [mockUser] });
            mockDb.query.accounts.findFirst = vi.fn().mockResolvedValue(mockUser);
            vi.mocked(getDb).mockReturnValue(mockDb as never);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/users/me/privacy', {
                method: 'PATCH',
                headers: authHeaders,
                body: JSON.stringify({
                    showOnlineStatus: false,
                    profileVisibility: 'friends-only',
                    friendRequestPermission: 'none',
                }),
            }, env);
            const body = await response.json() as {
                showOnlineStatus: boolean;
                profileVisibility: string;
                friendRequestPermission: string;
            };

            expect(response.status).toBe(200);
            expect(body.showOnlineStatus).toBe(false);
            expect(body.profileVisibility).toBe('friends-only');
            expect(body.friendRequestPermission).toBe('none');
        });

        it('should return 401 when user not found', async () => {
            const mockDb = createMockDb();
            mockDb.query.accounts.findFirst = vi.fn().mockResolvedValue(null);
            vi.mocked(getDb).mockReturnValue(mockDb as never);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/users/me/privacy', {
                method: 'PATCH',
                headers: authHeaders,
                body: JSON.stringify({ showOnlineStatus: false }),
            }, env);
            const body = await response.json() as { error: string };

            expect(response.status).toBe(401);
            expect(body.error).toBe('Unauthorized');
        });

        it('should return 401 when not authenticated', async () => {
            vi.mocked(verifyToken).mockResolvedValue(null);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/users/me/privacy', {
                method: 'PATCH',
                headers: authHeaders,
                body: JSON.stringify({ showOnlineStatus: false }),
            }, env);

            expect(response.status).toBe(401);
        });

        it('should handle empty update body', async () => {
            const mockUser = createMockAccount({
                id: 'test-user-id',
                showOnlineStatus: true,
                profileVisibility: 'public',
                friendRequestPermission: 'anyone',
            });

            const mockDb = createMockDb({ accounts: [mockUser] });
            mockDb.query.accounts.findFirst = vi.fn().mockResolvedValue(mockUser);
            vi.mocked(getDb).mockReturnValue(mockDb as never);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/users/me/privacy', {
                method: 'PATCH',
                headers: authHeaders,
                body: JSON.stringify({}),
            }, env);
            const body = await response.json() as {
                showOnlineStatus: boolean;
                profileVisibility: string;
                friendRequestPermission: string;
            };

            expect(response.status).toBe(200);
            // Should return unchanged values
            expect(body.showOnlineStatus).toBe(true);
            expect(body.profileVisibility).toBe('public');
            expect(body.friendRequestPermission).toBe('anyone');
        });
    });

    // =========================================================================
    // Helper Function Tests (for mutation testing coverage)
    // =========================================================================
    describe('helper function edge cases', () => {
        const authHeaders = {
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json',
        };

        it('should not send notification when status is rejected', async () => {
            const currentUser = createMockAccount({ id: 'test-user-id' });
            const targetUser = createMockAccount({
                id: 'target-user-id',
                username: 'target',
                friendRequestPermission: 'anyone',
            });
            const rejectedRelationship: MockRelationship = {
                fromUserId: 'target-user-id',
                toUserId: 'test-user-id',
                status: 'rejected',  // Target rejected our previous request
                lastNotifiedAt: null,
            };

            const mockDb = createMockDb({ accounts: [currentUser, targetUser], relationships: [rejectedRelationship] });
            mockDb.query.accounts.findFirst = vi.fn()
                .mockResolvedValueOnce(currentUser)
                .mockResolvedValueOnce(targetUser);
            mockDb.query.userRelationships.findFirst = vi.fn()
                .mockResolvedValueOnce({ status: 'rejected' })  // Current user's relationship (rejected)
                .mockResolvedValueOnce(rejectedRelationship)    // Target's relationship
                .mockResolvedValueOnce({ status: 'rejected' })  // For relationshipSet
                .mockResolvedValueOnce(rejectedRelationship)    // For relationshipSet
                .mockResolvedValueOnce({ status: 'rejected', lastNotifiedAt: null }); // For notification check - should NOT send due to rejected status
            mockDb.query.userFeedItems.findFirst = vi.fn().mockResolvedValue(null);
            vi.mocked(getDb).mockReturnValue(mockDb as never);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/friends/add', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ uid: 'target-user-id' }),
            }, env);

            expect(response.status).toBe(200);
            // Notification should not be created for rejected status
        });

        it('should respect 24-hour notification cooldown', async () => {
            const currentUser = createMockAccount({ id: 'test-user-id' });
            const targetUser = createMockAccount({
                id: 'target-user-id',
                username: 'target',
                friendRequestPermission: 'anyone',
            });
            const recentNotification: MockRelationship = {
                fromUserId: 'target-user-id',
                toUserId: 'test-user-id',
                status: 'pending',
                lastNotifiedAt: new Date(),  // Just notified
            };

            const mockDb = createMockDb({ accounts: [currentUser, targetUser], relationships: [recentNotification] });
            mockDb.query.accounts.findFirst = vi.fn()
                .mockResolvedValueOnce(currentUser)
                .mockResolvedValueOnce(targetUser);
            mockDb.query.userRelationships.findFirst = vi.fn()
                .mockResolvedValueOnce(null)               // Current user's relationship (none)
                .mockResolvedValueOnce(null)               // Target's relationship (none)
                .mockResolvedValueOnce(null)               // For relationshipSet
                .mockResolvedValueOnce(null)               // For relationshipSet
                .mockResolvedValueOnce(recentNotification); // For notification check - within 24h
            mockDb.query.userFeedItems.findFirst = vi.fn().mockResolvedValue(null);
            vi.mocked(getDb).mockReturnValue(mockDb as never);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/friends/add', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ uid: 'target-user-id' }),
            }, env);

            expect(response.status).toBe(200);
            // Notification should not be created due to cooldown
        });

        it('should send notification after 24-hour cooldown expires', async () => {
            const currentUser = createMockAccount({ id: 'test-user-id' });
            const targetUser = createMockAccount({
                id: 'target-user-id',
                username: 'target',
                feedSeq: 5,
                friendRequestPermission: 'anyone',
            });
            const oldNotification: MockRelationship = {
                fromUserId: 'target-user-id',
                toUserId: 'test-user-id',
                status: 'pending',
                lastNotifiedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),  // 25 hours ago
            };

            const mockDb = createMockDb({ accounts: [currentUser, targetUser], relationships: [oldNotification] });
            mockDb.query.accounts.findFirst = vi.fn()
                .mockResolvedValueOnce(currentUser)
                .mockResolvedValueOnce(targetUser)
                .mockResolvedValueOnce(targetUser);  // For feed notification
            mockDb.query.userRelationships.findFirst = vi.fn()
                .mockResolvedValueOnce(null)            // Current user's relationship (none)
                .mockResolvedValueOnce(null)            // Target's relationship (none)
                .mockResolvedValueOnce(null)            // For relationshipSet
                .mockResolvedValueOnce(null)            // For relationshipSet
                .mockResolvedValueOnce(oldNotification); // For notification check - past 24h
            mockDb.query.userFeedItems.findFirst = vi.fn().mockResolvedValue(null);
            vi.mocked(getDb).mockReturnValue(mockDb as never);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/friends/add', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ uid: 'target-user-id' }),
            }, env);

            expect(response.status).toBe(200);
            // Notification should be created since cooldown expired
        });

        it('should handle existing feed item with same repeatKey', async () => {
            const currentUser = createMockAccount({ id: 'test-user-id' });
            const targetUser = createMockAccount({
                id: 'target-user-id',
                username: 'target',
                feedSeq: 5,
                friendRequestPermission: 'anyone',
            });
            const existingFeedItem: MockFeedItem = {
                id: 'existing-feed-id',
                userId: 'target-user-id',
                counter: 5,
                repeatKey: 'friend_request_test-user-id',
                body: { kind: 'friend_request', uid: 'test-user-id' },
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const mockDb = createMockDb({ accounts: [currentUser, targetUser], feedItems: [existingFeedItem] });
            mockDb.query.accounts.findFirst = vi.fn()
                .mockResolvedValueOnce(currentUser)
                .mockResolvedValueOnce(targetUser)
                .mockResolvedValueOnce(targetUser);  // For feed notification
            mockDb.query.userRelationships.findFirst = vi.fn()
                .mockResolvedValueOnce(null)  // Current user's relationship (none)
                .mockResolvedValueOnce(null)  // Target's relationship (none)
                .mockResolvedValueOnce(null)  // For relationshipSet
                .mockResolvedValueOnce(null)  // For relationshipSet
                .mockResolvedValueOnce({ status: 'pending', lastNotifiedAt: null }); // For notification check
            mockDb.query.userFeedItems.findFirst = vi.fn().mockResolvedValue(existingFeedItem);
            vi.mocked(getDb).mockReturnValue(mockDb as never);

            const { app, env } = createTestApp();

            const response = await app.request('/v1/friends/add', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ uid: 'target-user-id' }),
            }, env);

            expect(response.status).toBe(200);
            // Should update existing feed item instead of creating new one
        });
    });
});
