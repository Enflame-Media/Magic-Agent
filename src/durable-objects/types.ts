/**
 * Durable Objects Types for WebSocket Connection Management
 *
 * These types define the structure for WebSocket connections in the Happy Server
 * Cloudflare Workers implementation. The architecture supports three client types:
 *
 * - **user-scoped**: Mobile apps that receive all user events
 * - **session-scoped**: Connections tied to a specific Claude Code session
 * - **machine-scoped**: CLI daemon connections for a specific machine
 *
 * @module durable-objects/types
 */

/**
 * Client connection types supported by the WebSocket system
 *
 * @remarks
 * These mirror the client types from the original Socket.io implementation in happy-server:
 * - `user-scoped`: Receives broadcasts for all user activity (typically mobile app)
 * - `session-scoped`: Only receives events for a specific session (session viewers)
 * - `machine-scoped`: CLI daemons that manage a specific machine's sessions
 */
export type ClientType = 'user-scoped' | 'session-scoped' | 'machine-scoped';

/**
 * Connection metadata stored with each WebSocket connection
 *
 * This is serialized via `WebSocket.serializeAttachment()` and restored on DO wake-up.
 * The metadata is used to route messages to appropriate connections and track state.
 */
export interface ConnectionMetadata {
    /** Unique connection ID (UUID) for tracking */
    connectionId: string;

    /** The authenticated user ID owning this connection */
    userId: string;

    /** The type of client connection */
    clientType: ClientType;

    /** Session ID for session-scoped connections */
    sessionId?: string;

    /** Machine ID for machine-scoped connections */
    machineId?: string;

    /** Timestamp when connection was established */
    connectedAt: number;

    /** Last activity timestamp (updated on each message) */
    lastActivityAt: number;
}

/**
 * Authentication handshake data sent by clients during WebSocket upgrade
 *
 * Clients must provide a valid auth token and their client type.
 * Session and machine-scoped clients must also provide their respective IDs.
 */
export interface WebSocketAuthHandshake {
    /** Authentication token from privacy-kit */
    token: string;

    /** Type of client connection */
    clientType: ClientType;

    /** Session ID (required for session-scoped connections) */
    sessionId?: string;

    /** Machine ID (required for machine-scoped connections) */
    machineId?: string;
}

/**
 * WebSocket close codes used by the connection manager
 *
 * Standard WebSocket close codes plus custom application codes.
 * @see https://www.rfc-editor.org/rfc/rfc6455.html#section-7.4
 */
export const CloseCode = {
    /** Normal closure - client requested disconnect */
    NORMAL: 1000,

    /** Server is going away (e.g., DO being evicted) */
    GOING_AWAY: 1001,

    /** Protocol error - invalid message format */
    PROTOCOL_ERROR: 1002,

    /** Unsupported data type received */
    UNSUPPORTED_DATA: 1003,

    /** Policy violation */
    POLICY_VIOLATION: 1008,

    /** Message too large */
    MESSAGE_TOO_BIG: 1009,

    /** Server error */
    INTERNAL_ERROR: 1011,

    // Custom application codes (4000-4999)

    /** Authentication failed - invalid or missing token */
    AUTH_FAILED: 4001,

    /** Missing required handshake data */
    INVALID_HANDSHAKE: 4002,

    /** Session ID required but not provided */
    MISSING_SESSION_ID: 4003,

    /** Machine ID required but not provided */
    MISSING_MACHINE_ID: 4004,

    /** Connection limit exceeded for user */
    CONNECTION_LIMIT_EXCEEDED: 4005,

    /** Duplicate connection detected */
    DUPLICATE_CONNECTION: 4006,
} as const;

/**
 * Message types for internal WebSocket protocol
 *
 * These define the structure of messages exchanged between clients and the DO.
 * All messages are JSON-encoded with a `type` field for routing.
 */
export type WebSocketMessageType =
    | 'ping'
    | 'pong'
    | 'error'
    | 'connected'
    | 'disconnected'
    | 'broadcast'
    | 'session-update'
    | 'machine-update'
    | 'artifact-update'
    | 'access-key-update'
    | 'rpc-request'
    | 'rpc-response';

/**
 * Base structure for all WebSocket messages
 */
export interface WebSocketMessage<T = unknown> {
    /** Message type for routing */
    type: WebSocketMessageType;

    /** Message payload */
    payload?: T;

    /** Timestamp when message was created */
    timestamp: number;

    /** Optional message ID for request/response correlation */
    messageId?: string;
}

/**
 * Error message sent to clients
 */
export interface ErrorMessage extends WebSocketMessage {
    type: 'error';
    payload: {
        code: number;
        message: string;
        details?: unknown;
    };
}

/**
 * Connection confirmation message sent after successful authentication
 */
export interface ConnectedMessage extends WebSocketMessage {
    type: 'connected';
    payload: {
        connectionId: string;
        userId: string;
        clientType: ClientType;
        sessionId?: string;
        machineId?: string;
    };
}

/**
 * Broadcast message filter for routing messages to specific connections
 */
export interface BroadcastFilter {
    /** Target all connections for a user */
    type: 'all';
}

export interface BroadcastFilterUserScoped {
    /** Target only user-scoped connections */
    type: 'user-scoped-only';
}

export interface BroadcastFilterSession {
    /** Target connections for a specific session */
    type: 'session';
    sessionId: string;
}

export interface BroadcastFilterMachine {
    /** Target connections for a specific machine */
    type: 'machine';
    machineId: string;
}

export interface BroadcastFilterExclude {
    /** Target all except specific connection */
    type: 'exclude';
    connectionId: string;
}

export type MessageFilter =
    | BroadcastFilter
    | BroadcastFilterUserScoped
    | BroadcastFilterSession
    | BroadcastFilterMachine
    | BroadcastFilterExclude;

/**
 * Connection statistics for monitoring
 */
export interface ConnectionStats {
    /** Total active connections */
    totalConnections: number;

    /** Connections by type */
    byType: {
        'user-scoped': number;
        'session-scoped': number;
        'machine-scoped': number;
    };

    /** Unique sessions with active connections */
    activeSessions: number;

    /** Unique machines with active connections */
    activeMachines: number;

    /** Oldest connection timestamp */
    oldestConnection: number | null;
}

/**
 * Configuration for the ConnectionManager Durable Object
 */
export interface ConnectionManagerConfig {
    /**
     * Maximum connections per user
     * @default 100
     */
    maxConnectionsPerUser: number;

    /**
     * Connection timeout in milliseconds (no activity)
     * @default 300000 (5 minutes)
     */
    connectionTimeoutMs: number;

    /**
     * Enable auto-response for ping/pong during hibernation
     * @default true
     */
    enableAutoResponse: boolean;

    /**
     * Maximum message size in bytes
     * @default 1048576 (1MB)
     */
    maxMessageSize: number;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: ConnectionManagerConfig = {
    maxConnectionsPerUser: 100,
    connectionTimeoutMs: 5 * 60 * 1000, // 5 minutes
    enableAutoResponse: true,
    maxMessageSize: 1024 * 1024, // 1MB
};
