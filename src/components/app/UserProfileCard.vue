<script setup lang="ts">
/**
 * User Profile Card Component
 *
 * Displays a user profile with avatar, name, username, and optional action buttons.
 * Used in friends list, search results, and friend requests.
 *
 * @see HAP-717 - Implement friends UI for happy-vue web app
 */

import { computed } from 'vue';
import type { UserProfile } from '@happy/protocol';
import { getDisplayName } from '@/composables/useFriends';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useFriendStatus } from '@/composables/useFriendStatus';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  /** User profile to display */
  user: UserProfile;
  /** Show online/offline status indicator */
  showStatus?: boolean;
  /** Show action button based on relationship status */
  showAction?: boolean;
  /** Whether an action is currently processing */
  isProcessing?: boolean;
  /** Clickable card (navigates to profile) */
  clickable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showStatus: false,
  showAction: false,
  isProcessing: false,
  clickable: false,
});

// ─────────────────────────────────────────────────────────────────────────────
// Emits
// ─────────────────────────────────────────────────────────────────────────────

const emit = defineEmits<{
  /** Card clicked */
  click: [];
  /** Add friend button clicked */
  addFriend: [userId: string];
  /** Remove friend button clicked */
  removeFriend: [userId: string];
  /** Cancel request button clicked */
  cancelRequest: [userId: string];
  /** Block user button clicked */
  blockUser: [userId: string];
}>();

// ─────────────────────────────────────────────────────────────────────────────
// Composables
// ─────────────────────────────────────────────────────────────────────────────

const { isOnline, getLastSeenText } = useFriendStatus();

// ─────────────────────────────────────────────────────────────────────────────
// Computed
// ─────────────────────────────────────────────────────────────────────────────

const displayName = computed(() => getDisplayName(props.user));

const avatarUrl = computed(() => props.user.avatar?.url ?? props.user.avatar?.path);

const initials = computed(() => {
  const first = props.user.firstName?.[0]?.toUpperCase() ?? '';
  const last = props.user.lastName?.[0]?.toUpperCase() ?? '';
  return (first + last) || (props.user.username[0]?.toUpperCase() ?? '?');
});

const userIsOnline = computed(() => props.showStatus && isOnline(props.user.id));

const lastSeenText = computed(() => {
  if (!props.showStatus || userIsOnline.value) return '';
  return getLastSeenText(props.user.id);
});

/** Action button configuration based on relationship status */
const actionConfig = computed(() => {
  if (!props.showAction) return null;

  switch (props.user.status) {
    case 'none':
      return {
        label: 'Add Friend',
        variant: 'default' as const,
        action: () => { emit('addFriend', props.user.id); },
      };
    case 'requested':
      return {
        label: 'Pending',
        variant: 'secondary' as const,
        action: () => { emit('cancelRequest', props.user.id); },
      };
    case 'friend':
      return {
        label: 'Friends',
        variant: 'outline' as const,
        action: () => { emit('removeFriend', props.user.id); },
      };
    default:
      return null;
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

function handleClick(): void {
  if (props.clickable) {
    emit('click');
  }
}
</script>

<template>
  <Card
    :class="[
      'transition-colors',
      clickable && 'cursor-pointer hover:bg-muted/50',
    ]"
    @click="handleClick"
  >
    <CardContent class="flex items-center gap-3 p-3">
      <!-- Avatar with online status -->
      <div class="relative">
        <Avatar class="h-10 w-10">
          <AvatarImage v-if="avatarUrl" :src="avatarUrl" :alt="displayName" />
          <AvatarFallback>{{ initials }}</AvatarFallback>
        </Avatar>

        <!-- Online status indicator -->
        <span
          v-if="showStatus"
          :class="[
            'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background',
            userIsOnline ? 'bg-green-500' : 'bg-muted-foreground',
          ]"
        />
      </div>

      <!-- User info -->
      <div class="flex-1 min-w-0">
        <p class="font-medium text-sm truncate">
          {{ displayName }}
        </p>
        <p class="text-xs text-muted-foreground truncate">
          @{{ user.username }}
          <span v-if="lastSeenText" class="ml-1">&middot; {{ lastSeenText }}</span>
        </p>
      </div>

      <!-- Action button -->
      <Button
        v-if="actionConfig"
        :variant="actionConfig.variant"
        size="sm"
        :disabled="isProcessing"
        @click.stop="actionConfig.action"
      >
        <span v-if="isProcessing" class="mr-2">
          <svg
            class="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </span>
        {{ actionConfig.label }}
      </Button>

      <!-- Chevron for clickable cards without action -->
      <svg
        v-else-if="clickable"
        class="h-4 w-4 text-muted-foreground"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fill-rule="evenodd"
          d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
          clip-rule="evenodd"
        />
      </svg>
    </CardContent>
  </Card>
</template>

<style scoped>
/* No custom styles needed - using Tailwind */
</style>
