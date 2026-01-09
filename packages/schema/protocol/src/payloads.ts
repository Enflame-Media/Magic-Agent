/**
 * Payload wrapper schemas
 *
 * These wrap update and ephemeral events with sequencing metadata.
 *
 * Security: All string fields have maximum length constraints.
 */

import { z } from 'zod';
import { STRING_LIMITS } from './constraints';
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
    id: z.string().min(1).max(STRING_LIMITS.ID_MAX),
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
    id: z.string().min(1).max(STRING_LIMITS.ID_MAX),
    seq: z.number(),
    body: z.object({
        t: z.string() as z.ZodType<ApiUpdateType>,
    }).passthrough().transform((data) => {
        // HAP-626: Sanitize dangerous prototype pollution keys
        // We use passthrough here (not strip) because this schema only validates
        // the type discriminator - the actual payload data must pass through.
        // Full validation happens via ApiUpdateContainerSchema with ApiUpdateSchema.
        const sanitized = { ...data };
        delete (sanitized as Record<string, unknown>)['__proto__'];
        delete (sanitized as Record<string, unknown>)['constructor'];
        delete (sanitized as Record<string, unknown>)['prototype'];
        return sanitized;
    }),
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
