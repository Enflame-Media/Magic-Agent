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
