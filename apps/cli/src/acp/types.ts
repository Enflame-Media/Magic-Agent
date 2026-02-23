/**
 * ACP Transport configuration and event types
 *
 * Defines the configuration options for spawning an ACP agent subprocess
 * and the event types emitted by the transport layer.
 *
 * @see https://agentclientprotocol.com/protocol/overview
 */

import type { Client, Agent } from '@agentclientprotocol/sdk';

/** Configuration for spawning an ACP agent subprocess */
export interface AcpTransportConfig {
    /** Path to the agent binary (e.g., 'claude', 'gemini-cli') */
    command: string;

    /** Arguments to pass to the agent binary (e.g., ['code', '--acp']) */
    args?: string[];

    /** Environment variables to pass to the agent process */
    env?: Record<string, string>;

    /** Working directory for the agent process */
    cwd?: string;

    /** Default timeout for requests in milliseconds (default: 30000). Set to 0 to disable. */
    requestTimeoutMs?: number;

    /** Grace period before SIGKILL after SIGTERM in milliseconds (default: 5000) */
    shutdownGracePeriodMs?: number;
}

/** Events emitted by AcpTransport */
export interface AcpTransportEvents {
    /** Agent process has exited */
    close: { code: number | null; signal: NodeJS.Signals | null };

    /** Agent process stderr output (for logging, not protocol messages) */
    stderr: string;

    /** Transport-level error (process spawn failure, unexpected crash, etc.) */
    error: Error;
}

/** Listener function type for transport events */
export type AcpTransportListener<K extends keyof AcpTransportEvents> = (
    data: AcpTransportEvents[K],
) => void;

/** Factory function that creates a Client handler given the Agent interface */
export type AcpClientFactory = (agent: Agent) => Client;
