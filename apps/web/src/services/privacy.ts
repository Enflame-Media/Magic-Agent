/**
 * Privacy Settings Service
 *
 * Handles fetching and updating user privacy settings.
 *
 * @see HAP-727 - Add privacy setting to hide online status from friends
 */

import { useAuthStore } from '@/stores/auth';
import { getApiBaseUrl } from './apiBase';

export interface PrivacySettings {
    showOnlineStatus: boolean;
}

/**
 * Get the server URL from environment
 */
function getServerUrl(): string {
    return getApiBaseUrl();
}

/**
 * Get current user's privacy settings
 */
export async function getPrivacySettings(): Promise<PrivacySettings> {
    const authStore = useAuthStore();
    if (!authStore.token) {
        throw new Error('Not authenticated');
    }

    const response = await fetch(`${getServerUrl()}/v1/users/me/privacy`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${authStore.token}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to get privacy settings: ${response.status}`);
    }

    return response.json();
}

/**
 * Update current user's privacy settings
 */
export async function updatePrivacySettings(
    settings: Partial<PrivacySettings>
): Promise<PrivacySettings> {
    const authStore = useAuthStore();
    if (!authStore.token) {
        throw new Error('Not authenticated');
    }

    const response = await fetch(`${getServerUrl()}/v1/users/me/privacy`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${authStore.token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
    });

    if (!response.ok) {
        throw new Error(`Failed to update privacy settings: ${response.status}`);
    }

    return response.json();
}
