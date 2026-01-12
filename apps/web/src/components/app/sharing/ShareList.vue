<script setup lang="ts">
/**
 * Share List Component
 *
 * Displays the list of users who have access to a session,
 * with the ability to change permissions or remove access.
 *
 * @see HAP-769 - Implement Share Session UI for happy-vue web app
 */

import { useI18n } from 'vue-i18n';
import { Users } from 'lucide-vue-next';
import ShareListItem from './ShareListItem.vue';
import type { SessionShareEntry, SessionSharePermission } from '@happy-vue/protocol';

// ─────────────────────────────────────────────────────────────────────────────
// Props & Emits
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  /** List of shares to display */
  shares: SessionShareEntry[];
  /** Whether the list is in a loading state */
  isLoading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
});

const emit = defineEmits<{
  'update:permission': [shareId: string, permission: SessionSharePermission];
  'remove': [shareId: string];
}>();

// ─────────────────────────────────────────────────────────────────────────────
// Composables
// ─────────────────────────────────────────────────────────────────────────────

const { t } = useI18n();

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

function handlePermissionUpdate(shareId: string, permission: SessionSharePermission): void {
  emit('update:permission', shareId, permission);
}

function handleRemove(shareId: string): void {
  emit('remove', shareId);
}
</script>

<template>
  <div class="space-y-2">
    <!-- Section Header -->
    <div class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
      <Users class="size-4" />
      <span>{{ t('sharing.peopleWithAccess') }}</span>
      <span v-if="shares.length > 0" class="text-xs">
        ({{ shares.length }})
      </span>
    </div>

    <!-- Empty State -->
    <div
      v-if="shares.length === 0 && !isLoading"
      class="py-6 text-center text-sm text-muted-foreground"
    >
      {{ t('sharing.noShares') }}
    </div>

    <!-- Share List -->
    <div v-else class="divide-y">
      <ShareListItem
        v-for="share in shares"
        :key="share.id"
        :share="share"
        :disabled="isLoading"
        @update:permission="handlePermissionUpdate"
        @remove="handleRemove"
      />
    </div>
  </div>
</template>
