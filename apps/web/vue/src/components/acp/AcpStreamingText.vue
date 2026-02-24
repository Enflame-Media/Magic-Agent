<!--
  HAP-1047: ACP Streaming Text Component

  Renders streaming agent message text using the existing MarkdownView
  component. Wraps the streaming text with proper layout handling.
-->
<script setup lang="ts">
import { MarkdownView } from '@/components/app';

const props = defineProps<{
  text: string;
}>();
</script>

<template>
  <div v-if="props.text" class="my-1">
    <MarkdownView :markdown="props.text" />
  </div>
</template>
