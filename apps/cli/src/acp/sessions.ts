/**
 * ACP Session Lifecycle Management
 *
 * Wraps all ACP session methods (new, load, resume, fork, config, mode, model, list)
 * and maintains a registry of active sessions. Gates optional methods behind
 * capability checks from the initialization phase.
 *
 * @see https://agentclientprotocol.com/protocol/session-setup
 */

import {
    AcpNewSessionResponseSchema,
    AcpLoadSessionResponseSchema,
    AcpResumeSessionResponseSchema,
    AcpForkSessionResponseSchema,
    AcpListSessionsResponseSchema,
    AcpSetSessionConfigOptionResponseSchema,
    type AcpMcpServer,
    type AcpSessionConfigOption,
    type AcpSessionModeState,
    type AcpSessionModelState,
    type AcpSessionInfo,
} from '@magic-agent/protocol';
import { logger } from '@/ui/logger';
import type { AcpTransport } from './transport';
import type { AgentConnection } from './capabilities';
import {
    canLoadSession,
    canResumeSession,
    canForkSession,
    canListSessions,
} from './capabilities';
import { handleAuthIfRequired, isAuthRequiredError } from './auth';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Metadata tracked for each active session */
export interface SessionState {
    /** Unique session identifier from the agent */
    sessionId: string;

    /** Working directory for this session */
    cwd: string;

    /** Configuration options available in this session */
    configOptions: AcpSessionConfigOption[] | null;

    /** Mode state (available modes and current mode) */
    modes: AcpSessionModeState | null;

    /** Model state (available models and current model) */
    models: AcpSessionModelState | null;

    /** When this session was created locally */
    createdAt: Date;
}

/** Parameters for listing sessions */
export interface ListSessionsParams {
    /** Pagination cursor from a previous response */
    cursor?: string | null;

    /** Filter by working directory */
    cwd?: string | null;
}

/** Result from listing sessions */
export interface SessionListResult {
    /** Session metadata entries */
    sessions: AcpSessionInfo[];

    /** Cursor for the next page, or null if no more results */
    nextCursor: string | null;
}

// ─── Errors ──────────────────────────────────────────────────────────────────

/** Thrown when a session method requires a capability the agent does not support */
export class SessionCapabilityError extends Error {
    readonly method: string;
    readonly capability: string;

    constructor(method: string, capability: string) {
        super(
            `Cannot call ${method}: agent does not support '${capability}' capability`,
        );
        this.name = 'SessionCapabilityError';
        this.method = method;
        this.capability = capability;
    }
}

/** Thrown when operating on a session that is not tracked in the registry */
export class SessionNotFoundError extends Error {
    readonly sessionId: string;

    constructor(sessionId: string) {
        super(`Session '${sessionId}' not found in the session registry`);
        this.name = 'SessionNotFoundError';
        this.sessionId = sessionId;
    }
}

// ─── SessionManager ──────────────────────────────────────────────────────────

/**
 * Manages ACP session lifecycle and maintains a registry of active sessions.
 *
 * All optional session methods are gated behind capability checks from the
 * AgentConnection established during initialization. The transport layer
 * handles request timeouts and error propagation.
 *
 * @example
 * ```typescript
 * const manager = new SessionManager(transport, connection);
 *
 * const sessionId = await manager.createSession('/path/to/project');
 *
 * if (manager.canSetMode()) {
 *     await manager.setMode(sessionId, 'architect');
 * }
 *
 * const session = manager.getSession(sessionId);
 * console.log('Current mode:', session?.modes?.currentModeId);
 * ```
 */
export class SessionManager {
    private readonly transport: AcpTransport;
    private connection: AgentConnection;
    private readonly sessions = new Map<string, SessionState>();
    private activeSessionId: string | null = null;

    constructor(transport: AcpTransport, connection: AgentConnection) {
        this.transport = transport;
        this.connection = connection;
    }

    // ─── Session Creation ────────────────────────────────────────────────

    /**
     * Create a new session with the agent.
     *
     * This is the primary entry point for starting a conversation. If the agent
     * returns an `auth_required` error, automatically triggers the auth flow
     * and retries the request.
     *
     * @param cwd - Working directory for the session (absolute path)
     * @param mcpServers - MCP server configurations to connect
     * @returns The new session ID
     */
    async createSession(cwd: string, mcpServers: AcpMcpServer[] = []): Promise<string> {
        logger.info(`[SessionManager] Creating new session in ${cwd}`);

        let rawResponse: unknown;

        try {
            rawResponse = await this.transport.request(
                (conn) => conn.newSession({ cwd, mcpServers }),
            );
        } catch (error: unknown) {
            if (isAuthRequiredError(error)) {
                logger.info('[SessionManager] Auth required for session creation, authenticating...');
                this.connection = await handleAuthIfRequired(this.transport, this.connection);
                rawResponse = await this.transport.request(
                    (conn) => conn.newSession({ cwd, mcpServers }),
                );
            } else {
                throw error;
            }
        }

        const parseResult = AcpNewSessionResponseSchema.safeParse(rawResponse);
        const response = parseResult.success ? parseResult.data : rawResponse as Record<string, unknown>;

        const sessionId = (response as Record<string, unknown>).sessionId as string;

        if (!sessionId) {
            throw new Error('[SessionManager] session/new response missing sessionId');
        }

        const state: SessionState = {
            sessionId,
            cwd,
            configOptions: parseResult.success ? parseResult.data.configOptions ?? null : null,
            modes: parseResult.success ? parseResult.data.modes ?? null : null,
            models: parseResult.success ? parseResult.data.models ?? null : null,
            createdAt: new Date(),
        };

        this.sessions.set(sessionId, state);
        this.activeSessionId = sessionId;

        logger.info(`[SessionManager] Session created: ${sessionId}`);
        this.logSessionState(state);

        return sessionId;
    }

    // ─── Session Loading ─────────────────────────────────────────────────

    /**
     * Load an existing session, replaying its message history via update notifications.
     *
     * Requires the `loadSession` agent capability. The agent will stream the
     * full conversation history to the client via `sessionUpdate` notifications
     * before resolving.
     *
     * @param sessionId - ID of the session to load
     * @param cwd - Working directory for the session
     * @param mcpServers - MCP server configurations to connect
     * @throws SessionCapabilityError if the agent does not support loadSession
     */
    async loadSession(sessionId: string, cwd: string, mcpServers: AcpMcpServer[] = []): Promise<void> {
        if (!canLoadSession(this.connection)) {
            throw new SessionCapabilityError('session/load', 'loadSession');
        }

        logger.info(`[SessionManager] Loading session: ${sessionId}`);

        const rawResponse = await this.transport.request(
            (conn) => conn.loadSession({ sessionId, cwd, mcpServers }),
            0, // No timeout — loading may take time while replaying history
        );

        const parseResult = AcpLoadSessionResponseSchema.safeParse(rawResponse);

        const state: SessionState = {
            sessionId,
            cwd,
            configOptions: parseResult.success ? parseResult.data.configOptions ?? null : null,
            modes: parseResult.success ? parseResult.data.modes ?? null : null,
            models: parseResult.success ? parseResult.data.models ?? null : null,
            createdAt: new Date(),
        };

        this.sessions.set(sessionId, state);
        this.activeSessionId = sessionId;

        logger.info(`[SessionManager] Session loaded: ${sessionId}`);
        this.logSessionState(state);
    }

    // ─── Session Resume ──────────────────────────────────────────────────

    /**
     * Resume an existing session without replaying message history.
     *
     * Requires the `session.resume` capability (UNSTABLE). Faster than loadSession
     * because the agent restores context internally without sending history updates.
     *
     * @param sessionId - ID of the session to resume
     * @param cwd - Working directory for the session
     * @param mcpServers - Optional MCP server configurations
     * @throws SessionCapabilityError if the agent does not support session.resume
     */
    async resumeSession(sessionId: string, cwd: string, mcpServers?: AcpMcpServer[]): Promise<void> {
        if (!canResumeSession(this.connection)) {
            throw new SessionCapabilityError('session/resume', 'session.resume');
        }

        logger.info(`[SessionManager] Resuming session: ${sessionId}`);

        const rawResponse = await this.transport.request(
            (conn) => conn.unstable_resumeSession({ sessionId, cwd, mcpServers }),
        );

        const parseResult = AcpResumeSessionResponseSchema.safeParse(rawResponse);

        const state: SessionState = {
            sessionId,
            cwd,
            configOptions: parseResult.success ? parseResult.data.configOptions ?? null : null,
            modes: parseResult.success ? parseResult.data.modes ?? null : null,
            models: parseResult.success ? parseResult.data.models ?? null : null,
            createdAt: new Date(),
        };

        this.sessions.set(sessionId, state);
        this.activeSessionId = sessionId;

        logger.info(`[SessionManager] Session resumed: ${sessionId}`);
    }

    // ─── Session Fork ────────────────────────────────────────────────────

    /**
     * Fork an existing session to create an independent branch.
     *
     * Requires the `session.fork` capability (UNSTABLE). Creates a new session
     * based on the context of the existing one. The original session remains
     * unchanged.
     *
     * @param sessionId - ID of the session to fork
     * @param cwd - Working directory for the forked session
     * @param mcpServers - Optional MCP server configurations
     * @returns The new forked session ID
     * @throws SessionCapabilityError if the agent does not support session.fork
     */
    async forkSession(sessionId: string, cwd: string, mcpServers?: AcpMcpServer[]): Promise<string> {
        if (!canForkSession(this.connection)) {
            throw new SessionCapabilityError('session/fork', 'session.fork');
        }

        logger.info(`[SessionManager] Forking session: ${sessionId}`);

        const rawResponse = await this.transport.request(
            (conn) => conn.unstable_forkSession({ sessionId, cwd, mcpServers }),
        );

        const parseResult = AcpForkSessionResponseSchema.safeParse(rawResponse);
        const response = parseResult.success ? parseResult.data : rawResponse as Record<string, unknown>;
        const newSessionId = (response as Record<string, unknown>).sessionId as string;

        if (!newSessionId) {
            throw new Error('[SessionManager] session/fork response missing sessionId');
        }

        const state: SessionState = {
            sessionId: newSessionId,
            cwd,
            configOptions: parseResult.success ? parseResult.data.configOptions ?? null : null,
            modes: parseResult.success ? parseResult.data.modes ?? null : null,
            models: parseResult.success ? parseResult.data.models ?? null : null,
            createdAt: new Date(),
        };

        this.sessions.set(newSessionId, state);
        this.activeSessionId = newSessionId;

        logger.info(`[SessionManager] Session forked: ${sessionId} -> ${newSessionId}`);

        return newSessionId;
    }

    // ─── Session Configuration ───────────────────────────────────────────

    /**
     * Set a configuration option for a session.
     *
     * Returns the full set of configuration options with their current values,
     * since changing one option may affect available values of other options.
     *
     * @param sessionId - ID of the session to configure
     * @param configId - Configuration option identifier
     * @param value - Value to set
     * @returns The updated configuration options array
     */
    async configSession(
        sessionId: string,
        configId: string,
        value: string,
    ): Promise<AcpSessionConfigOption[]> {
        logger.info(`[SessionManager] Setting config ${configId}=${value} on session: ${sessionId}`);

        const rawResponse = await this.transport.request(
            (conn) => conn.setSessionConfigOption({ sessionId, configId, value }),
        );

        const parseResult = AcpSetSessionConfigOptionResponseSchema.safeParse(rawResponse);

        const configOptions = parseResult.success
            ? parseResult.data.configOptions
            : (rawResponse as { configOptions?: AcpSessionConfigOption[] }).configOptions ?? [];

        // Update tracked session state
        const session = this.sessions.get(sessionId);
        if (session) {
            session.configOptions = configOptions;
        }

        logger.info(`[SessionManager] Config updated on session: ${sessionId}`);

        return configOptions;
    }

    // ─── Session Mode ────────────────────────────────────────────────────

    /**
     * Switch the operational mode for a session.
     *
     * Modes affect system prompts, tool availability, and permission behaviors.
     * Can be called at any time, whether the agent is idle or actively generating.
     *
     * @param sessionId - ID of the session
     * @param modeId - Mode identifier (e.g., 'ask', 'code', 'architect')
     */
    async setMode(sessionId: string, modeId: string): Promise<void> {
        logger.info(`[SessionManager] Setting mode '${modeId}' on session: ${sessionId}`);

        await this.transport.request(
            (conn) => conn.setSessionMode({ sessionId, modeId }),
        );

        // Update tracked mode in session state
        const session = this.sessions.get(sessionId);
        if (session?.modes) {
            session.modes = {
                ...session.modes,
                currentModeId: modeId,
            };
        }

        logger.info(`[SessionManager] Mode set to '${modeId}' on session: ${sessionId}`);
    }

    // ─── Session Model ───────────────────────────────────────────────────

    /**
     * Select the AI model for a session (UNSTABLE).
     *
     * @param sessionId - ID of the session
     * @param modelId - Model identifier
     */
    async setModel(sessionId: string, modelId: string): Promise<void> {
        logger.info(`[SessionManager] Setting model '${modelId}' on session: ${sessionId}`);

        await this.transport.request(
            (conn) => conn.unstable_setSessionModel({ sessionId, modelId }),
        );

        // Update tracked model in session state
        const session = this.sessions.get(sessionId);
        if (session?.models) {
            session.models = {
                ...session.models,
                currentModelId: modelId,
            };
        }

        logger.info(`[SessionManager] Model set to '${modelId}' on session: ${sessionId}`);
    }

    // ─── Session Listing ─────────────────────────────────────────────────

    /**
     * List existing sessions with optional filtering and pagination (UNSTABLE).
     *
     * Requires the `listSessions` capability. Returns paginated results with
     * session metadata. Use the `nextCursor` value to fetch subsequent pages.
     *
     * @param params - Optional filtering and pagination parameters
     * @returns Paginated session list with metadata
     * @throws SessionCapabilityError if the agent does not support listSessions
     */
    async listSessions(params: ListSessionsParams = {}): Promise<SessionListResult> {
        if (!canListSessions(this.connection)) {
            throw new SessionCapabilityError('session/list', 'listSessions');
        }

        logger.info('[SessionManager] Listing sessions');

        const rawResponse = await this.transport.request(
            (conn) => conn.unstable_listSessions({
                cursor: params.cursor ?? null,
                cwd: params.cwd ?? null,
            }),
        );

        const parseResult = AcpListSessionsResponseSchema.safeParse(rawResponse);

        if (parseResult.success) {
            return {
                sessions: parseResult.data.sessions,
                nextCursor: parseResult.data.nextCursor ?? null,
            };
        }

        // Fall back to raw response
        const raw = rawResponse as Record<string, unknown>;
        return {
            sessions: (raw.sessions as AcpSessionInfo[]) ?? [],
            nextCursor: (raw.nextCursor as string | null) ?? null,
        };
    }

    // ─── Capability Checks ───────────────────────────────────────────────

    /** Whether the agent supports loading previous sessions */
    canLoad(): boolean {
        return canLoadSession(this.connection);
    }

    /** Whether the agent supports resuming sessions without history replay */
    canResume(): boolean {
        return canResumeSession(this.connection);
    }

    /** Whether the agent supports forking sessions */
    canFork(): boolean {
        return canForkSession(this.connection);
    }

    /** Whether the agent supports listing existing sessions */
    canList(): boolean {
        return canListSessions(this.connection);
    }

    // ─── Session Registry ────────────────────────────────────────────────

    /** Get the currently active session ID, or null if no session is active */
    getActiveSessionId(): string | null {
        return this.activeSessionId;
    }

    /** Set the active session ID */
    setActiveSessionId(sessionId: string): void {
        if (!this.sessions.has(sessionId)) {
            throw new SessionNotFoundError(sessionId);
        }
        this.activeSessionId = sessionId;
    }

    /** Get the state of a specific session, or undefined if not tracked */
    getSession(sessionId: string): SessionState | undefined {
        return this.sessions.get(sessionId);
    }

    /** Get all tracked sessions */
    getAllSessions(): Map<string, SessionState> {
        return new Map(this.sessions);
    }

    /** Remove a session from the registry */
    removeSession(sessionId: string): void {
        this.sessions.delete(sessionId);
        if (this.activeSessionId === sessionId) {
            this.activeSessionId = null;
        }
    }

    /** Get the current AgentConnection (may be updated after auth) */
    getConnection(): AgentConnection {
        return this.connection;
    }

    // ─── Internal ────────────────────────────────────────────────────────

    private logSessionState(state: SessionState): void {
        if (state.modes) {
            const modeNames = state.modes.availableModes.map((m) => m.id);
            logger.info(`[SessionManager] Available modes: ${modeNames.join(', ')} (current: ${state.modes.currentModeId})`);
        }
        if (state.models) {
            const modelNames = state.models.availableModels.map((m) => m.modelId);
            logger.info(`[SessionManager] Available models: ${modelNames.join(', ')} (current: ${state.models.currentModelId})`);
        }
        if (state.configOptions && state.configOptions.length > 0) {
            logger.info(`[SessionManager] Config options: ${state.configOptions.length} available`);
        }
    }
}
