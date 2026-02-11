<script lang="ts" setup>
/**
 * Form Field Description component for TanStack Form
 *
 * Provides helper text below form inputs.
 */
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
  id?: string
}>()
</script>

<template>
  <p
    :id="id"
    data-slot="form-description"
    :class="cn('text-muted-foreground text-sm', props.class)"
  >
    <slot />
  </p>
</template>
