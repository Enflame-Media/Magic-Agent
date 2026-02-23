/**
 * ACP Agent Connection and Capability Querying
 *
 * Stores the negotiated connection state after initialization and provides
 * typed helpers for runtime feature-gating based on agent capabilities.
 *
 * @see https://agentclientprotocol.com/protocol/initialization
 */

import type {
    AcpAgentCapabilities,
    AcpClientCapabilities,
    AcpImplementation,
    AcpAuthMethod,
    AcpProtocolVersion,
} from '@magic-agent/protocol';

/** Authentication state of the connection */
export type AcpAuthState = 'none' | 'required' | 'authenticated';

/**
 * Represents a fully initialized connection to an ACP agent.
 *
 * Created after a successful initialize handshake and stored for
 * the lifetime of the connection to enable feature-gating.
 */
export interface AgentConnection {
    /** Information about the connected agent (name, version) */
    agentInfo: AcpImplementation | null;

    /** Agent capabilities discovered during initialization */
    capabilities: AcpAgentCapabilities;

    /** Client capabilities advertised during initialization */
    clientCapabilities: AcpClientCapabilities;

    /** Current authentication state */
    authState: AcpAuthState;

    /** Authentication methods offered by the agent (empty if none required) */
    authMethods: AcpAuthMethod[];

    /** Negotiated protocol version */
    protocolVersion: AcpProtocolVersion;
}

/**
 * Happy-cli's default client capabilities
 *
 * Advertised during initialization to inform the agent about
 * what features the Happy client supports.
 */
export const HAPPY_CLIENT_CAPABILITIES: AcpClientCapabilities = {
    fs: {
        readTextFile: true,
        writeTextFile: true,
    },
    terminal: true,
};

/** Whether the agent supports loading previous sessions */
export function canLoadSession(conn: AgentConnection): boolean {
    return conn.capabilities.loadSession === true;
}

/** Whether the agent supports listing existing sessions (UNSTABLE) */
export function canListSessions(conn: AgentConnection): boolean {
    return conn.capabilities.sessionCapabilities?.list != null;
}

/** Whether the agent supports resuming sessions without history replay (UNSTABLE) */
export function canResumeSession(conn: AgentConnection): boolean {
    return conn.capabilities.sessionCapabilities?.resume != null;
}

/** Whether the agent supports forking sessions (UNSTABLE) */
export function canForkSession(conn: AgentConnection): boolean {
    return conn.capabilities.sessionCapabilities?.fork != null;
}

/** Whether the agent supports image content in prompts */
export function canPromptWithImages(conn: AgentConnection): boolean {
    return conn.capabilities.promptCapabilities?.image === true;
}

/** Whether the agent supports audio content in prompts */
export function canPromptWithAudio(conn: AgentConnection): boolean {
    return conn.capabilities.promptCapabilities?.audio === true;
}

/** Whether the agent supports embedded context in prompts */
export function canPromptWithEmbeddedContext(conn: AgentConnection): boolean {
    return conn.capabilities.promptCapabilities?.embeddedContext === true;
}

/** Whether the agent supports MCP servers over HTTP */
export function canMcpHttp(conn: AgentConnection): boolean {
    return conn.capabilities.mcpCapabilities?.http === true;
}

/** Whether the agent supports MCP servers over SSE */
export function canMcpSse(conn: AgentConnection): boolean {
    return conn.capabilities.mcpCapabilities?.sse === true;
}

/** Whether authentication is required before session creation */
export function isAuthRequired(conn: AgentConnection): boolean {
    return conn.authState === 'required';
}

/** Whether the connection has been authenticated */
export function isAuthenticated(conn: AgentConnection): boolean {
    return conn.authState === 'authenticated';
}

/** Whether the connection is ready for session creation (no auth needed or already authenticated) */
export function isReady(conn: AgentConnection): boolean {
    return conn.authState === 'none' || conn.authState === 'authenticated';
}

/**
 * Create an AgentConnection from an initialize response.
 *
 * @param response - Parsed initialize response from the agent
 * @param clientCapabilities - The client capabilities that were sent
 * @returns A new AgentConnection with the negotiated state
 */
export function createAgentConnection(
    response: {
        agentInfo?: AcpImplementation | null;
        agentCapabilities?: AcpAgentCapabilities;
        authMethods?: AcpAuthMethod[];
        protocolVersion: AcpProtocolVersion;
    },
    clientCapabilities: AcpClientCapabilities,
): AgentConnection {
    const authMethods = response.authMethods ?? [];

    return {
        agentInfo: response.agentInfo ?? null,
        capabilities: response.agentCapabilities ?? {
            loadSession: false,
            mcpCapabilities: { http: false, sse: false },
            promptCapabilities: { audio: false, embeddedContext: false, image: false },
            sessionCapabilities: {},
        },
        clientCapabilities,
        authState: authMethods.length > 0 ? 'required' : 'none',
        authMethods,
        protocolVersion: response.protocolVersion,
    };
}
