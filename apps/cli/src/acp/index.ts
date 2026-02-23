/**
 * ACP (Agent Client Protocol) module for happy-cli
 *
 * Provides:
 * - Transport layer: Subprocess lifecycle and JSON-RPC 2.0 communication
 * - Initialization: Protocol handshake with version and capability negotiation
 * - Authentication: Agent Auth (OAuth) and Terminal Auth flows
 * - Capability querying: Runtime feature-gating based on agent capabilities
 * - Resource handlers: Client-side fs and terminal operations
 *
 * Uses @agentclientprotocol/sdk for the protocol implementation and
 * @magic-agent/protocol for typed Zod schemas.
 *
 * @example
 * ```typescript
 * import {
 *     AcpTransport,
 *     initializeConnection,
 *     createResourceHandlers,
 *     canLoadSession,
 *     type AgentConnection,
 * } from '@/acp';
 *
 * const transport = new AcpTransport({
 *     command: 'claude',
 *     args: ['code', '--acp'],
 * });
 *
 * const resources = createResourceHandlers();
 *
 * transport.spawn((agent) => ({
 *     requestPermission: async (params) => { ... },
 *     sessionUpdate: async (params) => { ... },
 *     readTextFile: resources.readTextFile,
 *     writeTextFile: resources.writeTextFile,
 *     createTerminal: resources.createTerminal,
 *     terminalOutput: resources.terminalOutput,
 *     waitForTerminalExit: resources.waitForTerminalExit,
 *     killTerminal: resources.killTerminal,
 *     releaseTerminal: resources.releaseTerminal,
 * }));
 *
 * const connection = await initializeConnection(transport);
 *
 * if (canLoadSession(connection)) {
 *     // Agent supports session loading
 * }
 *
 * // Cleanup on disconnect
 * resources.releaseAllTerminals();
 * ```
 *
 * @see https://agentclientprotocol.com/protocol/overview
 */

// Transport layer
export { AcpTransport } from './transport';

export type {
    AcpTransportConfig,
    AcpTransportEvents,
    AcpTransportListener,
    AcpClientFactory,
} from './types';

// Initialization
export {
    initializeConnection,
    ProtocolVersionMismatchError,
    type InitializeOptions,
} from './initialization';

// Capabilities
export {
    HAPPY_CLIENT_CAPABILITIES,
    createAgentConnection,
    canLoadSession,
    canListSessions,
    canResumeSession,
    canForkSession,
    canPromptWithImages,
    canPromptWithAudio,
    canPromptWithEmbeddedContext,
    canMcpHttp,
    canMcpSse,
    isAuthRequired,
    isAuthenticated,
    isReady,
    type AgentConnection,
    type AcpAuthState,
} from './capabilities';

// Authentication
export {
    selectAuthMethod,
    authenticate,
    handleAuthIfRequired,
    isAuthRequiredError,
} from './auth';

// Resource handlers for client-side fs and terminal operations
export { createResourceHandlers, TerminalRegistry } from './resources';
export type { AcpResourceHandlers } from './resources';

// Re-export key SDK types for convenience
export {
    ClientSideConnection,
    RequestError,
    PROTOCOL_VERSION,
} from '@agentclientprotocol/sdk';

export type {
    Client,
    Agent,
    AnyMessage,
} from '@agentclientprotocol/sdk';
