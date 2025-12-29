/**
 * Common types shared across Happy protocol
 *
 * These are foundational types used by multiple update and ephemeral schemas.
 *
 * Security: All string fields have maximum length constraints to prevent
 * DoS attacks via oversized payloads and database bloat.
 *
 * @see ./constraints.ts for STRING_LIMITS constants
 */

import { z } from 'zod';
import { STRING_LIMITS } from './constraints';

/**
 * GitHub profile data from OAuth
 * Used in update-account events
 *
 * IMPORTANT: This is the CANONICAL schema - all projects must import from here.
 *
 * GitHub API field requirements:
 * - id: Always present (required)
 * - login: Always present (required)
 * - name: User-settable, can be null or missing
 * - avatar_url: Usually present but not guaranteed
 * - email: User preference, can be null or missing
 * - bio: Optional user field, can be null or missing
 *
 * We use .strip() to safely ignore additional GitHub fields while preventing
 * prototype pollution and storage bloat attacks.
 *
 * @example
 * ```typescript
 * const profile = GitHubProfileSchema.parse({
 *     id: 12345678,
 *     login: 'octocat',
 *     name: 'The Octocat',
 *     avatar_url: 'https://avatars.githubusercontent.com/u/12345678',
 *     email: 'octocat@github.com',
 *     bio: 'I love coding!'
 * });
 * ```
 */
export const GitHubProfileSchema = z.object({
    id: z.number(),
    login: z.string().min(1).max(STRING_LIMITS.USERNAME_MAX),
    name: z.string().max(STRING_LIMITS.NAME_MAX).nullable().optional(),
    avatar_url: z.string().max(STRING_LIMITS.URL_MAX).optional(),
    email: z.string().max(STRING_LIMITS.NAME_MAX).nullable().optional(),
    bio: z.string().max(STRING_LIMITS.BIO_MAX).nullable().optional(),
}).strip();

export type GitHubProfile = z.infer<typeof GitHubProfileSchema>;

/**
 * Image reference for avatars and other media
 *
 * Note: width, height, and thumbhash are optional because:
 * - Image dimensions may not be available at upload time
 * - Thumbhash is generated asynchronously and may not exist yet
 *
 * @example
 * ```typescript
 * const avatar = ImageRefSchema.parse({
 *     path: 'avatars/user123/profile.jpg',
 *     url: 'https://cdn.example.com/avatars/user123/profile.jpg',
 *     width: 256,
 *     height: 256,
 *     thumbhash: 'YJqGPQw7WGdweIeAeH...'
 * });
 * ```
 */
export const ImageRefSchema = z.object({
    path: z.string().min(1).max(STRING_LIMITS.PATH_MAX),
    url: z.string().min(1).max(STRING_LIMITS.URL_MAX),
    width: z.number().optional(),
    height: z.number().optional(),
    thumbhash: z.string().max(STRING_LIMITS.THUMBHASH_MAX).optional(),
});

export type ImageRef = z.infer<typeof ImageRefSchema>;

/**
 * Relationship status between users
 *
 * @example
 * ```typescript
 * const status = RelationshipStatusSchema.parse('friend');
 * // Valid values: 'none', 'requested', 'pending', 'friend', 'rejected'
 * ```
 */
export const RelationshipStatusSchema = z.enum([
    'none',
    'requested',
    'pending',
    'friend',
    'rejected',
]);

export type RelationshipStatus = z.infer<typeof RelationshipStatusSchema>;

/**
 * User profile for social features
 *
 * @example
 * ```typescript
 * const user = UserProfileSchema.parse({
 *     id: 'user_abc123',
 *     firstName: 'Jane',
 *     lastName: 'Doe',
 *     avatar: null,
 *     username: 'janedoe',
 *     bio: 'Software developer',
 *     status: 'friend'
 * });
 * ```
 */
export const UserProfileSchema = z.object({
    id: z.string().min(1).max(STRING_LIMITS.ID_MAX),
    firstName: z.string().min(1).max(STRING_LIMITS.NAME_MAX),
    lastName: z.string().max(STRING_LIMITS.NAME_MAX).nullable(),
    avatar: ImageRefSchema.nullable(),
    username: z.string().min(1).max(STRING_LIMITS.USERNAME_MAX),
    bio: z.string().max(STRING_LIMITS.BIO_MAX).nullable(),
    status: RelationshipStatusSchema,
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

/**
 * Feed body types for activity feed
 *
 * @example
 * ```typescript
 * // Friend request notification
 * const friendRequest = FeedBodySchema.parse({
 *     kind: 'friend_request',
 *     uid: 'user_xyz789'
 * });
 *
 * // Text notification
 * const textPost = FeedBodySchema.parse({
 *     kind: 'text',
 *     text: 'Welcome to Happy!'
 * });
 * ```
 */
export const FeedBodySchema = z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('friend_request'), uid: z.string().min(1).max(STRING_LIMITS.ID_MAX) }),
    z.object({ kind: z.literal('friend_accepted'), uid: z.string().min(1).max(STRING_LIMITS.ID_MAX) }),
    z.object({ kind: z.literal('text'), text: z.string().max(STRING_LIMITS.FEED_TEXT_MAX) }),
]);

export type FeedBody = z.infer<typeof FeedBodySchema>;

/**
 * Encrypted message content structure
 * Used for all encrypted payloads in the protocol
 *
 * @example
 * ```typescript
 * const encrypted = EncryptedContentSchema.parse({
 *     t: 'encrypted',
 *     c: 'base64EncodedEncryptedContent=='
 * });
 * ```
 */
export const EncryptedContentSchema = z.object({
    t: z.literal('encrypted'),
    c: z.string().max(STRING_LIMITS.CONTENT_MAX), // Base64 encoded encrypted content
});

export type EncryptedContent = z.infer<typeof EncryptedContentSchema>;

/**
 * Versioned value wrapper for optimistic concurrency
 * Used for metadata, agentState, daemonState, etc.
 *
 * @example
 * ```typescript
 * const versioned = VersionedValueSchema.parse({
 *     version: 5,
 *     value: '{"key": "encrypted-data"}'
 * });
 * ```
 */
export const VersionedValueSchema = z.object({
    version: z.number(),
    value: z.string().max(STRING_LIMITS.VERSIONED_VALUE_MAX),
});

export type VersionedValue = z.infer<typeof VersionedValueSchema>;

/**
 * Nullable versioned value (for updates where value can be cleared)
 *
 * @example
 * ```typescript
 * // Set a value
 * const withValue = NullableVersionedValueSchema.parse({
 *     version: 3,
 *     value: '{"state": "active"}'
 * });
 *
 * // Clear a value
 * const cleared = NullableVersionedValueSchema.parse({
 *     version: 4,
 *     value: null
 * });
 * ```
 */
export const NullableVersionedValueSchema = z.object({
    version: z.number(),
    value: z.string().max(STRING_LIMITS.VERSIONED_VALUE_MAX).nullable(),
});

export type NullableVersionedValue = z.infer<typeof NullableVersionedValueSchema>;
