/**
 * Hook for managing Claude OAuth token lifecycle.
 *
 * This hook provides:
 * - Token retrieval from secure storage (with server fallback)
 * - Automatic token refresh before expiration
 * - Token cleanup on disconnect
 *
 * @module hooks/useClaudeAuth
 *
 * @example Basic usage
 * ```typescript
 * function MyComponent() {
 *   const { isConnected, getAccessToken, isRefreshing } = useClaudeAuth();
 *
 *   const handleApiCall = async () => {
 *     const token = await getAccessToken();
 *     if (token) {
 *       // Use token for Claude API calls
 *     }
 *   };
 * }
 * ```
 */

import * as React from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { useAuth } from '@/auth/AuthContext';
import { useProfile } from '@/sync/storage';
import { refreshClaudeToken, ClaudeAuthTokens } from '@/utils/oauth';
import { fetchClaudeToken } from '@/sync/apiServices';

/** Secure storage key for Claude OAuth tokens */
const CLAUDE_TOKEN_KEY = 'claude_auth_token';

/** Refresh tokens 5 minutes before expiry to avoid race conditions */
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * Return type for the useClaudeAuth hook.
 */
export interface UseClaudeAuthReturn {
    /** Whether user has connected Claude account (based on profile.connectedServices) */
    isConnected: boolean;
    /** Get valid access token (auto-refreshes if needed). Returns null if not connected or token unavailable. */
    getAccessToken: () => Promise<string | null>;
    /** Current token expiration time in milliseconds, or null if no token cached */
    expiresAt: number | null;
    /** Whether token is currently being refreshed */
    isRefreshing: boolean;
    /** Clear stored tokens (call this on disconnect) */
    clearTokens: () => Promise<void>;
}

/**
 * Platform-agnostic secure storage utilities.
 * On mobile: Uses expo-secure-store (hardware-backed encryption)
 * On web: Uses localStorage with AES-GCM encryption
 */
const secureStorage = {
    async get(key: string): Promise<string | null> {
        if (Platform.OS === 'web') {
            return localStorage.getItem(key);
        }
        return SecureStore.getItemAsync(key);
    },

    async set(key: string, value: string): Promise<void> {
        if (Platform.OS === 'web') {
            localStorage.setItem(key, value);
            return;
        }
        await SecureStore.setItemAsync(key, value);
    },

    async remove(key: string): Promise<void> {
        if (Platform.OS === 'web') {
            localStorage.removeItem(key);
            return;
        }
        await SecureStore.deleteItemAsync(key);
    },
};

/**
 * Hook for managing Claude OAuth token lifecycle.
 *
 * Implements a token management strategy with:
 * 1. Local-first: Check SecureStore for cached tokens
 * 2. Server fallback: Fetch from server if not cached locally
 * 3. Proactive refresh: Refresh tokens before they expire
 * 4. Error recovery: Return null on failure, prompting re-auth
 */
export function useClaudeAuth(): UseClaudeAuthReturn {
    const auth = useAuth();
    const profile = useProfile();
    const [tokens, setTokens] = React.useState<ClaudeAuthTokens | null>(null);
    const [isRefreshing, setIsRefreshing] = React.useState(false);

    // Check if Anthropic is in the connected services list
    const isConnected = React.useMemo(
        () => profile.connectedServices?.includes('anthropic') ?? false,
        [profile.connectedServices]
    );

    /**
     * Load tokens from secure storage on mount.
     * This runs once when the component mounts if connected.
     */
    const loadStoredTokens = React.useCallback(async () => {
        try {
            const stored = await secureStorage.get(CLAUDE_TOKEN_KEY);
            if (stored) {
                const parsed = JSON.parse(stored) as ClaudeAuthTokens;
                setTokens(parsed);
            }
        } catch (e) {
            console.error('[useClaudeAuth] Failed to load stored tokens:', e);
        }
    }, []);

    // Load tokens when connected status changes
    React.useEffect(() => {
        if (isConnected) {
            loadStoredTokens();
        } else {
            // Clear tokens if disconnected
            setTokens(null);
        }
    }, [isConnected, loadStoredTokens]);

    /**
     * Save tokens to secure storage and update state.
     */
    const saveTokens = React.useCallback(async (newTokens: ClaudeAuthTokens) => {
        await secureStorage.set(CLAUDE_TOKEN_KEY, JSON.stringify(newTokens));
        setTokens(newTokens);
    }, []);

    /**
     * Fetch tokens from the server.
     * Called when tokens aren't cached locally.
     */
    const fetchTokensFromServer = React.useCallback(async (): Promise<ClaudeAuthTokens | null> => {
        if (!auth.credentials) {
            console.log('[useClaudeAuth] No auth credentials available');
            return null;
        }

        try {
            const serverTokens = await fetchClaudeToken(auth.credentials);
            if (serverTokens) {
                await saveTokens(serverTokens);
                return serverTokens;
            }
            return null;
        } catch (e) {
            console.error('[useClaudeAuth] Failed to fetch tokens from server:', e);
            return null;
        }
    }, [auth.credentials, saveTokens]);

    /**
     * Get a valid access token, refreshing if needed.
     *
     * This is the main function consumers should use. It:
     * 1. Returns cached token if still valid
     * 2. Refreshes if token is about to expire
     * 3. Fetches from server if no local cache
     * 4. Returns null if unable to get a valid token
     */
    const getAccessToken = React.useCallback(async (): Promise<string | null> => {
        if (!isConnected) {
            return null;
        }

        // If no tokens cached, fetch from server
        if (!tokens) {
            const serverTokens = await fetchTokensFromServer();
            return serverTokens?.token ?? null;
        }

        // Check if token needs refresh (5 minutes before expiry)
        const needsRefresh = tokens.expires - Date.now() < REFRESH_THRESHOLD_MS;

        if (needsRefresh && tokens.raw.refresh_token) {
            setIsRefreshing(true);
            try {
                console.log('[useClaudeAuth] Token expiring soon, refreshing...');
                const refreshed = await refreshClaudeToken(tokens.raw.refresh_token);
                await saveTokens(refreshed);
                return refreshed.token;
            } catch (e) {
                console.error('[useClaudeAuth] Token refresh failed:', e);
                // Token expired and refresh failed - user needs to re-auth
                // Clear local tokens so next call will try server
                await secureStorage.remove(CLAUDE_TOKEN_KEY);
                setTokens(null);
                return null;
            } finally {
                setIsRefreshing(false);
            }
        }

        return tokens.token;
    }, [isConnected, tokens, fetchTokensFromServer, saveTokens]);

    /**
     * Clear all stored Claude tokens.
     * Call this when the user disconnects their Claude account.
     */
    const clearTokens = React.useCallback(async () => {
        await secureStorage.remove(CLAUDE_TOKEN_KEY);
        setTokens(null);
    }, []);

    return {
        isConnected,
        getAccessToken,
        expiresAt: tokens?.expires ?? null,
        isRefreshing,
        clearTokens,
    };
}
