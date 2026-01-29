<script lang="ts" setup>
/**
 * Form Field wrapper component for TanStack Form
 *
 * Provides consistent styling and accessibility attributes for form fields.
 * Use with TanStack Form's form.Field scoped slot.
 *
 * @example
 * <form.Field name="email" v-slot="{ field }">
 *   <Field :data-invalid="isInvalid(field)">
 *     <FieldLabel :for="field.name">Email</FieldLabel>
 *     <Input ... />
 *     <FieldError :errors="field.state.meta.errors" />
 *   </Field>
 * </form.Field>
 */
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
  dataInvalid?: boolean
}>()
</script>

<template>
  <div
    data-slot="form-field"
    :data-invalid="dataInvalid || undefined"
    :class="cn('grid gap-2', props.class)"
  >
    <slot />
  </div>
</template>
