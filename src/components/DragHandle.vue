<script setup lang="ts">
import { IconGripVertical } from "@tabler/icons-vue"
import { Button } from '@/components/ui/button'
</script>

<template>
  <Button
    variant="ghost"
    size="icon"
    class="text-muted-foreground size-7 hover:bg-transparent"
  >
    <IconGripVertical class="text-muted-foreground size-3" />
    <span class="sr-only">Drag to reorder</span>
  </Button>
</template>
