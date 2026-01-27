<script setup lang="ts">
import type { ToolPermission } from '@/services/messages/types';

interface Props {
  permission: ToolPermission;
}

defineProps<Props>();
</script>

<template>
  <div class="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
    <div class="flex items-center gap-2">
      <span class="font-semibold text-foreground">Permission</span>
      <span class="uppercase tracking-wide">
        {{ permission.status ?? 'pending' }}
      </span>
      <span v-if="permission.mode" class="text-muted-foreground">
        {{ permission.mode }}
      </span>
    </div>
    <div v-if="permission.reason" class="mt-1">
      {{ permission.reason }}
    </div>
  </div>
</template>
