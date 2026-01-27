<script setup lang="ts">
import { computed } from 'vue';
import { CodeBlock } from '@/components/app';

interface Props {
  input: unknown;
  showLineNumbers?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showLineNumbers: false,
});

const diffText = computed(() => {
  if (!props.input || typeof props.input !== 'object') {
    return '';
  }
  const record = props.input as Record<string, unknown>;
  if (typeof record.patch === 'string') {
    return record.patch;
  }
  const before = typeof record.oldText === 'string' ? record.oldText : '';
  const after = typeof record.newText === 'string' ? record.newText : '';
  return [
    '--- before',
    before,
    '+++ after',
    after,
  ].join('\n');
});
</script>

<template>
  <CodeBlock
    :code="diffText"
    language="diff"
  />
</template>
