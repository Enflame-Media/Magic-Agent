/**
 * Account-related update schemas
 *
 * Handles: update-account
 *
 * Security: All string fields have maximum length constraints.
 */

import { z } from 'zod';
import { GitHubProfileSchema, ImageRefSchema, NullableVersionedValueSchema } from '../common';
import { STRING_LIMITS } from '../constraints';

/**
 * Update account
 *
 * Sent when user account settings or profile changes.
 *
 * @example
 * ```typescript
 * const accountUpdate = ApiUpdateAccountSchema.parse({
 *     t: 'update-account',
 *     id: 'user_abc123',
 *     firstName: 'Jane',
 *     lastName: 'Doe',
 *     avatar: {
 *         path: 'avatars/user_abc123/profile.jpg',
 *         url: 'https://cdn.example.com/avatars/user_abc123/profile.jpg'
 *     },
 *     github: { id: 12345678, login: 'janedoe', name: 'Jane Doe' }
 * });
 * ```
 */
export const ApiUpdateAccountSchema = z.object({
    t: z.literal('update-account'),
    id: z.string().min(1).max(STRING_LIMITS.ID_MAX),
    settings: NullableVersionedValueSchema.nullish(),
    firstName: z.string().max(STRING_LIMITS.NAME_MAX).nullish(),
    lastName: z.string().max(STRING_LIMITS.NAME_MAX).nullish(),
    avatar: ImageRefSchema.nullish(),
    github: GitHubProfileSchema.nullish(),
});

export type ApiUpdateAccount = z.infer<typeof ApiUpdateAccountSchema>;
