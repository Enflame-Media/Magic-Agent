/**
 * Machine-related update schemas
 *
 * Handles: new-machine, update-machine
 *
 * Security: All string fields have maximum length constraints.
 */

import { z } from 'zod';
import { VersionedValueSchema } from '../common';
import { STRING_LIMITS } from '../constraints';

/**
 * New machine update
 *
 * Sent when a new CLI machine is registered.
 *
 * @example
 * ```typescript
 * const newMachine = ApiNewMachineSchema.parse({
 *     t: 'new-machine',
 *     machineId: 'machine_laptop1',
 *     seq: 1,
 *     metadata: 'encryptedMachineMetadata',
 *     metadataVersion: 1,
 *     daemonState: null,
 *     daemonStateVersion: 0,
 *     dataEncryptionKey: 'base64EncodedKey==',
 *     active: true,
 *     activeAt: Date.now(),
 *     createdAt: Date.now(),
 *     updatedAt: Date.now()
 * });
 * ```
 */
export const ApiNewMachineSchema = z.object({
    t: z.literal('new-machine'),
    /**
     * Machine ID
     *
     * @remarks
     * Field name: `machineId`
     *
     * All machine-related schemas consistently use `machineId` (HAP-655):
     * - `new-machine`: uses `machineId`
     * - `update-machine`: uses `machineId`
     * - `machine-status`: uses `machineId`
     * - `machine-activity`: uses `machineId`
     *
     * @see ApiEphemeralMachineActivityUpdateSchema
     * @see ApiEphemeralMachineStatusUpdateSchema
     */
    machineId: z.string().min(1).max(STRING_LIMITS.ID_MAX),
    seq: z.number(),
    metadata: z.string().max(STRING_LIMITS.ENCRYPTED_STATE_MAX), // Encrypted metadata
    metadataVersion: z.number(),
    daemonState: z.string().max(STRING_LIMITS.ENCRYPTED_STATE_MAX).nullable(), // Encrypted daemon state
    daemonStateVersion: z.number(),
    dataEncryptionKey: z.string().max(STRING_LIMITS.DATA_ENCRYPTION_KEY_MAX).nullable(), // Base64 encoded
    active: z.boolean(),
    activeAt: z.number(),
    createdAt: z.number(),
    updatedAt: z.number(),
});

export type ApiNewMachine = z.infer<typeof ApiNewMachineSchema>;

/**
 * Update machine state
 *
 * Sent when machine metadata or daemon state changes.
 *
 * @example
 * ```typescript
 * const machineUpdate = ApiUpdateMachineStateSchema.parse({
 *     t: 'update-machine',
 *     machineId: 'machine_laptop1',
 *     daemonState: { version: 2, value: 'encryptedDaemonState' },
 *     active: true,
 *     activeAt: Date.now()
 * });
 * ```
 */
export const ApiUpdateMachineStateSchema = z.object({
    t: z.literal('update-machine'),
    /**
     * Machine ID
     *
     * @remarks
     * Field name: `machineId`
     *
     * All machine-related schemas consistently use `machineId` (HAP-655):
     * - `new-machine`: uses `machineId`
     * - `update-machine`: uses `machineId`
     * - `machine-status`: uses `machineId`
     * - `machine-activity`: uses `machineId`
     *
     * @see ApiEphemeralMachineActivityUpdateSchema
     * @see ApiEphemeralMachineStatusUpdateSchema
     */
    machineId: z.string().min(1).max(STRING_LIMITS.ID_MAX),
    metadata: VersionedValueSchema.optional(),
    daemonState: VersionedValueSchema.optional(),
    active: z.boolean().optional(),
    activeAt: z.number().optional(),
});

export type ApiUpdateMachineState = z.infer<typeof ApiUpdateMachineStateSchema>;

/**
 * Delete machine update
 *
 * Sent when a machine is disconnected/unauthenticated from an account.
 * The machine will need to re-authenticate via QR code to reconnect.
 *
 * @example
 * ```typescript
 * const deleteMachine = ApiDeleteMachineSchema.parse({
 *     t: 'delete-machine',
 *     machineId: 'machine_laptop1'
 * });
 * ```
 */
export const ApiDeleteMachineSchema = z.object({
    t: z.literal('delete-machine'),
    /**
     * Machine ID being deleted/disconnected
     *
     * @remarks
     * Field name: `machineId`
     *
     * All machine-related schemas consistently use `machineId` (HAP-655):
     * - `new-machine`: uses `machineId`
     * - `update-machine`: uses `machineId`
     * - `delete-machine`: uses `machineId`
     * - `machine-status`: uses `machineId`
     * - `machine-activity`: uses `machineId`
     *
     * @see HAP-778 - Machine disconnect functionality
     */
    machineId: z.string().min(1).max(STRING_LIMITS.ID_MAX),
});

export type ApiDeleteMachine = z.infer<typeof ApiDeleteMachineSchema>;
