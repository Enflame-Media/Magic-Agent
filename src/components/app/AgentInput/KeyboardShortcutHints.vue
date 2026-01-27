<script setup lang="ts">
import { Kbd } from '@/components/ui/kbd';
</script>

<template>
  <div class="flex items-center gap-2 text-[10px] text-muted-foreground">
    <div class="flex items-center gap-1">
      <Kbd>Enter</Kbd>
      <span>Send</span>
    </div>
    <div class="flex items-center gap-1">
      <Kbd>Shift</Kbd>
      <Kbd>Tab</Kbd>
      <span>Cycle mode</span>
    </div>
    <div class="flex items-center gap-1">
      <Kbd>Cmd</Kbd>
      <Kbd>M</Kbd>
      <span>Cycle model</span>
    </div>
    <div class="flex items-center gap-1">
      <Kbd>Esc</Kbd>
      <span>Abort</span>
    </div>
  </div>
</template>
