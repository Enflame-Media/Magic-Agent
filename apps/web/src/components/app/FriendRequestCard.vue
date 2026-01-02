<script setup lang="ts">
/**
 * Friend Request Card Component
 *
 * Displays an incoming friend request with accept/reject action buttons.
 * Shows user avatar, name, username, and inline action buttons.
 *
 * @see HAP-717 - Implement friends UI for happy-vue web app
 */

import { computed, ref } from 'vue';
import type { UserProfile } from '@happy-vue/protocol';
import { getDisplayName } from '@/composables/useFriends';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  /** User profile of the person who sent the request */
  user: UserProfile;
  /** Whether an action is currently processing */
  isProcessing?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isProcessing: false,
});

// ─────────────────────────────────────────────────────────────────────────────
// Emits
// ─────────────────────────────────────────────────────────────────────────────

const emit = defineEmits<{
  /** Accept button clicked */
  accept: [userId: string];
  /** Reject button clicked */
  reject: [userId: string];
  /** Card clicked (navigate to profile) */
  click: [];
}>();

// ─────────────────────────────────────────────────────────────────────────────
// Local State
// ─────────────────────────────────────────────────────────────────────────────

/** Track which action was triggered for spinner display */
const activeAction = ref<'accept' | 'reject' | null>(null);

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

const isAccepting = computed(() => props.isProcessing && activeAction.value === 'accept');
const isRejecting = computed(() => props.isProcessing && activeAction.value === 'reject');

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

function handleAccept(): void {
  activeAction.value = 'accept';
  emit('accept', props.user.id);
}

function handleReject(): void {
  activeAction.value = 'reject';
  emit('reject', props.user.id);
}

function handleClick(): void {
  emit('click');
}
</script>

<template>
  <Card class="transition-colors hover:bg-muted/50 cursor-pointer" @click="handleClick">
    <CardContent class="flex items-center gap-3 p-3">
      <!-- Avatar -->
      <Avatar class="h-10 w-10">
        <AvatarImage v-if="avatarUrl" :src="avatarUrl" :alt="displayName" />
        <AvatarFallback>{{ initials }}</AvatarFallback>
      </Avatar>

      <!-- User info -->
      <div class="flex-1 min-w-0">
        <p class="font-medium text-sm truncate">
          {{ displayName }}
        </p>
        <p class="text-xs text-muted-foreground truncate">
          @{{ user.username }}
        </p>
      </div>

      <!-- Action buttons -->
      <div class="flex items-center gap-2">
        <!-- Reject button -->
        <Button
          variant="outline"
          size="sm"
          class="h-8 w-8 p-0 rounded-full border-destructive/30 hover:bg-destructive/10 hover:border-destructive/50"
          :disabled="isProcessing"
          @click.stop="handleReject"
        >
          <span v-if="isRejecting" class="animate-spin">
            <svg
              class="h-4 w-4"
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
          <svg
            v-else
            class="h-4 w-4 text-destructive"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
            />
          </svg>
          <span class="sr-only">Reject</span>
        </Button>

        <!-- Accept button -->
        <Button
          variant="outline"
          size="sm"
          class="h-8 w-8 p-0 rounded-full border-green-500/30 bg-green-500/10 hover:bg-green-500/20 hover:border-green-500/50"
          :disabled="isProcessing"
          @click.stop="handleAccept"
        >
          <span v-if="isAccepting" class="animate-spin">
            <svg
              class="h-4 w-4"
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
          <svg
            v-else
            class="h-4 w-4 text-green-500"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
              clip-rule="evenodd"
            />
          </svg>
          <span class="sr-only">Accept</span>
        </Button>
      </div>
    </CardContent>
  </Card>
</template>

<style scoped>
/* No custom styles needed - using Tailwind */
</style>
