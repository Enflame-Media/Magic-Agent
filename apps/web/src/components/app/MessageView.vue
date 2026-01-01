<script setup lang="ts">
/**
 * MessageView - Displays a single message in a conversation
 *
 * Renders different message types with appropriate styling:
 * - User messages: Right-aligned with primary background
 * - Assistant messages: Left-aligned with muted background
 * - System messages: Centered with subtle styling
 *
 * Content is encrypted and decrypted using the session's data encryption key.
 */

import { computed } from 'vue';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { Message } from '@/stores/messages';

interface Props {
  message: Message;
  /** Decrypted content (plaintext) - in production, decrypt using session key */
  decryptedContent?: string;
}

const props = defineProps<Props>();

// Message role detection from content structure
const messageRole = computed(() => {
  try {
    // Try to parse encrypted content for role hint
    const content = props.decryptedContent || '{}';
    const parsed = JSON.parse(content);
    return parsed.role || 'assistant';
  } catch {
    return 'assistant';
  }
});

const isUser = computed(() => messageRole.value === 'user');
const isAssistant = computed(() => messageRole.value === 'assistant');
const isSystem = computed(() => messageRole.value === 'system');

// Display content (would be decrypted in production)
const displayContent = computed(() => {
  if (props.decryptedContent) {
    try {
      const parsed = JSON.parse(props.decryptedContent);
      return parsed.text || parsed.content || props.decryptedContent;
    } catch {
      return props.decryptedContent;
    }
  }
  return '[Encrypted content]';
});

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
      <!-- Message text -->
      <p class="whitespace-pre-wrap break-words">{{ displayContent }}</p>

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
