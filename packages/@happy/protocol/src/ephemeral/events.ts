/**
 * Ephemeral event schemas
 *
 * Ephemeral events are transient status updates that don't need persistence.
 * These are real-time indicators of activity (typing, presence, etc.)
 *
 * Security: All string fields have maximum length constraints.
 */

import { z } from 'zod';
import { STRING_LIMITS } from '../constraints';

/**
 * Session activity update
 *
 * Real-time indicator of session activity and thinking state.
 */
export const ApiEphemeralActivityUpdateSchema = z.object({
    type: z.literal('activity'),
    /**
     * Session ID
     *
     * @remarks
     * Field name: `sid` (short for session ID)
     *
     * All session-related schemas now use `sid` for consistency:
     * - `new-session`, `update-session`, `new-message`, `delete-session`: use `sid`
     * - Ephemeral events (`activity`, `usage`): use `sid`
     *
     * @see HAP-654 - Standardization of session ID field names
     */
    sid: z.string().min(1).max(STRING_LIMITS.ID_MAX),
    active: z.boolean(),
    activeAt: z.number(),
    thinking: z.boolean(),
});

export type ApiEphemeralActivityUpdate = z.infer<typeof ApiEphemeralActivityUpdateSchema>;

/**
 * Token/cost usage update
 *
 * Real-time cost and token tracking for a session.
 * Uses flexible Record types to accommodate varying token breakdown keys
 * from different AI providers (Claude, Codex, etc.)
 *
 * Required: `total` key must be present
 * Optional: Additional breakdown keys (input, output, cache_creation, cache_read, etc.)
 */
export const ApiEphemeralUsageUpdateSchema = z.object({
    type: z.literal('usage'),
    /**
     * Session ID
     *
     * @remarks
     * Field name: `sid` (short for session ID)
     *
     * All session-related schemas now use `sid` for consistency:
     * - `new-session`, `update-session`, `new-message`, `delete-session`: use `sid`
     * - Ephemeral events (`activity`, `usage`): use `sid`
     *
     * @see HAP-654 - Standardization of session ID field names
     */
    sid: z.string().min(1).max(STRING_LIMITS.ID_MAX),
    key: z.string().min(1).max(STRING_LIMITS.LABEL_MAX), // Usage key/identifier
    timestamp: z.number(),
    tokens: z.record(z.string().max(STRING_LIMITS.LABEL_MAX), z.number()).refine(
        (obj) => typeof obj.total === 'number',
        { message: 'tokens.total is required' }
    ),
    cost: z.record(z.string().max(STRING_LIMITS.LABEL_MAX), z.number()).refine(
        (obj) => typeof obj.total === 'number',
        { message: 'cost.total is required' }
    ),
});

export type ApiEphemeralUsageUpdate = z.infer<typeof ApiEphemeralUsageUpdateSchema>;

/**
 * Machine activity update
 *
 * Real-time indicator of machine/daemon activity.
 */
export const ApiEphemeralMachineActivityUpdateSchema = z.object({
    type: z.literal('machine-activity'),
    /**
     * Machine ID - uniquely identifies the machine/daemon
     *
     * @remarks
     * Field name: `machineId` (standardized in HAP-655)
     *
     * All machine-related schemas now consistently use `machineId`:
     * - `new-machine`: uses `machineId`
     * - `update-machine`: uses `machineId`
     * - `machine-status`: uses `machineId`
     * - `machine-activity`: uses `machineId`
     *
     * @see ApiNewMachineSchema
     * @see ApiUpdateMachineStateSchema
     * @see ApiEphemeralMachineStatusUpdateSchema
     */
    machineId: z.string().min(1).max(STRING_LIMITS.ID_MAX),
    active: z.boolean(),
    activeAt: z.number(),
});

export type ApiEphemeralMachineActivityUpdate = z.infer<typeof ApiEphemeralMachineActivityUpdateSchema>;

/**
 * Machine online status update
 *
 * Real-time indicator of machine online/offline status.
 */
export const ApiEphemeralMachineStatusUpdateSchema = z.object({
    type: z.literal('machine-status'),
    /**
     * Machine ID - uniquely identifies the machine/daemon
     *
     * @remarks
     * Field name: `machineId`
     *
     * All machine-related schemas consistently use `machineId`:
     * - `new-machine`: uses `machineId`
     * - `update-machine`: uses `machineId`
     * - `machine-status`: uses `machineId`
     * - `machine-activity`: uses `machineId`
     *
     * @see ApiNewMachineSchema
     * @see ApiUpdateMachineStateSchema
     * @see ApiEphemeralMachineActivityUpdateSchema
     */
    machineId: z.string().min(1).max(STRING_LIMITS.ID_MAX),
    online: z.boolean(),
    timestamp: z.number(),
});

export type ApiEphemeralMachineStatusUpdate = z.infer<typeof ApiEphemeralMachineStatusUpdateSchema>;

/**
 * Union of all ephemeral update types
 */
export const ApiEphemeralUpdateSchema = z.union([
    ApiEphemeralActivityUpdateSchema,
    ApiEphemeralUsageUpdateSchema,
    ApiEphemeralMachineActivityUpdateSchema,
    ApiEphemeralMachineStatusUpdateSchema,
]);

export type ApiEphemeralUpdate = z.infer<typeof ApiEphemeralUpdateSchema>;

/**
 * Ephemeral update type discriminator values
 */
export type ApiEphemeralUpdateType = ApiEphemeralUpdate['type'];
