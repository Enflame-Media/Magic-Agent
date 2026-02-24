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
 * Machine disconnected notification
 *
 * Sent to a machine's WebSocket connection when it is disconnected
 * from an account (e.g., via the mobile app). This is a fire-and-forget
 * notification that allows the CLI daemon to gracefully shut down.
 *
 * @see HAP-780 - Add CLI disconnect notification when machine is removed via app
 */
export const ApiEphemeralMachineDisconnectedUpdateSchema = z.object({
    type: z.literal('machine-disconnected'),
    /**
     * Machine ID - uniquely identifies the machine being disconnected
     *
     * @remarks
     * Field name: `machineId` (standardized in HAP-655)
     */
    machineId: z.string().min(1).max(STRING_LIMITS.ID_MAX),
    /**
     * Reason for disconnection
     *
     * Currently always 'disconnected_by_user' when user disconnects
     * a machine via the mobile app.
     */
    reason: z.enum(['disconnected_by_user']),
    /**
     * Timestamp of when the disconnection occurred
     */
    timestamp: z.number(),
});

export type ApiEphemeralMachineDisconnectedUpdate = z.infer<typeof ApiEphemeralMachineDisconnectedUpdateSchema>;

/**
 * Friend online/offline status update
 *
 * Real-time indicator of friend presence status.
 * Sent to a user's friends when they come online or go offline.
 *
 * @see HAP-716 - Implement real-time friend online status
 */
export const ApiEphemeralFriendStatusUpdateSchema = z.object({
    type: z.literal('friend-status'),
    /**
     * User ID of the friend whose status changed
     *
     * @remarks
     * This is the ID of the user who came online/went offline,
     * not the recipient. The event is sent TO friends, containing
     * this user's status.
     */
    userId: z.string().min(1).max(STRING_LIMITS.ID_MAX),
    /**
     * Whether the user is currently online
     *
     * True when the user has at least one active WebSocket connection.
     * False when all connections are closed.
     */
    isOnline: z.boolean(),
    /**
     * ISO-8601 timestamp of last activity
     *
     * Present when isOnline is false to indicate when the user
     * was last seen. Omitted when user is currently online.
     */
    lastSeen: z.string().datetime().optional(),
});

export type ApiEphemeralFriendStatusUpdate = z.infer<typeof ApiEphemeralFriendStatusUpdateSchema>;

/**
 * ACP session update relay
 *
 * Carries an encrypted ACP session update through the server relay.
 * The server treats this as an opaque blob — zero-knowledge relay.
 * The app decrypts and parses the inner update using AcpSessionUpdateSchema.
 *
 * @see HAP-1036 - Adapt happy-server relay and happy-app display for ACP session updates
 */
export const ApiEphemeralAcpSessionUpdateSchema = z.object({
    type: z.literal('acp-session-update'),
    /**
     * Session ID — identifies which session the ACP update belongs to
     *
     * @remarks
     * Uses `sid` for consistency with other session-related ephemeral events.
     *
     * @see HAP-654 - Standardization of session ID field names
     */
    sid: z.string().min(1).max(STRING_LIMITS.ID_MAX),
    /**
     * Encrypted ACP session update payload.
     * Contains the serialized AcpSessionUpdate, encrypted with the session's
     * data encryption key. The server never reads this content.
     */
    update: z.string().min(1).max(STRING_LIMITS.CONTENT_MAX),
});

export type ApiEphemeralAcpSessionUpdate = z.infer<typeof ApiEphemeralAcpSessionUpdateSchema>;

/**
 * ACP permission request relay
 *
 * Carries an encrypted ACP permission request from CLI to mobile app.
 * The server treats this as an opaque blob — zero-knowledge relay.
 * The app decrypts and displays the permission UI for user approval.
 *
 * @see HAP-1043 - Add ACP remote permission approval flow
 */
export const ApiEphemeralAcpPermissionRequestSchema = z.object({
    type: z.literal('acp-permission-request'),
    /**
     * Session ID — identifies which session the permission request belongs to
     */
    sid: z.string().min(1).max(STRING_LIMITS.ID_MAX),
    /**
     * Unique request ID for correlating the response back to the CLI
     */
    requestId: z.string().min(1).max(STRING_LIMITS.ID_MAX),
    /**
     * Encrypted permission request payload.
     * Contains the serialized AcpRequestPermissionRequest, encrypted with the session's
     * data encryption key. The server never reads this content.
     */
    payload: z.string().min(1).max(STRING_LIMITS.CONTENT_MAX),
    /**
     * Optional timeout in milliseconds from when the request was created.
     * If present, the mobile app should show a countdown and expire the request.
     */
    timeoutMs: z.number().int().min(0).optional(),
});

export type ApiEphemeralAcpPermissionRequest = z.infer<typeof ApiEphemeralAcpPermissionRequestSchema>;

/**
 * Union of all ephemeral update types
 */
export const ApiEphemeralUpdateSchema = z.union([
    ApiEphemeralActivityUpdateSchema,
    ApiEphemeralUsageUpdateSchema,
    ApiEphemeralMachineActivityUpdateSchema,
    ApiEphemeralMachineStatusUpdateSchema,
    ApiEphemeralMachineDisconnectedUpdateSchema,
    ApiEphemeralFriendStatusUpdateSchema,
    ApiEphemeralAcpSessionUpdateSchema,
    ApiEphemeralAcpPermissionRequestSchema,
]);

export type ApiEphemeralUpdate = z.infer<typeof ApiEphemeralUpdateSchema>;

/**
 * Ephemeral update type discriminator values
 */
export type ApiEphemeralUpdateType = ApiEphemeralUpdate['type'];
