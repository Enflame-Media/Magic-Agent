package com.enflame.happy.data.sync

/**
 * Represents the connection state of the WebSocket sync service.
 *
 * Exposed as a [kotlinx.coroutines.flow.StateFlow] by [SyncService] for
 * UI observation (e.g., connection indicator in the toolbar).
 */
enum class ConnectionState {
    /** Not connected to the server. Initial state. */
    DISCONNECTED,

    /** Attempting to establish the initial connection. */
    CONNECTING,

    /** Connected to the server and receiving messages. */
    CONNECTED,

    /** Connection was lost; attempting to reconnect with exponential backoff. */
    RECONNECTING
}
