import { ref, computed } from 'vue';
import { API_BASE_URL, apiRequest } from '../lib/api';

/**
 * User type matching API response
 */
export interface AdminUser {
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
}

/**
 * User list response from API
 */
interface UserListResponse {
    users: AdminUser[];
    total: number;
    limit: number;
    offset: number;
    timestamp: string;
}

/**
 * Role update response from API
 */
interface RoleUpdateResponse {
    success: boolean;
    userId: string;
    previousRole: string | null;
    newRole: string;
}

/**
 * Composable for admin user management
 *
 * Provides reactive state and methods for:
 * - Fetching user list with pagination and filters
 * - Updating user roles
 * - Banning/unbanning users (via Better-Auth endpoints)
 *
 * @see HAP-639 Admin User Management API & Dashboard UI
 */
export function useAdminUsers() {
    // Reactive state
    const users = ref<AdminUser[]>([]);
    const loading = ref(false);
    const error = ref<string | null>(null);
    const total = ref(0);
    const limit = ref(50);
    const offset = ref(0);

    // Filter state
    const searchQuery = ref('');
    const roleFilter = ref<'admin' | 'user' | ''>('');

    // Computed
    const currentPage = computed(() => Math.floor(offset.value / limit.value) + 1);
    const totalPages = computed(() => Math.ceil(total.value / limit.value));
    const hasNextPage = computed(() => offset.value + limit.value < total.value);
    const hasPrevPage = computed(() => offset.value > 0);

    /**
     * Fetch users from API with current filters
     */
    async function fetchUsers(params: {
        limit?: number;
        offset?: number;
        search?: string;
        role?: 'admin' | 'user' | '';
    } = {}) {
        loading.value = true;
        error.value = null;

        try {
            const queryParams = new URLSearchParams();
            queryParams.set('limit', String(params.limit ?? limit.value));
            queryParams.set('offset', String(params.offset ?? offset.value));

            if (params.search ?? searchQuery.value) {
                queryParams.set('search', params.search ?? searchQuery.value);
            }
            if (params.role ?? roleFilter.value) {
                queryParams.set('role', params.role ?? roleFilter.value);
            }

            const response = await fetch(
                `${API_BASE_URL}/api/admin/users?${queryParams}`,
                {
                    credentials: 'include',
                }
            );

            if (!response.ok) {
                const data = await response.json().catch(() => ({})) as { message?: string };
                throw new Error(data.message || `Failed to fetch users: ${response.status}`);
            }

            const data: UserListResponse = await response.json();
            users.value = data.users;
            total.value = data.total;
            limit.value = data.limit;
            offset.value = data.offset;
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to fetch users';
            console.error('[AdminUsers] Fetch error:', e);
        } finally {
            loading.value = false;
        }
    }

    /**
     * Search users by email/name
     */
    async function search(query: string) {
        searchQuery.value = query;
        offset.value = 0;
        await fetchUsers({ search: query, offset: 0 });
    }

    /**
     * Filter users by role
     */
    async function filterByRole(role: 'admin' | 'user' | '') {
        roleFilter.value = role;
        offset.value = 0;
        await fetchUsers({ role, offset: 0 });
    }

    /**
     * Go to next page
     */
    async function nextPage() {
        if (hasNextPage.value) {
            offset.value += limit.value;
            await fetchUsers({ offset: offset.value });
        }
    }

    /**
     * Go to previous page
     */
    async function prevPage() {
        if (hasPrevPage.value) {
            offset.value = Math.max(0, offset.value - limit.value);
            await fetchUsers({ offset: offset.value });
        }
    }

    /**
     * Update user role
     *
     * @param userId - The user ID to update
     * @param role - The new role ('admin' or 'user')
     * @returns Promise<boolean> - Success status
     */
    async function updateUserRole(userId: string, role: 'admin' | 'user'): Promise<boolean> {
        try {
            // apiRequest throws ApiError on failure and returns parsed JSON
            const data = await apiRequest<RoleUpdateResponse>(
                `${API_BASE_URL}/api/admin/users/${userId}/role`,
                {
                    method: 'POST',
                    body: JSON.stringify({ role }),
                }
            );

            if (data.success) {
                // Update local state
                const user = users.value.find((u) => u.id === userId);
                if (user) {
                    user.role = role;
                }
                return true;
            }
            return false;
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to update role';
            console.error('[AdminUsers] Role update error:', e);
            return false;
        }
    }

    /**
     * Ban a user (uses Better-Auth endpoint)
     *
     * @param userId - The user ID to ban
     * @param reason - Optional ban reason
     * @param expiresIn - Optional expiration in seconds
     * @returns Promise<boolean> - Success status
     */
    async function banUser(
        userId: string,
        reason?: string,
        expiresIn?: number
    ): Promise<boolean> {
        try {
            const body: Record<string, unknown> = { userId };
            if (reason) body.banReason = reason;
            if (expiresIn) body.banExpiresIn = expiresIn;

            // apiRequest throws ApiError on failure and returns parsed JSON
            await apiRequest<{ user: { banned: boolean } }>(
                `${API_BASE_URL}/api/auth/admin/ban-user`,
                {
                    method: 'POST',
                    body: JSON.stringify(body),
                }
            );

            // Refresh user list to get updated ban status
            await fetchUsers();
            return true;
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to ban user';
            console.error('[AdminUsers] Ban error:', e);
            return false;
        }
    }

    /**
     * Unban a user (uses Better-Auth endpoint)
     *
     * @param userId - The user ID to unban
     * @returns Promise<boolean> - Success status
     */
    async function unbanUser(userId: string): Promise<boolean> {
        try {
            // apiRequest throws ApiError on failure and returns parsed JSON
            await apiRequest<{ user: { banned: boolean } }>(
                `${API_BASE_URL}/api/auth/admin/unban-user`,
                {
                    method: 'POST',
                    body: JSON.stringify({ userId }),
                }
            );

            // Refresh user list to get updated ban status
            await fetchUsers();
            return true;
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to unban user';
            console.error('[AdminUsers] Unban error:', e);
            return false;
        }
    }

    /**
     * Clear error state
     */
    function clearError() {
        error.value = null;
    }

    return {
        // State
        users,
        loading,
        error,
        total,
        limit,
        offset,
        searchQuery,
        roleFilter,

        // Computed
        currentPage,
        totalPages,
        hasNextPage,
        hasPrevPage,

        // Methods
        fetchUsers,
        search,
        filterByRole,
        nextPage,
        prevPage,
        updateUserRole,
        banUser,
        unbanUser,
        clearError,
    };
}
