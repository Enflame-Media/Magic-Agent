/**
 * Miscellaneous update schemas
 *
 * Handles: relationship-updated, new-feed-post, kv-batch-update
 */

import { z } from 'zod';
import { RelationshipStatusSchema, UserProfileSchema, FeedBodySchema } from '../common';

/**
 * Relationship update
 *
 * Sent when a friend relationship status changes.
 *
 * @example
 * ```typescript
 * const relationshipUpdate = ApiRelationshipUpdatedSchema.parse({
 *     t: 'relationship-updated',
 *     fromUserId: 'user_abc123',
 *     toUserId: 'user_xyz789',
 *     status: 'friend',
 *     action: 'created',
 *     timestamp: Date.now()
 * });
 * ```
 */
export const ApiRelationshipUpdatedSchema = z.object({
    t: z.literal('relationship-updated'),
    fromUserId: z.string(),
    toUserId: z.string(),
    status: RelationshipStatusSchema,
    action: z.enum(['created', 'updated', 'deleted']),
    fromUser: UserProfileSchema.optional(),
    toUser: UserProfileSchema.optional(),
    timestamp: z.number(),
});

export type ApiRelationshipUpdated = z.infer<typeof ApiRelationshipUpdatedSchema>;

/**
 * New feed post
 *
 * Sent when a new activity feed item is created.
 *
 * @example
 * ```typescript
 * const feedPost = ApiNewFeedPostSchema.parse({
 *     t: 'new-feed-post',
 *     id: 'feed_123',
 *     body: { kind: 'friend_request', uid: 'user_xyz789' },
 *     cursor: 'cursor_abc',
 *     createdAt: Date.now(),
 *     repeatKey: null,
 *     counter: 1
 * });
 * ```
 */
export const ApiNewFeedPostSchema = z.object({
    t: z.literal('new-feed-post'),
    id: z.string(),
    body: FeedBodySchema,
    cursor: z.string(),
    createdAt: z.number(),
    repeatKey: z.string().nullable(),
    counter: z.number(),
});

export type ApiNewFeedPost = z.infer<typeof ApiNewFeedPostSchema>;

/**
 * KV batch update
 *
 * Sent when key-value settings change (batch sync).
 *
 * @example
 * ```typescript
 * const kvUpdate = ApiKvBatchUpdateSchema.parse({
 *     t: 'kv-batch-update',
 *     changes: [
 *         { key: 'theme', value: 'dark', version: 1 },
 *         { key: 'notifications', value: 'enabled', version: 2 },
 *         { key: 'deprecated_setting', value: null, version: 3 }  // Deleted
 *     ]
 * });
 * ```
 */
export const ApiKvBatchUpdateSchema = z.object({
    t: z.literal('kv-batch-update'),
    changes: z.array(z.object({
        key: z.string(),
        value: z.string().nullable(),
        version: z.number(),
    })),
});

export type ApiKvBatchUpdate = z.infer<typeof ApiKvBatchUpdateSchema>;
