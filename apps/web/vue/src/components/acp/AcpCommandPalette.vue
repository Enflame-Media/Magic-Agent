<!--
  HAP-1047: ACP Command Palette Component

  Displays available slash commands from ACP agents in a searchable
  dialog triggered by Cmd+K (Mac) / Ctrl+K (Windows).
  Uses the shadcn-vue Command component for consistent UX.
-->
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { IconTerminal, IconCode } from '@tabler/icons-vue';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import type { AcpAvailableCommand } from '@magic-agent/protocol';

const props = defineProps<{
  commands: AcpAvailableCommand[];
}>();

const emit = defineEmits<{
  invoke: [command: AcpAvailableCommand];
}>();

const { t } = useI18n();
const open = ref(false);

function handleKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    open.value = !open.value;
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});

function handleSelect(command: AcpAvailableCommand) {
  open.value = false;
  emit('invoke', command);
}
</script>

<template>
  <CommandDialog
    v-model:open="open"
    :title="t('acp.commandPalette.title')"
    :description="t('acp.commandPalette.searchPlaceholder')"
  >
    <CommandInput :placeholder="t('acp.commandPalette.searchPlaceholder')" />
    <CommandList>
      <CommandEmpty>
        {{ t('acp.commandPalette.noResults') }}
      </CommandEmpty>
      <CommandGroup v-if="props.commands.length > 0" :heading="t('acp.commandPalette.title')">
        <CommandItem
          v-for="command in props.commands"
          :key="command.name"
          :value="command.name"
          @select="handleSelect(command)"
        >
          <IconTerminal class="size-4" />
          <span class="font-mono">/{{ command.name }}</span>
          <span v-if="command.description" class="ml-2 truncate text-muted-foreground">
            {{ command.description }}
          </span>
        </CommandItem>
      </CommandGroup>
      <div v-else class="flex flex-col items-center justify-center py-12 px-8">
        <IconCode class="size-8 text-muted-foreground mb-3" />
        <p class="text-base font-semibold text-foreground mb-1">
          {{ t('acp.commandPalette.emptyTitle') }}
        </p>
        <p class="text-sm text-muted-foreground text-center leading-5">
          {{ t('acp.commandPalette.emptyDescription') }}
        </p>
      </div>
    </CommandList>
  </CommandDialog>
</template>
