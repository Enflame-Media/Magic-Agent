<script setup lang="ts">
/**
 * Friends View
 *
 * Main friends page with tabs for:
 * - Friends list (accepted friends with online status)
 * - Requests (incoming and outgoing friend requests)
 * - Search (find new friends by username)
 * - Scan QR (add friends via QR code)
 *
 * @see HAP-717 - Implement friends UI for happy-vue web app
 * @see HAP-684 - Phase 4: Implement Friends and Social Features
 * @see HAP-931 - Add pull-to-refresh support (mobile-only)
 */

import { ref, onMounted, computed, defineAsyncComponent } from 'vue';
import { useRouter } from 'vue-router';
import { useFriends } from '@/composables/useFriends';
import { useFriendStatus } from '@/composables/useFriendStatus';
import { useBreakpoints } from '@/composables/useBreakpoints';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import UserProfileCard from '@/components/app/UserProfileCard.vue';
import FriendRequestCard from '@/components/app/FriendRequestCard.vue';
import UserSearch from '@/components/app/UserSearch.vue';
import EmptyState from '@/components/app/EmptyState.vue';
import { PullToRefresh } from '@/components/app';
import ResponsiveContainer from '@/components/app/ResponsiveContainer.vue';

// Lazy load QRScanner - @zxing library is ~100KB
const QRScanner = defineAsyncComponent({
  loader: () => import('@/components/app/QRScanner.vue'),
  loadingComponent: Spinner,
  delay: 200,
  timeout: 10000,
});

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
  blockUser,
  processFriendInvite,
} = useFriends();

const { setBulkStatus } = useFriendStatus();
const router = useRouter();

// Pull-to-refresh support (HAP-931)
const { isMobile } = useBreakpoints();

// ─────────────────────────────────────────────────────────────────────────────
// Local State
// ─────────────────────────────────────────────────────────────────────────────

const activeTab = ref('friends');
const processingId = ref<string | null>(null);
const isQRScannerActive = ref(false);

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

/** Pull-to-refresh handler - reloads friend list and updates online status (HAP-931) */
async function handleRefresh(): Promise<void> {
  await loadFriends();

  // Re-initialize online status for all friends
  if (friends.value.length > 0) {
    setBulkStatus(
      friends.value.map((f) => ({
        userId: f.id,
        isOnline: false, // Would be fetched from API in real implementation
      }))
    );
  }
}

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
  router.push({ name: 'friend-profile', params: { id: userId } });
}

async function handleBlockUser(userId: string): Promise<void> {
  processingId.value = userId;
  try {
    await blockUser(userId);
    await loadFriends(); // Refresh list
  } finally {
    processingId.value = null;
  }
}

function navigateToSearch(): void {
  activeTab.value = 'search';
}

function navigateToScan(): void {
  activeTab.value = 'scan';
  isQRScannerActive.value = true;
}

async function handleQRScan(data: string): Promise<void> {
  // Process the scanned QR code as a friend invite
  const success = await processFriendInvite(data);
  if (success) {
    // Switch to friends tab and refresh
    activeTab.value = 'friends';
    isQRScannerActive.value = false;
    await loadFriends();
  }
}

 
function handleQRError(_err: Error): void {
  // QR scanner handles its own error display
  // No additional handling needed here
}
</script>

<template>
  <!-- Pull-to-refresh wrapper for mobile (HAP-931) -->
  <PullToRefresh
    :enabled="isMobile"
    :mobile-only="true"
    @refresh="handleRefresh"
  >
    <ResponsiveContainer size="narrow" padding="default">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold">Friends</h1>
        <p class="text-sm text-muted-foreground">
          Connect with other Happy users
        </p>
      </div>

      <!-- Tabs -->
      <Tabs v-model="activeTab" class="w-full" @update:model-value="(val) => isQRScannerActive = val === 'scan'">
      <TabsList class="grid w-full grid-cols-4">
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
        <TabsTrigger value="scan">
          Scan
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
          description="Search for users or scan a QR code to add friends"
          icon="users"
        >
          <div class="flex gap-2">
            <Button @click="navigateToSearch">
              Find Friends
            </Button>
            <Button variant="outline" @click="navigateToScan">
              Scan QR Code
            </Button>
          </div>
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
              @block-user="handleBlockUser"
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

      <!-- Scan QR Tab -->
      <TabsContent value="scan" class="mt-4">
        <Card>
          <CardContent class="py-6">
            <div class="text-center mb-4">
              <h3 class="text-lg font-medium">Scan Friend's QR Code</h3>
              <p class="text-sm text-muted-foreground">
                Point your camera at a friend's QR code to add them
              </p>
            </div>
            <QRScanner
              :active="isQRScannerActive"
              @scan="handleQRScan"
              @error="handleQRError"
            />
          </CardContent>
        </Card>
      </TabsContent>
      </Tabs>
    </ResponsiveContainer>
  </PullToRefresh>
</template>

<style scoped>
/* No custom styles needed - using Tailwind */
</style>
