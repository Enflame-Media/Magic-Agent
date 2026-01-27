<script setup lang="ts">
import { computed, ref } from 'vue';

interface Props {
  modelValue: string;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '',
  disabled: false,
  rows: 3,
});

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void;
  (event: 'keydown', keydownEvent: KeyboardEvent): void;
  (event: 'cursor-change', cursor: number): void;
}>();

const localValue = computed({
  get: () => props.modelValue,
  set: (value: string) => { emit('update:modelValue', value); },
});

const textareaRef = ref<HTMLTextAreaElement | null>(null);

function handleKeydown(event: KeyboardEvent): void {
  emit('keydown', event);
}

function handleCursorChange(): void {
  const element = textareaRef.value;
  if (!element) {
    return;
  }
  emit('cursor-change', element.selectionStart ?? 0);
}

function setCursor(position: number): void {
  const element = textareaRef.value;
  if (!element) {
    return;
  }
  element.setSelectionRange(position, position);
  element.focus();
}

defineExpose({ setCursor });
</script>

<template>
  <textarea
    ref="textareaRef"
    v-model="localValue"
    :rows="rows"
    :placeholder="placeholder"
    :disabled="disabled"
    class="min-h-[88px] w-full resize-none bg-transparent py-2 text-sm leading-6 outline-none placeholder:text-muted-foreground"
    @keydown="handleKeydown"
    @keyup="handleCursorChange"
    @click="handleCursorChange"
    @input="handleCursorChange"
  />
</template>
