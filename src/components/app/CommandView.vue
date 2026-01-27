<script setup lang="ts">
import { CodeBlock } from '@/components/app';

interface Props {
  command: string;
}

defineProps<Props>();
</script>

<template>
  <CodeBlock
    :code="command"
    language="bash"
  />
</template>
