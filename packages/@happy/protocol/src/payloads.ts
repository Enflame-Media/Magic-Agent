/**
 * Payload wrapper schemas
 *
 * These wrap update and ephemeral events with sequencing metadata.
 */

import { z } from 'zod';
import { ApiUpdateSchema, type ApiUpdateType } from './updates';
import { ApiEphemeralUpdateSchema } from './ephemeral';

/**
 * Update payload container
 *
 * Wraps update events with sequencing information for ordered delivery.
 * The 'body' contains the actual update with 't' field renamed to differentiate
 * from the container structure.
 */
export const ApiUpdateContainerSchema = z.object({
    id: z.string(),
    seq: z.number(),
    body: ApiUpdateSchema,
    createdAt: z.number(),
});

export type ApiUpdateContainer = z.infer<typeof ApiUpdateContainerSchema>;

/**
 * Update payload for server-side use
 *
 * This is the wire format where body.t becomes body.t for the discriminator.
 * Matches the format used by eventRouter.ts builder functions.
 */
export const UpdatePayloadSchema = z.object({
    id: z.string(),
    seq: z.number(),
    body: z.object({
        t: z.string() as z.ZodType<ApiUpdateType>,
    }).strip(), // Strip unknown fields for security (prevents prototype pollution)
    createdAt: z.number(),
});

export type UpdatePayload = z.infer<typeof UpdatePayloadSchema>;

/**
 * Ephemeral payload wrapper
 *
 * Simpler than UpdatePayload since ordering isn't critical for ephemeral events.
 */
export const EphemeralPayloadSchema = ApiEphemeralUpdateSchema;

export type EphemeralPayload = z.infer<typeof EphemeralPayloadSchema>;
