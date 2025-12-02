/**
 * Socket.IO utility functions for the Happy CLI
 * Provides timeout wrappers for socket operations
 */

import { Socket } from 'socket.io-client';

/**
 * Default timeout for socket acknowledgment in milliseconds
 */
export const DEFAULT_SOCKET_ACK_TIMEOUT_MS = 5000;

/**
 * Response type for 'update-metadata' and 'machine-update-metadata' events
 */
export type MetadataUpdateResponse = {
    result: 'error'
} | {
    result: 'version-mismatch';
    version: number;
    metadata: string;
} | {
    result: 'success';
    version: number;
    metadata: string;
};

/**
 * Response type for 'update-state' event (session agent state)
 */
export type StateUpdateResponse = {
    result: 'error'
} | {
    result: 'version-mismatch';
    version: number;
    agentState: string | null;
} | {
    result: 'success';
    version: number;
    agentState: string | null;
};

/**
 * Response type for 'machine-update-state' event (daemon state)
 */
export type DaemonStateUpdateResponse = {
    result: 'error'
} | {
    result: 'version-mismatch';
    version: number;
    daemonState: string;
} | {
    result: 'success';
    version: number;
    daemonState: string;
};

/**
 * Error thrown when a socket acknowledgment times out
 */
export class SocketAckTimeoutError extends Error {
    constructor(event: string, timeoutMs: number) {
        super(`Socket ack timeout for event '${event}' after ${timeoutMs}ms`);
        this.name = 'SocketAckTimeoutError';
    }
}


/**
 * Error thrown when attempting to send a message on a disconnected socket.
 * Callers should catch this error and handle gracefully (e.g., display
 * "Disconnected from server" message and terminate session cleanly).
 */
export class SocketDisconnectedError extends Error {
    constructor(operation: string = 'send message') {
        super(`Socket not connected: cannot ${operation}`);
        this.name = 'SocketDisconnectedError';
    }
}

/**
 * Wraps Socket.IO's emitWithAck with a configurable timeout.
 *
 * Socket.IO's emitWithAck() waits indefinitely for server acknowledgment.
 * This wrapper adds timeout protection to prevent hanging when the server
 * is unresponsive.
 *
 * @param socket - The Socket.IO client socket instance
 * @param event - The event name to emit
 * @param data - The data payload to send with the event
 * @param timeoutMs - Timeout in milliseconds (default: 5000ms)
 * @returns Promise that resolves with the server's acknowledgment response
 * @throws {SocketAckTimeoutError} If the server doesn't respond within the timeout
 *
 * @example
 * ```typescript
 * const response = await emitWithTimeout(socket, 'update-metadata', { sid: '123', data: 'foo' });
 * // With custom timeout
 * const response = await emitWithTimeout(socket, 'update-state', data, 10000);
 * ```
 */
export async function emitWithTimeout<T>(
    socket: Socket,
    event: string,
    data: unknown,
    timeoutMs: number = DEFAULT_SOCKET_ACK_TIMEOUT_MS
): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new SocketAckTimeoutError(event, timeoutMs));
        }, timeoutMs);

        socket.emitWithAck(event, data)
            .then((response: T) => {
                clearTimeout(timer);
                resolve(response);
            })
            .catch((error: Error) => {
                clearTimeout(timer);
                reject(error);
            });
    });
}
