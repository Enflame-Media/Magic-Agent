<script setup lang="ts">
/**
 * FriendsView - Main friends list screen
 *
 * Displays friends grouped by status:
 * - Friend Requests (pending incoming)
 * - Sent Requests (requested outgoing)
 * - My Friends (accepted)
 *
 * Includes QR scanner and search functionality.
 */

import { ref, computed, onMounted } from 'vue';
import { Frame } from '@nativescript/core';
import { useFriends } from '@/composables/useFriends';
import { shareService } from '@/services/share';
import FriendCard from '@/components/FriendCard.vue';
import QRScannerView from '@/components/QRScannerView.vue';
import FriendProfileView from './FriendProfileView.vue';
import type { UserProfile } from '@/services/friends';

// Props for current user context
const props = defineProps<{
  currentUserId?: string;
}>();

// State
const {
  acceptedFriends,
  pendingRequests,
  sentRequests,
  isLoading,
  error,
  loadFriends,
  acceptRequest,
  rejectRequest,
  blockUser,
} = useFriends();

const processingId = ref<string | null>(null);
const showQRScanner = ref(false);

// Combine all items for ListView with section headers
interface ListItem {
  type: 'header' | 'friend';
  title?: string;
  user?: UserProfile;
  id: string;
}

const listItems = computed<ListItem[]>(() => {
  const items: ListItem[] = [];

  // Friend Requests Section
  if (pendingRequests.value.length > 0) {
    items.push({ type: 'header', title: 'Friend Requests', id: 'header-pending' });
    for (const friend of pendingRequests.value) {
      items.push({ type: 'friend', user: friend, id: friend.id });
    }
  }

  // Sent Requests Section
  if (sentRequests.value.length > 0) {
    items.push({ type: 'header', title: 'Sent Requests', id: 'header-sent' });
    for (const friend of sentRequests.value) {
      items.push({ type: 'friend', user: friend, id: friend.id });
    }
  }

  // My Friends Section
  items.push({ type: 'header', title: 'My Friends', id: 'header-friends' });
  if (acceptedFriends.value.length > 0) {
    for (const friend of acceptedFriends.value) {
      items.push({ type: 'friend', user: friend, id: friend.id });
    }
  }

  return items;
});

// Check if an item is a header
function isHeader(item: ListItem): boolean {
  return item.type === 'header';
}

// Handle accept request
async function handleAccept(userId: string) {
  processingId.value = userId;
  try {
    await acceptRequest(userId);
  } finally {
    processingId.value = null;
  }
}

// Handle reject request
async function handleReject(userId: string) {
  processingId.value = userId;
  try {
    await rejectRequest(userId);
  } finally {
    processingId.value = null;
  }
}

// Handle friend card tap
function handleFriendTap(userId: string) {
  const frame = Frame.topmost();
  frame?.navigate({
    create: () => FriendProfileView,
    context: { userId },
  });
}

// Handle block user (via long-press)
async function handleBlock(userId: string) {
  processingId.value = userId;
  try {
    await blockUser(userId);
  } finally {
    processingId.value = null;
  }
}

// Open QR scanner
function openQRScanner() {
  showQRScanner.value = true;
}

// Close QR scanner
function closeQRScanner() {
  showQRScanner.value = false;
}

// Handle successful QR scan
function onQRScanSuccess(userId: string) {
  console.log('[FriendsView] Friend added via QR:', userId);
  showQRScanner.value = false;
  loadFriends(); // Refresh list
}

// Share my friend invite link
async function shareMyInvite() {
  if (!props.currentUserId) {
    console.warn('[FriendsView] Cannot share: no current user ID');
    return;
  }
  await shareService.shareInviteLink(props.currentUserId);
}

// Handle pull to refresh
async function onPullToRefresh(args: { object: { refreshing: boolean } }) {
  await loadFriends();
  args.object.refreshing = false;
}

// Load friends on mount
onMounted(() => {
  loadFriends();
});
</script>

<template>
  <!-- QR Scanner Modal -->
  <QRScannerView
    v-if="showQRScanner"
    @close="closeQRScanner"
    @success="onQRScanSuccess"
  />

  <!-- Friends List Page -->
  <Page v-else>
    <ActionBar title="Friends">
      <ActionItem
        icon="res://ic_share"
        ios.position="right"
        android.position="actionBar"
        @tap="shareMyInvite"
      />
      <ActionItem
        icon="res://ic_qr_code"
        ios.position="right"
        android.position="actionBar"
        @tap="openQRScanner"
      />
      <ActionItem
        icon="res://ic_search"
        ios.position="right"
        android.position="actionBar"
        @tap="() => $navigateTo('FriendsSearch')"
      />
    </ActionBar>

    <GridLayout rows="*">
      <!-- Loading state -->
      <ActivityIndicator
        v-if="isLoading && listItems.length === 0"
        :busy="true"
        class="loading"
      />

      <!-- Error state -->
      <StackLayout v-else-if="error && listItems.length === 0" class="error-state">
        <Label text="Failed to load friends" class="error-title" />
        <Label :text="error" class="error-message" textWrap="true" />
        <Button text="Try Again" class="btn-retry" @tap="loadFriends" />
      </StackLayout>

      <!-- Friends list -->
      <ListView
        v-else
        :items="listItems"
        separatorColor="transparent"
        @itemTap="() => {}"
        @pullToRefreshInitiated="onPullToRefresh"
      >
        <template #default="{ item }">
          <!-- Section header -->
          <Label
            v-if="isHeader(item)"
            :text="item.title"
            class="section-header"
          />

          <!-- Friend card -->
          <FriendCard
            v-else-if="item.user"
            :user="item.user"
            :isProcessing="processingId === item.user.id"
            @tap="handleFriendTap(item.user.id)"
            @accept="handleAccept(item.user.id)"
            @reject="handleReject(item.user.id)"
            @block="handleBlock(item.user.id)"
          />
        </template>
      </ListView>

      <!-- Empty state for friends -->
      <StackLayout
        v-if="!isLoading && acceptedFriends.length === 0 && pendingRequests.length === 0"
        class="empty-state"
      >
        <Label text="No friends yet" class="empty-title" />
        <Label
          text="Scan a QR code or share your invite link"
          class="empty-message"
          textWrap="true"
        />
        <StackLayout orientation="horizontal" class="empty-buttons">
          <Button text="Scan QR Code" class="btn-scan" @tap="openQRScanner" />
          <Button text="Share Invite" class="btn-share" @tap="shareMyInvite" />
        </StackLayout>
      </StackLayout>
    </GridLayout>
  </Page>
</template>

<style scoped>
.loading {
  width: 48;
  height: 48;
  horizontal-align: center;
  vertical-align: center;
}

.section-header {
  font-size: 14;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5;
  padding: 16 16 8 16;
  background-color: #f9fafb;
}

.error-state {
  padding: 32;
  horizontal-align: center;
  vertical-align: center;
}

.error-title {
  font-size: 18;
  font-weight: 600;
  color: #ef4444;
  margin-bottom: 8;
}

.error-message {
  font-size: 14;
  color: #6b7280;
  text-align: center;
  margin-bottom: 16;
}

.btn-retry {
  background-color: #6366f1;
  color: #ffffff;
  padding: 12 24;
  border-radius: 8;
}

.empty-state {
  padding: 32;
  horizontal-align: center;
  vertical-align: center;
}

.empty-title {
  font-size: 20;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 8;
}

.empty-message {
  font-size: 14;
  color: #6b7280;
  text-align: center;
  margin-bottom: 24;
}

.empty-buttons {
  horizontal-align: center;
}

.btn-scan {
  background-color: #6366f1;
  color: #ffffff;
  padding: 12 24;
  border-radius: 8;
  margin-right: 8;
}

.btn-share {
  background-color: #10b981;
  color: #ffffff;
  padding: 12 24;
  border-radius: 8;
}
</style>
