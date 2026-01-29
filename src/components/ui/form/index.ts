/**
 * TanStack Form + ShadCN-Vue form components
 *
 * Pattern based on: https://www.shadcn-vue.com/docs/forms/tanstack-form
 *
 * @example
 * import { useForm } from '@tanstack/vue-form'
 * import { z } from 'zod'
 * import { Field, FieldLabel, FieldDescription, FieldError, isInvalid } from '@/components/ui/form'
 *
 * const schema = z.object({ email: z.string().email() })
 * const form = useForm({
 *   defaultValues: { email: '' },
 *   validators: { onSubmit: schema },
 *   onSubmit: async ({ value }) => { ... }
 * })
 *
 * <form @submit.prevent="form.handleSubmit">
 *   <form.Field name="email" v-slot="{ field }">
 *     <Field :data-invalid="isInvalid(field)">
 *       <FieldLabel :for="field.name">Email</FieldLabel>
 *       <Input
 *         :id="field.name"
 *         :model-value="field.state.value"
 *         @input="field.handleChange($event.target.value)"
 *         @blur="field.handleBlur"
 *       />
 *       <FieldError v-if="isInvalid(field)" :errors="field.state.meta.errors" />
 *     </Field>
 *   </form.Field>
 * </form>
 */
export { default as Field } from './Field.vue'
export { default as FieldLabel } from './FieldLabel.vue'
export { default as FieldDescription } from './FieldDescription.vue'
export { default as FieldError } from './FieldError.vue'
export { isInvalid } from './isInvalid'
