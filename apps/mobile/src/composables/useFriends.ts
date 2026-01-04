/**
 * useFriends Composable - Reactive friends state management
 *
 * Provides reactive access to friends list, friend requests,
 * and friend-related actions.
 *
 * Uses singleton pattern for shared state across components.
 *
 * @example
 * ```typescript
 * import { useFriends } from '@/composables/useFriends';
 *
 * const {
 *   friends,
 *   pendingRequests,
 *   sentRequests,
 *   isLoading,
 *   loadFriends,
 *   acceptRequest,
 *   rejectRequest,
 * } = useFriends();
 *
 * // Load friends on mount
 * onMounted(() => loadFriends());
 * ```
 */

import { ref, computed, readonly } from 'vue';
import {
  friendsService,
  type UserProfile,
  isFriend,
  isPendingRequest,
  isRequested,
} from '@/services/friends';

// Singleton state (shared across components)
const friends = ref<Map<string, UserProfile>>(new Map());
const isLoading = ref(false);
const error = ref<string | null>(null);
const lastFetchedAt = ref<Date | null>(null);

/**
 * Friends composable for reactive friend management
 */
export function useFriends() {
  // Computed getters for different friend categories
  const allFriends = computed(() => Array.from(friends.value.values()));

  const acceptedFriends = computed(() =>
    allFriends.value.filter(f => isFriend(f.status))
  );

  const pendingRequests = computed(() =>
    allFriends.value.filter(f => isPendingRequest(f.status))
  );

  const sentRequests = computed(() =>
    allFriends.value.filter(f => isRequested(f.status))
  );

  const friendsCount = computed(() => acceptedFriends.value.length);
  const pendingCount = computed(() => pendingRequests.value.length);

  /**
   * Load friends list from server
   */
  async function loadFriends(): Promise<void> {
    if (isLoading.value) return;

    isLoading.value = true;
    error.value = null;

    try {
      const friendsList = await friendsService.getFriendsList();

      // Update state
      friends.value.clear();
      for (const friend of friendsList) {
        friends.value.set(friend.id, friend);
      }

      lastFetchedAt.value = new Date();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load friends';
      error.value = message;
      console.error('[useFriends] Load error:', e);
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Refresh friends if stale (older than 30 seconds)
   */
  async function refreshIfStale(): Promise<void> {
    const staleThreshold = 30 * 1000; // 30 seconds
    const now = new Date();

    if (!lastFetchedAt.value || now.getTime() - lastFetchedAt.value.getTime() > staleThreshold) {
      await loadFriends();
    }
  }

  /**
   * Send a friend request
   */
  async function addFriend(userId: string): Promise<boolean> {
    try {
      const updatedProfile = await friendsService.sendFriendRequest(userId);

      if (updatedProfile) {
        friends.value.set(updatedProfile.id, updatedProfile);
        return true;
      }

      return false;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to send friend request';
      error.value = message;
      console.error('[useFriends] Add friend error:', e);
      return false;
    }
  }

  /**
   * Accept a friend request (same API as addFriend)
   */
  async function acceptRequest(userId: string): Promise<boolean> {
    return addFriend(userId);
  }

  /**
   * Reject/remove a friend or cancel a sent request
   */
  async function removeFriend(userId: string): Promise<boolean> {
    try {
      await friendsService.removeFriend(userId);
      friends.value.delete(userId);
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to remove friend';
      error.value = message;
      console.error('[useFriends] Remove friend error:', e);
      return false;
    }
  }

  /**
   * Reject a friend request (same as removeFriend)
   */
  async function rejectRequest(userId: string): Promise<boolean> {
    return removeFriend(userId);
  }

  /**
   * Block a user - prevents them from sending friend requests
   */
  async function blockUser(userId: string): Promise<boolean> {
    try {
      const success = await friendsService.blockUser(userId);
      if (success) {
        friends.value.delete(userId);
      }
      return success;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to block user';
      error.value = message;
      console.error('[useFriends] Block user error:', e);
      return false;
    }
  }

  /**
   * Process a QR code or deep link friend invite
   */
  async function processFriendInvite(qrData: string): Promise<boolean> {
    try {
      const profile = await friendsService.processFriendInvite(qrData);

      if (profile) {
        friends.value.set(profile.id, profile);
        return true;
      }

      return false;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to process invite';
      error.value = message;
      console.error('[useFriends] Process invite error:', e);
      return false;
    }
  }

  /**
   * Search for users by username
   */
  async function searchUsers(query: string): Promise<UserProfile[]> {
    if (!query.trim()) return [];

    try {
      return await friendsService.searchUsers(query);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to search users';
      error.value = message;
      console.error('[useFriends] Search error:', e);
      return [];
    }
  }

  /**
   * Get a friend by ID
   */
  function getFriend(userId: string): UserProfile | undefined {
    return friends.value.get(userId);
  }

  /**
   * Generate invite URL for sharing
   */
  function generateInviteUrl(userId: string): string {
    return friendsService.generateInviteUrl(userId);
  }

  /**
   * Generate invite deep link for QR codes
   */
  function generateInviteDeepLink(userId: string): string {
    return friendsService.generateInviteDeepLink(userId);
  }

  /**
   * Clear error state
   */
  function clearError(): void {
    error.value = null;
  }

  /**
   * Update a friend in local state (for real-time updates)
   */
  function updateFriend(profile: UserProfile): void {
    friends.value.set(profile.id, profile);
  }

  /**
   * Remove a friend from local state (for real-time updates)
   */
  function removeFriendFromState(userId: string): void {
    friends.value.delete(userId);
  }

  return {
    // State (readonly to prevent external mutation)
    friends: readonly(friends),
    isLoading: readonly(isLoading),
    error: readonly(error),
    lastFetchedAt: readonly(lastFetchedAt),

    // Computed
    allFriends,
    acceptedFriends,
    pendingRequests,
    sentRequests,
    friendsCount,
    pendingCount,

    // Actions
    loadFriends,
    refreshIfStale,
    addFriend,
    acceptRequest,
    removeFriend,
    rejectRequest,
    blockUser,
    processFriendInvite,
    searchUsers,
    getFriend,
    generateInviteUrl,
    generateInviteDeepLink,
    clearError,

    // State management for real-time updates
    updateFriend,
    removeFriendFromState,
  };
}
