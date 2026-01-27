/**
 * Sync Event Handlers
 *
 * Processes incoming WebSocket events and updates Pinia stores.
 * All incoming data is validated with Zod schemas from @happy/protocol.
 *
 * Events handled:
 * - 'update': Persistent state changes (sessions, messages, machines, etc.)
 * - 'ephemeral': Real-time status updates (typing, usage, machine status)
 * - 'error': Error events including session revival failures (HAP-750)
 * - 'session-revival-paused': Circuit breaker cooldown notifications (HAP-869)
 * - 'session-revived': Session revival success notifications (HAP-869)
 *
 * @see HAP-671 - WebSocket sync engine implementation
 * @see HAP-869 - Session revival cooldown UI
 */

import {
    ApiUpdateContainerSchema,
    ApiEphemeralUpdateSchema,
    type ApiUpdateContainer,
    type ApiEphemeralUpdate,
    type ApiNewArtifact,
    type ApiUpdateArtifact,
    type ApiDeleteArtifact,
} from '@happy/protocol';
import { useSessionsStore } from '@/stores/sessions';
import { useMessagesStore } from '@/stores/messages';
import { useMachinesStore } from '@/stores/machines';
import { useArtifactsStore } from '@/stores/artifacts';
import { useSyncStore } from '@/stores/sync';
import { useAuthStore } from '@/stores/auth';
import { wsService } from './WebSocketService';
import { getEncryptionManager, getArtifactEncryption, storeArtifactKey, removeArtifactKey } from './artifactSync';

// ─────────────────────────────────────────────────────────────────────────────
// Update Handler
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handle an update container from the server.
 * Validates the update and dispatches to appropriate store.
 */
function handleUpdate(data: unknown): void {
    const result = ApiUpdateContainerSchema.safeParse(data);

    if (!result.success) {
        console.warn('[sync] Invalid update received:', result.error.issues);
        return;
    }

    const container: ApiUpdateContainer = result.data;
    const update = container.body;
    const syncStore = useSyncStore();

    // Update sequence number for ordering
    syncStore.setSequence(container.seq);

    // Dispatch based on update type
    switch (update.t) {
        case 'new-session': {
            const sessionsStore = useSessionsStore();
            sessionsStore.upsertFromApi(update);
            break;
        }

        case 'update-session': {
            // update-session uses NullableVersionedValueSchema: { value, version }
            const sessionsStore = useSessionsStore();
            const updates: Partial<{
                metadata: string;
                metadataVersion: number;
                agentState: string | null;
                agentStateVersion: number;
                updatedAt: number;
            }> = {
                updatedAt: container.createdAt,
            };

            // Apply metadata if present
            if (update.metadata !== undefined && update.metadata !== null) {
                updates.metadata = update.metadata.value ?? '';
                updates.metadataVersion = update.metadata.version;
            }

            // Apply agentState if present
            if (update.agentState !== undefined && update.agentState !== null) {
                updates.agentState = update.agentState.value;
                updates.agentStateVersion = update.agentState.version;
            }

            sessionsStore.updateSession(update.sid, updates);
            break;
        }

        case 'delete-session': {
            const sessionsStore = useSessionsStore();
            sessionsStore.removeSession(update.sid);
            // Also clear messages for this session
            const messagesStore = useMessagesStore();
            messagesStore.clearSessionMessages(update.sid);
            break;
        }

        case 'new-message': {
            // new-message wraps the message in a 'message' field
            const messagesStore = useMessagesStore();
            const msg = update.message;
            messagesStore.addFromApi(update.sid, {
                id: msg.id,
                seq: msg.seq,
                localId: msg.localId,
                content: msg.content,
                createdAt: msg.createdAt,
            });
            break;
        }

        case 'new-machine': {
            const machinesStore = useMachinesStore();
            machinesStore.upsertFromApi(update);
            break;
        }

        case 'update-machine': {
            // update-machine uses VersionedValueSchema: { value, version }
            const machinesStore = useMachinesStore();
            const updates: Partial<{
                metadata: string;
                metadataVersion: number;
                daemonState: string | null;
                daemonStateVersion: number;
                active: boolean;
                activeAt: number;
                updatedAt: number;
            }> = {
                updatedAt: container.createdAt,
            };

            // Apply metadata if present
            if (update.metadata !== undefined) {
                updates.metadata = update.metadata.value;
                updates.metadataVersion = update.metadata.version;
            }

            // Apply daemonState if present
            if (update.daemonState !== undefined) {
                updates.daemonState = update.daemonState.value;
                updates.daemonStateVersion = update.daemonState.version;
            }

            // Apply active/activeAt if present
            if (update.active !== undefined) {
                updates.active = update.active;
            }
            if (update.activeAt !== undefined) {
                updates.activeAt = update.activeAt;
            }

            machinesStore.updateMachine(update.machineId, updates);
            break;
        }

        case 'update-account': {
            // update-account uses 'id' not 'accountId'
            const authStore = useAuthStore();
            authStore.updateAccount({
                id: update.id,
                firstName: update.firstName ?? null,
                lastName: update.lastName ?? null,
                avatar: update.avatar ?? null,
                github: update.github ?? null,
            });
            break;
        }

        case 'new-artifact': {
            // HAP-708: Handle new artifact creation
            const artifactUpdate = update as ApiNewArtifact;
            const artifactId = artifactUpdate.artifactId;
            const artifactsStore = useArtifactsStore();

            // Clear offline mode since we're receiving live data
            artifactsStore.clearOfflineMode();

            // First, add to store with placeholder data
            artifactsStore.upsertFromApi(artifactUpdate);

            // Then decrypt header asynchronously
            (async () => {
                try {
                    const artifactEncryption = await getArtifactEncryption(
                        artifactId,
                        artifactUpdate.dataEncryptionKey
                    );
                    if (!artifactEncryption) {
                        console.error(`[sync] Failed to get encryption for artifact ${artifactId}`);
                        return;
                    }

                    // Store the key for future updates
                    const encryptionManager = await getEncryptionManager();
                    if (encryptionManager) {
                        const decryptedKey = await encryptionManager.decryptEncryptionKey(
                            artifactUpdate.dataEncryptionKey
                        );
                        if (decryptedKey) {
                            storeArtifactKey(artifactId, decryptedKey);
                        }
                    }

                    // Decrypt header
                    const header = await artifactEncryption.decryptHeader(artifactUpdate.header);
                    if (header) {
                        artifactsStore.applyDecryptedHeader(artifactId, {
                            title: header.title,
                            mimeType: header.mimeType,
                            filePath: header.filePath,
                            language: header.language,
                            sessions: header.sessions,
                        });
                    }

                    // Decrypt body if provided
                    if (artifactUpdate.body) {
                        const body = await artifactEncryption.decryptBody(artifactUpdate.body);
                        artifactsStore.applyDecryptedBody(artifactId, body?.body ?? null);
                    }

                    // HAP-874: Cache the decrypted artifact for offline access
                    const decryptedArtifact = artifactsStore.getArtifact(artifactId);
                    if (decryptedArtifact) {
                        await artifactsStore.cacheArtifact(decryptedArtifact);
                    }

                    console.debug(`[sync] Processed new artifact ${artifactId}`);
                } catch (error) {
                    console.error(`[sync] Failed to process new artifact ${artifactId}:`, error);
                }
            })();
            break;
        }

        case 'update-artifact': {
            // HAP-708: Handle artifact updates
            const artifactUpdate = update as ApiUpdateArtifact;
            const artifactId = artifactUpdate.artifactId;
            const artifactsStore = useArtifactsStore();

            // Clear offline mode since we're receiving live data
            artifactsStore.clearOfflineMode();

            // Check if artifact exists
            const existingArtifact = artifactsStore.getArtifact(artifactId);
            if (!existingArtifact) {
                console.warn(`[sync] Artifact ${artifactId} not found for update`);
                // TODO: Could trigger a full artifacts sync here
                break;
            }

            // Decrypt and apply updates asynchronously
            (async () => {
                try {
                    const artifactEncryption = await getArtifactEncryption(artifactId);
                    if (!artifactEncryption) {
                        console.error(`[sync] No encryption key for artifact ${artifactId}`);
                        return;
                    }

                    // Update header if provided
                    if (artifactUpdate.header) {
                        const header = await artifactEncryption.decryptHeader(artifactUpdate.header.value);
                        if (header) {
                            artifactsStore.applyDecryptedHeader(artifactId, {
                                title: header.title,
                                mimeType: header.mimeType,
                                filePath: header.filePath,
                                language: header.language,
                                sessions: header.sessions,
                            });
                            artifactsStore.updateArtifact(artifactId, {
                                headerVersion: artifactUpdate.header.version,
                                updatedAt: container.createdAt,
                            });
                        }
                    }

                    // Update body if provided
                    if (artifactUpdate.body) {
                        const body = await artifactEncryption.decryptBody(artifactUpdate.body.value);
                        artifactsStore.applyDecryptedBody(artifactId, body?.body ?? null);
                        artifactsStore.updateArtifact(artifactId, {
                            bodyVersion: artifactUpdate.body.version,
                            updatedAt: container.createdAt,
                        });
                    }

                    // HAP-874: Update cache with new artifact data
                    const updatedArtifact = artifactsStore.getArtifact(artifactId);
                    if (updatedArtifact) {
                        await artifactsStore.cacheArtifact(updatedArtifact);
                    }

                    console.debug(`[sync] Updated artifact ${artifactId}`);
                } catch (error) {
                    console.error(`[sync] Failed to update artifact ${artifactId}:`, error);
                }
            })();
            break;
        }

        case 'delete-artifact': {
            // HAP-708: Handle artifact deletion
            const artifactUpdate = update as ApiDeleteArtifact;
            const artifactId = artifactUpdate.artifactId;
            const artifactsStore = useArtifactsStore();

            // Clear offline mode since we're receiving live data
            artifactsStore.clearOfflineMode();

            // Remove from store
            artifactsStore.removeArtifact(artifactId);

            // Remove encryption key from memory
            removeArtifactKey(artifactId);

            // HAP-874: Remove from cache
            artifactsStore.removeCached(artifactId);

            console.debug(`[sync] Deleted artifact ${artifactId}`);
            break;
        }

        case 'relationship-updated':
        case 'new-feed-post':
        case 'kv-batch-update':
            // These events may not be relevant for the web app
            // or will be handled in future issues
            break;

        default: {
            // TypeScript exhaustiveness check
            const _exhaustiveCheck = update;
            console.warn('[sync] Unknown update type:', (_exhaustiveCheck as { t: string }).t);
        }
    }

    // Mark sync complete
    syncStore.markSynced();
}

// ─────────────────────────────────────────────────────────────────────────────
// Ephemeral Event Handler
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handle an ephemeral event from the server.
 * These are real-time status updates that don't need persistence.
 */
function handleEphemeral(data: unknown): void {
    const result = ApiEphemeralUpdateSchema.safeParse(data);

    if (!result.success) {
        console.warn('[sync] Invalid ephemeral event received:', result.error.issues);
        return;
    }

    const event: ApiEphemeralUpdate = result.data;

    switch (event.type) {
        case 'activity': {
            // Session activity update (typing/thinking indicator)
            const sessionsStore = useSessionsStore();
            sessionsStore.updateSession(event.sid, {
                active: event.active,
                activeAt: event.activeAt,
            });
            // Note: 'thinking' state could be stored in a UI store for display
            break;
        }

        case 'usage': {
            // Token/cost usage update
            // This could update a session-specific usage display
            // For now, we just log it - UI implementation in a future issue
            console.debug('[sync] Usage update for session:', event.sid, event.tokens, event.cost);
            break;
        }

        case 'machine-activity': {
            // Machine activity update
            const machinesStore = useMachinesStore();
            machinesStore.updateMachine(event.machineId, {
                activeAt: event.activeAt,
            });
            break;
        }

        case 'machine-status': {
            // Machine online/offline status
            const machinesStore = useMachinesStore();
            machinesStore.updateMachine(event.machineId, {
                online: event.online,
                onlineAt: event.timestamp,
            });
            break;
        }

        case 'friend-status': {
            // Friend online/offline status (HAP-716)
            // Dispatched to useFriendStatus composable via custom event
            // This decouples the handler from the composable's reactive state
            window.dispatchEvent(new CustomEvent('friend-status', { detail: event }));
            break;
        }

        default: {
            // TypeScript exhaustiveness check
            const _exhaustiveCheck = event;
            console.warn('[sync] Unknown ephemeral type:', (_exhaustiveCheck as { type: string }).type);
        }
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// Error Event Handler
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Expected structure of WebSocket error events from the server.
 *
 * The server sends errors in the format:
 * { event: 'error', data: { code, message, timestamp, context? } }
 *
 * For session revival errors (HAP-750), the error will have:
 * - code: 'SESSION_REVIVAL_FAILED' (string error code)
 * - message: Human-readable error description
 * - context: { sessionId: string } for identifying the failed session
 */
interface WebSocketErrorData {
    /** Error code (string from @happy/errors ErrorCodes) */
    code?: string;
    /** Human-readable error message */
    message?: string;
    /** Unix timestamp when error occurred */
    timestamp?: number;
    /** Additional error context */
    context?: {
        sessionId?: string;
        [key: string]: unknown;
    };
}

/**
 * Handle error events from the WebSocket connection.
 * Dispatches session revival errors to the useSessionRevival composable
 * via CustomEvent, similar to the friend-status pattern (HAP-716).
 *
 * @see HAP-750 - Integrate useSessionRevival with WebSocket error events
 */
function handleError(data: unknown): void {
    // Cast to expected shape - we'll validate what we need
    const errorData = data as WebSocketErrorData | null | undefined;

    if (!errorData) {
        console.warn('[sync] Received empty error event');
        return;
    }

    // Log all errors for debugging
    console.error('[sync] WebSocket error:', errorData.code, errorData.message);

    // Check for session revival failure (HAP-750)
    // These errors need to be dispatched to the useSessionRevival composable
    if (errorData.code === 'SESSION_REVIVAL_FAILED') {
        // Dispatch to useSessionRevival via CustomEvent
        // This follows the same pattern as friend-status (HAP-716)
        window.dispatchEvent(new CustomEvent('session-revival-error', { detail: errorData }));
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Session Revival Paused Handler (HAP-869)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Expected structure of session-revival-paused WebSocket event.
 * Emitted by CLI when circuit breaker cooldown is active.
 *
 * @see HAP-784 - CLI circuit breaker implementation
 * @see HAP-869 - Vue.js handling implementation
 */
interface SessionRevivalPausedData {
    /** Reason for the pause (currently only 'circuit_breaker') */
    reason: 'circuit_breaker';
    /** Remaining cooldown time in milliseconds */
    remainingMs: number;
    /** Unix timestamp when cooldown will expire */
    resumesAt: number;
    /** Machine ID this event originated from */
    machineId: string;
}

/**
 * Expected structure of session-revived WebSocket event.
 * Emitted when a session is successfully revived.
 */
interface SessionRevivedData {
    /** Original session ID that was revived */
    originalSessionId: string;
    /** New session ID after revival */
    newSessionId: string;
    /** Machine ID this event originated from */
    machineId: string;
}

/**
 * Handle session-revival-paused events from the WebSocket connection.
 * Dispatches to the useRevivalCooldown composable via CustomEvent.
 *
 * @see HAP-869 - Vue.js circuit breaker cooldown UI
 */
function handleSessionRevivalPaused(data: unknown): void {
    const payload = data as SessionRevivalPausedData | null | undefined;

    if (!payload) {
        console.warn('[sync] Received empty session-revival-paused event');
        return;
    }

    // Validate required fields
    if (
        payload.reason !== 'circuit_breaker' ||
        typeof payload.remainingMs !== 'number' ||
        typeof payload.resumesAt !== 'number' ||
        typeof payload.machineId !== 'string'
    ) {
        console.warn('[sync] Invalid session-revival-paused payload:', payload);
        return;
    }

    console.debug('[sync] Session revival paused:', payload.machineId, payload.remainingMs, 'ms');

    // Dispatch to useRevivalCooldown composable via CustomEvent
    // This follows the same pattern as friend-status (HAP-716) and session-revival-error (HAP-750)
    window.dispatchEvent(new CustomEvent('session-revival-paused', { detail: payload }));
}

/**
 * Handle session-revived events from the WebSocket connection.
 * Dispatches to the useRevivalCooldown composable to clear cooldown state.
 *
 * @see HAP-869 - Vue.js circuit breaker cooldown UI
 */
function handleSessionRevived(data: unknown): void {
    const payload = data as SessionRevivedData | null | undefined;

    if (!payload) {
        console.warn('[sync] Received empty session-revived event');
        return;
    }

    // Validate required fields
    if (typeof payload.machineId !== 'string') {
        console.warn('[sync] Invalid session-revived payload:', payload);
        return;
    }

    console.debug('[sync] Session revived:', payload.machineId);

    // Dispatch to useRevivalCooldown composable via CustomEvent
    window.dispatchEvent(new CustomEvent('session-revived', { detail: payload }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler Setup
// ─────────────────────────────────────────────────────────────────────────────

let isSetup = false;
let cleanupFunctions: Array<() => void> = [];

/**
 * Set up all sync event handlers.
 * Should be called once when the app initializes.
 *
 * @returns Cleanup function to remove all handlers
 *
 * @example
 * ```typescript
 * import { setupSyncHandlers } from '@/services/sync';
 *
 * // In app initialization
 * const cleanup = setupSyncHandlers();
 *
 * // On app unmount
 * cleanup();
 * ```
 */
export function setupSyncHandlers(): () => void {
    if (isSetup) {
        console.warn('[sync] Handlers already set up');
        return () => {
            /* no-op */
        };
    }

    isSetup = true;

    // Register handlers
    const unsubUpdate = wsService.onMessage('update', handleUpdate);
    const unsubEphemeral = wsService.onMessage('ephemeral', handleEphemeral);
    // HAP-750: Register error handler for session revival failures
    const unsubError = wsService.onMessage('error', handleError);
    // HAP-869: Register handlers for session revival cooldown events
    const unsubRevivalPaused = wsService.onMessage('session-revival-paused', handleSessionRevivalPaused);
    const unsubRevived = wsService.onMessage('session-revived', handleSessionRevived);

    cleanupFunctions = [unsubUpdate, unsubEphemeral, unsubError, unsubRevivalPaused, unsubRevived];

    // Return cleanup function
    return () => {
        cleanupFunctions.forEach((cleanup) => {
            cleanup();
        });
        cleanupFunctions = [];
        isSetup = false;
    };
}

/**
 * Check if handlers are currently set up.
 */
export function areHandlersSetup(): boolean {
    return isSetup;
}
