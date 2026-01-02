<script setup lang="ts">
/**
 * User Search Component
 *
 * Search input with debounced user search and results display.
 * Shows search results as UserProfileCards with action buttons.
 *
 * @see HAP-717 - Implement friends UI for happy-vue web app
 */

import { ref, watch } from 'vue';
import { useFriends } from '@/composables/useFriends';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import UserProfileCard from './UserProfileCard.vue';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  /** Placeholder text for search input */
  placeholder?: string;
}

withDefaults(defineProps<Props>(), {
  placeholder: 'Search by username...',
});

// ─────────────────────────────────────────────────────────────────────────────
// Emits
// ─────────────────────────────────────────────────────────────────────────────

const emit = defineEmits<{
  /** User selected from search results */
  select: [userId: string];
}>();

// ─────────────────────────────────────────────────────────────────────────────
// Composables
// ─────────────────────────────────────────────────────────────────────────────

const {
  searchResults,
  isSearching,
  searchUsers,
  clearSearch,
  addFriend,
} = useFriends();

// ─────────────────────────────────────────────────────────────────────────────
// Local State
// ─────────────────────────────────────────────────────────────────────────────

const query = ref('');
const processingId = ref<string | null>(null);
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// ─────────────────────────────────────────────────────────────────────────────
// Watchers
// ─────────────────────────────────────────────────────────────────────────────

// Debounced search
watch(query, (newQuery) => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  if (!newQuery.trim()) {
    clearSearch();
    return;
  }

  debounceTimer = setTimeout(() => {
    void searchUsers(newQuery.trim());
  }, 300);
});

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

async function handleAddFriend(userId: string): Promise<void> {
  processingId.value = userId;
  try {
    await addFriend(userId);
    // Refresh search to update relationship status
    if (query.value.trim()) {
      await searchUsers(query.value.trim());
    }
  } finally {
    processingId.value = null;
  }
}

function handleUserClick(userId: string): void {
  emit('select', userId);
}
</script>

<template>
  <div class="space-y-4">
    <!-- Search input -->
    <div class="relative">
      <svg
        class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fill-rule="evenodd"
          d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
          clip-rule="evenodd"
        />
      </svg>
      <Input
        v-model="query"
        type="search"
        :placeholder="placeholder"
        class="pl-9"
      />
    </div>

    <!-- Loading state -->
    <div v-if="isSearching" class="space-y-2">
      <Skeleton class="h-16 w-full" />
      <Skeleton class="h-16 w-full" />
      <Skeleton class="h-16 w-full" />
    </div>

    <!-- Search results -->
    <div v-else-if="searchResults.length > 0" class="space-y-2">
      <UserProfileCard
        v-for="user in searchResults"
        :key="user.id"
        :user="user"
        :show-action="true"
        :is-processing="processingId === user.id"
        :clickable="true"
        @click="handleUserClick(user.id)"
        @add-friend="handleAddFriend"
      />
    </div>

    <!-- No results -->
    <div
      v-else-if="query.trim() && !isSearching"
      class="text-center py-8 text-muted-foreground"
    >
      <svg
        class="mx-auto h-12 w-12 mb-3 opacity-50"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
        />
      </svg>
      <p class="text-sm">No users found</p>
      <p class="text-xs mt-1">Try a different username</p>
    </div>

    <!-- Initial state -->
    <div
      v-else-if="!query.trim()"
      class="text-center py-8 text-muted-foreground"
    >
      <svg
        class="mx-auto h-12 w-12 mb-3 opacity-50"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
        />
      </svg>
      <p class="text-sm">Search for friends</p>
      <p class="text-xs mt-1">Enter a username to find people</p>
    </div>
  </div>
</template>

<style scoped>
/* No custom styles needed - using Tailwind */
</style>
