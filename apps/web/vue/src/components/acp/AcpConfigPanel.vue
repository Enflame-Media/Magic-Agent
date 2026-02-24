<!--
  HAP-1047: ACP Session Configuration Options Panel

  Renders configurable session options from ACP agents. Supports type-aware
  editors: select dropdowns (flat and grouped), with unknown types shown
  as read-only. Uses shadcn-vue Select for web-native dropdowns.
-->
<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { IconSettings } from '@tabler/icons-vue';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AcpSessionConfigOption, AcpSessionConfigSelectGroup } from '@magic-agent/protocol';
import type { AcpSessionConfigSelectOption } from '@magic-agent/protocol';

const props = defineProps<{
  configOptions: AcpSessionConfigOption[];
}>();

const emit = defineEmits<{
  configChange: [configId: string, value: string];
}>();

const { t } = useI18n();
const pendingId = ref<string | null>(null);
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// Clear pending state when config options change (agent confirmed the change)
watch(() => props.configOptions, () => {
  pendingId.value = null;
});

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer);
});

function isGrouped(
  options: AcpSessionConfigOption['options']
): options is AcpSessionConfigSelectGroup[] {
  return options.length > 0 && options[0] != null && 'group' in options[0];
}

function handleValueChange(configId: string, value: string) {
  pendingId.value = configId;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    emit('configChange', configId, value);
  }, 300);
}

/** Group config options by category */
const grouped = computed(() => {
  const groups = new Map<string, AcpSessionConfigOption[]>();
  for (const opt of props.configOptions) {
    const key = opt.category ?? '';
    const existing = groups.get(key);
    if (existing) {
      existing.push(opt);
    } else {
      groups.set(key, [opt]);
    }
  }
  return Array.from(groups.entries());
});
</script>

<template>
  <div v-if="props.configOptions.length === 0" class="flex flex-col items-center py-5 px-4">
    <IconSettings class="size-8 text-muted-foreground mb-2" />
    <p class="text-[15px] font-semibold text-foreground mb-1">
      {{ t('acp.config.emptyTitle') }}
    </p>
    <p class="text-[13px] text-muted-foreground text-center">
      {{ t('acp.config.emptyDescription') }}
    </p>
  </div>
  <div v-else class="rounded-xl bg-muted/50 p-3 my-1">
    <div class="mb-2 flex items-center gap-1.5">
      <IconSettings class="size-4 text-muted-foreground" />
      <span class="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
        {{ t('acp.config.title') }}
      </span>
    </div>
    <div v-for="[category, options] in grouped" :key="category || '__default'">
      <p v-if="category" class="mt-2 mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {{ category }}
      </p>
      <div
        v-for="option in options"
        :key="option.id"
        class="flex items-center justify-between gap-3 border-b border-border/50 py-2 last:border-b-0"
      >
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-foreground">
            {{ option.name }}
          </p>
          <p v-if="option.description" class="mt-0.5 truncate text-xs text-muted-foreground">
            {{ option.description }}
          </p>
        </div>
        <div class="shrink-0">
          <span
            v-if="option.type !== 'select'"
            class="max-w-[120px] truncate text-[13px] italic text-muted-foreground"
          >
            {{ option.currentValue }}
          </span>
          <Select
            v-else
            :model-value="option.currentValue"
            :disabled="pendingId === option.id"
            @update:model-value="(v) => handleValueChange(option.id, String(v))"
          >
            <SelectTrigger class="h-8 min-w-[100px] max-w-[160px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <template v-if="isGrouped(option.options)">
                <SelectGroup
                  v-for="group in (option.options as AcpSessionConfigSelectGroup[])"
                  :key="group.group"
                >
                  <SelectLabel>{{ group.name }}</SelectLabel>
                  <SelectItem
                    v-for="opt in group.options"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.name }}
                  </SelectItem>
                </SelectGroup>
              </template>
              <template v-else>
                <SelectItem
                  v-for="opt in (option.options as AcpSessionConfigSelectOption[])"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.name }}
                </SelectItem>
              </template>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  </div>
</template>
