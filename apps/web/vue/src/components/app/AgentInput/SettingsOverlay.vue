<script setup lang="ts">
interface Props {
  modelLabel?: string;
  permissionLabel?: string;
}

withDefaults(defineProps<Props>(), {
  modelLabel: '',
  permissionLabel: '',
});
</script>

<template>
  <div class="flex items-center gap-2 text-[11px] text-muted-foreground">
    <span
      v-if="modelLabel"
      class="rounded-full border border-border/60 bg-background/40 px-2 py-0.5 text-foreground"
    >
      {{ modelLabel }}
    </span>
    <span
      v-if="permissionLabel"
      class="rounded-full border border-border/60 bg-background/40 px-2 py-0.5 text-foreground"
    >
      {{ permissionLabel }}
    </span>
  </div>
</template>
