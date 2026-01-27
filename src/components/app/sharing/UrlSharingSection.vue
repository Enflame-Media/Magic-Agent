<script setup lang="ts">
/**
 * URL Sharing Section Component
 *
 * Manages URL sharing configuration with toggle, password input,
 * permission select, and copy URL functionality.
 *
 * @see HAP-769 - Implement Share Session UI for happy-vue web app
 */

import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Link, Copy, Lock, Eye, EyeOff } from 'lucide-vue-next';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import PermissionSelect from './PermissionSelect.vue';
import type { SessionShareUrlConfig, SessionSharePermission } from '@happy/protocol';

// ─────────────────────────────────────────────────────────────────────────────
// Props & Emits
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  /** Current URL sharing configuration */
  urlConfig: SessionShareUrlConfig | null;
  /** The shareable URL (computed from token) */
  shareableUrl: string | null;
  /** Whether the section is in a loading state */
  isLoading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
});

const emit = defineEmits<{
  'update:config': [enabled: boolean, password: string | null, permission: SessionSharePermission];
  'copy-url': [];
}>();

// ─────────────────────────────────────────────────────────────────────────────
// Composables
// ─────────────────────────────────────────────────────────────────────────────

const { t } = useI18n();

// ─────────────────────────────────────────────────────────────────────────────
// Local State
// ─────────────────────────────────────────────────────────────────────────────

const localEnabled = ref(false);
const localPassword = ref('');
const localPermission = ref<SessionSharePermission>('view_only');
const showPassword = ref(false);
const hasPasswordSet = ref(false);

// ─────────────────────────────────────────────────────────────────────────────
// Computed
// ─────────────────────────────────────────────────────────────────────────────

const isEnabled = computed(() => props.urlConfig?.enabled ?? false);

// ─────────────────────────────────────────────────────────────────────────────
// Watchers
// ─────────────────────────────────────────────────────────────────────────────

// Sync local state with props
watch(
  () => props.urlConfig,
  (config) => {
    if (config) {
      localEnabled.value = config.enabled;
      localPermission.value = config.permission;
      hasPasswordSet.value = !!config.password;
      // Don't show the actual password, just indicate if one is set
      localPassword.value = '';
    }
  },
  { immediate: true }
);

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

function handleToggle(enabled: boolean): void {
  localEnabled.value = enabled;
  emit(
    'update:config',
    enabled,
    localPassword.value || null,
    localPermission.value
  );
}

function handlePasswordChange(): void {
  if (!localEnabled.value) return;

  emit(
    'update:config',
    localEnabled.value,
    localPassword.value || null,
    localPermission.value
  );
}

function handlePermissionChange(permission: SessionSharePermission): void {
  localPermission.value = permission;
  if (!localEnabled.value) return;

  emit(
    'update:config',
    localEnabled.value,
    localPassword.value || null,
    permission
  );
}

function handleCopyUrl(): void {
  emit('copy-url');
}

function togglePasswordVisibility(): void {
  showPassword.value = !showPassword.value;
}
</script>

<template>
  <div class="space-y-4">
    <!-- Section Header with Toggle -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Link class="size-4 text-muted-foreground" />
        <Label class="font-medium">{{ t('sharing.urlSharing.title') }}</Label>
      </div>
      <Switch
        :checked="localEnabled"
        :disabled="isLoading"
        @update:checked="handleToggle"
      />
    </div>

    <!-- URL Sharing Content (when enabled) -->
    <div
      v-if="isEnabled"
      class="space-y-4 pl-6 border-l-2 border-muted"
    >
      <!-- Shareable URL -->
      <div class="space-y-2">
        <Label class="text-xs text-muted-foreground">
          {{ t('sharing.urlSharing.shareableLink') }}
        </Label>
        <div class="flex gap-2">
          <Input
            :model-value="shareableUrl ?? ''"
            readonly
            class="font-mono text-xs"
            :placeholder="t('sharing.urlSharing.generatingUrl')"
          />
          <Button
            variant="outline"
            size="icon"
            :disabled="!shareableUrl || isLoading"
            @click="handleCopyUrl"
          >
            <Copy class="size-4" />
            <span class="sr-only">{{ t('sharing.urlSharing.copyUrl') }}</span>
          </Button>
        </div>
      </div>

      <!-- Permission for URL access -->
      <div class="space-y-2">
        <Label class="text-xs text-muted-foreground">
          {{ t('sharing.urlSharing.permission') }}
        </Label>
        <PermissionSelect
          :model-value="localPermission"
          :disabled="isLoading"
          @update:model-value="handlePermissionChange"
        />
      </div>

      <!-- Password Protection -->
      <div class="space-y-2">
        <Label class="text-xs text-muted-foreground flex items-center gap-1">
          <Lock class="size-3" />
          {{ t('sharing.urlSharing.password') }}
          <span class="text-muted-foreground/60">({{ t('common.optional') }})</span>
        </Label>
        <div class="relative">
          <Input
            v-model="localPassword"
            :type="showPassword ? 'text' : 'password'"
            :placeholder="hasPasswordSet ? t('sharing.urlSharing.passwordSet') : t('sharing.urlSharing.passwordPlaceholder')"
            :disabled="isLoading"
            class="pr-10"
            @blur="handlePasswordChange"
            @keyup.enter="handlePasswordChange"
          />
          <Button
            variant="ghost"
            size="icon"
            class="absolute right-0 top-0 size-9"
            @click="togglePasswordVisibility"
          >
            <Eye v-if="showPassword" class="size-4" />
            <EyeOff v-else class="size-4" />
            <span class="sr-only">{{ t('sharing.urlSharing.togglePassword') }}</span>
          </Button>
        </div>
        <p class="text-xs text-muted-foreground">
          {{ t('sharing.urlSharing.passwordHint') }}
        </p>
      </div>
    </div>

    <!-- Disabled State Description -->
    <p v-else class="text-sm text-muted-foreground pl-6">
      {{ t('sharing.urlSharing.description') }}
    </p>
  </div>
</template>
