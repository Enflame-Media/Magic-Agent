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
 *     sid: 'session_abc123',
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
 *     sid: 'session_abc123',
 *     agentState: { version: 2, value: 'encryptedState' },
 *     metadata: { version: 3, value: null }  // Cleared metadata
 * });
 * ```
 */
export const ApiUpdateSessionStateSchema = z.object({
    t: z.literal('update-session'),
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
    agentState: NullableVersionedValueSchema.nullish(),
    metadata: NullableVersionedValueSchema.nullish(),
});

export type ApiUpdateSessionState = z.infer<typeof ApiUpdateSessionStateSchema>;

/**
 * Archive reason for sessions
 *
 * @remarks
 * - `revival_failed`: Session could not be revived after CLI reconnection
 * - `user_requested`: User explicitly requested archival
 * - `timeout`: Session timed out due to inactivity
 */
export const ArchiveReasonSchema = z.enum([
    'revival_failed',
    'user_requested',
    'timeout',
]);

export type ArchiveReason = z.infer<typeof ArchiveReasonSchema>;

/**
 * Archive session update
 *
 * Sent when a session is archived (soft-deleted).
 * Archived sessions are excluded from active session lists but not permanently deleted.
 *
 * @example
 * ```typescript
 * const archiveSession = ApiArchiveSessionSchema.parse({
 *     t: 'archive-session',
 *     sid: 'session_abc123',
 *     archivedAt: Date.now(),
 *     archiveReason: 'revival_failed'
 * });
 * ```
 */
export const ApiArchiveSessionSchema = z.object({
    t: z.literal('archive-session'),
    /**
     * Session ID
     *
     * @remarks
     * Field name: `sid` (short for session ID)
     *
     * All session-related schemas now use `sid` for consistency:
     * - `new-session`, `update-session`, `new-message`, `delete-session`, `archive-session`: use `sid`
     * - Ephemeral events (`activity`, `usage`): use `sid`
     *
     * @see HAP-654 - Standardization of session ID field names
     */
    sid: z.string().min(1).max(STRING_LIMITS.ID_MAX),
    /**
     * Timestamp when the session was archived (Unix milliseconds)
     */
    archivedAt: z.number(),
    /**
     * Reason for archiving the session
     */
    archiveReason: ArchiveReasonSchema,
});

export type ApiArchiveSession = z.infer<typeof ApiArchiveSessionSchema>;
