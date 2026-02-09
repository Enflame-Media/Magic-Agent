/**
 * Friends Composable
 *
 * Vue composable for managing friends list, friend requests, and user search.
 * Provides API client methods and reactive state for the friends feature.
 *
 * Features:
 * - Fetch and cache friends list with relationship status grouping
 * - Send, accept, reject, and cancel friend requests
 * - Search for users by username
 * - Error handling with toast notifications
 *
 * @example
 * ```vue
 * <script setup>
 * import { useFriends } from '@/composables/useFriends';
 *
 * const {
 *   friends,
 *   isLoading,
 *   acceptedFriends,
 *   pendingRequests,
 *   sentRequests,
 *   loadFriends,
 *   addFriend,
 *   removeFriend,
 *   searchUsers,
 * } = useFriends();
 *
 * // Load friends on mount
 * onMounted(() => loadFriends());
 * </script>
 * ```
 *
 * @see HAP-717 - Implement friends UI for happy-vue web app
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue';
import { storeToRefs } from 'pinia';
import { z } from 'zod';
import { useAuthStore } from '@/stores/auth';
import { getApiBaseUrl } from '@/services/apiBase';
import type { UserProfile, RelationshipStatus } from '@magic-agent/protocol';
import { UserProfileSchema } from '@magic-agent/protocol';
import { toast } from 'vue-sonner';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** API server URL from environment */
const API_URL = getApiBaseUrl();

// ─────────────────────────────────────────────────────────────────────────────
// Response Schemas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Schema for single user response
 */
const UserResponseSchema = z.object({
  user: UserProfileSchema,
});

/**
 * Schema for friends list response
 */
const FriendsResponseSchema = z.object({
  friends: z.array(UserProfileSchema),
});

/**
 * Schema for user search response
 */
const UsersSearchResponseSchema = z.object({
  users: z.array(UserProfileSchema),
});

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return type for the useFriends composable.
 */
export interface UseFriendsReturn {
  /** All friends (reactive) */
  friends: Ref<UserProfile[]>;
  /** Loading state for friends list */
  isLoading: Ref<boolean>;
  /** Loading state for search */
  isSearching: Ref<boolean>;
  /** Search results */
  searchResults: Ref<UserProfile[]>;
  /** Error message if any */
  error: Ref<string | null>;

  /** Friends with status 'friend' */
  acceptedFriends: ComputedRef<UserProfile[]>;
  /** Incoming friend requests (status 'pending') */
  pendingRequests: ComputedRef<UserProfile[]>;
  /** Outgoing friend requests (status 'requested') */
  sentRequests: ComputedRef<UserProfile[]>;

  /** Load friends list from server */
  loadFriends: () => Promise<void>;
  /** Send friend request or accept existing request */
  addFriend: (userId: string) => Promise<UserProfile | null>;
  /** Remove friend or reject/cancel request */
  removeFriend: (userId: string) => Promise<boolean>;
  /** Block a user - prevents them from sending requests */
  blockUser: (userId: string) => Promise<boolean>;
  /** Search users by username */
  searchUsers: (query: string) => Promise<void>;
  /** Clear search results */
  clearSearch: () => void;
  /** Get friend by ID */
  getFriend: (userId: string) => UserProfile | undefined;
  /** Update a friend in the local cache */
  updateFriend: (profile: UserProfile) => void;
  /** Remove a friend from the local cache */
  removeFriendFromCache: (userId: string) => void;
  /** Process a friend invite link (happy://friend/add/{userId}) */
  processFriendInvite: (inviteUrl: string) => Promise<boolean>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get display name from user profile
 */
export function getDisplayName(profile: UserProfile): string {
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ');
  return fullName || profile.username;
}

/**
 * Check relationship status helpers
 */
export function isFriend(status: RelationshipStatus): boolean {
  return status === 'friend';
}

export function isPendingRequest(status: RelationshipStatus): boolean {
  return status === 'pending';
}

export function isRequested(status: RelationshipStatus): boolean {
  return status === 'requested';
}

// ─────────────────────────────────────────────────────────────────────────────
// Composable Implementation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Composable for managing friends and friend requests.
 *
 * @returns Object with reactive state and methods
 */
export function useFriends(): UseFriendsReturn {
  const authStore = useAuthStore();
  const { token } = storeToRefs(authStore);

  // ─────────────────────────────────────────────────────────────────────────
  // Reactive State
  // ─────────────────────────────────────────────────────────────────────────

  const friends = ref<UserProfile[]>([]);
  const isLoading = ref(false);
  const isSearching = ref(false);
  const searchResults = ref<UserProfile[]>([]);
  const error = ref<string | null>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // Computed Getters
  // ─────────────────────────────────────────────────────────────────────────

  /** Friends with accepted status */
  const acceptedFriends = computed(() =>
    friends.value.filter((f: UserProfile) => f.status === 'friend')
  );

  /** Incoming friend requests (they requested us) */
  const pendingRequests = computed(() =>
    friends.value.filter((f: UserProfile) => f.status === 'pending')
  );

  /** Outgoing friend requests (we requested them) */
  const sentRequests = computed(() =>
    friends.value.filter((f: UserProfile) => f.status === 'requested')
  );

  // ─────────────────────────────────────────────────────────────────────────
  // API Methods
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Load friends list from server.
   * Includes all relationship statuses: friend, pending, requested.
   */
  async function loadFriends(): Promise<void> {
    if (!token.value) {
      error.value = 'Not authenticated';
      return;
    }

    isLoading.value = true;
    error.value = null;

    try {
      const response = await fetch(`${API_URL}/v1/friends`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token.value}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load friends: ${String(response.status)}`);
      }

      const data: unknown = await response.json();
      const parsed = FriendsResponseSchema.safeParse(data);

      if (!parsed.success) {
        console.error('[useFriends] Failed to parse friends list:', parsed.error);
        friends.value = [];
        return;
      }

      friends.value = parsed.data.friends;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load friends';
      error.value = message;
      console.error('[useFriends] Error loading friends:', err);
      toast.error('Failed to load friends');
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Send friend request or accept existing request.
   *
   * @param userId - The user ID to add as friend
   * @returns Updated user profile or null on failure
   */
  async function addFriend(userId: string): Promise<UserProfile | null> {
    if (!token.value) {
      toast.error('Not authenticated');
      return null;
    }

    try {
      const response = await fetch(`${API_URL}/v1/friends/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token.value}`,
        },
        body: JSON.stringify({ uid: userId }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          toast.error('User not found');
          return null;
        }
        throw new Error(`Failed to add friend: ${String(response.status)}`);
      }

      const data: unknown = await response.json();
      const parsed = UserResponseSchema.safeParse(data);

      if (!parsed.success) {
        console.error('[useFriends] Failed to parse add friend response:', parsed.error);
        return null;
      }

      // Update local cache
      updateFriend(parsed.data.user);
      toast.success('Friend request sent');

      return parsed.data.user;
    } catch (err) {
      console.error('[useFriends] Error adding friend:', err);
      toast.error('Failed to add friend');
      return null;
    }
  }

  /**
   * Remove friend or reject/cancel request.
   *
   * @param userId - The user ID to remove
   * @returns true on success, false on failure
   */
  async function removeFriend(userId: string): Promise<boolean> {
    if (!token.value) {
      toast.error('Not authenticated');
      return false;
    }

    try {
      const response = await fetch(`${API_URL}/v1/friends/remove`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token.value}`,
        },
        body: JSON.stringify({ uid: userId }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Already removed, update local state
          removeFriendFromCache(userId);
          return true;
        }
        throw new Error(`Failed to remove friend: ${String(response.status)}`);
      }

      // Remove from local cache
      removeFriendFromCache(userId);
      toast.success('Friend removed');

      return true;
    } catch (err) {
      console.error('[useFriends] Error removing friend:', err);
      toast.error('Failed to remove friend');
      return false;
    }
  }

  /**
   * Search for users by username.
   *
   * @param query - Search query (username)
   */
  async function searchUsers(query: string): Promise<void> {
    if (!token.value) {
      error.value = 'Not authenticated';
      return;
    }

    if (!query.trim()) {
      searchResults.value = [];
      return;
    }

    isSearching.value = true;

    try {
      const params = new URLSearchParams({ query });
      const response = await fetch(`${API_URL}/v1/users/search?${params.toString()}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token.value}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          searchResults.value = [];
          return;
        }
        throw new Error(`Search failed: ${String(response.status)}`);
      }

      const data: unknown = await response.json();
      const parsed = UsersSearchResponseSchema.safeParse(data);

      if (!parsed.success) {
        console.error('[useFriends] Failed to parse search response:', parsed.error);
        searchResults.value = [];
        return;
      }

      searchResults.value = parsed.data.users;
    } catch (err) {
      console.error('[useFriends] Error searching users:', err);
      toast.error('Search failed');
      searchResults.value = [];
    } finally {
      isSearching.value = false;
    }
  }

  /**
   * Clear search results.
   */
  function clearSearch(): void {
    searchResults.value = [];
  }

  /**
   * Get friend by ID from cache.
   *
   * @param userId - The user ID to find
   */
  function getFriend(userId: string): UserProfile | undefined {
    return friends.value.find((f: UserProfile) => f.id === userId);
  }

  /**
   * Update a friend in the local cache.
   * If the friend doesn't exist, add them.
   *
   * @param profile - Updated user profile
   */
  function updateFriend(profile: UserProfile): void {
    const index = friends.value.findIndex((f: UserProfile) => f.id === profile.id);
    if (index >= 0) {
      friends.value[index] = profile;
    } else {
      friends.value.push(profile);
    }
  }

  /**
   * Remove a friend from the local cache.
   *
   * @param userId - The user ID to remove
   */
  function removeFriendFromCache(userId: string): void {
    friends.value = friends.value.filter((f: UserProfile) => f.id !== userId);
  }

  /**
   * Block a user - prevents them from sending friend requests.
   *
   * @param userId - The user ID to block
   * @returns true on success, false on failure
   */
  async function blockUser(userId: string): Promise<boolean> {
    if (!token.value) {
      toast.error('Not authenticated');
      return false;
    }

    try {
      const response = await fetch(`${API_URL}/v1/friends/block`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token.value}`,
        },
        body: JSON.stringify({ uid: userId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to block user: ${String(response.status)}`);
      }

      // Remove from local cache
      removeFriendFromCache(userId);
      toast.success('User blocked');

      return true;
    } catch (err) {
      console.error('[useFriends] Error blocking user:', err);
      toast.error('Failed to block user');
      return false;
    }
  }

  /**
   * Process a friend invite link and send a friend request.
   * Supports both happy:// and https:// URLs.
   *
   * @param inviteUrl - The invite URL (happy://friend/add/{userId} or https://happy.engineering/friend/add/{userId})
   * @returns true on success, false on failure
   */
  async function processFriendInvite(inviteUrl: string): Promise<boolean> {
    // Parse the invite URL to extract user ID
    const friendMatch = inviteUrl.match(/happy:\/\/friend\/add\/(.+)/);
    const webMatch = inviteUrl.match(/https?:\/\/happy\.engineering\/friend\/add\/(.+)/);

    const match = friendMatch ?? webMatch;

    if (!match?.[1]) {
      toast.error('Invalid friend invite link');
      return false;
    }

    const userId = match[1];

    // Send friend request
    const result = await addFriend(userId);
    return result !== null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Return API
  // ─────────────────────────────────────────────────────────────────────────

  return {
    // Reactive state
    friends,
    isLoading,
    isSearching,
    searchResults,
    error,

    // Computed
    acceptedFriends,
    pendingRequests,
    sentRequests,

    // Actions
    loadFriends,
    addFriend,
    removeFriend,
    blockUser,
    searchUsers,
    clearSearch,
    getFriend,
    updateFriend,
    removeFriendFromCache,
    processFriendInvite,
  };
}
