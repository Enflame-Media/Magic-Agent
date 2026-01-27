<script setup lang="ts">
interface Props {
  title?: string;
  fullWidth?: boolean;
}

defineProps<Props>();
</script>

<template>
  <section :class="['rounded-lg border border-border/60 bg-muted/20', fullWidth ? 'w-full' : '']">
    <div v-if="title" class="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {{ title }}
    </div>
    <div class="px-3 pb-3">
      <slot />
    </div>
  </section>
</template>
