/**
 * Type-safe accessor helpers for session and machine IDs
 *
 * These helpers centralize the logic for extracting IDs from various update types,
 * handling the field name variations (`id`, `sid`, `machineId`) internally.
 *
 * @example
 * ```typescript
 * import { hasSessionId, getSessionId, tryGetSessionId } from '@happy/protocol';
 *
 * // Type-safe extraction
 * if (hasSessionId(update)) {
 *     const sessionId = getSessionId(update);
 *     console.log('Session:', sessionId);
 * }
 *
 * // Or use the try variant
 * const sessionId = tryGetSessionId(update);
 * if (sessionId) {
 *     console.log('Session:', sessionId);
 * }
 * ```
 *
 * @packageDocumentation
 */

import type {
    ApiUpdate,
    ApiEphemeralUpdate,
    ApiUpdateNewSession,
    ApiUpdateSessionState,
    ApiUpdateNewMessage,
    ApiDeleteSession,
    ApiEphemeralActivityUpdate,
    ApiEphemeralUsageUpdate,
    ApiNewMachine,
    ApiUpdateMachineState,
    ApiEphemeralMachineActivityUpdate,
    ApiEphemeralMachineStatusUpdate,
    ApiEphemeralMachineDisconnectedUpdate,
} from './index';

// =============================================================================
// SESSION ID HELPERS
// =============================================================================

/**
 * Session update types that contain a session ID
 *
 * All session-related schemas now use `sid` for consistency (HAP-654):
 * - `new-session`, `update-session`, `new-message`, `delete-session`: use field `sid`
 */
export type SessionIdUpdate =
    | ApiUpdateNewSession
    | ApiUpdateSessionState
    | ApiUpdateNewMessage
    | ApiDeleteSession;

/**
 * Ephemeral update types that contain a session ID
 *
 * All session-related ephemeral schemas now use `sid` for consistency (HAP-654):
 * - `activity`, `usage`: use field `sid`
 */
export type SessionIdEphemeral =
    | ApiEphemeralActivityUpdate
    | ApiEphemeralUsageUpdate;

/**
 * Type guard: checks if an update contains a session ID
 *
 * @param update - Any ApiUpdate to check
 * @returns `true` if the update contains a session ID
 *
 * @example
 * ```typescript
 * const update = parseUpdate(rawData);
 * if (hasSessionId(update)) {
 *     // TypeScript knows update is SessionIdUpdate here
 *     const sessionId = getSessionId(update);
 * }
 * ```
 */
export function hasSessionId(update: ApiUpdate): update is SessionIdUpdate {
    return ['new-session', 'update-session', 'new-message', 'delete-session'].includes(update.t);
}

/**
 * Type guard: checks if an ephemeral update contains a session ID
 *
 * @param update - Any ApiEphemeralUpdate to check
 * @returns `true` if the update contains a session ID
 *
 * @example
 * ```typescript
 * const ephemeral = parseEphemeral(rawData);
 * if (hasSessionIdEphemeral(ephemeral)) {
 *     const sessionId = getSessionIdFromEphemeral(ephemeral);
 * }
 * ```
 */
export function hasSessionIdEphemeral(update: ApiEphemeralUpdate): update is SessionIdEphemeral {
    return ['activity', 'usage'].includes(update.type);
}

/**
 * Extract session ID from a persistent update
 *
 * All session-related schemas now use `sid` for consistency (HAP-654).
 *
 * @param update - A SessionIdUpdate (use hasSessionId type guard first)
 * @returns The session ID string
 *
 * @example
 * ```typescript
 * const update = parseUpdate(rawData);
 * if (hasSessionId(update)) {
 *     const sessionId = getSessionId(update);
 *     const encryption = sessionManager.getEncryption(sessionId);
 * }
 * ```
 */
export function getSessionId(update: SessionIdUpdate): string {
    // All session update types now consistently use `sid` (HAP-654)
    return update.sid;
}

/**
 * Extract session ID from an ephemeral update
 *
 * All session-related ephemeral schemas now use `sid` for consistency (HAP-654).
 *
 * @param update - A SessionIdEphemeral (use hasSessionIdEphemeral type guard first)
 * @returns The session ID string
 *
 * @example
 * ```typescript
 * const ephemeral = parseEphemeral(rawData);
 * if (hasSessionIdEphemeral(ephemeral)) {
 *     const sessionId = getSessionIdFromEphemeral(ephemeral);
 *     updateSessionActivity(sessionId);
 * }
 * ```
 */
export function getSessionIdFromEphemeral(update: SessionIdEphemeral): string {
    // All session ephemeral types now consistently use `sid` (HAP-654)
    return update.sid;
}

/**
 * Try to extract session ID from any update
 *
 * Safe variant that returns `undefined` if the update doesn't contain a session ID,
 * instead of throwing an error.
 *
 * @param update - Any ApiUpdate
 * @returns The session ID string, or `undefined` if not present
 *
 * @example
 * ```typescript
 * const sessionId = tryGetSessionId(update);
 * if (sessionId) {
 *     processSession(sessionId);
 * } else {
 *     // Handle non-session update (e.g., machine update)
 * }
 * ```
 */
export function tryGetSessionId(update: ApiUpdate): string | undefined {
    if (hasSessionId(update)) {
        return getSessionId(update);
    }
    return undefined;
}

/**
 * Try to extract session ID from any ephemeral update
 *
 * Safe variant that returns `undefined` if the ephemeral update doesn't contain
 * a session ID, instead of throwing an error.
 *
 * @param update - Any ApiEphemeralUpdate
 * @returns The session ID string, or `undefined` if not present
 *
 * @example
 * ```typescript
 * const sessionId = tryGetSessionIdFromEphemeral(ephemeral);
 * if (sessionId) {
 *     updateSessionActivity(sessionId);
 * }
 * ```
 */
export function tryGetSessionIdFromEphemeral(update: ApiEphemeralUpdate): string | undefined {
    if (hasSessionIdEphemeral(update)) {
        return getSessionIdFromEphemeral(update);
    }
    return undefined;
}

// =============================================================================
// MACHINE ID HELPERS
// =============================================================================

/**
 * Machine update types that contain a machine ID
 *
 * - `new-machine`, `update-machine`: use field `machineId`
 */
export type MachineIdUpdate = ApiNewMachine | ApiUpdateMachineState;

/**
 * Ephemeral update types that contain a machine ID
 *
 * All machine-related ephemeral schemas now use `machineId` for consistency (HAP-655):
 * - `machine-activity`: uses field `machineId`
 * - `machine-status`: uses field `machineId`
 * - `machine-disconnected`: uses field `machineId` (HAP-780)
 */
export type MachineIdEphemeral =
    | ApiEphemeralMachineActivityUpdate
    | ApiEphemeralMachineStatusUpdate
    | ApiEphemeralMachineDisconnectedUpdate;

/**
 * Type guard: checks if an update contains a machine ID
 *
 * @param update - Any ApiUpdate to check
 * @returns `true` if the update contains a machine ID
 *
 * @example
 * ```typescript
 * const update = parseUpdate(rawData);
 * if (hasMachineId(update)) {
 *     const machineId = getMachineId(update);
 * }
 * ```
 */
export function hasMachineId(update: ApiUpdate): update is MachineIdUpdate {
    return ['new-machine', 'update-machine'].includes(update.t);
}

/**
 * Type guard: checks if an ephemeral update contains a machine ID
 *
 * @param update - Any ApiEphemeralUpdate to check
 * @returns `true` if the update contains a machine ID
 *
 * @example
 * ```typescript
 * const ephemeral = parseEphemeral(rawData);
 * if (hasMachineIdEphemeral(ephemeral)) {
 *     const machineId = getMachineIdFromEphemeral(ephemeral);
 * }
 * ```
 */
export function hasMachineIdEphemeral(update: ApiEphemeralUpdate): update is MachineIdEphemeral {
    return ['machine-activity', 'machine-status', 'machine-disconnected'].includes(update.type);
}

/**
 * Extract machine ID from a persistent update
 *
 * Both `new-machine` and `update-machine` use the `machineId` field.
 *
 * @param update - A MachineIdUpdate (use hasMachineId type guard first)
 * @returns The machine ID string
 *
 * @example
 * ```typescript
 * const update = parseUpdate(rawData);
 * if (hasMachineId(update)) {
 *     const machineId = getMachineId(update);
 *     updateMachineState(machineId);
 * }
 * ```
 */
export function getMachineId(update: MachineIdUpdate): string {
    switch (update.t) {
        case 'new-machine':
        case 'update-machine':
            return update.machineId;
        default: {
            const _exhaustive: never = update;
            throw new Error(`Unknown update type: ${(_exhaustive as MachineIdUpdate).t}`);
        }
    }
}

/**
 * Extract machine ID from an ephemeral update
 *
 * All machine-related ephemeral schemas now use `machineId` for consistency (HAP-655).
 *
 * @param update - A MachineIdEphemeral (use hasMachineIdEphemeral type guard first)
 * @returns The machine ID string
 *
 * @example
 * ```typescript
 * const ephemeral = parseEphemeral(rawData);
 * if (hasMachineIdEphemeral(ephemeral)) {
 *     const machineId = getMachineIdFromEphemeral(ephemeral);
 *     updateMachineStatus(machineId);
 * }
 * ```
 */
export function getMachineIdFromEphemeral(update: MachineIdEphemeral): string {
    // All machine ephemeral types now consistently use `machineId` (HAP-655)
    return update.machineId;
}

/**
 * Try to extract machine ID from any update
 *
 * Safe variant that returns `undefined` if the update doesn't contain a machine ID,
 * instead of throwing an error.
 *
 * @param update - Any ApiUpdate
 * @returns The machine ID string, or `undefined` if not present
 *
 * @example
 * ```typescript
 * const machineId = tryGetMachineId(update);
 * if (machineId) {
 *     processMachine(machineId);
 * }
 * ```
 */
export function tryGetMachineId(update: ApiUpdate): string | undefined {
    if (hasMachineId(update)) {
        return getMachineId(update);
    }
    return undefined;
}

/**
 * Try to extract machine ID from any ephemeral update
 *
 * Safe variant that returns `undefined` if the ephemeral update doesn't contain
 * a machine ID, instead of throwing an error.
 *
 * @param update - Any ApiEphemeralUpdate
 * @returns The machine ID string, or `undefined` if not present
 *
 * @example
 * ```typescript
 * const machineId = tryGetMachineIdFromEphemeral(ephemeral);
 * if (machineId) {
 *     updateMachineActivity(machineId);
 * }
 * ```
 */
export function tryGetMachineIdFromEphemeral(update: ApiEphemeralUpdate): string | undefined {
    if (hasMachineIdEphemeral(update)) {
        return getMachineIdFromEphemeral(update);
    }
    return undefined;
}
