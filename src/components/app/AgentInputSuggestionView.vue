<script setup lang="ts">
interface Props {
  suggestion: string;
  active?: boolean;
}

withDefaults(defineProps<Props>(), {
  active: false,
});
</script>

<template>
  <div
    class="rounded px-2 py-1 text-xs"
    :class="active ? 'bg-muted text-foreground' : 'text-muted-foreground'"
  >
    {{ suggestion }}
  </div>
</template>
