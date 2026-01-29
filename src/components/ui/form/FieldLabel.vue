<script lang="ts" setup>
/**
 * Form Field Label component for TanStack Form
 *
 * Accessible label that connects to form inputs via `for` attribute.
 * Applies error styling when parent Field has data-invalid.
 */
import type { LabelProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'

const props = defineProps<LabelProps & {
  class?: HTMLAttributes['class']
  for?: string
}>()
</script>

<template>
  <Label
    data-slot="form-label"
    :for="props.for"
    :class="cn(
      'data-[invalid]:text-destructive',
      props.class,
    )"
  >
    <slot />
  </Label>
</template>

<style scoped>
/* Inherit data-invalid from parent Field */
[data-slot='form-field'][data-invalid] [data-slot='form-label'] {
  color: hsl(var(--destructive));
}
</style>
