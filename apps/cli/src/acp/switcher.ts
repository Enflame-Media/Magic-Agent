/**
 * ACP Agent Switcher
 *
 * Handles graceful agent switching: closes the current agent connection,
 * spawns the new agent, performs ACP initialization and authentication,
 * and rolls back to the previous agent on failure.
 *
 * @see https://agentclientprotocol.com/protocol/overview
 */

import { existsSync } from 'node:fs';
import { logger } from '@/ui/logger';
import type { AgentConfig, AgentRegistry, AgentAuthState } from './registry';
import { AgentNotFoundError, AgentBinaryNotFoundError } from './registry';
import { AcpTransport } from './transport';
import type { AcpTransportConfig, AcpClientFactory } from './types';
import { initializeConnection, type InitializeOptions } from './initialization';
import type { AgentConnection } from './capabilities';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Events emitted by AgentSwitcher */
export interface AgentSwitcherEvents {
    /** Emitted when a new agent is successfully connected */
    'agent-switched': { previousAgentId: string | null; newAgentId: string; connection: AgentConnection };

    /** Emitted when a switch fails and rolls back to the previous agent */
    'switch-failed': { targetAgentId: string; error: Error; rolledBack: boolean };

    /** Emitted when the current agent connection closes unexpectedly */
    'agent-disconnected': { agentId: string; code: number | null; signal: NodeJS.Signals | null };
}

/** Listener function type for switcher events */
export type AgentSwitcherListener<K extends keyof AgentSwitcherEvents> = (
    data: AgentSwitcherEvents[K],
) => void;

/** Current state of the agent switcher */
export interface AgentSwitcherState {
    /** Currently connected agent ID, or null */
    currentAgentId: string | null;

    /** Whether a switch operation is in progress */
    switching: boolean;

    /** The current AcpTransport, or null */
    transport: AcpTransport | null;

    /** The current AgentConnection, or null */
    connection: AgentConnection | null;
}

/** Options for the switch operation */
export interface SwitchOptions {
    /** Working directory for the agent session */
    cwd?: string;

    /** Override initialization options */
    initOptions?: InitializeOptions;

    /** Factory for creating the ACP client handler */
    clientFactory: AcpClientFactory;
}

// ─── AgentSwitcher ───────────────────────────────────────────────────────────

/**
 * Manages switching between ACP agents with graceful shutdown and rollback.
 *
 * When switching agents:
 * 1. Validates the target agent's binary exists
 * 2. Gracefully closes the current agent connection (if any)
 * 3. Spawns the new agent process via AcpTransport
 * 4. Performs ACP initialization with capability negotiation
 * 5. Handles authentication if required
 * 6. Updates the registry's active agent
 * 7. Emits 'agent-switched' event for UI updates
 *
 * If step 3-5 fails, attempts to roll back to the previous agent.
 *
 * @example
 * ```typescript
 * const switcher = new AgentSwitcher(registry);
 *
 * switcher.on('agent-switched', ({ newAgentId, connection }) => {
 *     console.log(`Switched to ${newAgentId}`);
 *     console.log(`Capabilities:`, connection.capabilities);
 * });
 *
 * await switcher.switchTo('gemini-cli', {
 *     cwd: '/path/to/project',
 *     clientFactory: (agent) => ({ ... }),
 * });
 * ```
 */
export class AgentSwitcher {
    private readonly registry: AgentRegistry;
    private currentAgentId: string | null = null;
    private currentTransport: AcpTransport | null = null;
    private currentConnection: AgentConnection | null = null;
    private switching = false;
    private listeners: {
        [K in keyof AgentSwitcherEvents]?: Set<AgentSwitcherListener<K>>;
    } = {};

    constructor(registry: AgentRegistry) {
        this.registry = registry;
    }

    // ─── State ───────────────────────────────────────────────────────────

    /** Get the current state of the switcher */
    getState(): AgentSwitcherState {
        return {
            currentAgentId: this.currentAgentId,
            switching: this.switching,
            transport: this.currentTransport,
            connection: this.currentConnection,
        };
    }

    /** Get the current AcpTransport, or null if no agent is connected */
    getTransport(): AcpTransport | null {
        return this.currentTransport;
    }

    /** Get the current AgentConnection, or null if no agent is connected */
    getConnection(): AgentConnection | null {
        return this.currentConnection;
    }

    /** Get the currently connected agent ID */
    getCurrentAgentId(): string | null {
        return this.currentAgentId;
    }

    /** Whether a switch is currently in progress */
    isSwitching(): boolean {
        return this.switching;
    }

    // ─── Switching ───────────────────────────────────────────────────────

    /**
     * Switch to a different ACP agent.
     *
     * Gracefully closes the current connection, spawns the new agent,
     * performs initialization, and rolls back on failure.
     *
     * @param agentId - ID of the agent to switch to
     * @param options - Switch configuration including cwd and client factory
     * @returns The new AgentConnection after successful initialization
     * @throws AgentNotFoundError if the agent is not in the registry
     * @throws AgentBinaryNotFoundError if the agent binary doesn't exist
     * @throws Error if the switch fails and rollback also fails
     */
    async switchTo(agentId: string, options: SwitchOptions): Promise<AgentConnection> {
        if (this.switching) {
            throw new Error('Agent switch already in progress');
        }

        const targetAgent = this.registry.getAgent(agentId);
        if (!targetAgent) {
            throw new AgentNotFoundError(agentId);
        }

        // Verify binary exists before attempting switch
        if (!existsSync(targetAgent.binaryPath)) {
            throw new AgentBinaryNotFoundError(agentId, targetAgent.binaryPath);
        }

        this.switching = true;
        const previousAgentId = this.currentAgentId;
        const previousTransport = this.currentTransport;
        const previousConnection = this.currentConnection;

        try {
            // Step 1: Gracefully close current agent
            if (previousTransport) {
                logger.info(`[AgentSwitcher] Closing current agent: ${previousAgentId}`);
                await this.closeTransport(previousTransport);
            }

            // Step 2: Create new transport for target agent
            const transportConfig = buildTransportConfig(targetAgent, options.cwd);
            const transport = new AcpTransport(transportConfig);

            // Step 3: Spawn and connect
            logger.info(`[AgentSwitcher] Spawning agent: ${targetAgent.displayName} (${agentId})`);
            transport.spawn(options.clientFactory);

            // Listen for unexpected disconnects
            this.setupDisconnectHandler(transport, agentId);

            // Step 4: Initialize with capability negotiation
            logger.info(`[AgentSwitcher] Initializing connection to ${agentId}`);
            const connection = await initializeConnection(transport, options.initOptions);

            // Step 5: Update state
            this.currentAgentId = agentId;
            this.currentTransport = transport;
            this.currentConnection = connection;

            // Step 6: Update registry
            this.registry.setActiveAgent(agentId);
            const persistedAuthState = connectionAuthToAgentAuth(connection);
            this.registry.updateAgent(agentId, {
                authState: persistedAuthState,
                capabilities: connection.capabilities,
                lastUsed: Date.now(),
            });

            // Step 7: Emit success event
            this.emit('agent-switched', {
                previousAgentId,
                newAgentId: agentId,
                connection,
            });

            logger.info(`[AgentSwitcher] Successfully switched to ${targetAgent.displayName}`);

            return connection;
        } catch (error: unknown) {
            const switchError = error instanceof Error ? error : new Error(String(error));
            logger.error(`[AgentSwitcher] Failed to switch to ${agentId}:`, switchError.message);

            // Attempt rollback to previous agent
            let rolledBack = false;

            if (previousAgentId && previousTransport && previousConnection) {
                try {
                    // Close the failed new transport if it was created
                    if (this.currentTransport && this.currentTransport !== previousTransport) {
                        await this.closeTransport(this.currentTransport);
                    }

                    // Attempt to reconnect the previous agent
                    const prevAgent = this.registry.getAgent(previousAgentId);
                    if (prevAgent && existsSync(prevAgent.binaryPath)) {
                        const prevTransportConfig = buildTransportConfig(prevAgent, options.cwd);
                        const prevTransport = new AcpTransport(prevTransportConfig);
                        prevTransport.spawn(options.clientFactory);
                        const prevConn = await initializeConnection(prevTransport, options.initOptions);

                        this.currentAgentId = previousAgentId;
                        this.currentTransport = prevTransport;
                        this.currentConnection = prevConn;
                        this.setupDisconnectHandler(prevTransport, previousAgentId);
                        rolledBack = true;

                        logger.info(`[AgentSwitcher] Rolled back to ${previousAgentId}`);
                    }
                } catch (rollbackError) {
                    logger.error('[AgentSwitcher] Rollback failed:', rollbackError);
                    this.currentAgentId = null;
                    this.currentTransport = null;
                    this.currentConnection = null;
                }
            } else {
                // No previous agent to roll back to
                this.currentAgentId = null;
                this.currentTransport = null;
                this.currentConnection = null;
            }

            this.emit('switch-failed', {
                targetAgentId: agentId,
                error: switchError,
                rolledBack,
            });

            throw switchError;
        } finally {
            this.switching = false;
        }
    }

    /**
     * Connect to an agent for the first time (no previous connection to close).
     *
     * This is a convenience method for initial agent connection during startup.
     */
    async connectTo(agentId: string, options: SwitchOptions): Promise<AgentConnection> {
        return this.switchTo(agentId, options);
    }

    /**
     * Disconnect from the current agent.
     *
     * Gracefully closes the transport and clears all connection state.
     */
    async disconnect(): Promise<void> {
        if (this.currentTransport) {
            logger.info(`[AgentSwitcher] Disconnecting from agent: ${this.currentAgentId}`);
            await this.closeTransport(this.currentTransport);
        }

        this.currentAgentId = null;
        this.currentTransport = null;
        this.currentConnection = null;
    }

    // ─── Events ──────────────────────────────────────────────────────────

    /** Register an event listener */
    on<K extends keyof AgentSwitcherEvents>(
        event: K,
        listener: AgentSwitcherListener<K>,
    ): void {
        if (!this.listeners[event]) {
            this.listeners[event] = new Set() as never;
        }
        (this.listeners[event] as Set<AgentSwitcherListener<K>>).add(listener);
    }

    /** Remove an event listener */
    off<K extends keyof AgentSwitcherEvents>(
        event: K,
        listener: AgentSwitcherListener<K>,
    ): void {
        const set = this.listeners[event] as Set<AgentSwitcherListener<K>> | undefined;
        if (set) {
            set.delete(listener);
        }
    }

    // ─── Internal ────────────────────────────────────────────────────────

    private setupDisconnectHandler(transport: AcpTransport, agentId: string): void {
        transport.on('close', ({ code, signal }) => {
            if (this.currentAgentId === agentId) {
                logger.warn(`[AgentSwitcher] Agent ${agentId} disconnected (code: ${code}, signal: ${signal})`);
                this.currentAgentId = null;
                this.currentTransport = null;
                this.currentConnection = null;
                this.emit('agent-disconnected', { agentId, code, signal });
            }
        });
    }

    private async closeTransport(transport: AcpTransport): Promise<void> {
        try {
            await transport.close();
        } catch (error) {
            logger.warn('[AgentSwitcher] Error closing transport:', error);
            transport.kill();
        }
    }

    private emit<K extends keyof AgentSwitcherEvents>(
        event: K,
        data: AgentSwitcherEvents[K],
    ): void {
        const set = this.listeners[event] as Set<AgentSwitcherListener<K>> | undefined;
        if (set) {
            for (const listener of set) {
                try {
                    listener(data);
                } catch (err) {
                    logger.error(`[AgentSwitcher] Error in '${event}' listener:`, err);
                }
            }
        }
    }
}

// ─── Utility Functions ───────────────────────────────────────────────────────

/**
 * Build an AcpTransportConfig from an AgentConfig.
 */
function buildTransportConfig(agent: AgentConfig, cwd?: string): AcpTransportConfig {
    return {
        command: agent.binaryPath,
        args: agent.args,
        env: agent.env,
        cwd,
    };
}

/**
 * Convert an AgentConnection's auth state to a persisted AgentAuthState.
 *
 * The connection uses a simple string union ('none' | 'required' | 'authenticated')
 * while the persisted config uses a discriminated union with additional data.
 */
function connectionAuthToAgentAuth(connection: AgentConnection): AgentAuthState {
    switch (connection.authState) {
        case 'none':
            return { status: 'none' };
        case 'required':
            return { status: 'required', methods: connection.authMethods };
        case 'authenticated':
            return { status: 'authenticated' };
    }
}
