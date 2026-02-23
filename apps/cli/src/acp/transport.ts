/**
 * ACP Transport Layer
 *
 * Manages the lifecycle of an ACP agent subprocess and provides a typed,
 * bidirectional JSON-RPC 2.0 communication channel over stdio using ndjson.
 *
 * Wraps the @agentclientprotocol/sdk's ClientSideConnection and ndJsonStream
 * to add subprocess management, request timeouts, stderr capture, and
 * graceful shutdown handling.
 *
 * @see https://agentclientprotocol.com/protocol/overview
 */

import { spawn, type ChildProcess } from 'child_process';
import { Writable, Readable } from 'node:stream';
import {
    ClientSideConnection,
    ndJsonStream,
    type Agent,
} from '@agentclientprotocol/sdk';
import { logger } from '@/ui/logger';
import type {
    AcpTransportConfig,
    AcpTransportEvents,
    AcpTransportListener,
    AcpClientFactory,
} from './types';

/** Default request timeout in milliseconds */
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;

/** Default grace period before SIGKILL after SIGTERM */
const DEFAULT_SHUTDOWN_GRACE_MS = 5_000;

/**
 * AcpTransport manages the lifecycle of an ACP agent subprocess and provides
 * a typed, bidirectional JSON-RPC 2.0 communication channel.
 *
 * It wraps the SDK's ClientSideConnection with:
 * - Subprocess spawning and lifecycle management
 * - Configurable request timeouts
 * - Stderr capture for logging
 * - Graceful shutdown with SIGTERM -> SIGKILL fallback
 * - Event-based error and close notifications
 *
 * @example
 * ```typescript
 * const transport = new AcpTransport({
 *     command: 'claude',
 *     args: ['code', '--acp'],
 *     requestTimeoutMs: 60_000,
 * });
 *
 * transport.on('stderr', (data) => logger.debug('Agent stderr:', data));
 * transport.on('close', ({ code, signal }) => logger.info('Agent exited:', code, signal));
 *
 * const connection = transport.spawn((agent) => ({
 *     requestPermission: async (params) => { ... },
 *     sessionUpdate: async (params) => { ... },
 * }));
 *
 * const initResult = await connection.initialize({ ... });
 * ```
 */
export class AcpTransport {
    private readonly config: Required<
        Pick<AcpTransportConfig, 'command' | 'requestTimeoutMs' | 'shutdownGracePeriodMs'>
    > & AcpTransportConfig;

    private process: ChildProcess | null = null;
    private connection: ClientSideConnection | null = null;
    private closed = false;
    private listeners: {
        [K in keyof AcpTransportEvents]?: Set<AcpTransportListener<K>>;
    } = {};

    constructor(config: AcpTransportConfig) {
        this.config = {
            ...config,
            requestTimeoutMs: config.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
            shutdownGracePeriodMs: config.shutdownGracePeriodMs ?? DEFAULT_SHUTDOWN_GRACE_MS,
        };
    }

    /**
     * Spawn the agent subprocess and establish the ACP connection.
     *
     * Creates a child process with stdio pipes, sets up ndjson streams,
     * and returns a ClientSideConnection for typed ACP communication.
     *
     * @param clientFactory - Factory function that creates a Client handler.
     *   Receives the Agent interface so the client can call agent methods.
     * @returns The established ClientSideConnection for sending ACP messages
     * @throws Error if the transport is already spawned or has been closed
     */
    spawn(clientFactory: AcpClientFactory): ClientSideConnection {
        if (this.closed) {
            throw new Error('AcpTransport: transport has been closed');
        }
        if (this.process) {
            throw new Error('AcpTransport: already spawned');
        }

        const { command, args, env, cwd } = this.config;

        const mergedEnv = env ? { ...process.env, ...env } : process.env;

        this.process = spawn(command, args ?? [], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: mergedEnv,
            cwd,
        });

        this.setupStderr();
        this.setupProcessEvents();

        const stdin = this.process.stdin!;
        const stdout = this.process.stdout!;

        const writableWebStream = Writable.toWeb(stdin) as WritableStream<Uint8Array>;
        const readableWebStream = Readable.toWeb(stdout) as ReadableStream<Uint8Array>;

        const stream = ndJsonStream(writableWebStream, readableWebStream);

        this.connection = new ClientSideConnection(
            (agent: Agent) => clientFactory(agent),
            stream,
        );

        return this.connection;
    }

    /**
     * Register an event listener
     */
    on<K extends keyof AcpTransportEvents>(
        event: K,
        listener: AcpTransportListener<K>,
    ): void {
        if (!this.listeners[event]) {
            this.listeners[event] = new Set() as never;
        }
        (this.listeners[event] as Set<AcpTransportListener<K>>).add(listener);
    }

    /**
     * Remove an event listener
     */
    off<K extends keyof AcpTransportEvents>(
        event: K,
        listener: AcpTransportListener<K>,
    ): void {
        const set = this.listeners[event] as Set<AcpTransportListener<K>> | undefined;
        if (set) {
            set.delete(listener);
        }
    }

    /**
     * Send a request to the agent with an optional timeout.
     *
     * Wraps ClientSideConnection method calls with configurable timeouts.
     * Use timeoutMs=0 to disable the timeout (useful for long-running operations
     * like session/prompt).
     *
     * @param operation - An async function that performs the request via the connection
     * @param timeoutMs - Override timeout for this specific request (0 = no timeout)
     * @returns The result of the operation
     * @throws Error if the request times out or the transport is not connected
     */
    async request<T>(
        operation: (connection: ClientSideConnection) => Promise<T>,
        timeoutMs?: number,
    ): Promise<T> {
        if (!this.connection) {
            throw new Error('AcpTransport: not connected. Call spawn() first.');
        }

        const timeout = timeoutMs ?? this.config.requestTimeoutMs;

        if (timeout <= 0) {
            return operation(this.connection);
        }

        return Promise.race([
            operation(this.connection),
            new Promise<never>((_, reject) => {
                const timer = setTimeout(() => {
                    reject(new Error(`AcpTransport: request timed out after ${timeout}ms`));
                }, timeout);
                // Allow the process to exit even if the timer is pending
                if (typeof timer === 'object' && 'unref' in timer) {
                    timer.unref();
                }
            }),
        ]);
    }

    /**
     * Get the underlying ClientSideConnection.
     *
     * Use this for direct access when timeout wrapping is not needed
     * (e.g., for notifications or when managing timeouts externally).
     *
     * @throws Error if the transport is not connected
     */
    getConnection(): ClientSideConnection {
        if (!this.connection) {
            throw new Error('AcpTransport: not connected. Call spawn() first.');
        }
        return this.connection;
    }

    /** Whether the transport is currently connected */
    get isConnected(): boolean {
        return this.process !== null && !this.closed;
    }

    /** The PID of the agent subprocess, or null if not spawned */
    get pid(): number | null {
        return this.process?.pid ?? null;
    }

    /**
     * AbortSignal that aborts when the connection closes.
     *
     * Delegates to the underlying ClientSideConnection's signal.
     * Returns null if not yet connected.
     */
    get signal(): AbortSignal | null {
        return this.connection?.signal ?? null;
    }

    /**
     * Gracefully close the transport.
     *
     * Sends SIGTERM to the agent process and waits for the grace period.
     * If the process doesn't exit within the grace period, sends SIGKILL.
     *
     * @returns A promise that resolves when the process has exited
     */
    async close(): Promise<void> {
        if (!this.process || this.closed) {
            return;
        }

        const proc = this.process;

        return new Promise<void>((resolve) => {
            const onExit = () => {
                clearTimeout(killTimer);
                this.closed = true;
                resolve();
            };

            if (proc.exitCode !== null) {
                this.closed = true;
                resolve();
                return;
            }

            proc.once('exit', onExit);
            proc.kill('SIGTERM');

            const killTimer = setTimeout(() => {
                if (proc.exitCode === null) {
                    logger.warn('[AcpTransport] Agent did not exit after SIGTERM, sending SIGKILL');
                    proc.kill('SIGKILL');
                }
            }, this.config.shutdownGracePeriodMs);

            if (typeof killTimer === 'object' && 'unref' in killTimer) {
                killTimer.unref();
            }
        });
    }

    /**
     * Force kill the agent process immediately.
     */
    kill(): void {
        if (this.process && this.process.exitCode === null) {
            this.process.kill('SIGKILL');
        }
        this.closed = true;
    }

    private setupStderr(): void {
        const stderr = this.process?.stderr;
        if (!stderr) return;

        stderr.setEncoding('utf8');
        stderr.on('data', (chunk: string) => {
            this.emit('stderr', chunk);
        });
    }

    private setupProcessEvents(): void {
        const proc = this.process;
        if (!proc) return;

        proc.on('error', (err: Error) => {
            logger.error('[AcpTransport] Process error:', err.message);
            this.emit('error', err);
            this.closed = true;
        });

        proc.on('exit', (code, signal) => {
            if (!this.closed) {
                this.closed = true;
                this.emit('close', {
                    code,
                    signal: signal as NodeJS.Signals | null,
                });
            }
        });
    }

    private emit<K extends keyof AcpTransportEvents>(
        event: K,
        data: AcpTransportEvents[K],
    ): void {
        const set = this.listeners[event] as Set<AcpTransportListener<K>> | undefined;
        if (set) {
            for (const listener of set) {
                try {
                    listener(data);
                } catch (err) {
                    logger.error(`[AcpTransport] Error in '${event}' listener:`, err);
                }
            }
        }
    }
}
