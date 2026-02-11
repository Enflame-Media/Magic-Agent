<script setup lang="ts">
/**
 * EmptyState - Displays when no sessions are available
 *
 * Provides helpful guidance for users who haven't connected any terminals yet.
 * Encourages first-time setup and explains the app's purpose.
 */

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface Props {
  title?: string;
  description?: string;
  actionLabel?: string;
}

withDefaults(defineProps<Props>(), {
  title: 'No Sessions Yet',
  description: 'Connect a terminal to get started. Run the Happy CLI on your machine to see your Claude Code sessions here.',
  actionLabel: '',
});

const emit = defineEmits<{
  action: [];
}>();
</script>

<template>
  <Card class="max-w-md mx-auto">
    <CardHeader class="text-center">
      <div class="mx-auto mb-4 w-16 h-16 rounded-full bg-muted flex items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-8 h-8 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </div>
      <CardTitle>{{ title }}</CardTitle>
      <CardDescription>
        {{ description }}
      </CardDescription>
    </CardHeader>
    <CardContent v-if="actionLabel" class="flex justify-center">
      <Button @click="emit('action')">
        {{ actionLabel }}
      </Button>
    </CardContent>
  </Card>
</template>
