<script setup lang="ts">
/**
 * Session View - Session Detail with Messages
 *
 * Displays a single session's conversation history with Claude.
 * Shows messages in chronological order with real-time updates.
 *
 * Features:
 * - Header with session info (name, project path, status)
 * - Scrollable message list
 * - Loading and error states
 * - Back navigation
 */

import { computed, ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSessionsStore } from '@/stores/sessions';
import { useMessagesStore } from '@/stores/messages';
import { MessageView } from '@/components/app';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

const route = useRoute();
const router = useRouter();
const sessionsStore = useSessionsStore();
const messagesStore = useMessagesStore();

// Session ID from route params
const sessionId = computed(() => route.params.id as string);

// Session data
const session = computed(() =>
  sessionId.value ? sessionsStore.getSession(sessionId.value) : undefined
);

// Messages for this session
const messages = computed(() =>
  sessionId.value ? messagesStore.getMessagesForSession(sessionId.value) : []
);

// Loading state
const isLoading = ref(true);

// Parse session metadata
const sessionName = computed(() => {
  if (!session.value) return 'Session';
  try {
    const meta = JSON.parse(session.value.metadata);
    return meta.name || meta.title || `Session ${sessionId.value.slice(0, 8)}`;
  } catch {
    return `Session ${sessionId.value.slice(0, 8)}`;
  }
});

const projectPath = computed(() => {
  if (!session.value) return null;
  try {
    const meta = JSON.parse(session.value.metadata);
    return meta.path || meta.projectPath || null;
  } catch {
    return null;
  }
});

const isConnected = computed(() => session.value?.active ?? false);

const statusText = computed(() =>
  isConnected.value ? 'Connected' : 'Disconnected'
);

const statusColor = computed(() =>
  isConnected.value ? 'text-green-500' : 'text-gray-500'
);

// Simulate loading completion
onMounted(() => {
  globalThis.setTimeout(() => {
    isLoading.value = false;
  }, 500);
});

// Watch for route changes
watch(sessionId, () => {
  isLoading.value = true;
  globalThis.setTimeout(() => {
    isLoading.value = false;
  }, 300);
});

function goBack() {
  router.push('/');
}

function navigateToInfo() {
  router.push(`/session/${sessionId.value}/info`);
}
</script>

<template>
  <div class="flex flex-col h-screen bg-background">
    <!-- Header -->
    <header class="flex items-center gap-4 px-4 py-3 border-b bg-background sticky top-0 z-10">
      <!-- Back button -->
      <Button variant="ghost" size="icon" @click="goBack">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </Button>

      <!-- Session info -->
      <button
        class="flex-1 min-w-0 text-left"
        @click="navigateToInfo"
      >
        <h1 class="font-semibold truncate">{{ sessionName }}</h1>
        <div class="flex items-center gap-2 text-sm">
          <p v-if="projectPath" class="text-muted-foreground truncate">
            {{ projectPath }}
          </p>
          <span :class="['flex items-center gap-1', statusColor]">
            <span class="w-2 h-2 rounded-full bg-current" />
            {{ statusText }}
          </span>
        </div>
      </button>

      <!-- Info button -->
      <Button variant="ghost" size="icon" @click="navigateToInfo">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </Button>
    </header>

    <!-- Content -->
    <ScrollArea class="flex-1">
      <!-- Loading state -->
      <template v-if="isLoading">
        <div class="p-4 space-y-4">
          <div v-for="i in 5" :key="i" class="flex gap-3">
            <Skeleton class="h-8 w-8 rounded-full" />
            <div class="flex-1 space-y-2">
              <Skeleton class="h-4 w-3/4" />
              <Skeleton class="h-4 w-1/2" />
            </div>
          </div>
        </div>
      </template>

      <!-- Session not found -->
      <template v-else-if="!session">
        <div class="flex flex-col items-center justify-center h-full p-8 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-12 w-12 text-muted-foreground mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          <h2 class="text-lg font-semibold mb-2">Session Not Found</h2>
          <p class="text-muted-foreground mb-4">
            This session may have been deleted or is no longer available.
          </p>
          <Button @click="goBack">Go Back</Button>
        </div>
      </template>

      <!-- Messages -->
      <template v-else-if="messages.length > 0">
        <div class="py-4">
          <MessageView
            v-for="message in messages"
            :key="message.id"
            :message="message"
          />
        </div>
      </template>

      <!-- Empty messages -->
      <template v-else>
        <div class="flex flex-col items-center justify-center h-full p-8 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-12 w-12 text-muted-foreground mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <h2 class="text-lg font-semibold mb-2">No Messages Yet</h2>
          <p class="text-muted-foreground">
            Messages will appear here when the session starts.
          </p>
        </div>
      </template>
    </ScrollArea>

    <!-- Input area placeholder (read-only for now) -->
    <div class="border-t p-4 bg-muted/30">
      <p class="text-sm text-center text-muted-foreground">
        View-only mode. Use the CLI to send messages.
      </p>
    </div>
  </div>
</template>
