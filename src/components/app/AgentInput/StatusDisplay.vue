<script setup lang="ts">
interface Props {
  online?: boolean;
  label?: string;
}

withDefaults(defineProps<Props>(), {
  online: false,
  label: '',
});
</script>

<template>
  <div class="flex items-center gap-2 text-xs text-muted-foreground">
    <span
      class="h-2 w-2 rounded-full"
      :class="online ? 'bg-emerald-500' : 'bg-gray-400'"
    />
    <span>{{ label || (online ? 'online' : 'offline') }}</span>
  </div>
</template>
