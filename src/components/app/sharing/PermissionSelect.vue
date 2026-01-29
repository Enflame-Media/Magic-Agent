<script setup lang="ts">
/**
 * Permission Select Component
 *
 * A dropdown select component for choosing session sharing permissions.
 * Supports two permission levels: View Only and View & Chat.
 *
 * @see HAP-769 - Implement Share Session UI for happy-vue web app
 */

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { Eye, MessageSquare } from 'lucide-vue-next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SessionSharePermission } from '@happy/protocol';

// ─────────────────────────────────────────────────────────────────────────────
// Props & Emits
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  /** Current permission value */
  modelValue: SessionSharePermission;
  /** Whether the select is disabled */
  disabled?: boolean;
  /** Size variant */
  size?: 'sm' | 'md';
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  size: 'md',
});

const emit = defineEmits<{
  'update:modelValue': [value: SessionSharePermission];
}>();

// ─────────────────────────────────────────────────────────────────────────────
// Composables
// ─────────────────────────────────────────────────────────────────────────────

const { t } = useI18n();

// ─────────────────────────────────────────────────────────────────────────────
// Computed
// ─────────────────────────────────────────────────────────────────────────────

const triggerClass = computed(() => {
  return props.size === 'sm' ? 'h-8 text-xs' : 'h-9 text-sm';
});

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

function handleValueChange(value: string | number | bigint | Record<string, unknown> | null): void {
  if (typeof value === 'string') {
    emit('update:modelValue', value as SessionSharePermission);
  }
}
</script>

<template>
  <Select
    :model-value="modelValue"
    :disabled="disabled"
    @update:model-value="handleValueChange"
  >
    <SelectTrigger :class="triggerClass">
      <SelectValue :placeholder="t('sharing.permission.placeholder')" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="view_only">
        <div class="flex items-center gap-2">
          <Eye class="size-4 text-muted-foreground" />
          <span>{{ t('sharing.permission.viewOnly') }}</span>
        </div>
      </SelectItem>
      <SelectItem value="view_and_chat">
        <div class="flex items-center gap-2">
          <MessageSquare class="size-4 text-muted-foreground" />
          <span>{{ t('sharing.permission.viewAndChat') }}</span>
        </div>
      </SelectItem>
    </SelectContent>
  </Select>
</template>
