import { z } from 'zod';
import { FeedBodySchema } from '@magic-agent/protocol';

// Re-export FeedBodySchema from @magic-agent/protocol for consistency
// This is the canonical schema for feed body types
export { FeedBodySchema, type FeedBody } from '@magic-agent/protocol';

// Feed item schema
export const FeedItemSchema = z.object({
    id: z.string(),
    repeatKey: z.string().nullable(),
    body: FeedBodySchema,
    createdAt: z.number(),
    cursor: z.string(),
    counter: z.number()
});

export type FeedItem = z.infer<typeof FeedItemSchema>;

// Feed response schema
export const FeedResponseSchema = z.object({
    items: z.array(FeedItemSchema),
    hasMore: z.boolean()
});

export type FeedResponse = z.infer<typeof FeedResponseSchema>;

// Feed options for API calls
export interface FeedOptions {
    limit?: number;
    before?: string;
    after?: string;
}