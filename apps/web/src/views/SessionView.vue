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
import { useAuthStore } from '@/stores/auth';
import { useMachinesStore, isMachineOnline } from '@/stores/machines';
import { AgentInput, ChatList } from '@/components/app';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchSessionMessages } from '@/services/sessions';
import { decryptMessageContent, decryptSessionMetadata } from '@/services/encryption/sessionDecryption';
import { normalizeDecryptedMessage } from '@/services/messages/normalize';
import type { NormalizedMessage } from '@/services/messages/types';
import { sendSessionMessage } from '@/services/sync/messages';
import { toast } from 'vue-sonner';

interface SessionMetadata {
  name?: string;
  title?: string;
  path?: string;
  projectPath?: string;
  machineId?: string;
  flavor?: string;
}

const route = useRoute();
const router = useRouter();
const sessionsStore = useSessionsStore();
const messagesStore = useMessagesStore();
const authStore = useAuthStore();
const machinesStore = useMachinesStore();

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
const decryptedMetadata = ref<SessionMetadata | null>(null);
const decryptedContentById = ref<Map<string, string>>(new Map());
const messageInput = ref('');
const isSending = ref(false);

async function refreshMetadata(): Promise<void> {
  if (!session.value) {
    decryptedMetadata.value = null;
    return;
  }

  const currentSession = session.value;
  const decrypted = await decryptSessionMetadata<SessionMetadata>(currentSession);
  if (session.value?.id !== currentSession.id) {
    return;
  }

  if (decrypted) {
    decryptedMetadata.value = decrypted;
    return;
  }

  try {
    decryptedMetadata.value = JSON.parse(currentSession.metadata) as SessionMetadata;
  } catch {
    decryptedMetadata.value = null;
  }
}

async function refreshDecryptedMessages(): Promise<void> {
  if (!session.value) {
    decryptedContentById.value = new Map();
    return;
  }

  const currentSession = session.value;
  const currentMessages = messages.value;
  const results = await Promise.all(
    currentMessages.map(async (message) => ({
      id: message.id,
      content: await decryptMessageContent(message, currentSession),
    }))
  );

  if (session.value?.id !== currentSession.id) {
    return;
  }

  const next = new Map<string, string>();
  for (const result of results) {
    if (result.content !== null) {
      next.set(result.id, result.content);
    }
  }
  decryptedContentById.value = next;
}

// Parse session metadata
const sessionName = computed(() => {
  if (!session.value) return 'Session';
  try {
    const meta = decryptedMetadata.value ?? JSON.parse(session.value.metadata);
    return meta.name || meta.title || `Session ${sessionId.value.slice(0, 8)}`;
  } catch {
    return `Session ${sessionId.value.slice(0, 8)}`;
  }
});

const projectPath = computed(() => {
  if (!session.value) return null;
  try {
    const meta = decryptedMetadata.value ?? JSON.parse(session.value.metadata);
    return meta.path || meta.projectPath || null;
  } catch {
    return null;
  }
});

const statusText = computed(() => {
  if (!session.value) return 'Disconnected';
  return session.value.active ? 'Connected' : 'Archived';
});

const statusColor = computed(() =>
  session.value?.active ? 'text-green-500' : 'text-gray-500'
);

const codexModelOptions = [
  'gpt-5-codex high',
  'gpt-5-codex medium',
  'gpt-5-codex low',
];

const codexPermissionModes = [
  { value: 'default', label: 'default' },
  { value: 'read-only', label: 'read-only' },
  { value: 'safe-yolo', label: 'safe yolo' },
  { value: 'yolo', label: 'yolo' },
];

const claudePermissionModes = [
  { value: 'default', label: 'default' },
  { value: 'acceptEdits', label: 'accept edits' },
  { value: 'plan', label: 'plan' },
  { value: 'bypassPermissions', label: 'bypass permissions' },
];

const modelLabel = ref('');
const permissionMode = ref('default');

const permissionLabel = computed(() => {
  if (permissionMode.value === 'default') {
    return '';
  }
  const isCodex = decryptedMetadata.value?.flavor === 'codex' || decryptedMetadata.value?.flavor === 'gpt';
  const options = isCodex ? codexPermissionModes : claudePermissionModes;
  const match = options.find((option) => option.value === permissionMode.value);
  return match?.label ?? 'default';
});

watch(
  () => decryptedMetadata.value?.flavor,
  (flavor) => {
    const defaultCodexModel = codexModelOptions[0] ?? 'gpt-5-codex high';
    const defaultCodexMode = codexPermissionModes[0]?.value ?? 'default';
    const defaultClaudeMode = claudePermissionModes[0]?.value ?? 'default';

    if (flavor === 'codex' || flavor === 'gpt') {
      modelLabel.value = defaultCodexModel;
      permissionMode.value = defaultCodexMode;
      return;
    }
    modelLabel.value = '';
    permissionMode.value = defaultClaudeMode;
  },
  { immediate: true }
);

function cycleModelLabel(): void {
  if (!modelLabel.value) {
    return;
  }
  const currentIndex = codexModelOptions.indexOf(modelLabel.value);
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % codexModelOptions.length;
  modelLabel.value = codexModelOptions[nextIndex] ?? codexModelOptions[0] ?? modelLabel.value;
}

function cyclePermissionMode(): void {
  const isCodex = decryptedMetadata.value?.flavor === 'codex' || decryptedMetadata.value?.flavor === 'gpt';
  const options = isCodex ? codexPermissionModes : claudePermissionModes;
  const currentIndex = options.findIndex((option) => option.value === permissionMode.value);
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % options.length;
  permissionMode.value = options[nextIndex]?.value ?? 'default';
}

const normalizedMessages = computed<NormalizedMessage[]>(() => {
  if (!session.value) {
    return [];
  }

  const result: NormalizedMessage[] = [];
  const toolCalls = new Map<string, NormalizedMessage>();

  for (const message of messages.value) {
    const decrypted = decryptedContentById.value.get(message.id);
      if (!decrypted) {
        result.push({
          kind: 'system',
          id: message.id,
          sourceMessageId: message.id,
          localId: message.localId,
          createdAt: message.createdAt,
          text: '[Encrypted content]',
        });
        continue;
    }

    const normalized = normalizeDecryptedMessage({
      id: message.id,
      localId: message.localId,
      createdAt: message.createdAt,
      decrypted,
    });
    if (normalized.length === 0) {
      result.push({
        kind: 'system',
        id: message.id,
        sourceMessageId: message.id,
        localId: message.localId,
        createdAt: message.createdAt,
        text: decrypted,
      });
      continue;
    }

    for (const item of normalized) {
      if (item.kind === 'tool-call') {
        toolCalls.set(item.id, item);
      }
      if (item.kind === 'tool-result') {
        const toolCall = toolCalls.get(item.toolUseId);
        if (toolCall && toolCall.kind === 'tool-call') {
          toolCall.tool.state = item.isError ? 'error' : 'completed';
          toolCall.tool.result = item.content;
          toolCall.tool.permission = item.permission;
          continue;
        }
      }
      result.push(item);
    }
  }

  return result;
});

const machineOnline = computed(() => {
  const machineId = decryptedMetadata.value?.machineId;
  if (!machineId) return false;
  const machine = machinesStore.getMachine(machineId);
  return machine ? isMachineOnline(machine) : false;
});

async function loadArchivedHistory(): Promise<void> {
  if (!session.value || session.value.active) {
    return;
  }

  if (!authStore.token) {
    toast.error('Not authenticated');
    return;
  }

  try {
    const apiMessages = await fetchSessionMessages(sessionId.value, authStore.token);
    const mappedMessages = apiMessages.map((message) => ({
      id: message.id,
      sessionId: message.sessionId,
      seq: message.seq,
      localId: message.localId ?? null,
      content: message.content,
      createdAt: message.createdAt,
    }));
    mappedMessages.sort((a, b) => a.seq - b.seq);
    messagesStore.setMessagesForSession(sessionId.value, mappedMessages);
  } catch (error) {
    console.error('[session] Failed to load archived history', error);
    toast.error('Failed to load session history');
  }
}

// Simulate loading completion
onMounted(async () => {
  await loadArchivedHistory();
  await refreshMetadata();
  await refreshDecryptedMessages();
  isLoading.value = false;
});

// Watch for route changes
watch(sessionId, async () => {
  isLoading.value = true;
  await loadArchivedHistory();
  await refreshMetadata();
  await refreshDecryptedMessages();
  isLoading.value = false;
});

watch(
  () => [session.value, messages.value],
  async () => {
    await refreshMetadata();
    await refreshDecryptedMessages();
  }
);

function goBack() {
  router.push('/');
}

function navigateToInfo() {
  router.push(`/session/${sessionId.value}/info`);
}

function navigateToSettings() {
  router.push('/settings');
}

async function handleSendMessage(): Promise<void> {
  if (!session.value || !session.value.active) {
    toast.error('Session is not active');
    return;
  }

  if (isSending.value) {
    return;
  }

  const text = messageInput.value.trim();
  if (!text) {
    return;
  }

  isSending.value = true;
  const result = await sendSessionMessage(session.value, text, permissionMode.value);
  isSending.value = false;

  if (!result.ok) {
    toast.error(result.error ?? 'Failed to send message');
    return;
  }

  messageInput.value = '';
}

async function handleOptionPress(option: { title: string }): Promise<void> {
  messageInput.value = option.title;
  await handleSendMessage();
}
</script>

<template>
  <div class="flex flex-col h-full min-h-0 bg-background">
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
    <ScrollArea class="flex-1 min-h-0">
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
      <template v-else-if="normalizedMessages.length > 0">
        <ChatList
          :messages="normalizedMessages"
          :session-id="sessionId"
          :on-option-press="handleOptionPress"
        />
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

    <!-- Input area -->
    <div
      v-if="session?.active"
      class="border-t bg-muted/20 px-4 pb-4 pt-3"
    >
      <AgentInput
        v-model="messageInput"
        :online="machineOnline"
        :disabled="isSending"
        :model-label="modelLabel"
        :permission-label="permissionLabel"
        placeholder="Type a message..."
        @send="handleSendMessage"
        @settings="navigateToSettings"
        @info="navigateToInfo"
        @cycle-model="cycleModelLabel"
        @cycle-mode="cyclePermissionMode"
      />
    </div>

    <div v-else class="border-t p-4 bg-muted/30">
      <p class="text-sm text-center text-muted-foreground">
        View-only mode. Use the CLI to send messages.
      </p>
    </div>
  </div>
</template>
