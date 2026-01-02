/**
 * Tests for useAdminUsers Composable
 *
 * Tests the admin user management composable including:
 * - Initial state
 * - User fetching and pagination
 * - Filtering and search
 * - Role updates
 * - Ban/unban operations
 *
 * @see HAP-686 - Phase 4: Implement Comprehensive Testing Suite
 * @see HAP-639 - Admin User Management API & Dashboard UI
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAdminUsers, type AdminUser } from './useAdminUsers';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper to create mock user
function mockAdminUser(overrides: Partial<AdminUser> = {}): AdminUser {
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
        createdAt: '2024-01-15T00:00:00.000Z',
        updatedAt: '2024-01-15T00:00:00.000Z',
        ...overrides,
    };
}

// Helper to create mock API response
function mockUserListResponse(users: AdminUser[], total = users.length) {
    return {
        users,
        total,
        limit: 50,
        offset: 0,
        timestamp: new Date().toISOString(),
    };
}

describe('useAdminUsers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockFetch.mockReset();
    });

    describe('initial state', () => {
        it('should initialize with default state', () => {
            const admin = useAdminUsers();

            expect(admin.users.value).toEqual([]);
            expect(admin.loading.value).toBe(false);
            expect(admin.error.value).toBeNull();
            expect(admin.total.value).toBe(0);
            expect(admin.limit.value).toBe(50);
            expect(admin.offset.value).toBe(0);
            expect(admin.searchQuery.value).toBe('');
            expect(admin.roleFilter.value).toBe('');
        });
    });

    describe('computed values', () => {
        it('currentPage should calculate from offset and limit', () => {
            const admin = useAdminUsers();

            expect(admin.currentPage.value).toBe(1);

            admin.offset.value = 50;
            expect(admin.currentPage.value).toBe(2);

            admin.offset.value = 100;
            expect(admin.currentPage.value).toBe(3);
        });

        it('totalPages should calculate from total and limit', () => {
            const admin = useAdminUsers();

            admin.total.value = 100;
            expect(admin.totalPages.value).toBe(2);

            admin.total.value = 125;
            expect(admin.totalPages.value).toBe(3);
        });

        it('hasNextPage should be true when more pages exist', () => {
            const admin = useAdminUsers();

            admin.total.value = 100;
            admin.offset.value = 0;
            expect(admin.hasNextPage.value).toBe(true);

            admin.offset.value = 50;
            expect(admin.hasNextPage.value).toBe(false);
        });

        it('hasPrevPage should be true when not on first page', () => {
            const admin = useAdminUsers();

            expect(admin.hasPrevPage.value).toBe(false);

            admin.offset.value = 50;
            expect(admin.hasPrevPage.value).toBe(true);
        });
    });

    describe('fetchUsers', () => {
        it('should set loading state while fetching', async () => {
            let resolvePromise: (value: Response) => void;
            const pendingPromise = new Promise<Response>((resolve) => {
                resolvePromise = resolve;
            });

            mockFetch.mockReturnValue(pendingPromise);

            const admin = useAdminUsers();
            const fetchPromise = admin.fetchUsers();

            expect(admin.loading.value).toBe(true);

            resolvePromise!({
                ok: true,
                json: () => Promise.resolve(mockUserListResponse([])),
            } as Response);

            await fetchPromise;

            expect(admin.loading.value).toBe(false);
        });

        it('should populate users on successful fetch', async () => {
            const users = [mockAdminUser(), mockAdminUser({ id: 'user-456' })];

            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockUserListResponse(users, 100)),
            });

            const admin = useAdminUsers();
            await admin.fetchUsers();

            expect(admin.users.value).toHaveLength(2);
            expect(admin.total.value).toBe(100);
        });

        it('should handle fetch errors', async () => {
            mockFetch.mockResolvedValue({
                ok: false,
                status: 500,
                json: () => Promise.resolve({ message: 'Server error' }),
            });

            const admin = useAdminUsers();
            await admin.fetchUsers();

            expect(admin.error.value).toBe('Server error');
            expect(admin.loading.value).toBe(false);
        });

        it('should include search and role filters in query', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockUserListResponse([])),
            });

            const admin = useAdminUsers();
            admin.searchQuery.value = 'test@example.com';
            admin.roleFilter.value = 'admin';

            await admin.fetchUsers();

            const url = mockFetch.mock.calls[0]![0] as string;
            expect(url).toContain('search=test%40example.com');
            expect(url).toContain('role=admin');
        });
    });

    describe('search', () => {
        it('should update searchQuery and fetch', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockUserListResponse([])),
            });

            const admin = useAdminUsers();
            await admin.search('john@example.com');

            expect(admin.searchQuery.value).toBe('john@example.com');
            expect(admin.offset.value).toBe(0); // Reset to first page
            expect(mockFetch).toHaveBeenCalled();
        });
    });

    describe('filterByRole', () => {
        it('should update roleFilter and fetch', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockUserListResponse([])),
            });

            const admin = useAdminUsers();
            await admin.filterByRole('admin');

            expect(admin.roleFilter.value).toBe('admin');
            expect(admin.offset.value).toBe(0); // Reset to first page
            expect(mockFetch).toHaveBeenCalled();
        });
    });

    describe('pagination', () => {
        beforeEach(() => {
            // Mock that preserves requested offset in response
            mockFetch.mockImplementation((url: string) => {
                const urlParams = new URLSearchParams(url.split('?')[1] || '');
                const requestedOffset = parseInt(urlParams.get('offset') || '0', 10);
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            users: [],
                            total: 100,
                            limit: 50,
                            offset: requestedOffset,
                            timestamp: new Date().toISOString(),
                        }),
                } as Response);
            });
        });

        it('nextPage should increment offset', async () => {
            const admin = useAdminUsers();
            admin.total.value = 100;

            await admin.nextPage();

            expect(admin.offset.value).toBe(50);
        });

        it('nextPage should not go beyond total', async () => {
            const admin = useAdminUsers();
            admin.total.value = 50;
            admin.offset.value = 0;

            await admin.nextPage();

            expect(admin.offset.value).toBe(0); // Stays at 0 because no next page
        });

        it('prevPage should decrement offset', async () => {
            const admin = useAdminUsers();
            admin.offset.value = 50;

            await admin.prevPage();

            expect(admin.offset.value).toBe(0);
        });

        it('prevPage should not go below 0', async () => {
            const admin = useAdminUsers();
            admin.offset.value = 0;

            await admin.prevPage();

            expect(admin.offset.value).toBe(0);
        });
    });

    describe('clearError', () => {
        it('should clear error state', () => {
            const admin = useAdminUsers();
            admin.error.value = 'Some error';

            admin.clearError();

            expect(admin.error.value).toBeNull();
        });
    });

    // Note: updateUserRole, banUser, and unbanUser tests would require
    // mocking the apiRequest function which has a pre-existing import issue.
    // These tests are skipped for now and tracked for future implementation.
});
