/**
 * WebSocket Service
 *
 * Native WebSocket implementation for real-time sync with apps/server/workers.
 * This is a port of apps/web/react/sources/sync/apiSocket.ts adapted for Vue.js.
 *
 * CRITICAL: Uses native WebSocket API, NOT Socket.io.
 * Socket.io is incompatible with Cloudflare Workers WebSocket backend.
 *
 * Features:
 * - Ticket-based auth with message auth fallback (HAP-375, HAP-360)
 * - Exponential backoff with centered jitter (HAP-477)
 * - Request-response pattern via ackId
 * - Event-driven message handling
 *
 * @see apps/web/react/sources/sync/apiSocket.ts - Reference implementation
 * @see HAP-671 - This implementation issue
 */

import { useSyncStore } from '@/stores/sync';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Message format for native WebSocket protocol.
 * Matches the format used by apps/server/workers ConnectionManager.
 */
interface HappyMessage {
    event: string;
    data?: unknown;
    ackId?: string;
    ack?: unknown;
}

/**
 * Pending acknowledgement tracking for request-response pattern.
 */
interface PendingAck<T = unknown> {
    resolve: (value: T) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
}

/**
 * WebSocket configuration for reconnection behavior.
 */
interface WebSocketConfig {
    /** Initial reconnection delay in ms */
    reconnectionDelay: number;
    /** Maximum reconnection delay in ms (HAP-477: 30s cap) */
    reconnectionDelayMax: number;
    /** Jitter factor for centered randomization (±50%) */
    randomizationFactor: number;
    /** Timeout for acknowledgement responses */
    ackTimeout: number;
    /** Timeout for authentication handshake */
    authTimeout: number;
}

/**
 * Default WebSocket reconnection configuration.
 *
 * HAP-477: Max delay set to 30s to match CLI behavior and handle
 * poor network conditions gracefully.
 */
const DEFAULT_CONFIG: WebSocketConfig = {
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    randomizationFactor: 0.5,
    ackTimeout: 30000,
    authTimeout: 5000,
};

// ─────────────────────────────────────────────────────────────────────────────
// WebSocket Service Class
// ─────────────────────────────────────────────────────────────────────────────

class WebSocketService {
    // Connection state
    private ws: WebSocket | null = null;
    private serverUrl: string | null = null;
    private token: string | null = null;
    private config: WebSocketConfig = DEFAULT_CONFIG;

    // Reconnection state
    private reconnectAttempts = 0;
    private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    private isManualClose = false;
    private wasConnectedBefore = false;

    // Auth handshake state (HAP-360)
    private authTimeout: ReturnType<typeof setTimeout> | null = null;
    private usedTicketAuth = false;

    // Event handlers
    private messageHandlers: Map<string, Set<(data: unknown) => void>> = new Map();
    private reconnectedListeners: Set<() => void> = new Set();

    // Acknowledgement tracking for request-response pattern
    private pendingAcks: Map<string, PendingAck> = new Map();

    // ─────────────────────────────────────────────────────────────────────────
    // Connection Management
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Connect to the WebSocket server.
     *
     * @param serverUrl - Base URL of the server (e.g., "https://api.happy.dev")
     * @param token - JWT access token for authentication
     */
    async connect(serverUrl: string, token: string): Promise<void> {
        if (this.ws) {
            // Already connected or connecting
            return;
        }

        this.serverUrl = serverUrl;
        this.token = token;
        this.isManualClose = false;

        const syncStore = useSyncStore();
        syncStore.setStatus('connecting');

        await this.doConnect();
    }

    /**
     * Internal connection logic - creates WebSocket and sets up handlers.
     *
     * HAP-375: Uses ticket-based authentication for security.
     * 1. First fetches a short-lived ticket from the server via HTTP
     * 2. Then connects with the ticket in the WebSocket URL
     * 3. Server validates ticket and creates authenticated connection immediately
     *
     * Falls back to HAP-360 message-based auth if ticket fetch fails.
     */
    private async doConnect(): Promise<void> {
        if (!this.serverUrl || !this.token) return;

        // Reset ticket auth flag
        this.usedTicketAuth = false;

        // Build WebSocket URL
        const wsUrl = new URL('/v1/updates', this.serverUrl);
        wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:';

        // HAP-375: Try to fetch a ticket for secure authentication
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
            }, 10000);

            const ticketResponse = await fetch(`${this.serverUrl}/v1/websocket/ticket`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json',
                },
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (ticketResponse.ok) {
                const { ticket } = (await ticketResponse.json()) as { ticket: string };
                wsUrl.searchParams.set('ticket', ticket);
                this.usedTicketAuth = true;
            }
            // If ticket request fails, fall through to connect without ticket
            // The server's HAP-360 pending-auth flow will handle it
        } catch {
            // Network error or timeout fetching ticket - continue without it
            // Will use HAP-360 message-based auth as fallback
        }

        // Connect to WebSocket
        this.ws = new WebSocket(wsUrl.toString());
        this.setupEventHandlers();
    }

    /**
     * Disconnect from the WebSocket server.
     */
    disconnect(): void {
        this.isManualClose = true;

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.authTimeout) {
            clearTimeout(this.authTimeout);
            this.authTimeout = null;
        }

        // Reject all pending acknowledgements
        this.rejectAllPendingAcks(new Error('Connection closed'));

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        const syncStore = useSyncStore();
        syncStore.setStatus('disconnected');
    }

    /**
     * Check if the WebSocket is connected.
     */
    get isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }

    /**
     * Update the authentication token.
     * If connected, will reconnect with the new token.
     */
    updateToken(newToken: string): void {
        if (this.token !== newToken) {
            this.token = newToken;

            if (this.ws && this.serverUrl) {
                this.disconnect();
                void this.connect(this.serverUrl, newToken);
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Reconnection Logic
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Schedule a reconnection attempt with exponential backoff and jitter.
     *
     * Jitter Algorithm (HAP-477):
     * Uses "centered jitter" to spread reconnection times both above and below
     * the base delay, preventing thundering herd when many clients reconnect
     * after a server outage.
     *
     * With randomizationFactor=0.5:
     * - Base delay: 1000ms * 2^attempt (capped at max)
     * - Jitter range: ±50% of base delay
     * - Actual delay: 500ms to 1500ms for first attempt
     *
     * Formula: delay = base * (1 - factor + random * factor * 2)
     * This centers the distribution around the base delay.
     */
    private scheduleReconnect(): void {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }

        if (this.isManualClose) {
            return;
        }

        const syncStore = useSyncStore();
        syncStore.incrementReconnectAttempts();

        // Calculate delay with exponential backoff and centered jitter (HAP-477)
        const baseDelay = Math.min(
            this.config.reconnectionDelay * Math.pow(2, this.reconnectAttempts),
            this.config.reconnectionDelayMax
        );
        // Centered jitter: spreads delay ±factor around base
        // With factor=0.5: delay ranges from base*0.5 to base*1.5
        const jitterMultiplier =
            1 - this.config.randomizationFactor + Math.random() * this.config.randomizationFactor * 2;
        const delay = Math.max(100, baseDelay * jitterMultiplier);

        this.reconnectAttempts++;

        this.reconnectTimeout = setTimeout(() => {
            this.reconnectTimeout = null;
            void this.doConnect();
        }, delay);
    }

    /**
     * Reject all pending acknowledgements with an error.
     */
    private rejectAllPendingAcks(error: Error): void {
        for (const [, pending] of this.pendingAcks) {
            clearTimeout(pending.timer);
            pending.reject(error);
        }
        this.pendingAcks.clear();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Event Handlers
    // ─────────────────────────────────────────────────────────────────────────

    private setupEventHandlers(): void {
        if (!this.ws) return;

        const syncStore = useSyncStore();

        // Connection opened - handle authentication
        this.ws.onopen = () => {
            this.reconnectAttempts = 0;
            syncStore.setStatus('authenticating');

            // HAP-375: If we used ticket auth, server already validated us
            // The server will send 'connected' event immediately
            if (!this.usedTicketAuth && this.ws && this.token) {
                // HAP-360 fallback: Send auth message as first message
                this.ws.send(
                    JSON.stringify({
                        event: 'auth',
                        data: {
                            token: this.token,
                            clientType: 'user-scoped',
                        },
                    })
                );
            }

            // Set auth timeout - if server doesn't respond, close connection
            this.authTimeout = setTimeout(() => {
                this.authTimeout = null;
                if (syncStore.status === 'authenticating') {
                    syncStore.setError('Authentication timeout');
                    this.ws?.close(4001, 'Authentication timeout');
                }
            }, this.config.authTimeout);
        };

        // Connection closed
        this.ws.onclose = () => {
            const wasInActiveState = syncStore.status === 'connected' || syncStore.status === 'authenticating';
            this.ws = null;

            if (this.authTimeout) {
                clearTimeout(this.authTimeout);
                this.authTimeout = null;
            }

            // Reject any pending acks
            this.rejectAllPendingAcks(new Error('Connection closed'));

            if (wasInActiveState) {
                syncStore.setStatus('disconnected');
            }

            // Attempt reconnection if not manually closed
            if (!this.isManualClose) {
                this.scheduleReconnect();
            }
        };

        // Connection error
        this.ws.onerror = () => {
            syncStore.setError('WebSocket error');
        };

        // Message received
        this.ws.onmessage = (event: MessageEvent) => {
            if (typeof event.data === 'string') {
                this.handleMessage(event.data);
            }
        };
    }

    /**
     * Handle incoming WebSocket messages.
     * Parses JSON and dispatches to event handlers or resolves pending acks.
     *
     * HAP-360: Also handles the auth flow - the 'connected' event from server
     * indicates successful authentication.
     */
    private handleMessage(data: string): void {
        const syncStore = useSyncStore();

        try {
            const message = JSON.parse(data) as HappyMessage;

            // Handle auth success response (HAP-360)
            if (message.event === 'connected' && syncStore.status === 'authenticating') {
                if (this.authTimeout) {
                    clearTimeout(this.authTimeout);
                    this.authTimeout = null;
                }

                syncStore.setStatus('connected');

                // Notify reconnection listeners if this was a reconnection
                if (this.wasConnectedBefore) {
                    this.reconnectedListeners.forEach((listener) => {
                        listener();
                    });
                }
                this.wasConnectedBefore = true;
                return;
            }

            // Handle auth failure (HAP-360)
            if (message.event === 'auth-error' && syncStore.status === 'authenticating') {
                if (this.authTimeout) {
                    clearTimeout(this.authTimeout);
                    this.authTimeout = null;
                }

                const errorData = message.data as { message?: string } | undefined;
                syncStore.setError(errorData?.message ?? 'Authentication failed');
                this.ws?.close(4001, 'Authentication failed');
                return;
            }

            // Handle acknowledgement responses (for emitWithAck)
            if (message.ackId && message.ack !== undefined) {
                const pending = this.pendingAcks.get(message.ackId);
                if (pending) {
                    clearTimeout(pending.timer);
                    this.pendingAcks.delete(message.ackId);
                    pending.resolve(message.ack);
                }
                return;
            }

            // Handle regular events - dispatch to registered handlers
            const handlers = this.messageHandlers.get(message.event);
            if (handlers) {
                handlers.forEach((handler) => {
                    handler(message.data);
                });
            }
        } catch {
            // Ignore malformed messages
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Message Handling API
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Register a handler for a specific event type.
     *
     * @param event - Event name to listen for (e.g., 'update', 'ephemeral')
     * @param handler - Callback function to handle the event data
     * @returns Cleanup function to unregister the handler
     *
     * @example
     * ```typescript
     * const unsubscribe = wsService.onMessage('update', (data) => {
     *     console.log('Received update:', data);
     * });
     *
     * // Later, to unsubscribe:
     * unsubscribe();
     * ```
     */
    onMessage(event: string, handler: (data: unknown) => void): () => void {
        let handlers = this.messageHandlers.get(event);
        if (!handlers) {
            handlers = new Set();
            this.messageHandlers.set(event, handlers);
        }
        handlers.add(handler);

        return () => {
            const existingHandlers = this.messageHandlers.get(event);
            if (existingHandlers) {
                existingHandlers.delete(handler);
                if (existingHandlers.size === 0) {
                    this.messageHandlers.delete(event);
                }
            }
        };
    }

    /**
     * Register a handler for reconnection events.
     *
     * @param listener - Callback to invoke when reconnected after a disconnect
     * @returns Cleanup function to unregister the listener
     */
    onReconnected(listener: () => void): () => void {
        this.reconnectedListeners.add(listener);
        return () => this.reconnectedListeners.delete(listener);
    }

    /**
     * Send an event without expecting acknowledgement.
     *
     * @param event - Event name
     * @param data - Data to send
     * @returns true if sent, false if not connected
     */
    send(event: string, data: unknown): boolean {
        const syncStore = useSyncStore();
        if (!this.ws || syncStore.status !== 'connected') {
            return false;
        }
        this.ws.send(JSON.stringify({ event, data }));
        return true;
    }

    /**
     * Emit an event and wait for acknowledgement.
     * Implements the request-response pattern using ackId.
     *
     * @param event - Event name
     * @param data - Data to send
     * @param timeout - Optional custom timeout in milliseconds
     * @returns Promise that resolves with the acknowledgement response
     * @throws Error if not connected or if request times out
     *
     * @example
     * ```typescript
     * const response = await wsService.emitWithAck('sync', { since: 0 });
     * ```
     */
    async emitWithAck<T = unknown>(event: string, data: unknown, timeout?: number): Promise<T> {
        const syncStore = useSyncStore();
        const ws = this.ws;
        if (!ws || syncStore.status !== 'connected') {
            throw new Error('WebSocket not connected');
        }

        const ackId = crypto.randomUUID();
        const effectiveTimeout = timeout ?? this.config.ackTimeout;

        return new Promise<T>((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pendingAcks.delete(ackId);
                reject(new Error(`Request timed out: ${event}`));
            }, effectiveTimeout);

            this.pendingAcks.set(ackId, {
                resolve: resolve as (value: unknown) => void,
                reject,
                timer,
            });

            ws.send(JSON.stringify({ event, data, ackId }));
        });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton Export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Singleton WebSocket service instance.
 *
 * Use this throughout the application for all WebSocket operations.
 *
 * @example
 * ```typescript
 * import { wsService } from '@/services/sync';
 *
 * // Connect
 * await wsService.connect(serverUrl, token);
 *
 * // Listen for updates
 * wsService.onMessage('update', handleUpdate);
 *
 * // Disconnect
 * wsService.disconnect();
 * ```
 */
export const wsService = new WebSocketService();
