<script setup lang="ts">
import MessageView from './MessageView.vue';
import type { NormalizedMessage } from '@/services/messages/types';
import type { Option } from './markdown/MarkdownView.vue';

interface Props {
  messages: NormalizedMessage[];
  sessionId: string;
  onOptionPress?: (option: Option) => void;
}

defineProps<Props>();
</script>

<template>
  <div class="py-4">
    <MessageView
      v-for="message in messages"
      :key="message.id + String(message.createdAt)"
      :message="message"
      :session-id="sessionId"
      :on-option-press="onOptionPress"
    />
  </div>
</template>
