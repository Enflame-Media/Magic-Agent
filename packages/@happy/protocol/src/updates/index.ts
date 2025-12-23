/**
 * Update schemas barrel export
 *
 * All persistent update event types for the Happy protocol.
 * Updates represent state changes that are stored and synced.
 */

import { z } from 'zod';

// Re-export individual update schemas
export * from './message';
export * from './session';
export * from './machine';
export * from './artifact';
export * from './account';
export * from './misc';

// Import for discriminated union
import { ApiUpdateNewMessageSchema, ApiDeleteSessionSchema } from './message';
import { ApiUpdateNewSessionSchema, ApiUpdateSessionStateSchema } from './session';
import { ApiNewMachineSchema, ApiUpdateMachineStateSchema } from './machine';
import { ApiNewArtifactSchema, ApiUpdateArtifactSchema, ApiDeleteArtifactSchema } from './artifact';
import { ApiUpdateAccountSchema } from './account';
import { ApiRelationshipUpdatedSchema, ApiNewFeedPostSchema, ApiKvBatchUpdateSchema } from './misc';

/**
 * Discriminated union of all update types
 *
 * This is the main type for all persistent updates sent via WebSocket.
 * Uses 't' (type) as the discriminator field.
 *
 * @example
 * ```typescript
 * // Parse any incoming WebSocket update
 * const update = ApiUpdateSchema.parse(incomingData);
 *
 * // Type-safe handling based on discriminator
 * switch (update.t) {
 *     case 'new-session':
 *         console.log('New session:', update.id);
 *         break;
 *     case 'new-message':
 *         console.log('Message in session:', update.sid);
 *         break;
 *     // ... handle other update types
 * }
 * ```
 */
export const ApiUpdateSchema = z.discriminatedUnion('t', [
    ApiUpdateNewMessageSchema,
    ApiUpdateNewSessionSchema,
    ApiDeleteSessionSchema,
    ApiUpdateSessionStateSchema,
    ApiUpdateAccountSchema,
    ApiUpdateMachineStateSchema,
    ApiNewMachineSchema,
    ApiNewArtifactSchema,
    ApiUpdateArtifactSchema,
    ApiDeleteArtifactSchema,
    ApiRelationshipUpdatedSchema,
    ApiNewFeedPostSchema,
    ApiKvBatchUpdateSchema,
]);

export type ApiUpdate = z.infer<typeof ApiUpdateSchema>;

/**
 * Update type discriminator values
 *
 * Useful for type guards and switch statements.
 */
export type ApiUpdateType = ApiUpdate['t'];
