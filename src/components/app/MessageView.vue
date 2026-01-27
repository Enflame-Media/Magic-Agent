<script setup lang="ts">
/**
 * MessageView - Renders a normalized message block in a session.
 */

import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import MarkdownView, { type Option } from './markdown/MarkdownView.vue';
import ToolView from './tools/ToolView.vue';
import ToolResult from './ToolResult.vue';
import type { NormalizedMessage } from '@/services/messages/types';

interface Props {
  message: NormalizedMessage;
  sessionId: string;
  onOptionPress?: (option: Option) => void;
}

const props = defineProps<Props>();
const router = useRouter();
const isExpanded = ref(false);

const LINE_THRESHOLD = 50;
const INITIAL_LINES = 20;

const isUser = computed(() => props.message.kind === 'user-text');
const isAssistant = computed(() => props.message.kind === 'agent-text');
const isSystem = computed(() => props.message.kind === 'system' || props.message.kind === 'agent-event');

// Timestamp formatting
const timestamp = computed(() => {
  const date = new Date(props.message.createdAt);
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
});

// Avatar initials
const avatarInitials = computed(() => {
  if (isUser.value) return 'U';
  if (isAssistant.value) return 'C';
  return 'S';
});

const rawMarkdown = computed(() => {
  if (props.message.kind === 'user-text') {
    return props.message.displayText ?? props.message.text;
  }
  if (props.message.kind === 'agent-text') {
    return props.message.text;
  }
  return '';
});

const truncatedMarkdown = computed(() => {
  if (!rawMarkdown.value) {
    return { text: '', needsTruncation: false, hiddenLines: 0 };
  }
  const lines = rawMarkdown.value.split('\n');
  const needsTruncation = lines.length > LINE_THRESHOLD;
  if (!needsTruncation || isExpanded.value) {
    return { text: rawMarkdown.value, needsTruncation, hiddenLines: 0 };
  }
  const hiddenLines = lines.length - INITIAL_LINES;
  return {
    text: lines.slice(0, INITIAL_LINES).join('\n'),
    needsTruncation,
    hiddenLines,
  };
});

function openToolMessage(): void {
  if (props.message.kind !== 'tool-call') {
    return;
  }
  router.push({
    name: 'session-message',
    params: {
      id: props.sessionId,
      messageId: props.message.sourceMessageId ?? props.message.id,
    },
  });
}

function toggleExpanded(): void {
  isExpanded.value = !isExpanded.value;
}
</script>

<template>
  <div
    :class="[
      'flex gap-3 px-4 py-3',
      isUser && 'flex-row-reverse',
      isSystem && 'justify-center',
    ]"
  >
    <!-- Avatar -->
    <Avatar
      v-if="!isSystem"
      class="h-8 w-8 flex-shrink-0"
    >
      <AvatarFallback
        :class="[
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted',
        ]"
      >
        {{ avatarInitials }}
      </AvatarFallback>
    </Avatar>

    <!-- Message content -->
    <div
      :class="[
        'max-w-[80%] rounded-lg px-4 py-2',
        isUser && 'bg-primary text-primary-foreground',
        isAssistant && 'bg-muted',
        isSystem && 'bg-muted/50 text-muted-foreground text-sm italic',
      ]"
    >
      <div v-if="message.kind === 'user-text' || message.kind === 'agent-text'" class="space-y-2">
        <MarkdownView
          :markdown="truncatedMarkdown.text"
          :on-option-press="props.onOptionPress"
        />
        <button
          v-if="truncatedMarkdown.needsTruncation"
          type="button"
          class="text-xs text-muted-foreground underline underline-offset-4"
          @click="toggleExpanded"
        >
          {{ isExpanded ? 'Show less' : `Show ${truncatedMarkdown.hiddenLines} more lines` }}
        </button>
      </div>

      <button
        v-else-if="message.kind === 'tool-call'"
        type="button"
        class="w-full text-left"
        @click="openToolMessage"
      >
        <ToolView
          :tool="message.tool"
          :messages="message.children"
        />
      </button>

      <ToolResult
        v-else-if="message.kind === 'tool-result'"
        tool-name="Tool result"
        :result="typeof message.content === 'string' ? message.content : JSON.stringify(message.content, null, 2)"
        :success="!message.isError"
      />

      <p v-else-if="message.kind === 'agent-event'" class="whitespace-pre-wrap break-words">
        <span v-if="message.event.type === 'switch'">
          Switched to {{ message.event.mode }}
        </span>
        <span v-else-if="message.event.type === 'message'">
          {{ message.event.message }}
        </span>
        <span v-else-if="message.event.type === 'limit-reached'">
          <template v-if="Number.isFinite(Number(message.event.endsAt))">
            Usage limit until {{ new Date(Number(message.event.endsAt) * 1000).toLocaleTimeString() }}
          </template>
          <template v-else>
            Usage limit reached
          </template>
        </span>
        <span v-else>System event</span>
      </p>

      <p v-else-if="message.kind === 'system'" class="whitespace-pre-wrap break-words">
        {{ message.text }}
      </p>

      <!-- Timestamp -->
      <span
        v-if="!isSystem"
        :class="[
          'text-xs mt-1 block',
          isUser ? 'text-primary-foreground/70' : 'text-muted-foreground',
        ]"
      >
        {{ timestamp }}
      </span>
    </div>
  </div>
</template>
