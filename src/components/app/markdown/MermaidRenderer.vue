<script setup lang="ts">
import { CodeBlock } from '@/components/app';

interface Props {
  content: string;
}

defineProps<Props>();
</script>

<template>
  <CodeBlock
    :code="content"
    language="mermaid"
  />
</template>
