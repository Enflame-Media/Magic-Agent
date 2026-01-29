/**
 * TanStack Form field validity helper
 *
 * Checks if a field should be shown as invalid based on:
 * - Field has been touched (user interacted)
 * - Field has validation errors
 */
import type { AnyFieldApi } from '@tanstack/vue-form'

export function isInvalid(field: AnyFieldApi): boolean {
  return field.state.meta.isTouched && !field.state.meta.isValid
}
