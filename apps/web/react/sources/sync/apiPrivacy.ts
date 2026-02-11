/**
 * Privacy Settings API
 *
 * Handles fetching and updating user privacy settings.
 *
 * @see HAP-727 - Add privacy setting to hide online status from friends
 */

import { z } from 'zod';
import { AuthCredentials } from '@/auth/tokenStorage';
import { backoff } from '@/utils/time';
import { getServerUrl } from './serverConfig';
import { AppError, ErrorCodes } from '@/utils/errors';
import { authenticatedFetch } from './apiHelper';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export const ProfileVisibilitySchema = z.enum(['public', 'friends-only']);
export type ProfileVisibility = z.infer<typeof ProfileVisibilitySchema>;

export const FriendRequestPermissionSchema = z.enum(['anyone', 'friends-of-friends', 'none']);
export type FriendRequestPermission = z.infer<typeof FriendRequestPermissionSchema>;

export const PrivacySettingsSchema = z.object({
    showOnlineStatus: z.boolean(),
    profileVisibility: ProfileVisibilitySchema,
    friendRequestPermission: FriendRequestPermissionSchema
});

export type PrivacySettings = z.infer<typeof PrivacySettingsSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// API Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get current user's privacy settings
 */
export async function getPrivacySettings(
    credentials: AuthCredentials
): Promise<PrivacySettings> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await authenticatedFetch(
            `${API_ENDPOINT}/v1/users/me/privacy`,
            credentials,
            { method: 'GET', useDedupe: true },
            'getting privacy settings'
        );

        if (!response.ok) {
            throw new AppError(
                ErrorCodes.FETCH_FAILED,
                `Failed to get privacy settings: ${response.status}`,
                { canTryAgain: true }
            );
        }

        const data = await response.json();
        const parsed = PrivacySettingsSchema.safeParse(data);
        if (!parsed.success) {
            console.error('Failed to parse privacy settings:', parsed.error);
            // Return default if parse fails
            return {
                showOnlineStatus: true,
                profileVisibility: 'public',
                friendRequestPermission: 'anyone'
            };
        }

        return parsed.data;
    });
}

/**
 * Update current user's privacy settings
 */
export async function updatePrivacySettings(
    credentials: AuthCredentials,
    settings: Partial<PrivacySettings>
): Promise<PrivacySettings> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await authenticatedFetch(
            `${API_ENDPOINT}/v1/users/me/privacy`,
            credentials,
            {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            },
            'updating privacy settings'
        );

        if (!response.ok) {
            throw new AppError(
                ErrorCodes.API_ERROR,
                `Failed to update privacy settings: ${response.status}`,
                { canTryAgain: true }
            );
        }

        const data = await response.json();
        const parsed = PrivacySettingsSchema.safeParse(data);
        if (!parsed.success) {
            console.error('Failed to parse privacy settings response:', parsed.error);
            throw new AppError(
                ErrorCodes.API_ERROR,
                'Invalid response from server',
                { canTryAgain: false }
            );
        }

        return parsed.data;
    });
}
