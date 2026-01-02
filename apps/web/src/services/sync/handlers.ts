/**
 * Sync Event Handlers
 *
 * Processes incoming WebSocket events and updates Pinia stores.
 * All incoming data is validated with Zod schemas from @happy-vue/protocol.
 *
 * Events handled:
 * - 'update': Persistent state changes (sessions, messages, machines, etc.)
 * - 'ephemeral': Real-time status updates (typing, usage, machine status)
 *
 * @see HAP-671 - WebSocket sync engine implementation
 */

import {
    ApiUpdateContainerSchema,
    ApiEphemeralUpdateSchema,
    type ApiUpdateContainer,
    type ApiEphemeralUpdate,
} from '@happy-vue/protocol';
import { useSessionsStore } from '@/stores/sessions';
import { useMessagesStore } from '@/stores/messages';
import { useMachinesStore } from '@/stores/machines';
import { useSyncStore } from '@/stores/sync';
import { useAuthStore } from '@/stores/auth';
import { wsService } from './WebSocketService';

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

        case 'new-artifact':
        case 'update-artifact':
        case 'delete-artifact':
            // Artifacts not yet implemented in happy-vue
            // Will be handled in a future issue
            break;

        case 'relationship-updated':
        case 'new-feed-post':
        case 'kv-batch-update':
            // These events may not be relevant for the web app
            // or will be handled in future issues
            break;

        default: {
            // TypeScript exhaustiveness check
            const _exhaustiveCheck: never = update;
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
            const _exhaustiveCheck: never = event;
            console.warn('[sync] Unknown ephemeral type:', (_exhaustiveCheck as { type: string }).type);
        }
    }
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

    cleanupFunctions = [unsubUpdate, unsubEphemeral];

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
