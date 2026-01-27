<script setup lang="ts">
/**
 * Share List Item Component
 *
 * Displays a single share entry with user avatar, name, permission dropdown,
 * and remove button.
 *
 * @see HAP-769 - Implement Share Session UI for happy-vue web app
 */

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { Trash2 } from 'lucide-vue-next';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import PermissionSelect from './PermissionSelect.vue';
import type { SessionShareEntry, SessionSharePermission } from '@happy/protocol';

// ─────────────────────────────────────────────────────────────────────────────
// Props & Emits
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  /** The share entry to display */
  share: SessionShareEntry;
  /** Whether permission changes are disabled */
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
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
// Computed
// ─────────────────────────────────────────────────────────────────────────────

/** Display name for the user */
const displayName = computed(() => {
  const profile = props.share.userProfile;
  if (!profile) return 'Unknown User';

  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ');
  return fullName || profile.username;
});

/** Username for the user */
const username = computed(() => {
  return props.share.userProfile?.username ?? '';
});

/** Avatar URL */
const avatarUrl = computed(() => {
  return props.share.userProfile?.avatar?.url ?? undefined;
});

/** Initials for avatar fallback */
const initials = computed(() => {
  const profile = props.share.userProfile;
  if (!profile) return '?';

  if (profile.firstName && profile.lastName) {
    return `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase();
  }
  return profile.username.slice(0, 2).toUpperCase();
});

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

function handlePermissionChange(permission: SessionSharePermission): void {
  emit('update:permission', props.share.id, permission);
}

function handleRemove(): void {
  emit('remove', props.share.id);
}
</script>

<template>
  <div class="flex items-center gap-3 py-2">
    <!-- Avatar -->
    <Avatar class="size-10">
      <AvatarImage v-if="avatarUrl" :src="avatarUrl" :alt="displayName" />
      <AvatarFallback>{{ initials }}</AvatarFallback>
    </Avatar>

    <!-- User Info -->
    <div class="flex-1 min-w-0">
      <p class="font-medium text-sm truncate">{{ displayName }}</p>
      <p v-if="username" class="text-xs text-muted-foreground truncate">
        @{{ username }}
      </p>
    </div>

    <!-- Permission Select -->
    <PermissionSelect
      :model-value="share.permission"
      :disabled="disabled"
      size="sm"
      @update:model-value="handlePermissionChange"
    />

    <!-- Remove Button -->
    <Button
      variant="ghost"
      size="icon"
      class="size-8 text-muted-foreground hover:text-destructive"
      :disabled="disabled"
      @click="handleRemove"
    >
      <Trash2 class="size-4" />
      <span class="sr-only">{{ t('sharing.removeAccess') }}</span>
    </Button>
  </div>
</template>
