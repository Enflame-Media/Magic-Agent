<script setup lang="ts">
/**
 * Admin Users View
 *
 * User management dashboard for administrators.
 * Features:
 * - Paginated user list
 * - Search by email/name
 * - Filter by role
 * - Edit user role via modal
 * - Ban/unban users with confirmation
 * - Self-action buttons disabled
 *
 * @see HAP-639 Admin User Management API & Dashboard UI
 */
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAdminUsers, type AdminUser } from '../composables/useAdminUsers';
import { API_BASE_URL, apiRequest } from '../lib/api';

const router = useRouter();

// Initialize composable
const {
    users,
    loading,
    error,
    total,
    searchQuery,
    roleFilter,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    fetchUsers,
    search,
    filterByRole,
    nextPage,
    prevPage,
    updateUserRole,
    banUser,
    unbanUser,
    clearError,
} = useAdminUsers();

// Current user (to disable self-actions)
const currentUserId = ref<string | null>(null);

// Modal state
const showEditModal = ref(false);
const showBanModal = ref(false);
const editingUser = ref<AdminUser | null>(null);
const selectedRole = ref<'admin' | 'user'>('user');
const banReason = ref('');
const actionLoading = ref(false);

// Toast state
const toast = ref<{ type: 'success' | 'error'; message: string } | null>(null);

/**
 * Show toast notification
 */
function showToast(type: 'success' | 'error', message: string) {
    toast.value = { type, message };
    setTimeout(() => {
        toast.value = null;
    }, 3000);
}

/**
 * Handle search input with debounce
 */
let searchTimeout: ReturnType<typeof setTimeout>;
function handleSearch(event: Event) {
    const query = (event.target as HTMLInputElement).value;
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        search(query);
    }, 300);
}

/**
 * Handle role filter change
 */
function handleRoleFilter(event: Event) {
    const role = (event.target as HTMLSelectElement).value as 'admin' | 'user' | '';
    filterByRole(role);
}

/**
 * Open edit modal for a user
 */
function openEditModal(user: AdminUser) {
    editingUser.value = user;
    selectedRole.value = (user.role as 'admin' | 'user') || 'user';
    showEditModal.value = true;
}

/**
 * Close edit modal
 */
function closeEditModal() {
    showEditModal.value = false;
    editingUser.value = null;
}

/**
 * Save user role from edit modal
 */
async function saveRole() {
    if (!editingUser.value) return;

    actionLoading.value = true;
    const success = await updateUserRole(editingUser.value.id, selectedRole.value);
    actionLoading.value = false;

    if (success) {
        showToast('success', `Role updated to ${selectedRole.value}`);
        closeEditModal();
    } else {
        showToast('error', error.value || 'Failed to update role');
    }
}

/**
 * Open ban confirmation modal
 */
function openBanModal(user: AdminUser) {
    editingUser.value = user;
    banReason.value = '';
    showBanModal.value = true;
}

/**
 * Close ban modal
 */
function closeBanModal() {
    showBanModal.value = false;
    editingUser.value = null;
    banReason.value = '';
}

/**
 * Confirm ban user
 */
async function confirmBan() {
    if (!editingUser.value) return;

    actionLoading.value = true;
    const success = await banUser(editingUser.value.id, banReason.value || undefined);
    actionLoading.value = false;

    if (success) {
        showToast('success', 'User banned successfully');
        closeBanModal();
    } else {
        showToast('error', error.value || 'Failed to ban user');
    }
}

/**
 * Unban user directly
 */
async function handleUnban(user: AdminUser) {
    actionLoading.value = true;
    const success = await unbanUser(user.id);
    actionLoading.value = false;

    if (success) {
        showToast('success', 'User unbanned successfully');
    } else {
        showToast('error', error.value || 'Failed to unban user');
    }
}

/**
 * Check if user is current user (to disable self-actions)
 */
function isSelf(user: AdminUser): boolean {
    return user.id === currentUserId.value;
}

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

/**
 * Handle logout
 */
async function handleLogout() {
    try {
        await apiRequest(`${API_BASE_URL}/api/auth/sign-out`, {
            method: 'POST',
        });
        await router.push('/login');
    } catch (err) {
        console.error('Logout error:', err);
    }
}

/**
 * Navigate back to dashboard
 */
function goToDashboard() {
    router.push('/');
}

// Fetch current user and user list on mount
onMounted(async () => {
    // Get current user session
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/get-session`, {
            credentials: 'include',
        });
        if (response.ok) {
            const data = await response.json();
            currentUserId.value = data.user?.id || null;
        }
    } catch (e) {
        console.error('Failed to get session:', e);
    }

    // Fetch users
    await fetchUsers();
});
</script>

<template>
    <div class="min-h-screen">
        <!-- Header -->
        <header class="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div class="flex items-center gap-4">
                        <button
                            class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            title="Back to Dashboard"
                            @click="goToDashboard"
                        >
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                                />
                            </svg>
                        </button>
                        <h1 class="text-xl font-bold text-gray-900 dark:text-white">
                            User Management
                        </h1>
                    </div>
                    <div class="flex flex-wrap items-center gap-3">
                        <!-- Refresh button -->
                        <button
                            class="btn-secondary text-sm"
                            :disabled="loading"
                            @click="fetchUsers()"
                        >
                            <span v-if="loading" class="inline-flex items-center gap-1">
                                <span class="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" />
                                Loading...
                            </span>
                            <span v-else>Refresh</span>
                        </button>

                        <!-- Sign Out -->
                        <button class="btn-secondary text-sm" @click="handleLogout">
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
            <!-- Filters -->
            <div class="card mb-6">
                <div class="flex flex-col sm:flex-row gap-4">
                    <!-- Search -->
                    <div class="flex-1">
                        <label for="search" class="sr-only">Search users</label>
                        <div class="relative">
                            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                    />
                                </svg>
                            </div>
                            <input
                                id="search"
                                type="text"
                                class="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-happy-500 focus:border-transparent"
                                placeholder="Search by email or name..."
                                :value="searchQuery"
                                @input="handleSearch"
                            />
                        </div>
                    </div>

                    <!-- Role Filter -->
                    <div class="sm:w-40">
                        <label for="role-filter" class="sr-only">Filter by role</label>
                        <select
                            id="role-filter"
                            class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-happy-500 focus:border-transparent"
                            :value="roleFilter"
                            @change="handleRoleFilter"
                        >
                            <option value="">All Roles</option>
                            <option value="admin">Admins</option>
                            <option value="user">Users</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Error State -->
            <div v-if="error && !loading" class="card text-center py-8 mb-6">
                <svg
                    class="w-12 h-12 text-red-400 mx-auto mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg>
                <p class="text-red-600 dark:text-red-400 mb-4">{{ error }}</p>
                <button class="btn-primary" @click="fetchUsers()">
                    Try Again
                </button>
            </div>

            <!-- Users Table -->
            <div v-else class="card overflow-hidden">
                <!-- Loading State -->
                <div
                    v-if="loading && !users.length"
                    class="flex items-center justify-center py-12"
                >
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-happy-600" />
                </div>

                <!-- Empty State -->
                <div
                    v-else-if="!users.length"
                    class="flex flex-col items-center justify-center py-12"
                >
                    <svg class="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                    </svg>
                    <p class="text-gray-400 dark:text-gray-500">No users found</p>
                </div>

                <!-- Table -->
                <div v-else class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead class="bg-gray-50 dark:bg-gray-800/50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    User
                                </th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Role
                                </th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Status
                                </th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Created
                                </th>
                                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            <tr
                                v-for="user in users"
                                :key="user.id"
                                class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                            >
                                <!-- User Info -->
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="flex items-center">
                                        <div class="flex-shrink-0 h-10 w-10">
                                            <div
                                                v-if="user.image"
                                                class="h-10 w-10 rounded-full bg-cover bg-center"
                                                :style="{ backgroundImage: `url(${user.image})` }"
                                            />
                                            <div
                                                v-else
                                                class="h-10 w-10 rounded-full bg-happy-100 dark:bg-happy-900 flex items-center justify-center"
                                            >
                                                <span class="text-happy-600 dark:text-happy-400 font-medium text-sm">
                                                    {{ user.name.charAt(0).toUpperCase() }}
                                                </span>
                                            </div>
                                        </div>
                                        <div class="ml-4">
                                            <div class="text-sm font-medium text-gray-900 dark:text-white">
                                                {{ user.name }}
                                                <span v-if="isSelf(user)" class="ml-1 text-xs text-gray-400">(you)</span>
                                            </div>
                                            <div class="text-sm text-gray-500 dark:text-gray-400">
                                                {{ user.email }}
                                            </div>
                                        </div>
                                    </div>
                                </td>

                                <!-- Role Badge -->
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <span
                                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                        :class="{
                                            'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400': user.role === 'admin',
                                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300': user.role !== 'admin',
                                        }"
                                    >
                                        {{ user.role || 'user' }}
                                    </span>
                                </td>

                                <!-- Status Badge -->
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <span
                                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                        :class="{
                                            'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400': user.banned,
                                            'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400': !user.banned,
                                        }"
                                    >
                                        {{ user.banned ? 'Banned' : 'Active' }}
                                    </span>
                                    <p v-if="user.banned && user.banReason" class="text-xs text-gray-400 mt-1 max-w-[200px] truncate">
                                        {{ user.banReason }}
                                    </p>
                                </td>

                                <!-- Created Date -->
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    {{ formatDate(user.createdAt) }}
                                </td>

                                <!-- Actions -->
                                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div class="flex items-center justify-end gap-2">
                                        <!-- Edit Role Button -->
                                        <button
                                            class="text-happy-600 hover:text-happy-900 dark:text-happy-400 dark:hover:text-happy-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                            :disabled="isSelf(user)"
                                            :title="isSelf(user) ? 'Cannot edit your own role' : 'Edit role'"
                                            @click="openEditModal(user)"
                                        >
                                            Edit
                                        </button>

                                        <!-- Ban/Unban Button -->
                                        <button
                                            v-if="!user.banned"
                                            class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                            :disabled="isSelf(user)"
                                            :title="isSelf(user) ? 'Cannot ban yourself' : 'Ban user'"
                                            @click="openBanModal(user)"
                                        >
                                            Ban
                                        </button>
                                        <button
                                            v-else
                                            class="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                            :disabled="isSelf(user)"
                                            :title="isSelf(user) ? 'Cannot unban yourself' : 'Unban user'"
                                            @click="handleUnban(user)"
                                        >
                                            Unban
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Pagination -->
                <div
                    v-if="users.length > 0"
                    class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between"
                >
                    <div class="text-sm text-gray-500 dark:text-gray-400">
                        Showing {{ users.length }} of {{ total }} users
                    </div>
                    <div class="flex items-center gap-2">
                        <button
                            class="btn-secondary text-sm"
                            :disabled="!hasPrevPage || loading"
                            @click="prevPage()"
                        >
                            Previous
                        </button>
                        <span class="text-sm text-gray-500 dark:text-gray-400">
                            Page {{ currentPage }} of {{ totalPages }}
                        </span>
                        <button
                            class="btn-secondary text-sm"
                            :disabled="!hasNextPage || loading"
                            @click="nextPage()"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </main>

        <!-- Edit Role Modal -->
        <div
            v-if="showEditModal"
            class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            @click.self="closeEditModal"
        >
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Edit User Role
                </h2>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Changing role for <span class="font-medium">{{ editingUser?.email }}</span>
                </p>

                <div class="mb-6">
                    <label for="role-select" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Role
                    </label>
                    <select
                        id="role-select"
                        v-model="selectedRole"
                        class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-happy-500 focus:border-transparent"
                        data-testid="role-select"
                    >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>

                <div class="flex justify-end gap-3">
                    <button
                        class="btn-secondary"
                        :disabled="actionLoading"
                        @click="closeEditModal"
                    >
                        Cancel
                    </button>
                    <button
                        class="btn-primary"
                        :disabled="actionLoading"
                        data-testid="save-btn"
                        @click="saveRole"
                    >
                        <span v-if="actionLoading" class="inline-flex items-center gap-1">
                            <span class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                            Saving...
                        </span>
                        <span v-else>Save</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- Ban User Modal -->
        <div
            v-if="showBanModal"
            class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            @click.self="closeBanModal"
        >
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Ban User
                </h2>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Are you sure you want to ban <span class="font-medium">{{ editingUser?.email }}</span>?
                </p>

                <div class="mb-6">
                    <label for="ban-reason" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Reason (optional)
                    </label>
                    <textarea
                        id="ban-reason"
                        v-model="banReason"
                        rows="3"
                        class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        placeholder="Enter reason for banning..."
                    />
                </div>

                <div class="flex justify-end gap-3">
                    <button
                        class="btn-secondary"
                        :disabled="actionLoading"
                        @click="closeBanModal"
                    >
                        Cancel
                    </button>
                    <button
                        class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
                        :disabled="actionLoading"
                        @click="confirmBan"
                    >
                        <span v-if="actionLoading" class="inline-flex items-center gap-1">
                            <span class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                            Banning...
                        </span>
                        <span v-else>Ban User</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- Toast Notification -->
        <div
            v-if="toast"
            class="fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg"
            :class="{
                'bg-green-600 text-white': toast.type === 'success',
                'bg-red-600 text-white': toast.type === 'error',
            }"
        >
            {{ toast.message }}
        </div>
    </div>
</template>
