/**
 * Session-related update schemas
 *
 * Handles: new-session, update-session
 *
 * Security: All string fields have maximum length constraints.
 */

import { z } from 'zod';
import { NullableVersionedValueSchema } from '../common';
import { STRING_LIMITS } from '../constraints';

/**
 * New session update
 *
 * Sent when a new Claude Code session is created.
 * Contains initial encrypted metadata and agent state.
 *
 * @example
 * ```typescript
 * const newSession = ApiUpdateNewSessionSchema.parse({
 *     t: 'new-session',
 *     id: 'session_abc123',
 *     seq: 1,
 *     metadata: 'encryptedMetadataString',
 *     metadataVersion: 1,
 *     agentState: null,
 *     agentStateVersion: 0,
 *     dataEncryptionKey: 'base64EncodedKey==',
 *     active: true,
 *     activeAt: Date.now(),
 *     createdAt: Date.now(),
 *     updatedAt: Date.now()
 * });
 * ```
 */
export const ApiUpdateNewSessionSchema = z.object({
    t: z.literal('new-session'),
    id: z.string().min(1).max(STRING_LIMITS.ID_MAX), // Session ID
    seq: z.number(),
    metadata: z.string().max(STRING_LIMITS.ENCRYPTED_STATE_MAX), // Encrypted metadata
    metadataVersion: z.number(),
    agentState: z.string().max(STRING_LIMITS.ENCRYPTED_STATE_MAX).nullable(), // Encrypted agent state
    agentStateVersion: z.number(),
    dataEncryptionKey: z.string().max(STRING_LIMITS.DATA_ENCRYPTION_KEY_MAX).nullable(), // Base64 encoded
    active: z.boolean(),
    activeAt: z.number(),
    createdAt: z.number(),
    updatedAt: z.number(),
});

export type ApiUpdateNewSession = z.infer<typeof ApiUpdateNewSessionSchema>;

/**
 * Update session state
 *
 * Sent when session metadata or agent state changes.
 * Both fields are optional - only changed fields are included.
 *
 * @example
 * ```typescript
 * const sessionUpdate = ApiUpdateSessionStateSchema.parse({
 *     t: 'update-session',
 *     id: 'session_abc123',
 *     agentState: { version: 2, value: 'encryptedState' },
 *     metadata: { version: 3, value: null }  // Cleared metadata
 * });
 * ```
 */
export const ApiUpdateSessionStateSchema = z.object({
    t: z.literal('update-session'),
    id: z.string().min(1).max(STRING_LIMITS.ID_MAX),
    agentState: NullableVersionedValueSchema.nullish(),
    metadata: NullableVersionedValueSchema.nullish(),
});

export type ApiUpdateSessionState = z.infer<typeof ApiUpdateSessionStateSchema>;
