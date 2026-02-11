<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Button } from '@/components/ui/button';
import MultiTextInput from '@/components/app/MultiTextInput.vue';
import AgentInputAutocomplete from '@/components/app/AgentInputAutocomplete.vue';
import ActionButtons from './ActionButtons.vue';
import KeyboardShortcutHints from './KeyboardShortcutHints.vue';
import StatusDisplay from './StatusDisplay.vue';
import SettingsOverlay from './SettingsOverlay.vue';
import type { AgentInputProps } from './types';
import { useActiveSuggestions } from '@/components/app/autocomplete/useActiveSuggestions';
import { applySuggestion } from '@/components/app/autocomplete/applySuggestion';

interface Props extends AgentInputProps {
  modelValue: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelLabel: '',
  permissionLabel: '',
  online: false,
  disabled: false,
  placeholder: 'Type a message...',
});

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void;
  (event: 'send'): void;
  (event: 'settings'): void;
  (event: 'info'): void;
  (event: 'cycle-model'): void;
  (event: 'cycle-mode'): void;
}>();

const localValue = computed({
  get: () => props.modelValue,
  set: (value: string) => { emit('update:modelValue', value); },
});

const activeSuggestionIndex = ref(0);
const inputRef = ref<InstanceType<typeof MultiTextInput> | null>(null);

const { activeWord, suggestions, setCursor } = useActiveSuggestions(() => localValue.value);

function handleKeydown(event: KeyboardEvent): void {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'm') {
    event.preventDefault();
    emit('cycle-model');
    return;
  }

  if (event.key === 'Tab' && event.shiftKey) {
    event.preventDefault();
    emit('cycle-mode');
    return;
  }

  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    if (suggestions.value.length > 0 && activeWord.value) {
      const suggestion = suggestions.value[activeSuggestionIndex.value] ?? suggestions.value[0];
      if (!suggestion) {
        return;
      }
      const applied = applySuggestion(localValue.value, activeWord.value, suggestion);
      emit('update:modelValue', applied.value);
      setCursor(applied.cursor);
      inputRef.value?.setCursor(applied.cursor);
      return;
    }
    emit('send');
    return;
  }

  if (event.key === 'Tab' && suggestions.value.length > 0 && activeWord.value) {
    event.preventDefault();
    const suggestion = suggestions.value[activeSuggestionIndex.value] ?? suggestions.value[0];
    if (!suggestion) {
      return;
    }
    const applied = applySuggestion(localValue.value, activeWord.value, suggestion);
    emit('update:modelValue', applied.value);
    setCursor(applied.cursor);
    inputRef.value?.setCursor(applied.cursor);
    return;
  }

  if (event.key === 'ArrowDown' && suggestions.value.length > 0) {
    event.preventDefault();
    activeSuggestionIndex.value =
      (activeSuggestionIndex.value + 1) % suggestions.value.length;
    return;
  }

  if (event.key === 'ArrowUp' && suggestions.value.length > 0) {
    event.preventDefault();
    activeSuggestionIndex.value =
      (activeSuggestionIndex.value - 1 + suggestions.value.length) % suggestions.value.length;
  }
}

function handleCursorChange(cursor: number): void {
  setCursor(cursor);
}

watch(suggestions, (next) => {
  if (next.length === 0) {
    activeSuggestionIndex.value = 0;
    return;
  }
  if (activeSuggestionIndex.value >= next.length) {
    activeSuggestionIndex.value = 0;
  }
});
</script>

<template>
  <div class="rounded-2xl border border-border/50 bg-muted/50 px-4 py-3 shadow-sm">
    <div class="flex items-center justify-between text-[11px] text-muted-foreground mb-2">
      <StatusDisplay :online="online" />
      <div class="flex items-center gap-2">
        <SettingsOverlay
          :model-label="modelLabel"
          :permission-label="permissionLabel"
        />
        <Button
          variant="outline"
          size="sm"
          class="h-6 rounded-full border-border/60 bg-background/40 px-3 text-[11px]"
          @click="emit('settings')"
        >
          CLI Settings
        </Button>
      </div>
    </div>

    <AgentInputAutocomplete
      v-if="suggestions.length > 0"
      :suggestions="suggestions.map((item) => item.label)"
      :active-index="activeSuggestionIndex"
      wrapper-class="mt-2"
    />

    <MultiTextInput
      ref="inputRef"
      v-model="localValue"
      :placeholder="placeholder"
      :disabled="disabled"
      @keydown="handleKeydown"
      @cursor-change="handleCursorChange"
    />

    <div class="mt-3 flex items-center justify-between text-muted-foreground">
      <div class="flex items-center gap-2">
        <ActionButtons
          @settings="emit('settings')"
          @info="emit('info')"
        />
        <KeyboardShortcutHints />
      </div>
      <Button
        variant="ghost"
        size="icon"
        class="h-9 w-9 rounded-full bg-background/60 text-foreground"
        :disabled="disabled || localValue.trim().length === 0"
        aria-label="Send message"
        @click="emit('send')"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M7 9v6" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M11 6v12" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 9v6" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 5v14" />
        </svg>
      </Button>
    </div>
  </div>
</template>
