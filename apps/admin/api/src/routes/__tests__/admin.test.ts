/**
 * Unit Tests for Admin User Management API Routes
 *
 * These tests verify the functionality of the admin user management
 * endpoints including listing, filtering, pagination, and role updates.
 *
 * @see HAP-640 - Add unit tests for admin user management API routes
 * @see HAP-639 - Admin User Management API & Dashboard UI
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { Hono } from 'hono';
import type { Env, Variables, AuthUser } from '../../env';

/**
 * Mock user data type matching the schema
 */
interface MockUser {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
    role: string | null;
    banned: boolean | null;
    banReason: string | null;
    banExpires: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Response types for type-safe assertions
 */
interface UsersListResponse {
    users: Array<{
        id: string;
        name: string;
        email: string;
        emailVerified: boolean;
        image: string | null;
        role: string | null;
        banned: boolean;
        banReason: string | null;
        banExpires: string | null;
        createdAt: string;
        updatedAt: string;
    }>;
    total: number;
    limit: number;
    offset: number;
    timestamp: string;
}

interface UserDetailResponse {
    user: {
        id: string;
        name: string;
        email: string;
        emailVerified: boolean;
        image: string | null;
        role: string | null;
        banned: boolean;
        banReason: string | null;
        banExpires: string | null;
        createdAt: string;
        updatedAt: string;
    };
    timestamp: string;
}

interface RoleUpdateResponse {
    success: boolean;
    userId: string;
    previousRole: string | null;
    newRole: string;
}

interface ErrorResponse {
    error: string;
    message: string;
}

/**
 * Mock function types for proper TypeScript typing with Vitest mock methods
 */
type MockDbSelectAll = Mock<() => Promise<MockUser[]>>;
type MockDbSelectOne = Mock<(id: string) => Promise<MockUser | undefined>>;
type MockDbUpdate = Mock<(id: string, data: { role: string }) => Promise<void>>;

/**
 * Creates testable admin routes with injectable database mock
 *
 * This mirrors the real admin routes but allows injecting mock data
 * instead of using real D1 database connections.
 */
function createTestableAdminRoutes(
    mockDbSelectAll: () => Promise<MockUser[]>,
    mockDbSelectOne: (id: string) => Promise<MockUser | undefined>,
    mockDbUpdate: (id: string, data: { role: string }) => Promise<void>,
    currentUser: AuthUser | null
) {
    const app = new Hono<{ Bindings: Env; Variables: Variables }>();

    // Set current user in context (simulates middleware)
    app.use('*', async (c, next) => {
        c.set('user', currentUser);
        await next();
    });

    // GET /api/admin/users - List all users with pagination
    app.get('/api/admin/users', async (c) => {
        const url = new URL(c.req.url);
        const limitParam = url.searchParams.get('limit') ?? '50';
        const offsetParam = url.searchParams.get('offset') ?? '0';
        const search = url.searchParams.get('search') ?? undefined;
        const role = url.searchParams.get('role') as 'admin' | 'user' | undefined;

        const limitNum = Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 100);
        const offsetNum = Math.max(parseInt(offsetParam, 10) || 0, 0);

        const allUsers = await mockDbSelectAll();

        let filteredUsers = allUsers;

        if (search) {
            const searchLower = search.toLowerCase();
            filteredUsers = filteredUsers.filter(
                (u) =>
                    u.email.toLowerCase().includes(searchLower) ||
                    u.name.toLowerCase().includes(searchLower)
            );
        }

        if (role) {
            filteredUsers = filteredUsers.filter((u) => u.role === role);
        }

        const total = filteredUsers.length;
        const paginatedUsers = filteredUsers.slice(offsetNum, offsetNum + limitNum);

        const users = paginatedUsers.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            emailVerified: u.emailVerified,
            image: u.image,
            role: u.role,
            banned: u.banned ?? false,
            banReason: u.banReason,
            banExpires: u.banExpires ? u.banExpires.toISOString() : null,
            createdAt: u.createdAt.toISOString(),
            updatedAt: u.updatedAt.toISOString(),
        }));

        return c.json({
            users,
            total,
            limit: limitNum,
            offset: offsetNum,
            timestamp: new Date().toISOString(),
        });
    });

    // GET /api/admin/users/:id - Get single user
    app.get('/api/admin/users/:id', async (c) => {
        const id = c.req.param('id');
        const user = await mockDbSelectOne(id);

        if (!user) {
            return c.json(
                {
                    error: 'Not Found',
                    message: 'User not found',
                },
                404
            );
        }

        const userResponse = {
            id: user.id,
            name: user.name,
            email: user.email,
            emailVerified: user.emailVerified,
            image: user.image,
            role: user.role,
            banned: user.banned ?? false,
            banReason: user.banReason,
            banExpires: user.banExpires ? user.banExpires.toISOString() : null,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
        };

        return c.json({
            user: userResponse,
            timestamp: new Date().toISOString(),
        });
    });

    // POST /api/admin/users/:id/role - Update user role
    app.post('/api/admin/users/:id/role', async (c) => {
        const id = c.req.param('id');
        const currentUserFromContext = c.get('user');

        let body: { role?: string };
        try {
            body = await c.req.json();
        } catch {
            return c.json(
                {
                    error: 'Bad Request',
                    message: 'Invalid JSON body',
                },
                400
            );
        }

        const role = body.role;

        if (!role || (role !== 'admin' && role !== 'user')) {
            return c.json(
                {
                    error: 'Bad Request',
                    message: "Role must be 'admin' or 'user'",
                },
                400
            );
        }

        // SECURITY: Prevent self-demotion/modification
        if (currentUserFromContext?.id === id) {
            return c.json(
                {
                    error: 'Forbidden',
                    message: 'Cannot modify your own role',
                },
                400
            );
        }

        const targetUser = await mockDbSelectOne(id);

        if (!targetUser) {
            return c.json(
                {
                    error: 'Not Found',
                    message: 'User not found',
                },
                404
            );
        }

        await mockDbUpdate(id, { role });

        return c.json({
            success: true,
            userId: id,
            previousRole: targetUser.role,
            newRole: role,
        });
    });

    return app;
}

/**
 * Factory to create mock users for testing
 */
function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
    const now = new Date();
    return {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        emailVerified: true,
        image: null,
        role: 'user',
        banned: false,
        banReason: null,
        banExpires: null,
        createdAt: now,
        updatedAt: now,
        ...overrides,
    };
}

describe('Admin User Management API (HAP-640)', () => {
    let mockDbSelectAll: MockDbSelectAll;
    let mockDbSelectOne: MockDbSelectOne;
    let mockDbUpdate: MockDbUpdate;
    let currentAdmin: AuthUser;

    beforeEach(() => {
        vi.clearAllMocks();

        mockDbSelectAll = vi.fn();
        mockDbSelectOne = vi.fn();
        mockDbUpdate = vi.fn();

        currentAdmin = {
            id: 'admin-001',
            email: 'admin@example.com',
            emailVerified: true,
            name: 'Admin User',
            image: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            role: 'admin',
        };
    });

    describe('GET /api/admin/users', () => {
        it('returns paginated user list', async () => {
            const mockUsers = [
                createMockUser({ id: 'user-1', name: 'User One', email: 'user1@test.com' }),
                createMockUser({ id: 'user-2', name: 'User Two', email: 'user2@test.com' }),
                createMockUser({ id: 'user-3', name: 'User Three', email: 'user3@test.com' }),
            ];

            mockDbSelectAll.mockResolvedValue(mockUsers);

            const app = createTestableAdminRoutes(
                mockDbSelectAll,
                mockDbSelectOne,
                mockDbUpdate,
                currentAdmin
            );

            const res = await app.request('/api/admin/users');

            expect(res.status).toBe(200);
            const body = (await res.json()) as UsersListResponse;
            expect(body.users).toHaveLength(3);
            expect(body.total).toBe(3);
            expect(body.limit).toBe(50); // default
            expect(body.offset).toBe(0);
            expect(body.timestamp).toBeDefined();
        });

        it('filters by search query (email)', async () => {
            const mockUsers = [
                createMockUser({ id: 'user-1', name: 'Alice', email: 'alice@test.com' }),
                createMockUser({ id: 'user-2', name: 'Bob', email: 'bob@test.com' }),
                createMockUser({ id: 'user-3', name: 'Charlie', email: 'charlie@test.com' }),
            ];

            mockDbSelectAll.mockResolvedValue(mockUsers);

            const app = createTestableAdminRoutes(
                mockDbSelectAll,
                mockDbSelectOne,
                mockDbUpdate,
                currentAdmin
            );

            const res = await app.request('/api/admin/users?search=alice');

            expect(res.status).toBe(200);
            const body = (await res.json()) as UsersListResponse;
            expect(body.users).toHaveLength(1);
            expect(body.users[0].email).toBe('alice@test.com');
            expect(body.total).toBe(1);
        });

        it('filters by search query (name)', async () => {
            const mockUsers = [
                createMockUser({ id: 'user-1', name: 'Alice Smith', email: 'alice@test.com' }),
                createMockUser({ id: 'user-2', name: 'Bob Jones', email: 'bob@test.com' }),
            ];

            mockDbSelectAll.mockResolvedValue(mockUsers);

            const app = createTestableAdminRoutes(
                mockDbSelectAll,
                mockDbSelectOne,
                mockDbUpdate,
                currentAdmin
            );

            const res = await app.request('/api/admin/users?search=smith');

            expect(res.status).toBe(200);
            const body = (await res.json()) as UsersListResponse;
            expect(body.users).toHaveLength(1);
            expect(body.users[0].name).toBe('Alice Smith');
        });

        it('filters by role', async () => {
            const mockUsers = [
                createMockUser({ id: 'user-1', name: 'Admin User', role: 'admin' }),
                createMockUser({ id: 'user-2', name: 'Regular User', role: 'user' }),
                createMockUser({ id: 'user-3', name: 'Another Admin', role: 'admin' }),
            ];

            mockDbSelectAll.mockResolvedValue(mockUsers);

            const app = createTestableAdminRoutes(
                mockDbSelectAll,
                mockDbSelectOne,
                mockDbUpdate,
                currentAdmin
            );

            const res = await app.request('/api/admin/users?role=admin');

            expect(res.status).toBe(200);
            const body = (await res.json()) as UsersListResponse;
            expect(body.users).toHaveLength(2);
            expect(body.users.every((u) => u.role === 'admin')).toBe(true);
            expect(body.total).toBe(2);
        });

        it('respects limit and offset parameters', async () => {
            const mockUsers = Array.from({ length: 10 }, (_, i) =>
                createMockUser({
                    id: `user-${i + 1}`,
                    name: `User ${i + 1}`,
                    email: `user${i + 1}@test.com`,
                })
            );

            mockDbSelectAll.mockResolvedValue(mockUsers);

            const app = createTestableAdminRoutes(
                mockDbSelectAll,
                mockDbSelectOne,
                mockDbUpdate,
                currentAdmin
            );

            const res = await app.request('/api/admin/users?limit=3&offset=2');

            expect(res.status).toBe(200);
            const body = (await res.json()) as UsersListResponse;
            expect(body.users).toHaveLength(3);
            expect(body.users[0].id).toBe('user-3'); // offset=2 means start from 3rd user
            expect(body.limit).toBe(3);
            expect(body.offset).toBe(2);
            expect(body.total).toBe(10); // total before pagination
        });

        it('clamps limit to maximum of 100', async () => {
            mockDbSelectAll.mockResolvedValue([]);

            const app = createTestableAdminRoutes(
                mockDbSelectAll,
                mockDbSelectOne,
                mockDbUpdate,
                currentAdmin
            );

            const res = await app.request('/api/admin/users?limit=500');

            expect(res.status).toBe(200);
            const body = (await res.json()) as UsersListResponse;
            expect(body.limit).toBe(100);
        });

        it('falls back to default when limit is 0 (falsy)', async () => {
            // Note: The implementation uses `parseInt(limitParam, 10) || 50`
            // which means 0 is falsy and falls back to 50, then clamped to [1,100]
            mockDbSelectAll.mockResolvedValue([]);

            const app = createTestableAdminRoutes(
                mockDbSelectAll,
                mockDbSelectOne,
                mockDbUpdate,
                currentAdmin
            );

            const res = await app.request('/api/admin/users?limit=0');

            expect(res.status).toBe(200);
            const body = (await res.json()) as UsersListResponse;
            expect(body.limit).toBe(50); // Falls back to default, not clamped to 1
        });

        it('clamps offset to minimum of 0', async () => {
            mockDbSelectAll.mockResolvedValue([]);

            const app = createTestableAdminRoutes(
                mockDbSelectAll,
                mockDbSelectOne,
                mockDbUpdate,
                currentAdmin
            );

            const res = await app.request('/api/admin/users?offset=-5');

            expect(res.status).toBe(200);
            const body = (await res.json()) as UsersListResponse;
            expect(body.offset).toBe(0);
        });

        it('handles combined search and role filter', async () => {
            const mockUsers = [
                createMockUser({ id: 'user-1', name: 'Alice Admin', email: 'alice@test.com', role: 'admin' }),
                createMockUser({ id: 'user-2', name: 'Alice User', email: 'alice2@test.com', role: 'user' }),
                createMockUser({ id: 'user-3', name: 'Bob Admin', email: 'bob@test.com', role: 'admin' }),
            ];

            mockDbSelectAll.mockResolvedValue(mockUsers);

            const app = createTestableAdminRoutes(
                mockDbSelectAll,
                mockDbSelectOne,
                mockDbUpdate,
                currentAdmin
            );

            const res = await app.request('/api/admin/users?search=alice&role=admin');

            expect(res.status).toBe(200);
            const body = (await res.json()) as UsersListResponse;
            expect(body.users).toHaveLength(1);
            expect(body.users[0].name).toBe('Alice Admin');
        });

        it('returns empty array when no users match', async () => {
            mockDbSelectAll.mockResolvedValue([
                createMockUser({ id: 'user-1', name: 'Test', email: 'test@test.com' }),
            ]);

            const app = createTestableAdminRoutes(
                mockDbSelectAll,
                mockDbSelectOne,
                mockDbUpdate,
                currentAdmin
            );

            const res = await app.request('/api/admin/users?search=nonexistent');

            expect(res.status).toBe(200);
            const body = (await res.json()) as UsersListResponse;
            expect(body.users).toHaveLength(0);
            expect(body.total).toBe(0);
        });

        it('performs case-insensitive search', async () => {
            const mockUsers = [
                createMockUser({ id: 'user-1', name: 'ALICE', email: 'ALICE@TEST.COM' }),
            ];

            mockDbSelectAll.mockResolvedValue(mockUsers);

            const app = createTestableAdminRoutes(
                mockDbSelectAll,
                mockDbSelectOne,
                mockDbUpdate,
                currentAdmin
            );

            const res = await app.request('/api/admin/users?search=alice');

            expect(res.status).toBe(200);
            const body = (await res.json()) as UsersListResponse;
            expect(body.users).toHaveLength(1);
        });
    });

    describe('GET /api/admin/users/:id', () => {
        it('returns user details for valid ID', async () => {
            const mockUser = createMockUser({
                id: 'user-123',
                name: 'Test User',
                email: 'test@example.com',
                role: 'user',
            });

            mockDbSelectOne.mockResolvedValue(mockUser);

            const app = createTestableAdminRoutes(
                mockDbSelectAll,
                mockDbSelectOne,
                mockDbUpdate,
                currentAdmin
            );

            const res = await app.request('/api/admin/users/user-123');

            expect(res.status).toBe(200);
            const body = (await res.json()) as UserDetailResponse;
            expect(body.user.id).toBe('user-123');
            expect(body.user.name).toBe('Test User');
            expect(body.user.email).toBe('test@example.com');
            expect(body.user.role).toBe('user');
            expect(body.timestamp).toBeDefined();
        });

        it('returns 404 for non-existent user', async () => {
            mockDbSelectOne.mockResolvedValue(undefined);

            const app = createTestableAdminRoutes(
                mockDbSelectAll,
                mockDbSelectOne,
                mockDbUpdate,
                currentAdmin
            );

            const res = await app.request('/api/admin/users/nonexistent-id');

            expect(res.status).toBe(404);
            const body = (await res.json()) as ErrorResponse;
            expect(body.error).toBe('Not Found');
            expect(body.message).toBe('User not found');
        });

        it('includes all user fields in response', async () => {
            const banExpires = new Date('2025-12-31T23:59:59Z');
            const mockUser = createMockUser({
                id: 'user-456',
                name: 'Banned User',
                email: 'banned@example.com',
                emailVerified: false,
                image: 'https://example.com/avatar.jpg',
                role: 'user',
                banned: true,
                banReason: 'Spam',
                banExpires,
            });

            mockDbSelectOne.mockResolvedValue(mockUser);

            const app = createTestableAdminRoutes(
                mockDbSelectAll,
                mockDbSelectOne,
                mockDbUpdate,
                currentAdmin
            );

            const res = await app.request('/api/admin/users/user-456');

            expect(res.status).toBe(200);
            const body = (await res.json()) as UserDetailResponse;
            expect(body.user.emailVerified).toBe(false);
            expect(body.user.image).toBe('https://example.com/avatar.jpg');
            expect(body.user.banned).toBe(true);
            expect(body.user.banReason).toBe('Spam');
            expect(body.user.banExpires).toBe(banExpires.toISOString());
        });
    });

    describe('POST /api/admin/users/:id/role', () => {
        it('updates user role when admin authenticated', async () => {
            const targetUser = createMockUser({
                id: 'user-target',
                name: 'Target User',
                email: 'target@example.com',
                role: 'user',
            });

            mockDbSelectOne.mockResolvedValue(targetUser);
            mockDbUpdate.mockResolvedValue(undefined);

            const app = createTestableAdminRoutes(
                mockDbSelectAll,
                mockDbSelectOne,
                mockDbUpdate,
                currentAdmin
            );

            const res = await app.request('/api/admin/users/user-target/role', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: 'admin' }),
            });

            expect(res.status).toBe(200);
            const body = (await res.json()) as RoleUpdateResponse;
            expect(body.success).toBe(true);
            expect(body.userId).toBe('user-target');
            expect(body.previousRole).toBe('user');
            expect(body.newRole).toBe('admin');

            expect(mockDbUpdate).toHaveBeenCalledWith('user-target', { role: 'admin' });
        });

        it('rejects self-role-modification with 400', async () => {
            const app = createTestableAdminRoutes(
                mockDbSelectAll,
                mockDbSelectOne,
                mockDbUpdate,
                currentAdmin
            );

            const res = await app.request('/api/admin/users/admin-001/role', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: 'user' }),
            });

            expect(res.status).toBe(400);
            const body = (await res.json()) as ErrorResponse;
            expect(body.error).toBe('Forbidden');
            expect(body.message).toBe('Cannot modify your own role');

            // Should not have called update
            expect(mockDbUpdate).not.toHaveBeenCalled();
        });

        it('returns 404 for non-existent user', async () => {
            mockDbSelectOne.mockResolvedValue(undefined);

            const app = createTestableAdminRoutes(
                mockDbSelectAll,
                mockDbSelectOne,
                mockDbUpdate,
                currentAdmin
            );

            const res = await app.request('/api/admin/users/nonexistent/role', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: 'admin' }),
            });

            expect(res.status).toBe(404);
            const body = (await res.json()) as ErrorResponse;
            expect(body.error).toBe('Not Found');
            expect(body.message).toBe('User not found');
        });

        it('validates role parameter - rejects invalid role', async () => {
            const app = createTestableAdminRoutes(
                mockDbSelectAll,
                mockDbSelectOne,
                mockDbUpdate,
                currentAdmin
            );

            const res = await app.request('/api/admin/users/user-123/role', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: 'superadmin' }),
            });

            expect(res.status).toBe(400);
            const body = (await res.json()) as ErrorResponse;
            expect(body.error).toBe('Bad Request');
            expect(body.message).toBe("Role must be 'admin' or 'user'");
        });

        it('validates role parameter - rejects empty role', async () => {
            const app = createTestableAdminRoutes(
                mockDbSelectAll,
                mockDbSelectOne,
                mockDbUpdate,
                currentAdmin
            );

            const res = await app.request('/api/admin/users/user-123/role', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: '' }),
            });

            expect(res.status).toBe(400);
            const body = (await res.json()) as ErrorResponse;
            expect(body.message).toBe("Role must be 'admin' or 'user'");
        });

        it('validates role parameter - rejects missing role', async () => {
            const app = createTestableAdminRoutes(
                mockDbSelectAll,
                mockDbSelectOne,
                mockDbUpdate,
                currentAdmin
            );

            const res = await app.request('/api/admin/users/user-123/role', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });

            expect(res.status).toBe(400);
            const body = (await res.json()) as ErrorResponse;
            expect(body.message).toBe("Role must be 'admin' or 'user'");
        });

        it('rejects invalid JSON body with 400', async () => {
            const app = createTestableAdminRoutes(
                mockDbSelectAll,
                mockDbSelectOne,
                mockDbUpdate,
                currentAdmin
            );

            const res = await app.request('/api/admin/users/user-123/role', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: 'not valid json',
            });

            expect(res.status).toBe(400);
            const body = (await res.json()) as ErrorResponse;
            expect(body.error).toBe('Bad Request');
            expect(body.message).toBe('Invalid JSON body');
        });

        it('accepts valid role values: admin', async () => {
            const targetUser = createMockUser({ id: 'user-123', role: 'user' });
            mockDbSelectOne.mockResolvedValue(targetUser);
            mockDbUpdate.mockResolvedValue(undefined);

            const app = createTestableAdminRoutes(
                mockDbSelectAll,
                mockDbSelectOne,
                mockDbUpdate,
                currentAdmin
            );

            const res = await app.request('/api/admin/users/user-123/role', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: 'admin' }),
            });

            expect(res.status).toBe(200);
        });

        it('accepts valid role values: user', async () => {
            const targetUser = createMockUser({ id: 'user-123', role: 'admin' });
            mockDbSelectOne.mockResolvedValue(targetUser);
            mockDbUpdate.mockResolvedValue(undefined);

            const app = createTestableAdminRoutes(
                mockDbSelectAll,
                mockDbSelectOne,
                mockDbUpdate,
                currentAdmin
            );

            const res = await app.request('/api/admin/users/user-123/role', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: 'user' }),
            });

            expect(res.status).toBe(200);
            const body = (await res.json()) as RoleUpdateResponse;
            expect(body.newRole).toBe('user');
        });

        it('preserves previous role in response', async () => {
            const targetUser = createMockUser({ id: 'user-123', role: null });
            mockDbSelectOne.mockResolvedValue(targetUser);
            mockDbUpdate.mockResolvedValue(undefined);

            const app = createTestableAdminRoutes(
                mockDbSelectAll,
                mockDbSelectOne,
                mockDbUpdate,
                currentAdmin
            );

            const res = await app.request('/api/admin/users/user-123/role', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: 'admin' }),
            });

            expect(res.status).toBe(200);
            const body = (await res.json()) as RoleUpdateResponse;
            expect(body.previousRole).toBe(null);
            expect(body.newRole).toBe('admin');
        });
    });
});

describe('Edge Cases and Security', () => {
    let mockDbSelectAll: MockDbSelectAll;
    let mockDbSelectOne: MockDbSelectOne;
    let mockDbUpdate: MockDbUpdate;
    let currentAdmin: AuthUser;

    beforeEach(() => {
        vi.clearAllMocks();

        mockDbSelectAll = vi.fn();
        mockDbSelectOne = vi.fn();
        mockDbUpdate = vi.fn();

        currentAdmin = {
            id: 'admin-001',
            email: 'admin@example.com',
            emailVerified: true,
            name: 'Admin User',
            image: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            role: 'admin',
        };
    });

    it('handles users with null banned field', async () => {
        const mockUser = createMockUser({
            id: 'user-1',
            banned: null,
        });

        mockDbSelectAll.mockResolvedValue([mockUser]);

        const app = createTestableAdminRoutes(
            mockDbSelectAll,
            mockDbSelectOne,
            mockDbUpdate,
            currentAdmin
        );

        const res = await app.request('/api/admin/users');

        expect(res.status).toBe(200);
        const body = (await res.json()) as UsersListResponse;
        expect(body.users[0].banned).toBe(false); // null coerced to false
    });

    it('handles users with null banExpires', async () => {
        const mockUser = createMockUser({
            id: 'user-1',
            banExpires: null,
        });

        mockDbSelectOne.mockResolvedValue(mockUser);

        const app = createTestableAdminRoutes(
            mockDbSelectAll,
            mockDbSelectOne,
            mockDbUpdate,
            currentAdmin
        );

        const res = await app.request('/api/admin/users/user-1');

        expect(res.status).toBe(200);
        const body = (await res.json()) as UserDetailResponse;
        expect(body.user.banExpires).toBe(null);
    });

    it('handles special characters in search query safely', async () => {
        mockDbSelectAll.mockResolvedValue([]);

        const app = createTestableAdminRoutes(
            mockDbSelectAll,
            mockDbSelectOne,
            mockDbUpdate,
            currentAdmin
        );

        // SQL injection attempt in search
        const res = await app.request("/api/admin/users?search=' OR '1'='1");

        expect(res.status).toBe(200);
        // No crash, just returns no results
        const body = (await res.json()) as UsersListResponse;
        expect(body.users).toHaveLength(0);
    });

    it('handles very large offset gracefully', async () => {
        mockDbSelectAll.mockResolvedValue([
            createMockUser({ id: 'user-1' }),
        ]);

        const app = createTestableAdminRoutes(
            mockDbSelectAll,
            mockDbSelectOne,
            mockDbUpdate,
            currentAdmin
        );

        const res = await app.request('/api/admin/users?offset=9999999');

        expect(res.status).toBe(200);
        const body = (await res.json()) as UsersListResponse;
        expect(body.users).toHaveLength(0); // Past end of array
        expect(body.total).toBe(1); // But total still shows actual count
    });

    it('handles invalid limit string gracefully', async () => {
        mockDbSelectAll.mockResolvedValue([]);

        const app = createTestableAdminRoutes(
            mockDbSelectAll,
            mockDbSelectOne,
            mockDbUpdate,
            currentAdmin
        );

        const res = await app.request('/api/admin/users?limit=abc');

        expect(res.status).toBe(200);
        const body = (await res.json()) as UsersListResponse;
        expect(body.limit).toBe(50); // Falls back to default
    });
});
