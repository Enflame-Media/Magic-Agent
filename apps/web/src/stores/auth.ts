/**
 * Authentication Store
 *
 * Manages authentication state including token and account information.
 * Uses Composition API (setup syntax) for better TypeScript inference.
 *
 * @example
 * ```typescript
 * const auth = useAuthStore();
 * auth.setCredentials('token123', 'account456');
 * if (auth.isAuthenticated) {
 *     console.log('Logged in as:', auth.accountId);
 * }
 * ```
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { GitHubProfile, ImageRef } from '@happy-vue/protocol';
import {
    logout as clearStoredCredentials,
    loadCredentials,
} from '@/services/auth';

/**
 * Account information synchronized from the server
 */
export interface AccountInfo {
    id: string;
    firstName: string | null;
    lastName: string | null;
    avatar: ImageRef | null;
    github: GitHubProfile | null;
}

export const useAuthStore = defineStore('auth', () => {
    // ─────────────────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────────────────

    /** JWT access token for API requests */
    const token = ref<string | null>(null);

    /** Current user's account ID */
    const accountId = ref<string | null>(null);

    /** Account profile information */
    const account = ref<AccountInfo | null>(null);

    // ─────────────────────────────────────────────────────────────────────────
    // Getters (Computed)
    // ─────────────────────────────────────────────────────────────────────────

    /** Whether the user is authenticated (has a valid token) */
    const isAuthenticated = computed(() => !!token.value && !!accountId.value);

    /** User's display name (firstName lastName or 'User') */
    const displayName = computed(() => {
        if (!account.value) return null;
        const { firstName, lastName } = account.value;
        if (firstName && lastName) return `${firstName} ${lastName}`;
        if (firstName) return firstName;
        if (lastName) return lastName;
        return null;
    });

    /** User's initials for avatar fallback */
    const initials = computed(() => {
        if (!account.value) return null;
        const { firstName, lastName } = account.value;
        const first = firstName?.[0]?.toUpperCase() ?? '';
        const last = lastName?.[0]?.toUpperCase() ?? '';
        return first + last || null;
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Actions
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Set authentication credentials after login
     */
    function setCredentials(newToken: string, newAccountId: string) {
        token.value = newToken;
        accountId.value = newAccountId;
    }

    /**
     * Update account profile information
     */
    function setAccount(info: AccountInfo) {
        account.value = info;
    }

    /**
     * Update partial account information (from update-account events)
     */
    function updateAccount(updates: Partial<AccountInfo>) {
        if (account.value) {
            account.value = { ...account.value, ...updates };
        } else if (updates.id) {
            // Initialize account with partial data
            account.value = {
                id: updates.id,
                firstName: updates.firstName ?? null,
                lastName: updates.lastName ?? null,
                avatar: updates.avatar ?? null,
                github: updates.github ?? null,
            };
        }
    }

    /**
     * Clear all authentication state (logout)
     */
    function logout(): void {
        // Clear reactive state
        token.value = null;
        accountId.value = null;
        account.value = null;
        // Clear persisted credentials from secure storage
        clearStoredCredentials();
    }

    /**
     * Initialize auth state from persisted credentials
     * Should be called on app startup
     */
    async function initialize(): Promise<boolean> {
        const credentials = await loadCredentials();
        if (credentials) {
            token.value = credentials.token;
            // Note: accountId is set separately after fetching account info
            return true;
        }
        return false;
    }

    /**
     * Reset store to initial state
     */
    function $reset() {
        logout();
    }

    return {
        // State
        token,
        accountId,
        account,
        // Getters
        isAuthenticated,
        displayName,
        initials,
        // Actions
        initialize,
        setCredentials,
        setAccount,
        updateAccount,
        logout,
        $reset,
    };
});
