/**
 * Friends Service for NativeScript-Vue
 *
 * API client for friend-related operations.
 * Handles friend requests, accepts, rejections, and user search.
 *
 * @example
 * ```typescript
 * import { friendsService } from '@/services/friends';
 *
 * // Search for users
 * const users = await friendsService.searchUsers('john');
 *
 * // Send friend request
 * await friendsService.sendFriendRequest('user-id-123');
 *
 * // Get friends list
 * const friends = await friendsService.getFriendsList();
 * ```
 */

import { Connectivity } from '@nativescript/core';
import {
  type UserProfile,
  UserResponseSchema,
  FriendsResponseSchema,
  UsersSearchResponseSchema,
} from './types';

/**
 * API configuration
 */
interface ApiConfig {
  baseUrl: string;
  getAuthToken: () => string | null;
}

/**
 * Error class for API failures
 */
export class FriendsApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly canRetry: boolean = false
  ) {
    super(message);
    this.name = 'FriendsApiError';
  }
}

/**
 * Check if device has network connectivity
 */
function hasNetworkConnection(): boolean {
  const connectionType = Connectivity.getConnectionType();
  return connectionType !== Connectivity.connectionType.none;
}

/**
 * Exponential backoff utility for retries
 */
async function withBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (error instanceof FriendsApiError && !error.canRetry) {
        throw error;
      }

      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError ?? new Error('Unknown error');
}

/**
 * Friends Service Implementation
 */
class FriendsServiceImpl {
  private config: ApiConfig | null = null;

  /**
   * Configure the service with API settings
   */
  configure(config: ApiConfig): void {
    this.config = config;
  }

  /**
   * Get current configuration
   */
  private getConfig(): ApiConfig {
    if (!this.config) {
      throw new FriendsApiError('FriendsService not configured. Call configure() first.');
    }
    return this.config;
  }

  /**
   * Make authenticated API request
   */
  private async authenticatedFetch(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const config = this.getConfig();

    if (!hasNetworkConnection()) {
      throw new FriendsApiError('No network connection', undefined, true);
    }

    const token = config.getAuthToken();
    if (!token) {
      throw new FriendsApiError('Not authenticated', 401);
    }

    const url = `${config.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers as Record<string, string>),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    return response;
  }

  /**
   * Search for users by username
   */
  async searchUsers(query: string): Promise<UserProfile[]> {
    return withBackoff(async () => {
      const params = new URLSearchParams({ query });
      const response = await this.authenticatedFetch(`/v1/users/search?${params}`);

      if (!response.ok) {
        if (response.status === 404) {
          return [];
        }
        throw new FriendsApiError(
          `Failed to search users: ${response.status}`,
          response.status,
          response.status >= 500
        );
      }

      const data = await response.json();
      const parsed = UsersSearchResponseSchema.safeParse(data);

      if (!parsed.success) {
        console.error('[FriendsService] Failed to parse search response:', parsed.error);
        return [];
      }

      return parsed.data.users;
    });
  }

  /**
   * Get a single user profile by ID
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    return withBackoff(async () => {
      const response = await this.authenticatedFetch(`/v1/users/${userId}`);

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new FriendsApiError(
          `Failed to get user profile: ${response.status}`,
          response.status,
          response.status >= 500
        );
      }

      const data = await response.json();
      const parsed = UserResponseSchema.safeParse(data);

      if (!parsed.success) {
        console.error('[FriendsService] Failed to parse user response:', parsed.error);
        return null;
      }

      return parsed.data.user;
    });
  }

  /**
   * Get friends list (includes all statuses: friend, pending, requested)
   */
  async getFriendsList(): Promise<UserProfile[]> {
    return withBackoff(async () => {
      const response = await this.authenticatedFetch('/v1/friends');

      if (!response.ok) {
        throw new FriendsApiError(
          `Failed to get friends list: ${response.status}`,
          response.status,
          response.status >= 500
        );
      }

      const data = await response.json();
      const parsed = FriendsResponseSchema.safeParse(data);

      if (!parsed.success) {
        console.error('[FriendsService] Failed to parse friends list:', parsed.error);
        return [];
      }

      return parsed.data.friends;
    });
  }

  /**
   * Send a friend request (or accept existing request)
   */
  async sendFriendRequest(recipientId: string): Promise<UserProfile | null> {
    return withBackoff(async () => {
      const response = await this.authenticatedFetch('/v1/friends/add', {
        method: 'POST',
        body: JSON.stringify({ uid: recipientId }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new FriendsApiError(
          `Failed to add friend: ${response.status}`,
          response.status,
          response.status >= 500
        );
      }

      const data = await response.json();
      const parsed = UserResponseSchema.safeParse(data);

      if (!parsed.success) {
        console.error('[FriendsService] Failed to parse add friend response:', parsed.error);
        return null;
      }

      return parsed.data.user;
    });
  }

  /**
   * Remove a friend (or reject/cancel friend request)
   */
  async removeFriend(friendId: string): Promise<UserProfile | null> {
    return withBackoff(async () => {
      const response = await this.authenticatedFetch('/v1/friends/remove', {
        method: 'POST',
        body: JSON.stringify({ uid: friendId }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new FriendsApiError(
          `Failed to remove friend: ${response.status}`,
          response.status,
          response.status >= 500
        );
      }

      const data = await response.json();
      const parsed = UserResponseSchema.safeParse(data);

      if (!parsed.success) {
        console.error('[FriendsService] Failed to parse remove friend response:', parsed.error);
        return null;
      }

      return parsed.data.user;
    });
  }

  /**
   * Block a user - prevents them from sending friend requests
   *
   * @param userId - The user ID to block
   * @returns true on success, false on failure
   */
  async blockUser(userId: string): Promise<boolean> {
    return withBackoff(async () => {
      const response = await this.authenticatedFetch('/v1/friends/block', {
        method: 'POST',
        body: JSON.stringify({ uid: userId }),
      });

      if (!response.ok) {
        throw new FriendsApiError(
          `Failed to block user: ${response.status}`,
          response.status,
          response.status >= 500
        );
      }

      return true;
    });
  }

  /**
   * Process a friend invite from QR code or deep link
   * QR code format: happy://friend/add/{userId}
   */
  async processFriendInvite(qrData: string): Promise<UserProfile | null> {
    // Parse QR code format: happy://friend/add/{userId}
    const match = qrData.match(/happy:\/\/friend\/add\/(.+)/);

    if (!match) {
      console.warn('[FriendsService] Invalid QR code format:', qrData);
      return null;
    }

    const userId = match[1]!;
    return this.sendFriendRequest(userId);
  }

  /**
   * Generate a friend invite URL for sharing
   */
  generateInviteUrl(userId: string): string {
    return `https://happy.engineering/friend/add/${userId}`;
  }

  /**
   * Generate a friend invite deep link for QR codes
   */
  generateInviteDeepLink(userId: string): string {
    return `happy://friend/add/${userId}`;
  }
}

/**
 * Singleton friends service instance
 */
export const friendsService = new FriendsServiceImpl();
