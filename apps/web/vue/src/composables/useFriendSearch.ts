/**
 * Friend Search Composable
 *
 * Vue composable for searching friends with debounced input.
 * Designed to be used with the share session modal for selecting
 * friends to share a session with.
 *
 * Features:
 * - Debounced search (300ms delay)
 * - Filters out users who already have access
 * - Returns filtered friends from the existing friends list
 *
 * @example
 * ```vue
 * <script setup>
 * import { useFriendSearch } from '@/composables/useFriendSearch';
 *
 * const existingShareUserIds = ref(['user1', 'user2']);
 *
 * const {
 *   searchQuery,
 *   searchResults,
 *   isSearching,
 *   clearSearch,
 * } = useFriendSearch(existingShareUserIds);
 * </script>
 *
 * <template>
 *   <input v-model="searchQuery" placeholder="Search friends..." />
 *   <div v-for="friend in searchResults" :key="friend.id">
 *     {{ friend.username }}
 *   </div>
 * </template>
 * ```
 *
 * @see HAP-769 - Implement Share Session UI for happy-vue web app
 */

import { ref, computed, watch, type Ref, type ComputedRef } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { useFriends } from './useFriends';
import type { UserProfile } from '@magic-agent/protocol';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Debounce delay for search in milliseconds */
const DEBOUNCE_DELAY = 300;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return type for the useFriendSearch composable.
 */
export interface UseFriendSearchReturn {
  /** Current search query */
  searchQuery: Ref<string>;
  /** Filtered search results */
  searchResults: ComputedRef<UserProfile[]>;
  /** Whether a search is in progress */
  isSearching: Ref<boolean>;
  /** All accepted friends (for initial display) */
  allFriends: ComputedRef<UserProfile[]>;
  /** Clear the search query and results */
  clearSearch: () => void;
  /** Load friends list */
  loadFriends: () => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Composable Implementation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Composable for searching friends with debounce.
 *
 * @param excludeUserIds - Reactive array of user IDs to exclude from results
 * @returns Object with reactive state and methods
 */
export function useFriendSearch(
  excludeUserIds: Ref<string[]> = ref([])
): UseFriendSearchReturn {
  const {
    acceptedFriends,
    loadFriends: loadFriendsFromApi,
    isLoading,
  } = useFriends();

  // ─────────────────────────────────────────────────────────────────────────
  // Reactive State
  // ─────────────────────────────────────────────────────────────────────────

  const searchQuery = ref('');
  const isSearching = ref(false);
  const debouncedQuery = ref('');

  // ─────────────────────────────────────────────────────────────────────────
  // Debounced Search
  // ─────────────────────────────────────────────────────────────────────────

  const debouncedUpdate = useDebounceFn((query: string) => {
    debouncedQuery.value = query;
    isSearching.value = false;
  }, DEBOUNCE_DELAY);

  // Watch for search query changes
  watch(searchQuery, (newQuery) => {
    if (newQuery.trim()) {
      isSearching.value = true;
      debouncedUpdate(newQuery.trim().toLowerCase());
    } else {
      debouncedQuery.value = '';
      isSearching.value = false;
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Computed
  // ─────────────────────────────────────────────────────────────────────────

  /** All accepted friends, excluding those already shared with */
  const allFriends = computed<UserProfile[]>(() => {
    return acceptedFriends.value.filter(
      (friend) => !excludeUserIds.value.includes(friend.id)
    );
  });

  /** Filtered search results based on query and exclusions */
  const searchResults = computed<UserProfile[]>(() => {
    const query = debouncedQuery.value;

    // If no query, return all available friends
    if (!query) {
      return allFriends.value;
    }

    // Filter friends by query
    return allFriends.value.filter((friend) => {
      const searchableFields = [
        friend.username,
        friend.firstName,
        friend.lastName,
      ].filter(Boolean);

      return searchableFields.some((field) =>
        field?.toLowerCase().includes(query)
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Methods
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Clear the search query and results.
   */
  function clearSearch(): void {
    searchQuery.value = '';
    debouncedQuery.value = '';
    isSearching.value = false;
  }

  /**
   * Load friends from the API.
   */
  async function loadFriends(): Promise<void> {
    await loadFriendsFromApi();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Return API
  // ─────────────────────────────────────────────────────────────────────────

  return {
    searchQuery,
    searchResults,
    isSearching: computed(() => isSearching.value || isLoading.value),
    allFriends,
    clearSearch,
    loadFriends,
  };
}
