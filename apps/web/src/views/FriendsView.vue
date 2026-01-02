<script setup lang="ts">
/**
 * Friends View
 *
 * Main friends page with tabs for:
 * - Friends list (accepted friends with online status)
 * - Requests (incoming and outgoing friend requests)
 * - Search (find new friends by username)
 *
 * @see HAP-717 - Implement friends UI for happy-vue web app
 */

import { ref, onMounted, computed } from 'vue';
import { useFriends } from '@/composables/useFriends';
import { useFriendStatus } from '@/composables/useFriendStatus';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import UserProfileCard from '@/components/app/UserProfileCard.vue';
import FriendRequestCard from '@/components/app/FriendRequestCard.vue';
import UserSearch from '@/components/app/UserSearch.vue';
import EmptyState from '@/components/app/EmptyState.vue';

// ─────────────────────────────────────────────────────────────────────────────
// Composables
// ─────────────────────────────────────────────────────────────────────────────

const {
  friends,
  isLoading,
  error,
  acceptedFriends,
  pendingRequests,
  sentRequests,
  loadFriends,
  addFriend,
  removeFriend,
} = useFriends();

const { setBulkStatus } = useFriendStatus();

// ─────────────────────────────────────────────────────────────────────────────
// Local State
// ─────────────────────────────────────────────────────────────────────────────

const activeTab = ref('friends');
const processingId = ref<string | null>(null);

// ─────────────────────────────────────────────────────────────────────────────
// Computed
// ─────────────────────────────────────────────────────────────────────────────

/** Badge count for requests tab */
const requestsCount = computed(() => pendingRequests.value.length);

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────────────────────────────────────

onMounted(async () => {
  await loadFriends();

  // Initialize online status for all friends
  // This would typically come from the API, but we simulate offline for now
  if (friends.value.length > 0) {
    setBulkStatus(
      friends.value.map((f) => ({
        userId: f.id,
        isOnline: false,
      }))
    );
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

async function handleAcceptRequest(userId: string): Promise<void> {
  processingId.value = userId;
  try {
    await addFriend(userId);
    await loadFriends(); // Refresh list
  } finally {
    processingId.value = null;
  }
}

async function handleRejectRequest(userId: string): Promise<void> {
  processingId.value = userId;
  try {
    await removeFriend(userId);
    await loadFriends(); // Refresh list
  } finally {
    processingId.value = null;
  }
}

async function handleCancelRequest(userId: string): Promise<void> {
  processingId.value = userId;
  try {
    await removeFriend(userId);
    await loadFriends(); // Refresh list
  } finally {
    processingId.value = null;
  }
}

async function handleRemoveFriend(userId: string): Promise<void> {
  processingId.value = userId;
  try {
    await removeFriend(userId);
    await loadFriends(); // Refresh list
  } finally {
    processingId.value = null;
  }
}

function handleUserClick(userId: string): void {
  // Navigate to user profile (future feature)
  // For now, just log
  console.debug('[FriendsView] User clicked:', userId);
}

function navigateToSearch(): void {
  activeTab.value = 'search';
}
</script>

<template>
  <div class="container mx-auto max-w-2xl p-4">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold">Friends</h1>
      <p class="text-sm text-muted-foreground">
        Connect with other Happy users
      </p>
    </div>

    <!-- Tabs -->
    <Tabs v-model="activeTab" class="w-full">
      <TabsList class="grid w-full grid-cols-3">
        <TabsTrigger value="friends">
          Friends
          <span
            v-if="acceptedFriends.length > 0"
            class="ml-1.5 text-xs text-muted-foreground"
          >
            ({{ acceptedFriends.length }})
          </span>
        </TabsTrigger>
        <TabsTrigger value="requests" class="relative">
          Requests
          <!-- Badge for pending requests -->
          <span
            v-if="requestsCount > 0"
            class="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground"
          >
            {{ requestsCount }}
          </span>
        </TabsTrigger>
        <TabsTrigger value="search">
          Search
        </TabsTrigger>
      </TabsList>

      <!-- Friends Tab -->
      <TabsContent value="friends" class="mt-4">
        <!-- Loading state -->
        <div v-if="isLoading" class="space-y-2">
          <Skeleton class="h-16 w-full" />
          <Skeleton class="h-16 w-full" />
          <Skeleton class="h-16 w-full" />
        </div>

        <!-- Error state -->
        <Card v-else-if="error" class="border-destructive/50">
          <CardContent class="py-8 text-center">
            <p class="text-destructive">{{ error }}</p>
            <Button variant="outline" class="mt-4" @click="loadFriends">
              Try Again
            </Button>
          </CardContent>
        </Card>

        <!-- Empty state -->
        <EmptyState
          v-else-if="acceptedFriends.length === 0"
          title="No friends yet"
          description="Search for users to add as friends"
          icon="users"
        >
          <Button @click="navigateToSearch">
            Find Friends
          </Button>
        </EmptyState>

        <!-- Friends list -->
        <ScrollArea v-else class="h-[calc(100vh-280px)]">
          <div class="space-y-2 pr-4">
            <UserProfileCard
              v-for="friend in acceptedFriends"
              :key="friend.id"
              :user="friend"
              :show-status="true"
              :clickable="true"
              @click="handleUserClick(friend.id)"
              @remove-friend="handleRemoveFriend"
            />
          </div>
        </ScrollArea>
      </TabsContent>

      <!-- Requests Tab -->
      <TabsContent value="requests" class="mt-4 space-y-6">
        <!-- Loading state -->
        <div v-if="isLoading" class="space-y-2">
          <Skeleton class="h-16 w-full" />
          <Skeleton class="h-16 w-full" />
        </div>

        <template v-else>
          <!-- Incoming Requests Section -->
          <div v-if="pendingRequests.length > 0">
            <h3 class="text-sm font-medium text-muted-foreground mb-3">
              Incoming Requests
            </h3>
            <div class="space-y-2">
              <FriendRequestCard
                v-for="request in pendingRequests"
                :key="request.id"
                :user="request"
                :is-processing="processingId === request.id"
                @accept="handleAcceptRequest"
                @reject="handleRejectRequest"
                @click="handleUserClick(request.id)"
              />
            </div>
          </div>

          <!-- Sent Requests Section -->
          <div v-if="sentRequests.length > 0">
            <h3 class="text-sm font-medium text-muted-foreground mb-3">
              Sent Requests
            </h3>
            <div class="space-y-2">
              <UserProfileCard
                v-for="request in sentRequests"
                :key="request.id"
                :user="request"
                :show-action="true"
                :is-processing="processingId === request.id"
                :clickable="true"
                @click="handleUserClick(request.id)"
                @cancel-request="handleCancelRequest"
              />
            </div>
          </div>

          <!-- Empty state -->
          <EmptyState
            v-if="pendingRequests.length === 0 && sentRequests.length === 0"
            title="No requests"
            description="You don't have any pending friend requests"
            icon="inbox"
          />
        </template>
      </TabsContent>

      <!-- Search Tab -->
      <TabsContent value="search" class="mt-4">
        <UserSearch @select="handleUserClick" />
      </TabsContent>
    </Tabs>
  </div>
</template>

<style scoped>
/* No custom styles needed - using Tailwind */
</style>
