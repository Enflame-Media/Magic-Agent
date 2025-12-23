/**
 * Account-related update schemas
 *
 * Handles: update-account
 */

import { z } from 'zod';
import { GitHubProfileSchema, ImageRefSchema, NullableVersionedValueSchema } from '../common';

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
    id: z.string(),
    settings: NullableVersionedValueSchema.nullish(),
    firstName: z.string().nullish(),
    lastName: z.string().nullish(),
    avatar: ImageRefSchema.nullish(),
    github: GitHubProfileSchema.nullish(),
});

export type ApiUpdateAccount = z.infer<typeof ApiUpdateAccountSchema>;
