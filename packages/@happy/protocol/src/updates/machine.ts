/**
 * Machine-related update schemas
 *
 * Handles: new-machine, update-machine
 */

import { z } from 'zod';
import { VersionedValueSchema } from '../common';

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
    machineId: z.string(),
    seq: z.number(),
    metadata: z.string(), // Encrypted metadata
    metadataVersion: z.number(),
    daemonState: z.string().nullable(), // Encrypted daemon state
    daemonStateVersion: z.number(),
    dataEncryptionKey: z.string().nullable(), // Base64 encoded
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
    machineId: z.string(),
    metadata: VersionedValueSchema.optional(),
    daemonState: VersionedValueSchema.optional(),
    active: z.boolean().optional(),
    activeAt: z.number().optional(),
});

export type ApiUpdateMachineState = z.infer<typeof ApiUpdateMachineStateSchema>;
