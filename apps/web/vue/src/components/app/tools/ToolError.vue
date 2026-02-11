<script setup lang="ts">
interface Props {
  message: string;
}

defineProps<Props>();
</script>

<template>
  <div class="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
    {{ message }}
  </div>
</template>
