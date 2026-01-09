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
import { ApiUpdateNewSessionSchema, ApiUpdateSessionStateSchema, ApiArchiveSessionSchema } from './session';
import { ApiNewMachineSchema, ApiUpdateMachineStateSchema, ApiDeleteMachineSchema } from './machine';
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
 *     case 'new-message':
 *     case 'update-session':
 *     case 'delete-session':
 *         // All session updates use 'sid' (HAP-654)
 *         console.log('Session:', update.sid);
 *         break;
 *     // ... handle other update types
 * }
 * ```
 */
export const ApiUpdateSchema = z.discriminatedUnion('t', [
    ApiUpdateNewMessageSchema,
    ApiUpdateNewSessionSchema,
    ApiDeleteSessionSchema,
    ApiArchiveSessionSchema,
    ApiUpdateSessionStateSchema,
    ApiUpdateAccountSchema,
    ApiUpdateMachineStateSchema,
    ApiNewMachineSchema,
    ApiDeleteMachineSchema,
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
