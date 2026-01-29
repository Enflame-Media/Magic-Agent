<script lang="ts" setup>
/**
 * Form Field Error component for TanStack Form
 *
 * Displays validation errors from TanStack Form field state.
 * Only renders when errors array is non-empty.
 *
 * @example
 * <FieldError v-if="isInvalid(field)" :errors="field.state.meta.errors" />
 */
import type { HTMLAttributes } from 'vue'
import { computed } from 'vue'
import { cn } from '@/lib/utils'
import type { ValidationError } from '@tanstack/vue-form'

const props = defineProps<{
  class?: HTMLAttributes['class']
  id?: string
  errors?: ValidationError[]
}>()

const errorMessage = computed(() => {
  if (!props.errors || props.errors.length === 0) return null

  // Get first error message
  const firstError = props.errors[0]
  if (typeof firstError === 'string') return firstError
  if (firstError && typeof firstError === 'object' && 'message' in firstError) {
    return (firstError as { message: string }).message
  }
  return String(firstError)
})
</script>

<template>
  <p
    v-if="errorMessage"
    :id="id"
    data-slot="form-error"
    role="alert"
    :class="cn('text-destructive text-sm', props.class)"
  >
    {{ errorMessage }}
  </p>
</template>
