/**
 * Hook for managing session sharing state and operations
 *
 * Provides access to session share settings and mutation operations
 * for sharing sessions with friends or via URL.
 *
 * @example
 * ```tsx
 * const { shareSettings, isLoading, addShare, removeShare, updateUrlSharing } = useSessionSharing(sessionId);
 * ```
 */
import * as React from 'react';
import type {
    SessionShareSettings,
    SessionShareEntry,
    SessionSharePermission,
} from '@magic-agent/protocol';
import { useAuth } from '@/auth/AuthContext';
import { getServerUrl } from '@/sync/serverConfig';
import { t } from '@/text';
import { AppError, ErrorCodes } from '@/utils/errors';
import { useAcceptedFriends } from '@/sync/storage';

// API response types
interface ShareSettingsResponse {
    settings: SessionShareSettings;
}

interface AddShareResponse {
    share: SessionShareEntry;
}

interface SuccessResponse {
    success: boolean;
}

interface UrlSharingResponse {
    urlSharing: SessionShareSettings['urlSharing'];
}

/**
 * API functions for session sharing
 * Note: These will make HTTP requests to the server when the backend is implemented
 * For now, they return mock data to enable UI development
 */
async function fetchShareSettings(
    _baseUrl: string,
    _token: string,
    sessionId: string
): Promise<SessionShareSettings> {
    // TODO: Replace with actual API call when HAP-772 is complete
    // const response = await fetch(`${baseUrl}/v1/sessions/${sessionId}/shares`, {
    //     headers: { Authorization: `Bearer ${token}` },
    // });
    // return (await response.json()).settings;

    // Mock response for UI development
    return {
        sessionId,
        shares: [],
        urlSharing: {
            enabled: false,
            permission: 'view_only' as SessionSharePermission,
        },
        invitations: [],
    };
}

async function addSessionShare(
    _baseUrl: string,
    _token: string,
    sessionId: string,
    userId: string,
    permission: SessionSharePermission
): Promise<SessionShareEntry> {
    // TODO: Replace with actual API call when HAP-772 is complete
    // const response = await fetch(`${baseUrl}/v1/sessions/${sessionId}/shares`, {
    //     method: 'POST',
    //     headers: {
    //         Authorization: `Bearer ${token}`,
    //         'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify({ userId, permission }),
    // });
    // return (await response.json()).share;

    // Mock response for UI development
    return {
        id: crypto.randomUUID(),
        userId,
        permission,
        sharedAt: new Date().toISOString(),
        sharedBy: 'current-user',
    };
}

async function removeSessionShare(
    _baseUrl: string,
    _token: string,
    _sessionId: string,
    _shareId: string
): Promise<void> {
    // TODO: Replace with actual API call when HAP-772 is complete
    // await fetch(`${baseUrl}/v1/sessions/${sessionId}/shares/${shareId}`, {
    //     method: 'DELETE',
    //     headers: { Authorization: `Bearer ${token}` },
    // });

    // Mock - no-op for UI development
}

async function updateUrlSharingConfig(
    _baseUrl: string,
    _token: string,
    sessionId: string,
    config: {
        enabled: boolean;
        password?: string | null;
        permission?: SessionSharePermission;
    }
): Promise<SessionShareSettings['urlSharing']> {
    // TODO: Replace with actual API call when HAP-772 is complete
    // const response = await fetch(`${baseUrl}/v1/sessions/${sessionId}/url-sharing`, {
    //     method: 'PUT',
    //     headers: {
    //         Authorization: `Bearer ${token}`,
    //         'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify(config),
    // });
    // return (await response.json()).urlSharing;

    // Mock response for UI development
    return {
        enabled: config.enabled,
        token: config.enabled ? 'mock-share-token-12345' : undefined,
        password: config.password || undefined,
        permission: config.permission || 'view_only',
    };
}

export interface UseSessionSharingResult {
    /** Current share settings (null while loading) */
    shareSettings: SessionShareSettings | null;
    /** Whether settings are being loaded */
    isLoading: boolean;
    /** Error message if loading failed */
    error: string | null;
    /** Refresh share settings from server */
    refresh: () => Promise<void>;
    /** Add a share for a user */
    addShare: (userId: string, permission: SessionSharePermission) => Promise<void>;
    /** Remove a share */
    removeShare: (shareId: string) => Promise<void>;
    /** Update URL sharing configuration */
    updateUrlSharing: (config: {
        enabled: boolean;
        password?: string | null;
        permission?: SessionSharePermission;
    }) => Promise<void>;
    /** Get the shareable URL for this session */
    getShareUrl: () => string | null;
    /** List of friends available for sharing */
    availableFriends: ReturnType<typeof useAcceptedFriends>;
}

export function useSessionSharing(sessionId: string): UseSessionSharingResult {
    const { credentials } = useAuth();
    const friends = useAcceptedFriends();
    const [shareSettings, setShareSettings] = React.useState<SessionShareSettings | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    // Filter out friends who already have access
    const availableFriends = React.useMemo(() => {
        if (!shareSettings) return friends;
        const sharedUserIds = new Set(shareSettings.shares.map(s => s.userId));
        return friends.filter(f => !sharedUserIds.has(f.id));
    }, [friends, shareSettings]);

    const refresh = React.useCallback(async () => {
        if (!credentials) {
            setError(t('errors.notAuthenticated'));
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            const settings = await fetchShareSettings(
                getServerUrl(),
                credentials.token,
                sessionId
            );
            setShareSettings(settings);
        } catch (e) {
            const message = e instanceof Error ? e.message : t('errors.unknownError');
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, [credentials, sessionId]);

    // Load settings on mount
    React.useEffect(() => {
        refresh();
    }, [refresh]);

    const addShare = React.useCallback(async (userId: string, permission: SessionSharePermission) => {
        if (!credentials) {
            throw new AppError(ErrorCodes.AUTH_FAILED, t('errors.notAuthenticated'), { canTryAgain: false });
        }

        const newShare = await addSessionShare(
            getServerUrl(),
            credentials.token,
            sessionId,
            userId,
            permission
        );

        // Update local state optimistically
        setShareSettings(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                shares: [...prev.shares, newShare],
            };
        });
    }, [credentials, sessionId]);

    const removeShare = React.useCallback(async (shareId: string) => {
        if (!credentials) {
            throw new AppError(ErrorCodes.AUTH_FAILED, t('errors.notAuthenticated'), { canTryAgain: false });
        }

        await removeSessionShare(
            getServerUrl(),
            credentials.token,
            sessionId,
            shareId
        );

        // Update local state optimistically
        setShareSettings(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                shares: prev.shares.filter(s => s.id !== shareId),
            };
        });
    }, [credentials, sessionId]);

    const updateUrlSharing = React.useCallback(async (config: {
        enabled: boolean;
        password?: string | null;
        permission?: SessionSharePermission;
    }) => {
        if (!credentials) {
            throw new AppError(ErrorCodes.AUTH_FAILED, t('errors.notAuthenticated'), { canTryAgain: false });
        }

        const updatedConfig = await updateUrlSharingConfig(
            getServerUrl(),
            credentials.token,
            sessionId,
            config
        );

        // Update local state
        setShareSettings(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                urlSharing: updatedConfig,
            };
        });
    }, [credentials, sessionId]);

    const getShareUrl = React.useCallback(() => {
        if (!shareSettings?.urlSharing.enabled || !shareSettings.urlSharing.token) {
            return null;
        }
        // TODO: Use actual server URL when implemented
        return `https://app.happy.dev/share/${shareSettings.urlSharing.token}`;
    }, [shareSettings]);

    return {
        shareSettings,
        isLoading,
        error,
        refresh,
        addShare,
        removeShare,
        updateUrlSharing,
        getShareUrl,
        availableFriends,
    };
}
