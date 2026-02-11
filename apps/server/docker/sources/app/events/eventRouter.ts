import { Socket } from "socket.io";
import { log } from "@/utils/log";
import { GitHubProfile } from "@/app/api/types";
import { AccountProfile } from "@/types";
import { getPublicUrl } from "@/storage/files";

// Import shared protocol types from @magic-agent/protocol
import type {
    ApiUpdate,
    ApiEphemeralUpdate,
    UpdatePayload,
    EphemeralPayload,
} from '@magic-agent/protocol';

// === CONNECTION TYPES ===

export interface SessionScopedConnection {
    connectionType: 'session-scoped';
    socket: Socket;
    userId: string;
    sessionId: string;
}

export interface UserScopedConnection {
    connectionType: 'user-scoped';
    socket: Socket;
    userId: string;
}

export interface MachineScopedConnection {
    connectionType: 'machine-scoped';
    socket: Socket;
    userId: string;
    machineId: string;
}

export type ClientConnection = SessionScopedConnection | UserScopedConnection | MachineScopedConnection;

// === RECIPIENT FILTER TYPES ===

export type RecipientFilter =
    | { type: 'all-interested-in-session'; sessionId: string }
    | { type: 'user-scoped-only' }
    | { type: 'machine-scoped-only'; machineId: string }  // For update-machine: sends to user-scoped + only the specific machine
    | { type: 'all-user-authenticated-connections' };

// === UPDATE EVENT TYPES (Persistent) ===
// Now using shared types from @magic-agent/protocol
// ApiUpdate uses 't' as discriminator field

/**
 * Re-export ApiUpdate as UpdateEvent for backward compatibility
 * The shared type uses 't' discriminator (e.g., t: 'new-message')
 */
export type UpdateEvent = ApiUpdate;

// === EPHEMERAL EVENT TYPES (Transient) ===
// Now using shared types from @magic-agent/protocol

/**
 * Re-export ApiEphemeralUpdate as EphemeralEvent for backward compatibility
 * The shared type uses 'type' discriminator (e.g., type: 'activity')
 */
export type EphemeralEvent = ApiEphemeralUpdate;

// === EVENT PAYLOAD TYPES ===
// Re-export from @magic-agent/protocol for type consistency
// Note: These are re-exported with the same names from the import above
export type { UpdatePayload, EphemeralPayload };

// === EVENT ROUTER CLASS ===

class EventRouter {
    private userConnections = new Map<string, Set<ClientConnection>>();

    // === CONNECTION MANAGEMENT ===

    addConnection(userId: string, connection: ClientConnection): void {
        if (!this.userConnections.has(userId)) {
            this.userConnections.set(userId, new Set());
        }
        this.userConnections.get(userId)!.add(connection);
    }

    removeConnection(userId: string, connection: ClientConnection): void {
        const connections = this.userConnections.get(userId);
        if (connections) {
            connections.delete(connection);
            if (connections.size === 0) {
                this.userConnections.delete(userId);
            }
        }
    }

    getConnections(userId: string): Set<ClientConnection> | undefined {
        return this.userConnections.get(userId);
    }

    // === EVENT EMISSION METHODS ===

    emitUpdate(params: {
        userId: string;
        payload: UpdatePayload;
        recipientFilter?: RecipientFilter;
        skipSenderConnection?: ClientConnection;
    }): void {
        this.emit({
            userId: params.userId,
            eventName: 'update',
            payload: params.payload,
            recipientFilter: params.recipientFilter || { type: 'all-user-authenticated-connections' },
            skipSenderConnection: params.skipSenderConnection
        });
    }

    emitEphemeral(params: {
        userId: string;
        payload: EphemeralPayload;
        recipientFilter?: RecipientFilter;
        skipSenderConnection?: ClientConnection;
    }): void {
        this.emit({
            userId: params.userId,
            eventName: 'ephemeral',
            payload: params.payload,
            recipientFilter: params.recipientFilter || { type: 'all-user-authenticated-connections' },
            skipSenderConnection: params.skipSenderConnection
        });
    }

    // === PRIVATE ROUTING LOGIC ===

    private shouldSendToConnection(
        connection: ClientConnection,
        filter: RecipientFilter
    ): boolean {
        switch (filter.type) {
            case 'all-interested-in-session':
                // Send to session-scoped with matching session + all user-scoped
                if (connection.connectionType === 'session-scoped') {
                    if (connection.sessionId !== filter.sessionId) {
                        return false;  // Wrong session
                    }
                } else if (connection.connectionType === 'machine-scoped') {
                    return false;  // Machines don't need session updates
                }
                // user-scoped always gets it
                return true;

            case 'user-scoped-only':
                return connection.connectionType === 'user-scoped';

            case 'machine-scoped-only':
                // Send to user-scoped (mobile/web needs all machine updates) + only the specific machine
                if (connection.connectionType === 'user-scoped') {
                    return true;
                }
                if (connection.connectionType === 'machine-scoped') {
                    return connection.machineId === filter.machineId;
                }
                return false;  // session-scoped doesn't need machine updates

            case 'all-user-authenticated-connections':
                // Send to all connection types (default behavior)
                return true;

            default:
                return false;
        }
    }

    private emit(params: {
        userId: string;
        eventName: 'update' | 'ephemeral';
        payload: any;
        recipientFilter: RecipientFilter;
        skipSenderConnection?: ClientConnection;
    }): void {
        const connections = this.userConnections.get(params.userId);
        if (!connections) {
            log({ module: 'websocket', level: 'warn' }, `No connections found for user ${params.userId}`);
            return;
        }

        for (const connection of connections) {
            // Skip message echo
            if (params.skipSenderConnection && connection === params.skipSenderConnection) {
                continue;
            }

            // Apply recipient filter
            if (!this.shouldSendToConnection(connection, params.recipientFilter)) {
                continue;
            }

            connection.socket.emit(params.eventName, params.payload);
        }
    }
}

export const eventRouter = new EventRouter();

// === EVENT BUILDER FUNCTIONS ===

export function buildNewSessionUpdate(session: {
    id: string;
    seq: number;
    metadata: string;
    metadataVersion: number;
    agentState: string | null;
    agentStateVersion: number;
    dataEncryptionKey: Uint8Array | null;
    active: boolean;
    lastActiveAt: Date;
    createdAt: Date;
    updatedAt: Date;
}, updateSeq: number, updateId: string): UpdatePayload {
    return {
        id: updateId,
        seq: updateSeq,
        body: {
            t: 'new-session',
            id: session.id,
            seq: session.seq,
            metadata: session.metadata,
            metadataVersion: session.metadataVersion,
            agentState: session.agentState,
            agentStateVersion: session.agentStateVersion,
            dataEncryptionKey: session.dataEncryptionKey ? Buffer.from(session.dataEncryptionKey).toString('base64') : null,
            active: session.active,
            activeAt: session.lastActiveAt.getTime(),
            createdAt: session.createdAt.getTime(),
            updatedAt: session.updatedAt.getTime()
        },
        createdAt: Date.now()
    };
}

export function buildNewMessageUpdate(message: {
    id: string;
    seq: number;
    content: any;
    localId: string | null;
    createdAt: Date;
    updatedAt: Date;
}, sessionId: string, updateSeq: number, updateId: string): UpdatePayload {
    return {
        id: updateId,
        seq: updateSeq,
        body: {
            t: 'new-message',
            sid: sessionId,
            message: {
                id: message.id,
                seq: message.seq,
                content: message.content,
                localId: message.localId,
                createdAt: message.createdAt.getTime(),
                updatedAt: message.updatedAt.getTime()
            }
        },
        createdAt: Date.now()
    };
}

export function buildUpdateSessionUpdate(sessionId: string, updateSeq: number, updateId: string, metadata?: { value: string; version: number }, agentState?: { value: string; version: number }): UpdatePayload {
    return {
        id: updateId,
        seq: updateSeq,
        body: {
            t: 'update-session',
            id: sessionId,
            metadata,
            agentState
        },
        createdAt: Date.now()
    };
}

export function buildDeleteSessionUpdate(sessionId: string, updateSeq: number, updateId: string): UpdatePayload {
    return {
        id: updateId,
        seq: updateSeq,
        body: {
            t: 'delete-session',
            sid: sessionId
        },
        createdAt: Date.now()
    };
}

export function buildUpdateAccountUpdate(userId: string, profile: Partial<AccountProfile>, updateSeq: number, updateId: string): UpdatePayload {
    return {
        id: updateId,
        seq: updateSeq,
        body: {
            t: 'update-account',
            id: userId,
            ...profile,
            avatar: profile.avatar ? { ...profile.avatar, url: getPublicUrl(profile.avatar.path) } : undefined
        },
        createdAt: Date.now()
    };
}

export function buildNewMachineUpdate(machine: {
    id: string;
    seq: number;
    metadata: string;
    metadataVersion: number;
    daemonState: string | null;
    daemonStateVersion: number;
    dataEncryptionKey: Uint8Array | null;
    active: boolean;
    lastActiveAt: Date;
    createdAt: Date;
    updatedAt: Date;
}, updateSeq: number, updateId: string): UpdatePayload {
    return {
        id: updateId,
        seq: updateSeq,
        body: {
            t: 'new-machine',
            machineId: machine.id,
            seq: machine.seq,
            metadata: machine.metadata,
            metadataVersion: machine.metadataVersion,
            daemonState: machine.daemonState,
            daemonStateVersion: machine.daemonStateVersion,
            dataEncryptionKey: machine.dataEncryptionKey ? Buffer.from(machine.dataEncryptionKey).toString('base64') : null,
            active: machine.active,
            activeAt: machine.lastActiveAt.getTime(),
            createdAt: machine.createdAt.getTime(),
            updatedAt: machine.updatedAt.getTime()
        },
        createdAt: Date.now()
    };
}

export function buildUpdateMachineUpdate(machineId: string, updateSeq: number, updateId: string, metadata?: { value: string; version: number }, daemonState?: { value: string; version: number }): UpdatePayload {
    return {
        id: updateId,
        seq: updateSeq,
        body: {
            t: 'update-machine',
            machineId,
            metadata,
            daemonState
        },
        createdAt: Date.now()
    };
}

/**
 * HAP-778: Build a delete-machine update event.
 * Sent when a machine is disconnected/unauthenticated from an account.
 */
export function buildDeleteMachineUpdate(machineId: string, updateSeq: number, updateId: string): UpdatePayload {
    return {
        id: updateId,
        seq: updateSeq,
        body: {
            t: 'delete-machine',
            machineId
        },
        createdAt: Date.now()
    };
}

export function buildSessionActivityEphemeral(sessionId: string, active: boolean, activeAt: number, thinking?: boolean): EphemeralPayload {
    return {
        type: 'activity',
        sid: sessionId,
        active,
        activeAt,
        thinking: thinking || false
    };
}

export function buildMachineActivityEphemeral(machineId: string, active: boolean, activeAt: number): EphemeralPayload {
    return {
        type: 'machine-activity',
        machineId,
        active,
        activeAt
    };
}

export function buildUsageEphemeral(sessionId: string, key: string, tokens: Record<string, number>, cost: Record<string, number>): EphemeralPayload {
    return {
        type: 'usage',
        sid: sessionId,
        key,
        tokens,
        cost,
        timestamp: Date.now()
    };
}

export function buildMachineStatusEphemeral(machineId: string, online: boolean): EphemeralPayload {
    return {
        type: 'machine-status',
        machineId,
        online,
        timestamp: Date.now()
    };
}

/**
 * HAP-780: Build a machine-disconnected ephemeral event.
 * Sent to a machine's WebSocket connection when it is disconnected from an account.
 * This allows the CLI daemon to gracefully shut down.
 */
export function buildMachineDisconnectedEphemeral(machineId: string, reason: 'disconnected_by_user'): EphemeralPayload {
    return {
        type: 'machine-disconnected',
        machineId,
        reason,
        timestamp: Date.now()
    };
}

export function buildNewArtifactUpdate(artifact: {
    id: string;
    seq: number;
    header: Uint8Array;
    headerVersion: number;
    body: Uint8Array;
    bodyVersion: number;
    dataEncryptionKey: Uint8Array;
    createdAt: Date;
    updatedAt: Date;
}, updateSeq: number, updateId: string): UpdatePayload {
    return {
        id: updateId,
        seq: updateSeq,
        body: {
            t: 'new-artifact',
            artifactId: artifact.id,
            seq: artifact.seq,
            header: Buffer.from(artifact.header).toString('base64'),
            headerVersion: artifact.headerVersion,
            body: Buffer.from(artifact.body).toString('base64'),
            bodyVersion: artifact.bodyVersion,
            dataEncryptionKey: Buffer.from(artifact.dataEncryptionKey).toString('base64'),
            createdAt: artifact.createdAt.getTime(),
            updatedAt: artifact.updatedAt.getTime()
        },
        createdAt: Date.now()
    };
}

export function buildUpdateArtifactUpdate(artifactId: string, updateSeq: number, updateId: string, header?: { value: string; version: number }, body?: { value: string; version: number }): UpdatePayload {
    return {
        id: updateId,
        seq: updateSeq,
        body: {
            t: 'update-artifact',
            artifactId,
            header,
            body
        },
        createdAt: Date.now()
    };
}

export function buildDeleteArtifactUpdate(artifactId: string, updateSeq: number, updateId: string): UpdatePayload {
    return {
        id: updateId,
        seq: updateSeq,
        body: {
            t: 'delete-artifact',
            artifactId
        },
        createdAt: Date.now()
    };
}

export function buildRelationshipUpdatedEvent(
    data: {
        uid: string;
        status: 'none' | 'requested' | 'pending' | 'friend' | 'rejected';
        timestamp: number;
    },
    updateSeq: number,
    updateId: string
): UpdatePayload {
    return {
        id: updateId,
        seq: updateSeq,
        body: {
            t: 'relationship-updated',
            ...data
        },
        createdAt: Date.now()
    };
}

export function buildNewFeedPostUpdate(feedItem: {
    id: string;
    body: any;
    cursor: string;
    createdAt: number;
}, updateSeq: number, updateId: string): UpdatePayload {
    return {
        id: updateId,
        seq: updateSeq,
        body: {
            t: 'new-feed-post',
            id: feedItem.id,
            body: feedItem.body,
            cursor: feedItem.cursor,
            createdAt: feedItem.createdAt
        },
        createdAt: Date.now()
    };
}

export function buildKVBatchUpdateUpdate(
    changes: Array<{ key: string; value: string | null; version: number }>,
    updateSeq: number,
    updateId: string
): UpdatePayload {
    return {
        id: updateId,
        seq: updateSeq,
        body: {
            t: 'kv-batch-update',
            changes
        },
        createdAt: Date.now()
    };
}
